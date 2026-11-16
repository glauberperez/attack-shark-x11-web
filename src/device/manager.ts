import { AttackSharkX11, ConnectionMode, TimeoutError, type ReportId } from 'attack-shark-x11-driver';
import { WebHidTransport, findGrantedDevice, requestDevice, toHex } from './webhid-transport';
import {
	REPORTS,
	decodeAll,
	decodeDpi,
	decodeLighting,
	decodePolling,
	encodeDpi,
	encodeLighting,
	encodePolling,
	type RawReports,
	type Section,
	type Settings,
} from './codec';

export type Status = 'unsupported' | 'insecure' | 'idle' | 'connecting' | 'connected' | 'error';

export interface LogEntry {
	t: number;
	dir: 'tx' | 'rx' | 'in' | 'info' | 'err';
	msg: string;
}

export interface DeviceState {
	status: Status;
	error?: string;
	mode?: 'wired' | 'wireless';
	productName?: string;
	battery?: { percent: number; charging: boolean };
	settings?: Settings;
	raw?: RawReports;
	snapshot?: RawReports;
	busy: boolean;
	log: LogEntry[];
}

const LOG_LIMIT = 400;
const ACK_TIMEOUT = 1500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function initialStatus(): Status {
	if (typeof window === 'undefined') return 'idle';
	if (!window.isSecureContext) return 'insecure';
	if (!('hid' in navigator)) return 'unsupported';
	return 'idle';
}

class DeviceManager {
	private state: DeviceState = { status: initialStatus(), busy: false, log: [] };
	private listeners = new Set<() => void>();
	private driver?: AttackSharkX11;
	private transport?: WebHidTransport;
	private queue: Promise<unknown> = Promise.resolve();
	private booted = false;

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
		return this.transport?.productId === 0xfa55 ? ConnectionMode.Wired : ConnectionMode.Wireless;
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
			(driver as unknown as { productId: number }).productId = device.productId;
			driver.on('batteryChange', (status, percent) => this.set({ battery: { percent, charging: status === 3 } }));
			driver.on('error', (e) => this.log('err', String(e)));
			transport.onData((data) => this.onEvent(data));
			const mode = device.productId === 0xfa55 ? 'wired' : 'wireless';
			this.log('info', `opened ${device.productName} (${mode})`);
			this.set({ status: 'connected', mode, productName: device.productName });
			await this.reload(true);
		} catch (e) {
			this.driver = undefined;
			this.transport = undefined;
			this.fail(e);
		}
	}

	private onEvent(data: Uint8Array) {
		if (data.length !== 5 || data[0] !== 0x03) return;
		if (data[2] === 0x10 && this.state.settings && data[3]! >= 1 && data[3]! <= 8) {
			const dpi = { ...this.state.settings.dpi, current: data[3]! };
			this.set({ settings: { ...this.state.settings, dpi } });
		}
	}

	async disconnect() {
		const driver = this.driver;
		this.driver = undefined;
		this.transport = undefined;
		this.set({ status: 'idle', settings: undefined, raw: undefined, battery: undefined, mode: undefined, busy: false });
		try {
			await driver?.close();
		} catch (e) {
			this.log('err', String(e));
		}
	}

	private async readReport(section: Section): Promise<Uint8Array> {
		const { id, length } = REPORTS[section];
		for (let attempt = 1; ; attempt++) {
			try {
				return await this.driver!.getFeatureReport(id, length);
			} catch (e) {
				if (attempt >= 3) throw e;
				this.log('info', `read ${section} failed (attempt ${attempt}), retrying`);
				await sleep(150);
			}
		}
	}

	reload(takeSnapshot = false) {
		return this.run(async () => {
			if (!this.driver) return;
			this.set({ busy: true });
			try {
				const raw: RawReports = {
					polling: await this.readReport('polling'),
					dpi: await this.readReport('dpi'),
					lighting: await this.readReport('lighting'),
				};
				this.set({ raw, settings: decodeAll(raw), ...(takeSnapshot || !this.state.snapshot ? { snapshot: raw } : {}) });
			} catch (e) {
				this.fail(e);
			} finally {
				this.set({ busy: false });
			}
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

	private async apply(section: Section, packet: Uint8Array) {
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
				this.set({ raw, settings });
			} finally {
				this.set({ busy: false });
			}
		});
	}

	applyPolling(rate: Settings['polling']) {
		return this.apply('polling', encodePolling(rate, this.connectionMode));
	}

	applyDpi(dpi: Settings['dpi']) {
		return this.apply('dpi', encodeDpi(dpi, this.state.raw!.dpi, this.connectionMode));
	}

	applyLighting(lighting: Settings['lighting']) {
		return this.apply('lighting', encodeLighting(lighting, this.state.raw!.lighting, this.connectionMode));
	}

	exportBackup(): string | null {
		const r = this.state.snapshot ?? this.state.raw;
		if (!r) return null;
		return JSON.stringify(
			{ device: 'attack-shark-x11', version: 1, reports: { polling: toHex(r.polling), dpi: toHex(r.dpi), lighting: toHex(r.lighting) } },
			null,
			2,
		);
	}

	async restoreBackup(json: string) {
		const parsed = JSON.parse(json) as { device?: string; reports?: Record<string, string> };
		if (parsed.device !== 'attack-shark-x11' || !parsed.reports) throw new Error('invalidBackup');
		const bytes = (h: string) => Uint8Array.from(h.trim().split(/\s+/).map((x) => parseInt(x, 16)));
		const r = parsed.reports;
		const raw: RawReports = { polling: bytes(r.polling!), dpi: bytes(r.dpi!), lighting: bytes(r.lighting!) };
		const s = decodeAll(raw);
		await this.applyPolling(s.polling);
		await this.apply('dpi', encodeDpi(s.dpi, raw.dpi, this.connectionMode));
		await this.apply('lighting', encodeLighting(s.lighting, raw.lighting, this.connectionMode));
	}
}

export const device = new DeviceManager();

if (typeof window !== 'undefined') (window as unknown as { x11: DeviceManager }).x11 = device;
