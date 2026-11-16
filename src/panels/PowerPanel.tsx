import { useMemo } from 'react';
import type { LightingSettings } from '../device/codec';
import { device } from '../device/useDevice';
import type { DeviceState } from '../device/manager';
import { useI18n } from '../i18n';
import { ApplyBar, Panel, Slider, useDraft } from '../components/ui';
import { useApply } from './useApply';

export function PowerPanel({ lighting, battery, deviceBusy }: { lighting: LightingSettings; battery: DeviceState['battery']; deviceBusy: boolean }) {
	const { t } = useI18n();
	const source = useMemo(() => ({ sleep: lighting.sleep, deepSleep: lighting.deepSleep }), [lighting]);
	const { draft, setDraft, dirty, reset } = useDraft(source);
	const { busy, run } = useApply();
	if (!draft) return null;

	return (
		<>
			<Panel title={t('power.battery')}>
				{battery ? (
					<div className="battery-big">
						<div className="battery-shell">
							<div className={`battery-fill ${battery.percent <= 20 ? 'low' : ''}`} style={{ width: `${battery.percent}%` }} />
						</div>
						<strong>{battery.percent}%</strong>
						{battery.charging && <span className="tag">{t('conn.charging')}</span>}
					</div>
				) : (
					<p className="hint">{t('power.batteryUnknown')}</p>
				)}
			</Panel>
			<Panel title={t('power.sleep')} hint={t('power.sleepHint')}>
				<Slider label={t('power.sleep')} value={draft.sleep} min={0.5} max={30} step={0.5} unit={t('unit.min')} onChange={(sleep) => setDraft({ ...draft, sleep })} />
			</Panel>
			<Panel title={t('power.deepSleep')} hint={t('power.deepSleepHint')}>
				<Slider label={t('power.deepSleep')} value={draft.deepSleep} min={1} max={60} unit={t('unit.min')} onChange={(deepSleep) => setDraft({ ...draft, deepSleep })} />
			</Panel>
			<ApplyBar dirty={dirty} busy={busy || deviceBusy} onApply={() => run(() => device.applyLighting({ ...lighting, ...draft }))} onReset={reset} draftKey={JSON.stringify(draft)} />
		</>
	);
}
