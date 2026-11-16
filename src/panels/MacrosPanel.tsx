import { useEffect, useRef, useState } from 'react';
import { BUTTONS, type ButtonSettings, type PhysicalButton } from '../device/codec';
import { CODE_TO_USAGE, KEY_OPTIONS, MACRO_ACTION, MOUSE_BUTTON_TO_CODE, MOUSE_CODES, keyLabel } from '../device/actions';
import { MACRO_BYTES, MACRO_SLOTS, macroBytes, newMacro, snapDelay, validateMacro, type MacroDef, type MacroMode, type MacroStep } from '../device/macros';
import type { MacroSlotInfo } from '../device/macros';
import { device } from '../device/useDevice';
import { setPrefs, usePrefs } from '../store';
import { useI18n } from '../i18n';
import { ColorInput, Panel, Segmented } from '../components/ui';
import { useApply } from './useApply';

const MODES: MacroMode[] = ['loop', 'untilKey', 'whileHeld'];

function stepLabel(code: number, t: (k: string) => string) {
	const m = MOUSE_CODES.find((x) => x.code === code);
	return m ? t(`act.${m.key}`) : keyLabel(code);
}

function Recorder({ onDone }: { onDone: (steps: MacroStep[]) => void }) {
	const { t } = useI18n();
	const [rec, setRec] = useState(false);
	const steps = useRef<MacroStep[]>([]);
	const last = useRef(0);
	const [count, setCount] = useState(0);

	const push = (down: boolean, code: number) => {
		const now = performance.now();
		const prev = steps.current[steps.current.length - 1];
		if (prev) prev.delay = snapDelay(now - last.current);
		last.current = now;
		steps.current.push({ down, code, delay: 10 });
		setCount(steps.current.length);
	};

	const stop = () => {
		setRec(false);
		if (steps.current.length) onDone(steps.current);
	};

	return (
		<div className="recorder">
			{rec ? (
				<div
					className="rec-area"
					tabIndex={0}
					ref={(el) => el?.focus()}
					onKeyDown={(e) => {
						e.preventDefault();
						if (e.repeat) return;
						if (e.code === 'Escape') return stop();
						const u = CODE_TO_USAGE.get(e.code);
						if (u !== undefined) push(true, u);
					}}
					onKeyUp={(e) => {
						e.preventDefault();
						const u = CODE_TO_USAGE.get(e.code);
						if (u !== undefined) push(false, u);
					}}
					onMouseDown={(e) => {
						e.preventDefault();
						const c = MOUSE_BUTTON_TO_CODE[e.button];
						if (c) push(true, c);
					}}
					onMouseUp={(e) => {
						const c = MOUSE_BUTTON_TO_CODE[e.button];
						if (c) push(false, c);
					}}
					onContextMenu={(e) => e.preventDefault()}
				>
					<span className="rec-dot" />
					{t('macros.recording')} · {count}
					<small>{t('macros.recordHint')}</small>
				</div>
			) : null}
			<button
				className={rec ? 'primary' : ''}
				onClick={() => {
					if (rec) return stop();
					steps.current = [];
					last.current = performance.now();
					setCount(0);
					setRec(true);
				}}
			>
				{rec ? t('macros.stop') : t('macros.record')}
			</button>
		</div>
	);
}

function StepRow({ step, onChange, onRemove, onMove }: { step: MacroStep; onChange: (s: MacroStep) => void; onRemove: () => void; onMove: (d: -1 | 1) => void }) {
	const { t } = useI18n();
	return (
		<div className={`step ${step.down ? 'down' : 'up'}`}>
			<button className="small ghost dir" onClick={() => onChange({ ...step, down: !step.down })} title={t(step.down ? 'macros.press' : 'macros.release')}>
				{step.down ? '↓' : '↑'}
			</button>
			<select value={step.code} onChange={(e) => onChange({ ...step, code: Number(e.target.value) })} aria-label={t('buttons.key')}>
				<optgroup label={t('group.mouse')}>
					{MOUSE_CODES.map((m) => (
						<option key={m.code} value={m.code}>
							{t(`act.${m.key}`)}
						</option>
					))}
				</optgroup>
				<optgroup label={t('group.keyboard')}>
					{KEY_OPTIONS.map((k) => (
						<option key={k.usage} value={k.usage}>
							{k.label}
						</option>
					))}
				</optgroup>
			</select>
			<label className="delay">
				<input type="number" min={10} max={50000} step={10} value={step.delay} onChange={(e) => onChange({ ...step, delay: Number(e.target.value) })} onBlur={(e) => onChange({ ...step, delay: snapDelay(Number(e.target.value)) })} />
				<small>ms</small>
			</label>
			<button className="small ghost" onClick={() => onMove(-1)} aria-label="up">
				▲
			</button>
			<button className="small ghost" onClick={() => onMove(1)} aria-label="down">
				▼
			</button>
			<button className="small ghost danger" onClick={onRemove} aria-label={t('macros.remove')}>
				✕
			</button>
		</div>
	);
}

function SlotGrid({ selected, onSelect, slots, macros }: { selected: number; onSelect: (id: number) => void; slots?: MacroSlotInfo[]; macros: MacroDef[] }) {
	const { t } = useI18n();
	return (
		<div className="slot-grid">
			{Array.from({ length: MACRO_SLOTS }, (_, i) => i + 1).map((id) => {
				const local = macros.find((m) => m.id === id);
				const onMouse = slots?.find((s) => s.id === id);
				return (
					<button key={id} className={`slot ${selected === id ? 'on' : ''}`} onClick={() => onSelect(id)}>
						<span className="slot-id">#{id}</span>
						<strong>{local?.name ?? onMouse?.name ?? t('macros.empty')}</strong>
						<small>{onMouse ? (onMouse.empty ? t('macros.notOnMouse') : t('macros.onMouse')) : '…'}</small>
					</button>
				);
			})}
		</div>
	);
}

export function MacrosPanel({ buttons, deviceBusy, slots }: { buttons: ButtonSettings; deviceBusy: boolean; slots?: MacroSlotInfo[] }) {
	const { t } = useI18n();
	const prefs = usePrefs();
	const [selected, setSelected] = useState(1);
	const stored = prefs.macros.find((m) => m.id === selected);
	const [draft, setDraft] = useState<MacroDef>(() => stored ?? newMacro(1, 'Macro 1'));
	const [assignTo, setAssignTo] = useState<PhysicalButton | ''>('');
	const { busy, run } = useApply();

	useEffect(() => {
		if (!slots) void device.readMacroSlots();
	}, [slots]);

	useEffect(() => {
		const s = prefs.macros.find((m) => m.id === selected);
		setDraft(s ?? newMacro(selected, `Macro ${selected}`));
	}, [selected]);

	const bytes = macroBytes(draft);
	const err = validateMacro(draft);
	const setSteps = (steps: MacroStep[]) => setDraft({ ...draft, steps });
	const assigned = BUTTONS.filter((b) => buttons[b].action === MACRO_ACTION && buttons[b].code === draft.id);

	const save = () =>
		run(async () => {
			setPrefs((p) => ({ macros: [...p.macros.filter((m) => m.id !== draft.id), draft].sort((a, b) => a.id - b.id) }));
			await device.writeMacro(draft);
			if (assignTo) await device.applyButtons({ ...buttons, [assignTo]: { action: MACRO_ACTION, mod: 0, code: draft.id } });
			setAssignTo('');
		}, 'macros.saved');

	return (
		<>
			<Panel title={t('macros.slots')} hint={t('macros.slotsHint')}>
				<SlotGrid selected={selected} onSelect={setSelected} slots={slots} macros={prefs.macros} />
			</Panel>
			<Panel
				title={`${t('macros.editor')} #${draft.id}`}
				aside={
					<button
						className="ghost small danger"
						onClick={() => {
							setPrefs((p) => ({ macros: p.macros.filter((m) => m.id !== draft.id) }));
							setDraft(newMacro(draft.id, `Macro ${draft.id}`));
						}}
					>
						{t('macros.clear')}
					</button>
				}
			>
				<div className="macro-meta">
					<label>
						{t('macros.name')}
						<input type="text" maxLength={20} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
					</label>
					<label>
						{t('macros.color')}
						<ColorInput label={t('macros.color')} value={draft.color} onChange={(color) => setDraft({ ...draft, color })} />
					</label>
				</div>
				<Segmented<MacroMode> label={t('macros.mode')} value={draft.mode} options={MODES.map((m) => ({ value: m, label: t(`macros.mode.${m}`) }))} onChange={(mode) => setDraft({ ...draft, mode })} />
				<p className="hint">{t(`macros.modeHint.${draft.mode}`)}</p>
				{draft.mode === 'loop' && (
					<label className="inline">
						{t('macros.loops')}
						<input type="number" min={1} max={255} value={draft.loops} onChange={(e) => setDraft({ ...draft, loops: Number(e.target.value) })} />
					</label>
				)}

				<div className="budget">
					<div className="budget-bar">
						<div className={bytes > MACRO_BYTES ? 'over' : ''} style={{ width: `${Math.min(100, (bytes / MACRO_BYTES) * 100)}%` }} />
					</div>
					<small>
						{bytes}/{MACRO_BYTES} bytes · {draft.steps.length} {t('macros.steps')}
					</small>
				</div>

				<div className="steps">
					{draft.steps.length === 0 && <p className="hint">{t('macros.noSteps')}</p>}
					{draft.steps.map((s, i) => (
						<StepRow
							key={i}
							step={s}
							onChange={(ns) => setSteps(draft.steps.map((x, j) => (j === i ? ns : x)))}
							onRemove={() => setSteps(draft.steps.filter((_, j) => j !== i))}
							onMove={(d) => {
								const j = i + d;
								if (j < 0 || j >= draft.steps.length) return;
								const next = [...draft.steps];
								[next[i], next[j]] = [next[j]!, next[i]!];
								setSteps(next);
							}}
						/>
					))}
				</div>
				<div className="macro-tools">
					<Recorder onDone={(steps) => setSteps([...draft.steps, ...steps])} />
					<button onClick={() => setSteps([...draft.steps, { down: true, code: 0x04, delay: 30 }, { down: false, code: 0x04, delay: 30 }])}>{t('macros.addKey')}</button>
					<button onClick={() => setSteps([...draft.steps, { down: true, code: 0xf1, delay: 30 }, { down: false, code: 0xf1, delay: 30 }])}>{t('macros.addClick')}</button>
				</div>
			</Panel>
			<Panel title={t('macros.saveTitle')} hint={assigned.length ? `${t('macros.assignedTo')}: ${assigned.map((b) => t(`btn.${b}`)).join(', ')}` : t('macros.notAssigned')}>
				<div className="macro-save">
					<label>
						{t('macros.assign')}
						<select value={assignTo} onChange={(e) => setAssignTo(e.target.value as PhysicalButton | '')}>
							<option value="">{t('macros.dontAssign')}</option>
							{BUTTONS.filter((b) => b !== 'left').map((b) => (
								<option key={b} value={b}>
									{t(`btn.${b}`)}
								</option>
							))}
						</select>
					</label>
					<span className={`apply-state ${err ? 'err' : ''}`}>{err ? t(err) : ''}</span>
					<button className="primary" disabled={Boolean(err) || busy || deviceBusy} onClick={save}>
						{busy ? t('common.applying') : t('macros.save')}
					</button>
				</div>
			</Panel>
		</>
	);
}
