export type ActionGroup = 'mouse' | 'dpi' | 'keyboard' | 'shortcuts' | 'macro' | 'media' | 'browser' | 'system' | 'other';

export interface ActionDef {
	id: number;
	key: string;
	group: ActionGroup;
	mod?: number;
	code?: number;
	experimental?: boolean;
}

export const KEYBOARD_ACTION = 0x11;
export const MACRO_ACTION = 0x12;
export const DISABLED_ACTION = 0x01;

const shortcut = (key: string, mod: number, code: number): ActionDef => ({ id: KEYBOARD_ACTION, key, group: 'shortcuts', mod, code });

export const ACTIONS: ActionDef[] = [
	{ id: 0x02, key: 'leftClick', group: 'mouse' },
	{ id: 0x03, key: 'rightClick', group: 'mouse' },
	{ id: 0x04, key: 'middleClick', group: 'mouse' },
	{ id: 0x05, key: 'back', group: 'mouse' },
	{ id: 0x06, key: 'forward', group: 'mouse' },
	{ id: 0x07, key: 'doubleClick', group: 'mouse' },
	{ id: 0x08, key: 'fire', group: 'mouse' },
	{ id: 0x09, key: 'scrollUp', group: 'mouse' },
	{ id: 0x0a, key: 'scrollDown', group: 'mouse' },
	{ id: 0x0d, key: 'dpiCycle', group: 'dpi' },
	{ id: 0x0e, key: 'dpiUp', group: 'dpi' },
	{ id: 0x0f, key: 'dpiDown', group: 'dpi' },
	{ id: 0x10, key: 'easyAim', group: 'dpi', code: 0x03 },
	{ id: KEYBOARD_ACTION, key: 'keyboard', group: 'keyboard' },
	shortcut('copy', 0x01, 0x06),
	shortcut('cut', 0x01, 0x1b),
	shortcut('paste', 0x01, 0x19),
	shortcut('undo', 0x01, 0x1d),
	shortcut('redo', 0x01, 0x1c),
	shortcut('selectAll', 0x01, 0x04),
	shortcut('find', 0x01, 0x09),
	shortcut('save', 0x01, 0x16),
	shortcut('open', 0x01, 0x12),
	shortcut('newFile', 0x01, 0x11),
	shortcut('print', 0x01, 0x13),
	shortcut('zoomIn', 0x01, 0x2e),
	shortcut('zoomOut', 0x01, 0x2d),
	shortcut('closeWindow', 0x04, 0x3d),
	shortcut('swapWindows', 0x04, 0x2b),
	shortcut('showDesktop', 0x08, 0x07),
	shortcut('runCommand', 0x08, 0x15),
	shortcut('lockPc', 0x08, 0x0f),
	shortcut('screenCapture', 0x0a, 0x16),
	{ id: MACRO_ACTION, key: 'macro', group: 'macro' },
	{ id: 0x15, key: 'mediaPlayer', group: 'media' },
	{ id: 0x18, key: 'playPause', group: 'media' },
	{ id: 0x16, key: 'prevTrack', group: 'media' },
	{ id: 0x17, key: 'nextTrack', group: 'media' },
	{ id: 0x19, key: 'stop', group: 'media' },
	{ id: 0x1a, key: 'mute', group: 'media' },
	{ id: 0x1b, key: 'volUp', group: 'media' },
	{ id: 0x1c, key: 'volDown', group: 'media' },
	{ id: 0x25, key: 'browserHome', group: 'browser' },
	{ id: 0x21, key: 'browserBack', group: 'browser' },
	{ id: 0x20, key: 'browserForward', group: 'browser' },
	{ id: 0x24, key: 'browserRefresh', group: 'browser' },
	{ id: 0x22, key: 'browserStop', group: 'browser' },
	{ id: 0x26, key: 'browserSearch', group: 'browser' },
	{ id: 0x1f, key: 'browserFavorites', group: 'browser' },
	{ id: 0x1e, key: 'email', group: 'system' },
	{ id: 0x1d, key: 'calculator', group: 'system' },
	{ id: 0x23, key: 'myComputer', group: 'system' },
	{ id: 0x14, key: 'startMenu', group: 'system' },
	{ id: 0x28, key: 'pollingCycle', group: 'other' },
	{ id: 0x29, key: 'lightingCycle', group: 'other', code: 0x03 },
	{ id: 0x30, key: 'ledToggle', group: 'other' },
	{ id: 0x2b, key: 'showBattery', group: 'other', experimental: true },
	{ id: DISABLED_ACTION, key: 'disabled', group: 'other' },
];

export const GROUPS: ActionGroup[] = ['mouse', 'dpi', 'keyboard', 'shortcuts', 'macro', 'media', 'browser', 'system', 'other'];

export const actionById = (id: number) => ACTIONS.find((a) => a.id === id && a.group !== 'shortcuts');

export function matchAction(b: { action: number; mod: number; code: number }): number {
	const preset = ACTIONS.findIndex((a) => a.group === 'shortcuts' && a.id === b.action && a.mod === b.mod && a.code === b.code);
	if (preset !== -1) return preset;
	return ACTIONS.findIndex((a) => a.id === b.action && a.group !== 'shortcuts');
}

export function bindingFor(index: number) {
	const a = ACTIONS[index]!;
	if (a.id === MACRO_ACTION) return { action: a.id, mod: 0, code: 1 };
	return { action: a.id, mod: a.mod ?? 0, code: a.code ?? 0 };
}

export const MODIFIERS = [
	{ bit: 0x01, label: 'Ctrl' },
	{ bit: 0x02, label: 'Shift' },
	{ bit: 0x04, label: 'Alt' },
	{ bit: 0x08, label: 'Win' },
];

const KEYS: [string, number, string][] = [];
for (let i = 0; i < 26; i++) KEYS.push([`Key${String.fromCharCode(65 + i)}`, 0x04 + i, String.fromCharCode(65 + i)]);
for (let i = 1; i <= 9; i++) KEYS.push([`Digit${i}`, 0x1e + i - 1, String(i)]);
KEYS.push(['Digit0', 0x27, '0']);
KEYS.push(
	['Enter', 0x28, 'Enter'],
	['Escape', 0x29, 'Esc'],
	['Backspace', 0x2a, 'Backspace'],
	['Tab', 0x2b, 'Tab'],
	['Space', 0x2c, 'Space'],
	['Minus', 0x2d, '-'],
	['Equal', 0x2e, '='],
	['BracketLeft', 0x2f, '['],
	['BracketRight', 0x30, ']'],
	['Backslash', 0x31, '\\'],
	['Semicolon', 0x33, ';'],
	['Quote', 0x34, "'"],
	['Backquote', 0x35, '`'],
	['Comma', 0x36, ','],
	['Period', 0x37, '.'],
	['Slash', 0x38, '/'],
	['CapsLock', 0x39, 'Caps Lock'],
);
for (let i = 1; i <= 12; i++) KEYS.push([`F${i}`, 0x3a + i - 1, `F${i}`]);
KEYS.push(
	['PrintScreen', 0x46, 'Print Screen'],
	['ScrollLock', 0x47, 'Scroll Lock'],
	['Pause', 0x48, 'Pause'],
	['Insert', 0x49, 'Insert'],
	['Home', 0x4a, 'Home'],
	['PageUp', 0x4b, 'Page Up'],
	['Delete', 0x4c, 'Delete'],
	['End', 0x4d, 'End'],
	['PageDown', 0x4e, 'Page Down'],
	['ArrowRight', 0x4f, '→'],
	['ArrowLeft', 0x50, '←'],
	['ArrowDown', 0x51, '↓'],
	['ArrowUp', 0x52, '↑'],
	['NumLock', 0x53, 'Num Lock'],
	['NumpadDivide', 0x54, 'Num /'],
	['NumpadMultiply', 0x55, 'Num *'],
	['NumpadSubtract', 0x56, 'Num -'],
	['NumpadAdd', 0x57, 'Num +'],
	['NumpadEnter', 0x58, 'Num Enter'],
);
for (let i = 1; i <= 9; i++) KEYS.push([`Numpad${i}`, 0x59 + i - 1, `Num ${i}`]);
KEYS.push(['Numpad0', 0x62, 'Num 0'], ['NumpadDecimal', 0x63, 'Num .'], ['IntlBackslash', 0x64, '\\ (ISO)'], ['ContextMenu', 0x65, 'Menu'], ['IntlRo', 0x87, '/ (ABNT)']);
for (let i = 13; i <= 24; i++) KEYS.push([`F${i}`, 0x68 + i - 13, `F${i}`]);
KEYS.push(
	['ControlLeft', 0xe0, 'Left Ctrl'],
	['ShiftLeft', 0xe1, 'Left Shift'],
	['AltLeft', 0xe2, 'Left Alt'],
	['MetaLeft', 0xe3, 'Left Win'],
	['ControlRight', 0xe4, 'Right Ctrl'],
	['ShiftRight', 0xe5, 'Right Shift'],
	['AltRight', 0xe6, 'Right Alt'],
	['MetaRight', 0xe7, 'Right Win'],
);

export const CODE_TO_USAGE = new Map(KEYS.map(([code, usage]) => [code, usage]));
export const USAGE_LABEL = new Map(KEYS.map(([, usage, label]) => [usage, label]));
export const KEY_OPTIONS = KEYS.filter(([, u]) => u < 0xe0).map(([, usage, label]) => ({ usage, label }));

export const MOUSE_CODES = [
	{ code: 0xf1, key: 'leftClick' },
	{ code: 0xf2, key: 'rightClick' },
	{ code: 0xf3, key: 'middleClick' },
	{ code: 0xf4, key: 'back' },
	{ code: 0xf5, key: 'forward' },
];

export const MOUSE_BUTTON_TO_CODE: Record<number, number> = { 0: 0xf1, 2: 0xf2, 1: 0xf3, 3: 0xf4, 4: 0xf5 };

export function keyLabel(usage: number) {
	return USAGE_LABEL.get(usage) ?? `0x${usage.toString(16).padStart(2, '0')}`;
}

export function comboLabel(mod: number, code: number) {
	const parts = MODIFIERS.filter((m) => mod & m.bit).map((m) => m.label);
	if (code) parts.push(keyLabel(code));
	return parts.join(' + ') || '—';
}
