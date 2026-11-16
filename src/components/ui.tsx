import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '../i18n';
import { usePrefs } from '../store';

export function Panel({ title, hint, children, aside }: { title: string; hint?: string; children: ReactNode; aside?: ReactNode }) {
	return (
		<section className="panel">
			<header className="panel-head">
				<div>
					<h2>{title}</h2>
					{hint && <p className="hint">{hint}</p>}
				</div>
				{aside}
			</header>
			{children}
		</section>
	);
}

export function ApplyBar({ dirty, busy, onApply, onReset, error, manual, draftKey }: { dirty: boolean; busy: boolean; onApply: () => void; onReset: () => void; error?: string | null; manual?: boolean; draftKey?: string }) {
	const { t } = useI18n();
	const { autoApply } = usePrefs();
	const auto = autoApply && !manual;
	const applyRef = useRef(onApply);
	const attempted = useRef<string | undefined>(undefined);
	applyRef.current = onApply;
	useEffect(() => {
		if (!auto || !dirty || busy || error || draftKey === undefined || attempted.current === draftKey) return;
		const id = setTimeout(() => {
			attempted.current = draftKey;
			applyRef.current();
		}, 600);
		return () => clearTimeout(id);
	}, [auto, dirty, busy, error, draftKey]);
	return (
		<div className={`apply-bar ${dirty ? 'dirty' : ''} ${auto ? 'auto' : ''}`}>
			<span className={`apply-state ${error ? 'err' : ''}`}>{error ?? (dirty ? t(auto ? 'common.autoSaving' : 'common.unsaved') : auto ? t('common.autoOn') : '')}</span>
			<button className="ghost" disabled={!dirty || busy} onClick={onReset}>
				{t('common.reset')}
			</button>
			{!auto && (
				<button className="primary" disabled={!dirty || busy || Boolean(error)} onClick={onApply}>
					{busy ? t('common.applying') : t('common.apply')}
				</button>
			)}
		</div>
	);
}

export function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
	return (
		<div className="segmented" role="radiogroup" aria-label={label}>
			{options.map((o) => (
				<button key={String(o.value)} role="radio" aria-checked={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
					{o.label}
				</button>
			))}
		</div>
	);
}

export function Slider({ label, value, min, max, step = 1, unit, onChange, format }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void; format?: (v: number) => string }) {
	const pct = ((value - min) / (max - min)) * 100;
	return (
		<label className="slider">
			<span className="slider-top">
				<span>{label}</span>
				<output>
					{format ? format(value) : value}
					{unit && <small> {unit}</small>}
				</output>
			</span>
			<input type="range" min={min} max={max} step={step} value={value} style={{ '--pct': `${pct}%` } as React.CSSProperties} onChange={(e) => onChange(Number(e.target.value))} />
		</label>
	);
}

export function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
	return (
		<label className="toggle">
			<span>
				<strong>{label}</strong>
				{hint && <small>{hint}</small>}
			</span>
			<input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
			<i aria-hidden="true" />
		</label>
	);
}

export function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
	return (
		<label className="color-input" title={label}>
			<span className="swatch" style={{ background: value }} />
			<input type="color" value={value} aria-label={label} onChange={(e) => onChange(e.target.value)} />
		</label>
	);
}

export function CopyBlock({ text }: { text: string }) {
	const { t } = useI18n();
	const [copied, setCopied] = useState(false);
	useEffect(() => {
		if (!copied) return;
		const id = setTimeout(() => setCopied(false), 1500);
		return () => clearTimeout(id);
	}, [copied]);
	return (
		<div className="copy-block">
			<pre>
				<code>{text}</code>
			</pre>
			<button
				className="ghost small"
				onClick={() => {
					void navigator.clipboard?.writeText(text).then(() => setCopied(true));
				}}
			>
				{copied ? t('common.copied') : t('common.copy')}
			</button>
		</div>
	);
}

export function useDraft<T>(source: T | undefined) {
	const [draft, setDraft] = useState<T | undefined>(source);
	useEffect(() => setDraft(source), [source]);
	const dirty = source !== undefined && draft !== undefined && JSON.stringify(draft) !== JSON.stringify(source);
	return { draft, setDraft, dirty, reset: () => setDraft(source) };
}
