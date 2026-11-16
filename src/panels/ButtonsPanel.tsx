import { useEffect, useRef, useState } from 'react';
import { BUTTONS, DEFAULT_BUTTONS, validateButtons, type ButtonBinding, type ButtonSettings, type PhysicalButton } from '../device/codec';
import { ACTIONS, CODE_TO_USAGE, DISABLED_ACTION, GROUPS, KEYBOARD_ACTION, KEY_OPTIONS, MACRO_ACTION, MODIFIERS, bindingFor, comboLabel, keyLabel, matchAction } from '../device/actions';
import { MACRO_SLOTS } from '../device/macros';
import { device } from '../device/useDevice';
import { usePrefs } from '../store';
import { useI18n } from '../i18n';
import { ApplyBar, Panel, useDraft } from '../components/ui';
import { useApply } from './useApply';

const MOD_CODES: Record<string, number> = { ControlLeft: 1, ControlRight: 1, ShiftLeft: 2, ShiftRight: 2, AltLeft: 4, AltRight: 4, MetaLeft: 8, MetaRight: 8 };

function KeyCapture({ value, onChange }: { value: ButtonBinding; onChange: (mod: number, code: number) => void }) {
	const { t } = useI18n();
	const [listening, setListening] = useState(false);
	const mods = useRef(0);
	return (
		<button
			className={`key-capture ${listening ? 'listening' : ''}`}
			onClick={() => {
				mods.current = 0;
				setListening(true);
			}}
			onBlur={() => setListening(false)}
			onKeyDown={(e) => {
				if (!listening) return;
				e.preventDefault();
				e.stopPropagation();
				if (MOD_CODES[e.code]) {
					mods.current |= MOD_CODES[e.code]!;
					return;
				}
				const usage = CODE_TO_USAGE.get(e.code);
				if (usage === undefined) return;
				let m = 0;
				if (e.ctrlKey) m |= 1;
				if (e.shiftKey) m |= 2;
				if (e.altKey) m |= 4;
				if (e.metaKey) m |= 8;
				onChange(m || mods.current, usage);
				setListening(false);
			}}
		>
			{listening ? t('buttons.pressKeys') : comboLabel(value.mod, value.code)}
		</button>
	);
}

function BindingEditor({ button, value, onChange }: { button: PhysicalButton; value: ButtonBinding; onChange: (v: ButtonBinding) => void }) {
	const { t } = useI18n();
	const prefs = usePrefs();
	const idx = matchAction(value);
	const isPreset = idx !== -1 && ACTIONS[idx]!.group === 'shortcuts';
	return (
		<div className="binding">
			<label className="binding-label">{t(`btn.${button}`)}</label>
			<select value={idx === -1 ? '' : idx} onChange={(e) => onChange(bindingFor(Number(e.target.value)))}>
				{idx === -1 && <option value="">{`0x${value.action.toString(16)} ${value.mod.toString(16)} ${value.code.toString(16)}`}</option>}
				{GROUPS.map((g) => (
					<optgroup key={g} label={t(`group.${g}`)}>
						{ACTIONS.map((a, i) =>
							a.group === g ? (
								<option key={i} value={i}>
									{t(`act.${a.key}`)}
									{a.experimental ? ` (${t('common.experimental')})` : ''}
								</option>
							) : null,
						)}
					</optgroup>
				))}
			</select>
			{value.action === KEYBOARD_ACTION && !isPreset && (
				<div className="binding-extra">
					<KeyCapture value={value} onChange={(mod, code) => onChange({ ...value, mod, code })} />
					<div className="mods">
						{MODIFIERS.map((m) => (
							<label key={m.bit} className="chip">
								<input type="checkbox" checked={Boolean(value.mod & m.bit)} onChange={(e) => onChange({ ...value, mod: e.target.checked ? value.mod | m.bit : value.mod & ~m.bit })} />
								<span>{m.label}</span>
							</label>
						))}
					</div>
					<select value={value.code} onChange={(e) => onChange({ ...value, code: Number(e.target.value) })} aria-label={t('buttons.key')}>
						<option value={0}>{t('buttons.noKey')}</option>
						{KEY_OPTIONS.map((k) => (
							<option key={k.usage} value={k.usage}>
								{k.label}
							</option>
						))}
					</select>
				</div>
			)}
			{value.action === MACRO_ACTION && (
				<div className="binding-extra">
					<select value={value.code} onChange={(e) => onChange({ ...value, code: Number(e.target.value) })} aria-label={t('nav.macros')}>
						{Array.from({ length: MACRO_SLOTS }, (_, i) => i + 1).map((id) => {
							const m = prefs.macros.find((x) => x.id === id);
							return (
								<option key={id} value={id}>
									{`#${id}${m ? ` · ${m.name}` : ''}`}
								</option>
							);
						})}
					</select>
				</div>
			)}
		</div>
	);
}

function Tester() {
	const { t } = useI18n();
	const [events, setEvents] = useState<string[]>([]);
	const push = (s: string) => setEvents((e) => [s, ...e].slice(0, 8));
	const names = ['left', 'middle', 'right', 'backward', 'forward'];
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const el = document.activeElement;
			if (el && el.classList.contains('tester')) push(`${t('buttons.testKey')}: ${keyLabel(CODE_TO_USAGE.get(e.code) ?? 0)}${e.ctrlKey ? ' +Ctrl' : ''}${e.shiftKey ? ' +Shift' : ''}${e.altKey ? ' +Alt' : ''}`);
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [t]);
	return (
		<Panel title={t('buttons.tester')} hint={t('buttons.testerHint')}>
			<div
				className="tester"
				tabIndex={0}
				onMouseDown={(e) => {
					e.preventDefault();
					(e.currentTarget as HTMLElement).focus();
					push(`${t('buttons.testClick')}: ${t(`btn.${names[e.button] ?? 'left'}`)}`);
				}}
				onAuxClick={(e) => e.preventDefault()}
				onContextMenu={(e) => e.preventDefault()}
				onWheel={(e) => push(t(e.deltaY < 0 ? 'btn.scrollUp' : 'btn.scrollDown'))}
			>
				{events.length ? events.map((ev, i) => <div key={i} className={i === 0 ? 'latest' : ''}>{ev}</div>) : <span className="hint">{t('buttons.testerEmpty')}</span>}
			</div>
		</Panel>
	);
}

export function ButtonsPanel({ buttons, deviceBusy }: { buttons: ButtonSettings; deviceBusy: boolean }) {
	const { t } = useI18n();
	const { draft, setDraft, dirty, reset } = useDraft(buttons);
	const { busy, run } = useApply();
	if (!draft) return null;
	const err = validateButtons(draft);
	return (
		<>
			<Panel
				title={t('buttons.title')}
				hint={t('buttons.hint')}
				aside={
					<button className="ghost small" onClick={() => setDraft({ ...DEFAULT_BUTTONS })}>
						{t('buttons.defaults')}
					</button>
				}
			>
				<div className="bindings">
					{BUTTONS.map((b) => (
						<BindingEditor key={b} button={b} value={draft[b]} onChange={(v) => setDraft({ ...draft, [b]: v })} />
					))}
				</div>
				{BUTTONS.some((b) => draft[b].action === DISABLED_ACTION && (b === 'left' || b === 'right')) && <p className="warn">{t('buttons.warnDisable')}</p>}
			</Panel>
			<ApplyBar dirty={dirty} busy={busy || deviceBusy} error={dirty && err ? t(err) : null} onApply={() => run(() => device.applyButtons(draft))} onReset={reset} manual />
			<Tester />
		</>
	);
}
