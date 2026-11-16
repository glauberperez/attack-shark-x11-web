import { useSyncExternalStore } from 'react';
import { device, type DeviceState } from './manager';

export function useDevice(): DeviceState {
	return useSyncExternalStore(device.subscribe, device.getState);
}

export { device };
