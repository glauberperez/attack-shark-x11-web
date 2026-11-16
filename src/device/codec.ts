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

export interface Settings {
	polling: PollingRate;
	dpi: DpiSettings;
	lighting: LightingSettings;
}

export type Section = keyof Settings;

export interface RawReports {
	polling: Uint8Array;
	dpi: Uint8Array;
	lighting: Uint8Array;
}

export const REPORTS: Record<Section, { id: ReportId; length: number }> = {
	polling: { id: ReportId.POLLING_RATE, length: ReportReadLength.POLLING_RATE },
	dpi: { id: ReportId.DPI, length: ReportReadLength.DPI },
	lighting: { id: ReportId.LIGHTING_SETTINGS, length: ReportReadLength.LIGHTING_SETTINGS },
};

export const rgbToHex = (c: RGB) => '#' + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('');

export const hexToRgb = (h: string): RGB => ({
	r: parseInt(h.slice(1, 3), 16),
	g: parseInt(h.slice(3, 5), 16),
	b: parseInt(h.slice(5, 7), 16),
});

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const snapDpi = (v: number) => clamp(Math.round(v / DPI_STEP) * DPI_STEP, DPI_MIN, DPI_MAX);

export function decodePolling(raw: Uint8Array): PollingRate {
	return handleResponsePollingRate(raw) as PollingRate;
}

export function decodeDpi(raw: Uint8Array): DpiSettings {
	const b = handleResponseDpi(raw);
	const mask = b.getActiveStages();
	const values = b.getDpiValues();
	const colors = b.getDpiColors();
	return {
		stages: Array.from({ length: STAGE_COUNT }, (_, i) => ({
			enabled: Boolean(mask & (1 << i)),
			value: clamp(values[i] || 800, DPI_MIN, DPI_MAX),
			color: rgbToHex(colors[i] ?? { r: 255, g: 255, b: 255 }),
		})),
		current: b.getCurrentStage(),
		angleSnap: b.getAngleSnap(),
		ripple: b.getRippleControl(),
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

export function decodeAll(raw: RawReports): Settings {
	return { polling: decodePolling(raw.polling), dpi: decodeDpi(raw.dpi), lighting: decodeLighting(raw.lighting) };
}

export function encodePolling(rate: PollingRate, mode: ConnectionMode): Uint8Array {
	return new PollingRateBuilder({ rate: rate as Rate }).build(mode);
}

function writeDpiChecksum(buf: Uint8Array) {
	let sum = 0;
	for (let i = 3; i <= 49; i++) sum += buf[i] ?? 0;
	buf[50] = (sum >> 8) & 0xff;
	buf[51] = sum & 0xff;
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
	full[49] = base[49]!;
	writeDpiChecksum(full);
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

export function validateDpi(s: DpiSettings): string | null {
	if (!s.stages.some((st) => st.enabled)) return 'dpi.errNoStage';
	if (!s.stages[s.current - 1]?.enabled) return 'dpi.errActiveDisabled';
	return null;
}

export { ConnectionMode };
