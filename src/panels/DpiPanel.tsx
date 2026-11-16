import { DPI_MAX, DPI_MIN, DPI_STEP, snapDpi, validateDpi, type DpiSettings, type DpiStage } from '../device/codec';
import { device } from '../device/useDevice';
import { useI18n } from '../i18n';
import { ApplyBar, ColorInput, Panel, Toggle, useDraft } from '../components/ui';
import { useApply } from './useApply';

export function DpiPanel({ dpi, deviceBusy }: { dpi: DpiSettings; deviceBusy: boolean }) {
	const { t } = useI18n();
	const { draft, setDraft, dirty, reset } = useDraft(dpi);
	const { busy, run } = useApply();
	if (!draft) return null;

	const err = validateDpi(draft);
	const setStage = (i: number, patch: Partial<DpiStage>) => setDraft({ ...draft, stages: draft.stages.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

	return (
		<>
			<Panel title={t('dpi.stages')} hint={t('dpi.stagesHint')}>
				<div className="stages">
					{draft.stages.map((s, i) => {
						const active = draft.current === i + 1;
						return (
							<div key={i} className={`stage ${s.enabled ? '' : 'off'} ${active ? 'active' : ''}`} style={{ '--stage': s.color } as React.CSSProperties}>
								<button className="stage-pick" onClick={() => setDraft({ ...draft, current: i + 1, stages: draft.stages.map((x, j) => (j === i ? { ...x, enabled: true } : x)) })} aria-pressed={active} title={t('dpi.active')}>
									<span className="stage-num">{i + 1}</span>
									{active && <span className="stage-badge">{t('dpi.active')}</span>}
								</button>
								<div className="stage-value">
									<input type="number" min={DPI_MIN} max={DPI_MAX} step={DPI_STEP} value={s.value} aria-label={`${t('dpi.stage')} ${i + 1}`} onChange={(e) => setStage(i, { value: Number(e.target.value) })} onBlur={(e) => setStage(i, { value: snapDpi(Number(e.target.value)) })} />
									<small>DPI</small>
								</div>
								<input className="stage-range" type="range" min={DPI_MIN} max={DPI_MAX} step={DPI_STEP} value={s.value} aria-label={`${t('dpi.stage')} ${i + 1}`} style={{ '--pct': `${((s.value - DPI_MIN) / (DPI_MAX - DPI_MIN)) * 100}%` } as React.CSSProperties} onChange={(e) => setStage(i, { value: Number(e.target.value) })} />
								<div className="stage-foot">
									<ColorInput label={t('dpi.color')} value={s.color} onChange={(color) => setStage(i, { color })} />
									<label className="mini-switch">
										<input type="checkbox" checked={s.enabled} onChange={(e) => setStage(i, { enabled: e.target.checked })} />
										<span>{t('dpi.enabled')}</span>
									</label>
								</div>
							</div>
						);
					})}
				</div>
			</Panel>
			<Panel title={t('dpi.sensor')}>
				<div className="toggles">
					<Toggle label={t('dpi.angleSnap')} hint={t('dpi.angleSnapHint')} checked={draft.angleSnap} onChange={(angleSnap) => setDraft({ ...draft, angleSnap })} />
					<Toggle label={t('dpi.ripple')} hint={t('dpi.rippleHint')} checked={draft.ripple} onChange={(ripple) => setDraft({ ...draft, ripple })} />
				</div>
			</Panel>
			<ApplyBar dirty={dirty} busy={busy || deviceBusy} error={dirty && err ? t(err) : null} onApply={() => run(() => device.applyDpi({ ...draft, stages: draft.stages.map((s) => ({ ...s, value: snapDpi(s.value) })) }))} onReset={reset} />
		</>
	);
}
