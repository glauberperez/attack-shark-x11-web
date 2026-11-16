import { Buffer } from 'buffer';
(globalThis as any).Buffer ??= Buffer;
if (!(Uint8Array.prototype as any).toHex) {
	(Uint8Array.prototype as any).toHex = function (this: Uint8Array) {
		return Array.from(this, (x) => x.toString(16).padStart(2, '0')).join('');
	};
}

import {
	AttackSharkX11,
	CommandConfirmation,
	DpiBuilder,
	LightingSettingsBuilder,
	PollingRateBuilder,
	Rate,
	ReportId,
	ReportReadLength,
	handleResponseDpi,
	handleResponseLightingSettings,
	handleResponsePollingRate,
	type RGB,
	type StageIndex,
} from 'attack-shark-x11-driver';
import { WebHidTransport, findGrantedDevice, requestDevice, toHex, type RawLog } from './webhid-transport';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const logEl = $('log');
const log: RawLog = (dir, msg) => {
	const line = `${new Date().toLocaleTimeString()} ${dir.padEnd(4)} ${msg}\n`;
	logEl.textContent = (line + (logEl.textContent ?? '')).slice(0, 40_000);
	if (dir === 'err') console.error(msg);
};
let toastTimer: number | undefined;
function toast(msg: string, kind: 'ok' | 'err' = 'ok') {
	const t = $('toast');
	t.textContent = msg;
	t.className = `show ${kind}`;
	clearTimeout(toastTimer);
	toastTimer = window.setTimeout(() => (t.className = ''), 3500);
}

let driver: AttackSharkX11 | undefined;
let transport: WebHidTransport | undefined;
let dpi: DpiBuilder | undefined;
let lighting: LightingSettingsBuilder | undefined;
let rate: Rate | undefined;
let snapshot: Record<string, string> = {};

let queue: Promise<unknown> = Promise.resolve();
function run<T>(fn: () => Promise<T>): Promise<T> {
	const p = queue.then(fn, fn);
	queue = p.catch(() => undefined);
	return p;
}

function setStatus(text: string, connected: boolean) {
	const s = $('status');
	s.textContent = text;
	s.classList.toggle('on', connected);
	$('panels').classList.toggle('disabled', !connected);
	$('connect').textContent = connected ? 'Disconnect' : 'Connect mouse';
}

async function connect(device: HIDDevice) {
	await disconnect();
	transport = new WebHidTransport(device, log);
	driver = new AttackSharkX11({ transport });
	await driver.open();
	(driver as any).productId = device.productId;
	driver.on('batteryChange', (status, pct) => showBattery(status, pct));
	driver.on('error', (e) => log('err', String(e)));
	const mode = device.productId === 0xfa55 ? 'wired' : '2.4 GHz';
	log('info', `opened ${device.productName} (${mode})`);
	setStatus(`Connected · ${mode}`, true);
	await readAll(true);
}

async function disconnect() {
	if (driver) {
		try {
			await driver.close();
		} catch (e) {
			log('err', String(e));
		}
	}
	driver = undefined;
	transport = undefined;
	setStatus('Disconnected', false);
	$('battery').hidden = true;
}

function showBattery(status: number, pct: number) {
	const b = $('battery');
	b.hidden = false;
	b.textContent = `🔋 ${pct}%${status === 3 ? ' ⚡' : ''}`;
}

async function readRaw(id: ReportId, len: number, param = 0x01) {
	for (let attempt = 1; ; attempt++) {
		try {
			return await driver!.getFeatureReport(id, len, param);
		} catch (e) {
			if (attempt >= 3) throw e;
			log('info', `read 0x${id.toString(16)} failed (attempt ${attempt}), retrying`);
			await new Promise((r) => setTimeout(r, 150));
		}
	}
}

async function readAll(takeSnapshot = false) {
	if (!driver) return;
	await run(async () => {
		const errors: string[] = [];
		const tryRead = async (name: string, fn: () => Promise<void>) => {
			try {
				await fn();
			} catch (e) {
				const cause = (e as any)?.cause;
				errors.push(name);
				log('err', `read ${name}: ${e}${cause ? ` (cause: ${cause})` : ''}`);
			}
		};
		await tryRead('polling', async () => {
			const raw = await readRaw(ReportId.POLLING_RATE, ReportReadLength.POLLING_RATE);
			rate = handleResponsePollingRate(raw);
			if (takeSnapshot) snapshot.polling = toHex(raw);
		});
		await tryRead('dpi', async () => {
			const raw = await readRaw(ReportId.DPI, ReportReadLength.DPI);
			dpi = handleResponseDpi(raw);
			if (takeSnapshot) snapshot.dpi = toHex(raw);
		});
		await tryRead('lighting', async () => {
			const raw = await readRaw(ReportId.LIGHTING_SETTINGS, ReportReadLength.LIGHTING_SETTINGS);
			lighting = handleResponseLightingSettings(raw);
			if (takeSnapshot) snapshot.lighting = toHex(raw);
		});
		render();
		if (errors.length) toast(`Could not read: ${errors.join(', ')} (see device log)`, 'err');
		else toast('Settings loaded from the mouse');
	});
}

const rgbToHex = (c: RGB) => '#' + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('');
const hexToRgb = (h: string): RGB => ({
	r: parseInt(h.slice(1, 3), 16),
	g: parseInt(h.slice(3, 5), 16),
	b: parseInt(h.slice(5, 7), 16),
});

function render() {
	if (rate !== undefined) {
		const r = document.querySelector<HTMLInputElement>(`input[name=rate][value="${rate}"]`);
		if (r) r.checked = true;
	}
	if (dpi) {
		const tbody = $('stages');
		tbody.innerHTML = '';
		const mask = dpi.getActiveStages();
		const values = dpi.getDpiValues();
		const colors = dpi.getDpiColors();
		for (let i = 0; i < 8; i++) {
			const tr = document.createElement('tr');
			tr.innerHTML = `
				<td>${i + 1}</td>
				<td><input type="checkbox" data-on="${i}" ${mask & (1 << i) ? 'checked' : ''} /></td>
				<td><input type="radio" name="current" value="${i + 1}" ${dpi.getCurrentStage() === i + 1 ? 'checked' : ''} /></td>
				<td><input type="number" data-dpi="${i}" min="50" max="26000" step="50" value="${values[i] || 800}" /></td>
				<td><input type="color" data-color="${i}" value="${rgbToHex(colors[i]!)}" /></td>`;
			tbody.appendChild(tr);
		}
		$<HTMLInputElement>('motionSync').checked = dpi.getMotionSync();
		$<HTMLInputElement>('angleSnap').checked = dpi.getAngleSnap();
		$<HTMLInputElement>('rippleControl').checked = dpi.getRippleControl();
		$<HTMLSelectElement>('liftOff').value = String(dpi.getLiftOffDistance());
	}
	if (lighting) {
		$<HTMLSelectElement>('lightMode').value = String(lighting.lightMode);
		$<HTMLInputElement>('lightColor').value = rgbToHex(lighting.rgb);
		$<HTMLInputElement>('ledSpeed').value = String(lighting.ledSpeed);
		$<HTMLInputElement>('brightness').value = String(lighting.brightnessLevel ?? 8);
		$<HTMLInputElement>('sleepTime').value = String(lighting.sleepTime);
		$<HTMLInputElement>('deepSleep').value = String(lighting.deepSleepTime);
		$<HTMLInputElement>('keyResponse').value = String(lighting.keyResponse);
	}
}

function check(result: CommandConfirmation, what: string) {
	if (result !== CommandConfirmation.Success) throw new Error(`The mouse rejected the ${what} change`);
}

async function applyPolling() {
	const v = document.querySelector<HTMLInputElement>('input[name=rate]:checked')?.value;
	if (!v) return;
	check(await driver!.setPollingRate(new PollingRateBuilder({ rate: Number(v) as Rate })), 'polling rate');
	rate = Number(v) as Rate;
}

async function applyDpi() {
	if (!dpi) throw new Error('DPI settings were not loaded');
	let mask = 0;
	document.querySelectorAll<HTMLInputElement>('input[data-on]').forEach((el) => {
		if (el.checked) mask |= 1 << Number(el.dataset.on);
	});
	if (!mask) throw new Error('Enable at least one DPI stage');
	const current = Number(document.querySelector<HTMLInputElement>('input[name=current]:checked')?.value ?? 1);
	if (!(mask & (1 << (current - 1)))) throw new Error('The active stage must be enabled');
	document.querySelectorAll<HTMLInputElement>('input[data-dpi]').forEach((el) => {
		const value = Math.round(Math.min(26000, Math.max(50, Number(el.value))) / 50) * 50;
		dpi!.setDpiValue((Number(el.dataset.dpi) + 1) as StageIndex, value);
	});
	document.querySelectorAll<HTMLInputElement>('input[data-color]').forEach((el) => {
		dpi!.setRGB((Number(el.dataset.color) + 1) as StageIndex, hexToRgb(el.value));
	});
	dpi.setActiveStages(mask)
		.setCurrentStage(current as StageIndex)
		.setMotionSync($<HTMLInputElement>('motionSync').checked)
		.setAngleSnap($<HTMLInputElement>('angleSnap').checked)
		.setRippleControl($<HTMLInputElement>('rippleControl').checked)
		.setLiftOffDistance(Number($<HTMLSelectElement>('liftOff').value) as 0 | 1 | 2);
	check(await driver!.setDpi(dpi), 'DPI');
}

async function applyLighting() {
	if (!lighting) throw new Error('Lighting settings were not loaded');
	const num = (id: string) => Number($<HTMLInputElement>(id).value);
	const sleep = Math.min(30, Math.max(0.5, Math.round(num('sleepTime') * 2) / 2));
	const deep = Math.min(60, Math.max(1, Math.round(num('deepSleep'))));
	const key = Math.min(50, Math.max(4, Math.round(num('keyResponse') / 2) * 2));
	lighting
		.setLightMode(Number($<HTMLSelectElement>('lightMode').value))
		.setRgb(hexToRgb($<HTMLInputElement>('lightColor').value))
		.setLedSpeed(num('ledSpeed') as any)
		.setBrightnessLevel(num('brightness') as any)
		.setSleep(sleep as any)
		.setDeepSleep(deep as any)
		.setKeyResponse(key as any);
	check(await driver!.setLightingSettings(lighting), 'lighting');
}

const appliers: Record<string, () => Promise<void>> = {
	polling: applyPolling,
	dpi: applyDpi,
	lighting: applyLighting,
};

document.querySelectorAll<HTMLButtonElement>('button[data-apply]').forEach((btn) =>
	btn.addEventListener('click', async () => {
		if (!driver) return;
		btn.disabled = true;
		try {
			await run(appliers[btn.dataset.apply!]!);
			toast('Saved to the mouse ✓');
		} catch (e) {
			log('err', String(e));
			toast(String((e as Error).message ?? e), 'err');
		} finally {
			btn.disabled = false;
		}
	}),
);

$('exportBackup').addEventListener('click', () => {
	if (!Object.keys(snapshot).length) return toast('Nothing to save yet — connect first', 'err');
	const blob = new Blob([JSON.stringify({ device: 'attack-shark-x11', version: 1, reports: snapshot }, null, 2)], {
		type: 'application/json',
	});
	const a = document.createElement('a');
	a.href = URL.createObjectURL(blob);
	a.download = `x11-backup-${new Date().toISOString().slice(0, 10)}.json`;
	a.click();
	URL.revokeObjectURL(a.href);
});

$<HTMLInputElement>('importBackup').addEventListener('change', async (ev) => {
	const file = (ev.target as HTMLInputElement).files?.[0];
	(ev.target as HTMLInputElement).value = '';
	if (!file || !driver) return toast('Connect the mouse first', 'err');
	try {
		const { reports } = JSON.parse(await file.text()) as { reports: Record<string, string> };
		const bytes = (h: string) => Uint8Array.from(h.split(' ').map((x) => parseInt(x, 16)));
		await run(async () => {
			if (reports.polling) check(await driver!.setPollingRate(new PollingRateBuilder({ rate: handleResponsePollingRate(bytes(reports.polling)) })), 'polling rate');
			if (reports.dpi) check(await driver!.setDpi(handleResponseDpi(bytes(reports.dpi))), 'DPI');
			if (reports.lighting) check(await driver!.setLightingSettings(handleResponseLightingSettings(bytes(reports.lighting))), 'lighting');
		});
		toast('Backup restored ✓');
		await readAll();
	} catch (e) {
		log('err', String(e));
		toast(`Restore failed: ${(e as Error).message}`, 'err');
	}
});

$('reload').addEventListener('click', () => readAll());

$('connect').addEventListener('click', async () => {
	if (driver) return disconnect();
	try {
		const device = await requestDevice();
		if (device) await connect(device);
	} catch (e) {
		log('err', String(e));
		toast(String((e as Error).message ?? e), 'err');
		if (/access|permission|open/i.test(String(e))) ($('linux-help') as HTMLDetailsElement).open = true;
	}
});

if (!('hid' in navigator)) {
	$('unsupported').hidden = false;
	$<HTMLButtonElement>('connect').disabled = true;
} else {
	navigator.hid.addEventListener('disconnect', (e) => {
		if (transport && e.device === transport.device) {
			log('info', 'device disconnected');
			disconnect();
		}
	});
	navigator.hid.addEventListener('connect', async (e) => {
		if (!driver && (await findGrantedDevice()) === e.device) connect(e.device).catch((err) => log('err', String(err)));
	});
	findGrantedDevice()
		.then((d) => d && connect(d))
		.catch((e) => log('err', String(e)));
}

(window as any).x11 = { get driver() { return driver; }, readAll, snapshot: () => snapshot };
