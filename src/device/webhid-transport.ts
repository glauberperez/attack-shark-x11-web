import type { MouseTransport, ReportId } from 'attack-shark-x11-driver';

export const VENDOR_ID = 0x1d57;
export const PRODUCT_IDS = { wired: 0xfa55, wireless: 0xfa60 } as const;
const COMMAND_USAGE_PAGE = 0x0b;

export const HID_FILTERS: HIDDeviceFilter[] = [
	{ vendorId: VENDOR_ID, productId: PRODUCT_IDS.wireless, usagePage: COMMAND_USAGE_PAGE },
	{ vendorId: VENDOR_ID, productId: PRODUCT_IDS.wired, usagePage: COMMAND_USAGE_PAGE },
];

export type RawLog = (dir: 'tx' | 'rx' | 'in' | 'info' | 'err', msg: string) => void;

export const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join(' ');

function isCommandDevice(d: HIDDevice) {
	return (
		d.vendorId === VENDOR_ID &&
		(d.productId === PRODUCT_IDS.wired || d.productId === PRODUCT_IDS.wireless) &&
		d.collections.some((c) => c.usagePage === COMMAND_USAGE_PAGE)
	);
}

export async function findGrantedDevice(): Promise<HIDDevice | undefined> {
	const devices = await navigator.hid.getDevices();
	return devices.find(isCommandDevice);
}

export async function requestDevice(): Promise<HIDDevice | undefined> {
	const devices = await navigator.hid.requestDevice({ filters: HID_FILTERS });
	return devices.find(isCommandDevice) ?? devices[0];
}

export class WebHidTransport implements MouseTransport {
	private listeners: ((data: Uint8Array) => void)[] = [];
	private errorListeners: ((e: Error) => void)[] = [];

	constructor(
		readonly device: HIDDevice,
		private readonly log: RawLog = () => {},
	) {}

	get productId() {
		return this.device.productId;
	}

	async open(): Promise<void> {
		if (!this.device.opened) await this.device.open();
		this.device.addEventListener('inputreport', this.onInputReport);
	}

	async close(): Promise<void> {
		this.device.removeEventListener('inputreport', this.onInputReport);
		this.listeners = [];
		this.errorListeners = [];
		if (this.device.opened) await this.device.close();
	}

	async sendFeatureReport(data: Uint8Array): Promise<number> {
		this.log('tx', toHex(data));
		try {
			await this.device.sendFeatureReport(data[0]!, data.slice(1));
		} catch (e) {
			this.log('err', `sendFeatureReport failed: ${e}`);
			throw e;
		}
		return data.length;
	}

	async getFeatureReport(reportId: ReportId, reportLength: number): Promise<Uint8Array> {
		const view = await this.device.receiveFeatureReport(reportId);
		const raw = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
		this.log('rx', `[${raw.length}B raw] ${toHex(raw)}`);

		if (raw[0] !== reportId) throw new Error(`stale feature report: expected 0x${reportId.toString(16)}, got 0x${raw[0]?.toString(16)}`);
		const framed = raw;
		const out = new Uint8Array(reportLength);
		out.set(framed.subarray(0, reportLength));
		return out;
	}

	onData(listener: (data: Uint8Array) => void): void {
		this.listeners.push(listener);
	}

	onError(listener: (error: Error) => void): void {
		this.errorListeners.push(listener);
	}

	private onInputReport = (e: HIDInputReportEvent) => {
		const body = new Uint8Array(e.data.buffer, e.data.byteOffset, e.data.byteLength);
		const data = concat(new Uint8Array([e.reportId]), body);
		this.log('in', toHex(data));
		for (const l of this.listeners) {
			try {
				l(data);
			} catch (err) {
				for (const el of this.errorListeners) el(err as Error);
			}
		}
	};
}

function concat(a: Uint8Array, b: Uint8Array) {
	const out = new Uint8Array(a.length + b.length);
	out.set(a);
	out.set(b, a.length);
	return out;
}
