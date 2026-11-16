const unsupported = () => {
	throw new Error('node-hid is not available in the browser; use the WebHID transport');
};

export class HIDAsync {
	static open = unsupported;
}
export const devicesAsync = async () => unsupported();
export const devices = unsupported;
export type Device = Record<string, unknown>;
export default { HIDAsync, devicesAsync, devices };
