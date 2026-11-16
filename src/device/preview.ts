import { useEffect, useSyncExternalStore } from 'react';
import type { DpiSettings, LightingSettings } from './codec';

export interface Preview {
	lighting?: Partial<LightingSettings>;
	dpi?: DpiSettings;
}

let state: Preview = {};
const listeners = new Set<() => void>();

function set(patch: Preview) {
	state = { ...state, ...patch };
	listeners.forEach((l) => l());
}

export function usePreview(): Preview {
	return useSyncExternalStore(
		(fn) => {
			listeners.add(fn);
			return () => listeners.delete(fn);
		},
		() => state,
	);
}

export function usePublishPreview<K extends keyof Preview>(key: K, value: Preview[K]) {
	useEffect(() => {
		set({ [key]: value } as Preview);
	}, [key, value]);
	useEffect(() => () => set({ [key]: undefined } as Preview), [key]);
}
