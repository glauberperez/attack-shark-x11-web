import { useMemo } from 'react';
import { POLLING_RATES, type PollingRate, type Settings } from '../device/codec';
import { device } from '../device/useDevice';
import { useI18n } from '../i18n';
import { ApplyBar, Panel, Segmented, Slider, useDraft } from '../components/ui';
import { useApply } from './useApply';

export function PerformancePanel({ settings, deviceBusy }: { settings: Settings; deviceBusy: boolean }) {
	const { t } = useI18n();
	const source = useMemo(() => ({ polling: settings.polling, debounce: settings.lighting.debounce }), [settings.polling, settings.lighting]);
	const { draft, setDraft, dirty, reset } = useDraft(source);
	const { busy, run } = useApply();
	if (!draft) return null;

	const apply = () =>
		run(async () => {
			if (draft.polling !== source.polling) await device.applyPolling(draft.polling);
			if (draft.debounce !== source.debounce) await device.applyLighting({ ...settings.lighting, debounce: draft.debounce });
		});

	return (
		<>
			<Panel title={t('perf.polling')} hint={t('perf.pollingHint')}>
				<Segmented<PollingRate> label={t('perf.polling')} value={draft.polling} options={POLLING_RATES.map((r) => ({ value: r, label: `${r} ${t('unit.hz')}` }))} onChange={(polling) => setDraft({ ...draft, polling })} />
			</Panel>
			<Panel title={t('perf.debounce')} hint={t('perf.debounceHint')}>
				<Slider label={t('perf.debounce')} value={draft.debounce} min={4} max={50} step={2} unit={t('unit.ms')} onChange={(debounce) => setDraft({ ...draft, debounce })} />
			</Panel>
			<ApplyBar dirty={dirty} busy={busy || deviceBusy} onApply={apply} onReset={reset} draftKey={JSON.stringify(draft)} />
		</>
	);
}
