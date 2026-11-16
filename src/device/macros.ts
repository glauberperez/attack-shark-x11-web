import { MacroAction, MacroBuilder, MacroType, type ConnectionMode } from 'attack-shark-x11-driver';
import { hexToRgb } from './codec';

export const MACRO_SLOTS = 8;
export const MACRO_BYTES = 100;
export const MACRO_MIN_DELAY = 10;
export const MACRO_MAX_DELAY = 50000;

export type MacroMode = 'loop' | 'untilKey' | 'whileHeld';

export interface MacroStep {
	down: boolean;
	code: number;
	delay: number;
}

export interface MacroDef {
	id: number;
	name: string;
	mode: MacroMode;
	loops: number;
	color: string;
	steps: MacroStep[];
}

const MODE_TO_TYPE: Record<MacroMode, MacroType> = {
	loop: MacroType.FIXED_LOOP,
	untilKey: MacroType.UNTIL_KEY_PRESS,
	whileHeld: MacroType.WHILE_PRESSED,
};

export const snapDelay = (ms: number) => Math.min(MACRO_MAX_DELAY, Math.max(MACRO_MIN_DELAY, Math.floor(ms / 10) * 10));

export const stepBytes = (s: MacroStep) => (snapDelay(s.delay) / 10 > 0x7f ? 4 : 2);

export const macroBytes = (m: MacroDef) => m.steps.reduce((n, s) => n + stepBytes(s), 0);

export function newMacro(id: number, name: string): MacroDef {
	return { id, name, mode: 'loop', loops: 1, color: '#ff2d55', steps: [] };
}

export function validateMacro(m: MacroDef): string | null {
	if (!m.steps.length) return 'macros.errEmpty';
	if (macroBytes(m) > MACRO_BYTES) return 'macros.errTooLong';
	if (new TextEncoder().encode(m.name).length > 20) return 'macros.errName';
	return null;
}

export function encodeMacro(m: MacroDef, mode: ConnectionMode): Uint8Array[] {
	const b = new MacroBuilder({
		id: m.id,
		name: m.name || `Macro ${m.id}`,
		type: MODE_TO_TYPE[m.mode],
		loopTimes: Math.min(255, Math.max(1, Math.round(m.loops))),
		macroGunRGB: hexToRgb(m.color),
		actions: m.steps.map((s) => new MacroAction({ direction: s.down ? 0 : 128, button: s.code, delay: snapDelay(s.delay) })),
	});
	return b.build(mode).map((p) => Uint8Array.from(p));
}

export function macroHeadMatches(read: Uint8Array, firstPage: Uint8Array) {
	for (let i = 3; i < Math.min(read.length, 64); i++) if (read[i] !== firstPage[i + 1]) return false;
	return true;
}

export interface MacroSlotInfo {
	id: number;
	empty: boolean;
	name?: string;
}

export function decodeMacroHead(id: number, read: Uint8Array): MacroSlotInfo {
	if (read[3] === 0xff || read[3] === undefined) return { id, empty: true };
	const nameBytes = read.subarray(8, 28);
	const end = nameBytes.indexOf(0);
	const name = new TextDecoder().decode(end === -1 ? nameBytes : nameBytes.subarray(0, end)).replace(/�/g, '');
	return { id, empty: false, name };
}
