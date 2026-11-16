import { AttackSharkX11, ConnectionMode, TimeoutError, type ReportId } from 'attack-shark-x11-driver';
import { WebHidTransport, findGrantedDevice, requestDevice, toHex, WIRED_PIDS } from './webhid-transport';
import {
	REPORTS,
	SECTIONS,
	decodeAll,
	decodeButtons,
	decodeDpi,
	decodeLighting,
	decodePolling,
	encodeSection,
	LightMode,
	type RawReports,
	type Section,
	type Settings,
} from './codec';
import { MACRO_SLOTS, decodeMacroHead, encodeMacro, macroHeadMatches, type MacroDef, type MacroSlotInfo } from './macros';
import { getPrefs } from '../store';

export type Status = 'unsupported' | 'insecure' | 'idle' | 'connecting' | 'connected' | 'error';

export interface LogEntry {
	t: number;
	dir: 'tx' | 'rx' | 'in' | 'info' | 'err';
	msg: string;
}

export interface DeviceInfo {
	firmware?: string;
	profile?: number;
	profiles?: number;
}

export interface DeviceState {
	status: Status;
	error?: string;
	asleep: boolean;
	mode?: 'wired' | 'wireless';
	productName?: string;
	battery?: { percent: number; charging: boolean };
	settings?: Settings;
	raw?: RawReports;
	snapshot?: RawReports;
	info: DeviceInfo;
	macroSlots?: MacroSlotInfo[];
	busy: boolean;
	log: LogEntry[];
}

const LOG_LIMIT = 400;
const ACK_TIMEOUT = 1500;
const SLEEP_RETRY = 3000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class AsleepError extends Error {
	constructor() {
		super('asleep');
	}
}

function initialStatus(): Status {
	if (typeof window === 'undefined') return 'idle';
	if (!window.isSecureContext) return 'insecure';
	if (!('hid' in navigator)) return 'unsupported';
	return 'idle';
}

const isPermissionDenied = (e: unknown) => /did not enable reading/i.test(String((e as { cause?: unknown })?.cause ?? e));

class DeviceManager {
	private state: DeviceState = { status: initialStatus(), asleep: false, busy: false, log: [], info: {} };
	private listeners = new Set<() => void>();
	private driver?: AttackSharkX11;
	private transport?: WebHidTransport;
	private queue: Promise<unknown> = Promise.resolve();
	private booted = false;
	private wakeTimer?: ReturnType<typeof setTimeout>;
	private ledTimer?: ReturnType<typeof setTimeout>;
	private lowBatteryNotified = false;

	subscribe = (fn: () => void) => {
		this.listeners.add(fn);
		return () => this.listeners.delete(fn);
	};

	getState = () => this.state;

	private set(patch: Partial<DeviceState>) {
		this.state = { ...this.state, ...patch };
		this.listeners.forEach((l) => l());
	}

	log = (dir: LogEntry['dir'], msg: string) => {
		if (dir === 'in' && msg.startsWith('03 55 40')) return;
		const log = [{ t: Date.now(), dir, msg }, ...this.state.log].slice(0, LOG_LIMIT);
		this.set({ log });
	};

	clearLog = () => this.set({ log: [] });

	private run<T>(fn: () => Promise<T>): Promise<T> {
		const p = this.queue.then(fn, fn);
		this.queue = p.catch(() => undefined);
		return p;
	}

	private get connectionMode() {
		return this.transport && WIRED_PIDS.includes(this.transport.productId) ? ConnectionMode.Wired : ConnectionMode.Wireless;
	}

	boot() {
		if (this.booted || this.state.status !== 'idle') return;
		this.booted = true;
		navigator.hid.addEventListener('disconnect', (e) => {
			if (this.transport && e.device === this.transport.device) {
				this.log('info', 'device disconnected');
				void this.disconnect();
			}
		});
		navigator.hid.addEventListener('connect', async () => {
			if (this.driver) return;
			const d = await findGrantedDevice();
			if (d) void this.open(d);
		});
		void findGrantedDevice().then((d) => d && this.open(d));
	}

	async connect() {
		try {
			const d = await requestDevice();
			if (d) await this.open(d);
		} catch (e) {
			this.fail(e);
		}
	}

	private fail(e: unknown) {
		const msg = e instanceof Error ? e.message : String(e);
		this.log('err', msg);
		this.set({ status: 'error', error: msg, busy: false });
	}

	private async open(device: HIDDevice) {
		if (this.driver) return;
		this.set({ status: 'connecting', error: undefined });
		try {
			const transport = new WebHidTransport(device, this.log);
			const driver = new AttackSharkX11({ transport });
			this.transport = transport;
			this.driver = driver;
			await driver.open();
			(driver as unknown as { productId: number }).productId = WIRED_PIDS.includes(device.productId) ? ConnectionMode.Wired : ConnectionMode.Wireless;
			driver.on('batteryChange', (status, percent) => this.onBattery(percent, status === 3));
			driver.on('error', (e) => this.log('err', String(e)));
			transport.onData((data) => this.onEvent(data));
			const mode = WIRED_PIDS.includes(device.productId) ? 'wired' : 'wireless';
			this.log('info', `opened ${device.productName} (${mode})`);
			this.set({ status: 'connected', mode, productName: device.productName });
			await this.reload(true);
			void this.readInfo();
		} catch (e) {
			this.driver = undefined;
			this.transport = undefined;
			this.fail(e);
		}
	}

	private onBattery(percent: number, charging: boolean) {
		this.set({ battery: { percent, charging } });
		const p = getPrefs();
		if (charging || percent > p.lowBatteryAt) {
			this.lowBatteryNotified = false;
			return;
		}
		if (!p.lowBattery || this.lowBatteryNotified) return;
		this.lowBatteryNotified = true;
		try {
			if ('Notification' in window && Notification.permission === 'granted') {
				new Notification('X11 Web Config', { body: `Attack Shark X11: ${percent}%`, tag: 'x11-battery' });
			}
		} catch (e) {
			this.log('err', String(e));
		}
	}

	private onEvent(data: Uint8Array) {
		if (data.length !== 5 || data[0] !== 0x03) return;
		if (this.state.asleep) {
			this.set({ asleep: false });
			void this.reload();
		}
		if (data[2] === 0x10 && this.state.settings && data[3]! >= 1 && data[3]! <= 8) {
			const dpi = { ...this.state.settings.dpi, current: data[3]! };
			this.set({ settings: { ...this.state.settings, dpi } });
			this.scheduleLedRestore();
		}
		if (data[2] === 0x80) this.set({ info: { ...this.state.info, profile: data[3]! + 1 } });
	}

	private scheduleLedRestore() {
		const mode = this.state.settings?.lighting.mode;
		if (!getPrefs().ledRestore || mode === undefined || mode === LightMode.StaticDpi || mode === LightMode.BreathingDpi) return;
		clearTimeout(this.ledTimer);
		this.ledTimer = setTimeout(() => {
			const raw = this.state.raw?.lighting;
			if (!raw || !this.driver) return;
			void this.run(async () => {
				try {
					await this.driver!.sendCommand(REPORTS.lighting.id, raw.slice(0, raw[1] ?? raw.length), ACK_TIMEOUT);
				} catch (e) {
					this.log('info', `led restore: ${e}`);
				}
			});
		}, 1000);
	}

	async disconnect() {
		const driver = this.driver;
		this.driver = undefined;
		this.transport = undefined;
		clearTimeout(this.wakeTimer);
		this.set({ status: 'idle', settings: undefined, raw: undefined, battery: undefined, mode: undefined, busy: false, asleep: false, macroSlots: undefined, info: {} });
		try {
			await driver?.close();
		} catch (e) {
			this.log('err', String(e));
		}
	}

	private async readRaw(id: number, length: number, param = 0x01): Promise<Uint8Array> {
		for (let attempt = 1; ; attempt++) {
			try {
				return await this.driver!.getFeatureReport(id as ReportId, length, param);
			} catch (e) {
				if (attempt >= 3) throw isPermissionDenied(e) ? new AsleepError() : e;
				this.log('info', `read 0x${id.toString(16)} failed (attempt ${attempt}), retrying`);
				await sleep(150);
			}
		}
	}

	private readReport(section: Section) {
		const { id, length } = REPORTS[section];
		return this.readRaw(id, length);
	}

	private markAsleep() {
		this.set({ asleep: true });
		clearTimeout(this.wakeTimer);
		this.wakeTimer = setTimeout(() => {
			if (this.driver && this.state.asleep) void this.reload();
		}, SLEEP_RETRY);
	}

	reload(takeSnapshot = false) {
		return this.run(async () => {
			if (!this.driver) return;
			this.set({ busy: true });
			try {
				const raw = {} as RawReports;
				for (const s of SECTIONS) raw[s] = await this.readReport(s);
				this.set({ raw, settings: decodeAll(raw), asleep: false, ...(takeSnapshot || !this.state.snapshot ? { snapshot: raw } : {}) });
			} catch (e) {
				if (e instanceof AsleepError) this.markAsleep();
				else this.log('err', `reload: ${e instanceof Error ? e.message : e}`);
			} finally {
				this.set({ busy: false });
			}
		});
	}

	private readInfo() {
		return this.run(async () => {
			if (!this.driver) return;
			const info: DeviceInfo = { ...this.state.info };
			try {
				const v = await this.readRaw(0x0b, 8);
				info.firmware = `${v[3]}.${String(v[4]).padStart(2, '0')}`;
			} catch (e) {
				this.log('info', `firmware read: ${e}`);
			}
			try {
				const p = await this.readRaw(0x0c, 10, 0);
				info.profile = p[2];
				info.profiles = p[4];
			} catch (e) {
				this.log('info', `profile read: ${e}`);
			}
			this.set({ info });
		});
	}

	private async writeVerified(section: Section, packet: Uint8Array) {
		const id = REPORTS[section].id as ReportId;
		let acked = false;
		try {
			acked = (await this.driver!.sendCommand(id, packet, ACK_TIMEOUT)) === 0;
		} catch (e) {
			if (!(e instanceof TimeoutError)) throw e;
			this.log('info', `no ACK for ${section}, verifying by read-back`);
		}
		await sleep(120);
		const back = await this.readReport(section);
		const same = packet.every((v, i) => i < 2 || back[i] === v);
		if (!same) throw new Error(acked ? 'verifyMismatch' : 'writeFailed');
		return back;
	}

	private applyPacket(section: Section, packet: Uint8Array) {
		return this.run(async () => {
			if (!this.driver || !this.state.raw) throw new Error('notConnected');
			this.set({ busy: true });
			try {
				const back = await this.writeVerified(section, packet);
				const raw = { ...this.state.raw, [section]: back } as RawReports;
				const settings = { ...this.state.settings! };
				if (section === 'polling') settings.polling = decodePolling(back);
				if (section === 'dpi') settings.dpi = decodeDpi(back);
				if (section === 'lighting') settings.lighting = decodeLighting(back);
				if (section === 'buttons') settings.buttons = decodeButtons(back);
				this.set({ raw, settings, asleep: false });
			} catch (e) {
				if (e instanceof AsleepError) {
					this.markAsleep();
					throw new Error('asleep');
				}
				throw e;
			} finally {
				this.set({ busy: false });
			}
		});
	}

	apply<S extends Section>(section: S, value: Settings[S]) {
		if (!this.state.raw || !this.state.settings) return Promise.reject(new Error('notConnected'));
		const settings = { ...this.state.settings, [section]: value } as Settings;
		return this.applyPacket(section, encodeSection(section, settings, this.state.raw, this.connectionMode));
	}

	applyPolling(v: Settings['polling']) {
		return this.apply('polling', v);
	}

	applyDpi(v: Settings['dpi']) {
		return this.apply('dpi', v);
	}

	applyLighting(v: Settings['lighting']) {
		return this.apply('lighting', v);
	}

	applyButtons(v: Settings['buttons']) {
		return this.apply('buttons', v);
	}

	async applyReports(reports: Record<string, string>) {
		const bytes = (h: string) => Uint8Array.from(h.trim().split(/\s+/).map((x) => parseInt(x, 16)));
		const parsed: Partial<RawReports> = {};
		for (const s of SECTIONS) if (reports[s]) parsed[s] = bytes(reports[s]);
		if (!Object.keys(parsed).length) throw new Error('invalidBackup');
		for (const s of SECTIONS) {
			const r = parsed[s];
			if (!r || !this.state.raw) continue;
			const decoded = decodeAll({ ...this.state.raw, [s]: r });
			await this.applyPacket(s, encodeSection(s, decoded, { ...this.state.raw, [s]: r }, this.connectionMode));
		}
	}

	currentReports(): Record<string, string> | null {
		const r = this.state.raw;
		if (!r) return null;
		return Object.fromEntries(SECTIONS.map((s) => [s, toHex(r[s])]));
	}

	exportBackup(): string | null {
		const r = this.state.snapshot ?? this.state.raw;
		if (!r) return null;
		const macros = getPrefs().macros;
		return JSON.stringify({ device: 'attack-shark-x11', version: 2, reports: Object.fromEntries(SECTIONS.map((s) => [s, toHex(r[s])])), macros }, null, 2);
	}

	async restoreBackup(json: string) {
		const parsed = JSON.parse(json) as { device?: string; reports?: Record<string, string>; macros?: MacroDef[] };
		if (parsed.device !== 'attack-shark-x11' || !parsed.reports) throw new Error('invalidBackup');
		await this.applyReports(parsed.reports);
		return parsed.macros;
	}

	readMacroSlots() {
		return this.run(async () => {
			if (!this.driver) return;
			const slots: MacroSlotInfo[] = [];
			for (let id = 1; id <= MACRO_SLOTS; id++) {
				try {
					slots.push(decodeMacroHead(id, await this.readRaw(0x09, 0x83, id)));
				} catch (e) {
					if (e instanceof AsleepError) {
						this.markAsleep();
						return;
					}
					slots.push({ id, empty: true });
				}
			}
			this.set({ macroSlots: slots });
		});
	}

	writeMacro(m: MacroDef) {
		return this.run(async () => {
			if (!this.driver) throw new Error('notConnected');
			this.set({ busy: true });
			try {
				const pages = encodeMacro(m, this.connectionMode);
				for (const page of pages) {
					let ok = false;
					for (let attempt = 1; attempt <= 2 && !ok; attempt++) {
						try {
							ok = (await this.driver.sendCommand(0x09 as ReportId, page, ACK_TIMEOUT)) === 0;
						} catch (e) {
							if (!(e instanceof TimeoutError)) throw e;
							this.log('info', `no ACK for macro page ${page[3]}, attempt ${attempt}`);
						}
					}
					if (!ok) throw new Error('writeFailed');
					await sleep(60);
				}
				await sleep(120);
				const head = await this.readRaw(0x09, 0x83, m.id);
				if (!macroHeadMatches(head, pages[0]!)) throw new Error('verifyMismatch');
				const slots = (this.state.macroSlots ?? []).filter((s) => s.id !== m.id);
				slots.push(decodeMacroHead(m.id, head));
				slots.sort((a, b) => a.id - b.id);
				this.set({ macroSlots: slots });
			} catch (e) {
				if (e instanceof AsleepError) {
					this.markAsleep();
					throw new Error('asleep');
				}
				throw e;
			} finally {
				this.set({ busy: false });
			}
		});
	}
}

export const device = new DeviceManager();

if (typeof window !== 'undefined') (window as unknown as { x11: DeviceManager }).x11 = device;
