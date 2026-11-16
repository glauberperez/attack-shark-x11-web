import {
	ConnectionMode,
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

export type PollingRate = 125 | 250 | 500 | 1000;
export const POLLING_RATES: PollingRate[] = [125, 250, 500, 1000];

export const DPI_MIN = 50;
export const DPI_MAX = 22000;
export const DPI_STEP = 50;
export const STAGE_COUNT = 8;

export enum DpiIndicator {
	Blink = 1,
	Static = 2,
	Off = 3,
}

export interface DpiStage {
	enabled: boolean;
	value: number;
	color: string;
}

export interface DpiSettings {
	stages: DpiStage[];
	current: number;
	angleSnap: boolean;
	ripple: boolean;
	indicator: DpiIndicator;
}

export enum LightMode {
	Off = 0,
	Static = 1,
	Breathing = 2,
	Neon = 3,
	ColorBreathing = 4,
	StaticDpi = 5,
	BreathingDpi = 6,
}

export interface LightingSettings {
	mode: LightMode;
	color: string;
	speed: number;
	brightness: number;
	sleep: number;
	deepSleep: number;
	debounce: number;
}

export type PhysicalButton = 'left' | 'right' | 'middle' | 'dpi' | 'forward' | 'backward' | 'scrollUp' | 'scrollDown';

export const BUTTON_OFFSETS: Record<PhysicalButton, number> = {
	left: 3,
	right: 6,
	middle: 9,
	dpi: 18,
	forward: 21,
	backward: 24,
	scrollUp: 51,
	scrollDown: 54,
};

export const BUTTONS = Object.keys(BUTTON_OFFSETS) as PhysicalButton[];

export interface ButtonBinding {
	action: number;
	mod: number;
	code: number;
}

export type ButtonSettings = Record<PhysicalButton, ButtonBinding>;

export const DEFAULT_BUTTONS: ButtonSettings = {
	left: { action: 0x02, mod: 0, code: 0 },
	right: { action: 0x03, mod: 0, code: 0 },
	middle: { action: 0x04, mod: 0, code: 0 },
	dpi: { action: 0x0d, mod: 0, code: 0 },
	forward: { action: 0x06, mod: 0, code: 0 },
	backward: { action: 0x05, mod: 0, code: 0 },
	scrollUp: { action: 0x09, mod: 0, code: 0 },
	scrollDown: { action: 0x0a, mod: 0, code: 0 },
};

export interface Settings {
	polling: PollingRate;
	dpi: DpiSettings;
	lighting: LightingSettings;
	buttons: ButtonSettings;
}

export type Section = keyof Settings;

export type RawReports = Record<Section, Uint8Array>;

export const REPORTS: Record<Section, { id: ReportId; length: number }> = {
	polling: { id: ReportId.POLLING_RATE, length: ReportReadLength.POLLING_RATE },
	dpi: { id: ReportId.DPI, length: ReportReadLength.DPI },
	lighting: { id: ReportId.LIGHTING_SETTINGS, length: ReportReadLength.LIGHTING_SETTINGS },
	buttons: { id: ReportId.BUTTON_MAPPING, length: ReportReadLength.BUTTON_MAPPING },
};

export const SECTIONS = Object.keys(REPORTS) as Section[];

export const rgbToHex = (c: RGB) => '#' + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('');

export const hexToRgb = (h: string): RGB => ({
	r: parseInt(h.slice(1, 3), 16),
	g: parseInt(h.slice(3, 5), 16),
	b: parseInt(h.slice(5, 7), 16),
});

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const snapDpi = (v: number) => clamp(Math.round(v / DPI_STEP) * DPI_STEP, DPI_MIN, DPI_MAX);

function sum(buf: Uint8Array, from: number, to: number) {
	let s = 0;
	for (let i = from; i <= to; i++) s += buf[i] ?? 0;
	return s;
}

function writeBE16(buf: Uint8Array, at: number, v: number) {
	buf[at] = (v >> 8) & 0xff;
	buf[at + 1] = v & 0xff;
}

export function decodePolling(raw: Uint8Array): PollingRate {
	return handleResponsePollingRate(raw) as PollingRate;
}

export function decodeDpi(raw: Uint8Array): DpiSettings {
	const b = handleResponseDpi(raw);
	const mask = b.getActiveStages();
	const values = b.getDpiValues();
	const colors = b.getDpiColors();
	const ind = raw[49] ?? DpiIndicator.Static;
	return {
		stages: Array.from({ length: STAGE_COUNT }, (_, i) => ({
			enabled: Boolean(mask & (1 << i)),
			value: clamp(values[i] || 800, DPI_MIN, DPI_MAX),
			color: rgbToHex(colors[i] ?? { r: 255, g: 255, b: 255 }),
		})),
		current: b.getCurrentStage(),
		angleSnap: b.getAngleSnap(),
		ripple: b.getRippleControl(),
		indicator: ind >= 1 && ind <= 3 ? ind : DpiIndicator.Static,
	};
}

export function decodeLighting(raw: Uint8Array): LightingSettings {
	const b = handleResponseLightingSettings(raw);
	return {
		mode: b.lightMode as number as LightMode,
		color: rgbToHex(b.rgb),
		speed: b.ledSpeed,
		brightness: b.brightnessLevel ?? 8,
		sleep: b.sleepTime,
		deepSleep: b.deepSleepTime,
		debounce: b.keyResponse,
	};
}

export function decodeButtons(raw: Uint8Array): ButtonSettings {
	if (raw[0] !== 0x08 || raw.length < 59) throw new Error('invalid button report');
	if (sum(raw, 3, 56) !== ((raw[57]! << 8) | raw[58]!)) throw new Error('invalid button report checksum');
	const out = {} as ButtonSettings;
	for (const b of BUTTONS) {
		const o = BUTTON_OFFSETS[b];
		const action = raw[o]!;
		out[b] = action === 0x00 ? { action: 0x01, mod: 0, code: 0 } : { action, mod: raw[o + 1]!, code: raw[o + 2]! };
	}
	return out;
}

export function decodeAll(raw: RawReports): Settings {
	return {
		polling: decodePolling(raw.polling),
		dpi: decodeDpi(raw.dpi),
		lighting: decodeLighting(raw.lighting),
		buttons: decodeButtons(raw.buttons),
	};
}

export function encodePolling(rate: PollingRate, base: Uint8Array, mode: ConnectionMode): Uint8Array {
	const b = new PollingRateBuilder({ rate: rate as Rate });
	b.setProfileId((base[2] || 1) as 1);
	return b.build(mode);
}

export function encodeDpi(s: DpiSettings, base: Uint8Array, mode: ConnectionMode): Uint8Array {
	const b = handleResponseDpi(base);
	let mask = 0;
	s.stages.forEach((st, i) => {
		if (st.enabled) mask |= 1 << i;
		const stage = (i + 1) as StageIndex;
		b.setDpiValue(stage, snapDpi(st.value));
		b.setRGB(stage, hexToRgb(st.color));
	});
	b.setActiveStages(mask).setCurrentStage(s.current as StageIndex).setAngleSnap(s.angleSnap).setRippleControl(s.ripple);
	const built = b.build(mode);
	const full = new Uint8Array(Math.max(built.length, 52));
	full.set(built);
	full[7] = full[6]!;
	full[49] = s.indicator;
	writeBE16(full, 50, sum(full, 3, 49));
	return full.slice(0, built.length);
}

export function encodeLighting(s: LightingSettings, base: Uint8Array, mode: ConnectionMode): Uint8Array {
	const b: LightingSettingsBuilder = handleResponseLightingSettings(base);
	b.setLightMode(s.mode as number)
		.setRgb(hexToRgb(s.color))
		.setLedSpeed(clamp(Math.round(s.speed), 1, 5) as 1)
		.setBrightnessLevel(clamp(Math.round(s.brightness), 1, 8) as 1)
		.setSleep((clamp(Math.round(s.sleep * 2), 1, 60) / 2) as 1)
		.setDeepSleep(clamp(Math.round(s.deepSleep), 1, 60) as 1)
		.setKeyResponse((clamp(Math.round(s.debounce / 2), 2, 25) * 2) as 4);
	return b.build(mode);
}

export function encodeButtons(s: ButtonSettings, base: Uint8Array): Uint8Array {
	const out = new Uint8Array(59);
	out.set(base.subarray(0, 59));
	out[0] = 0x08;
	out[1] = 0x3b;
	out[2] = base[2] || 1;
	for (const b of BUTTONS) {
		const o = BUTTON_OFFSETS[b];
		const v = s[b];
		out[o] = v.action;
		out[o + 1] = v.mod;
		out[o + 2] = v.code;
	}
	writeBE16(out, 57, sum(out, 3, 56));
	return out;
}

export function encodeSection(section: Section, s: Settings, raw: RawReports, mode: ConnectionMode): Uint8Array {
	switch (section) {
		case 'polling':
			return encodePolling(s.polling, raw.polling, mode);
		case 'dpi':
			return encodeDpi(s.dpi, raw.dpi, mode);
		case 'lighting':
			return encodeLighting(s.lighting, raw.lighting, mode);
		case 'buttons':
			return encodeButtons(s.buttons, raw.buttons);
	}
}

export function validateDpi(s: DpiSettings): string | null {
	if (!s.stages.some((st) => st.enabled)) return 'dpi.errNoStage';
	if (!s.stages[s.current - 1]?.enabled) return 'dpi.errActiveDisabled';
	return null;
}

export function validateButtons(s: ButtonSettings): string | null {
	if (!BUTTONS.some((b) => s[b].action === 0x02)) return 'buttons.errNoLeft';
	return null;
}

export { ConnectionMode };
