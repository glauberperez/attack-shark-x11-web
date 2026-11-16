import { useMemo } from 'react';
import { LightMode, type LightingSettings } from '../device/codec';
import { device } from '../device/useDevice';
import { useI18n } from '../i18n';
import { ApplyBar, Panel, Slider, useDraft } from '../components/ui';
import { useApply } from './useApply';
import { usePublishPreview } from '../device/preview';

const MODES = [LightMode.Off, LightMode.Static, LightMode.Breathing, LightMode.Neon, LightMode.ColorBreathing, LightMode.StaticDpi, LightMode.BreathingDpi];
const PRESETS = ['#ff2d55', '#ff7a00', '#ffd400', '#00e676', '#00e5ff', '#2f6bff', '#b04dff', '#ffffff'];

export function LightingPanel({ lighting, deviceBusy }: { lighting: LightingSettings; deviceBusy: boolean }) {
	const { t } = useI18n();
	const source = useMemo(() => ({ mode: lighting.mode, color: lighting.color, speed: lighting.speed, brightness: lighting.brightness }), [lighting]);
	const { draft, setDraft, dirty, reset } = useDraft(source);
	const { busy, run } = useApply();
	usePublishPreview('lighting', draft);
	if (!draft) return null;

	const usesColor = draft.mode === LightMode.Static || draft.mode === LightMode.Breathing;
	const animated = draft.mode !== LightMode.Off && draft.mode !== LightMode.Static && draft.mode !== LightMode.StaticDpi;

	return (
		<>
			<Panel title={t('light.effect')}>
				<div className="modes">
					{MODES.map((m) => (
						<button key={m} className={`mode mode-${m} ${draft.mode === m ? 'on' : ''}`} aria-pressed={draft.mode === m} onClick={() => setDraft({ ...draft, mode: m })} style={{ '--c': draft.color } as React.CSSProperties}>
							<span className="mode-dot" />
							{t(`light.mode.${m}`)}
						</button>
					))}
				</div>
			</Panel>
			{usesColor && (
				<Panel title={t('light.color')}>
					<div className="presets">
						{PRESETS.map((c) => (
							<button key={c} className={`preset ${draft.color === c ? 'on' : ''}`} style={{ background: c }} aria-label={c} onClick={() => setDraft({ ...draft, color: c })} />
						))}
						<label className="preset custom" style={{ background: draft.color }}>
							<input type="color" value={draft.color} aria-label={t('light.color')} onChange={(e) => setDraft({ ...draft, color: e.target.value })} />
						</label>
					</div>
				</Panel>
			)}
			{draft.mode !== LightMode.Off && (
				<Panel title={t('light.brightness')}>
					<div className="sliders">
						<Slider label={t('light.brightness')} value={draft.brightness} min={1} max={8} onChange={(brightness) => setDraft({ ...draft, brightness })} />
						{animated && <Slider label={t('light.speed')} value={draft.speed} min={1} max={5} onChange={(speed) => setDraft({ ...draft, speed })} />}
					</div>
				</Panel>
			)}
			<ApplyBar dirty={dirty} busy={busy || deviceBusy} onApply={() => run(() => device.applyLighting({ ...lighting, ...draft }))} onReset={reset} />
		</>
	);
}
