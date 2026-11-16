import { useSyncExternalStore } from 'react';
import type { MacroDef } from './device/macros';

export interface Preset {
	id: string;
	name: string;
	created: number;
	reports: Record<string, string>;
}

export interface AppPrefs {
	autoApply: boolean;
	ledRestore: boolean;
	lowBattery: boolean;
	lowBatteryAt: number;
	macros: MacroDef[];
	presets: Preset[];
}

const KEY = 'x11-prefs-v1';

const DEFAULTS: AppPrefs = {
	autoApply: false,
	ledRestore: false,
	lowBattery: false,
	lowBatteryAt: 20,
	macros: [],
	presets: [],
};

function load(): AppPrefs {
	try {
		const raw = localStorage.getItem(KEY);
		return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AppPrefs>) } : DEFAULTS;
	} catch {
		return DEFAULTS;
	}
}

let state = load();
const listeners = new Set<() => void>();

export function getPrefs() {
	return state;
}

export function setPrefs(patch: Partial<AppPrefs> | ((p: AppPrefs) => Partial<AppPrefs>)) {
	state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
	try {
		localStorage.setItem(KEY, JSON.stringify(state));
	} catch {
		state = { ...state };
	}
	listeners.forEach((l) => l());
}

export function usePrefs() {
	return useSyncExternalStore(
		(fn) => {
			listeners.add(fn);
			return () => listeners.delete(fn);
		},
		() => state,
	);
}
