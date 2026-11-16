import { useEffect, useState } from 'react';
import { ConnectionMode, DpiBuilder, LightingSettingsBuilder } from 'attack-shark-x11-driver';
import { DEFAULT_BUTTONS, decodeDpi, decodeLighting, DpiIndicator } from '../device/codec';
import type { DeviceState } from '../device/manager';
import { device } from '../device/useDevice';
import { setPrefs, usePrefs } from '../store';
import { useI18n } from '../i18n';
import { Panel, Slider, Toggle } from '../components/ui';
import { toast } from '../components/Toast';
import { useApply } from './useApply';

interface InstallEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: string }>;
}

let deferred: InstallEvent | null = null;
const installListeners = new Set<() => void>();
if (typeof window !== 'undefined') {
	window.addEventListener('beforeinstallprompt', (e) => {
		e.preventDefault();
		deferred = e as InstallEvent;
		installListeners.forEach((l) => l());
	});
}

function useInstall() {
	const [, force] = useState(0);
	useEffect(() => {
		const l = () => force((n) => n + 1);
		installListeners.add(l);
		return () => {
			installListeners.delete(l);
		};
	}, []);
	const standalone = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;
	return { canInstall: Boolean(deferred), standalone };
}

function factoryDefaults() {
	const dpi = decodeDpi(new DpiBuilder().build(ConnectionMode.Wireless));
	const lighting = decodeLighting(new LightingSettingsBuilder().build(ConnectionMode.Wireless));
	return { polling: 1000 as const, dpi: { ...dpi, indicator: DpiIndicator.Static }, lighting, buttons: { ...DEFAULT_BUTTONS } };
}

export function SettingsPanel({ s }: { s: DeviceState }) {
	const { t } = useI18n();
	const prefs = usePrefs();
	const { canInstall, standalone } = useInstall();
	const [confirmReset, setConfirmReset] = useState(false);
	const { busy, run } = useApply();
	const notifPerm = typeof Notification !== 'undefined' ? Notification.permission : 'denied';

	return (
		<>
			<Panel title={t('settings.app')}>
				<div className="toggles">
					<Toggle label={t('settings.autoApply')} hint={t('settings.autoApplyHint')} checked={prefs.autoApply} onChange={(autoApply) => setPrefs({ autoApply })} />
					<Toggle label={t('settings.ledRestore')} hint={t('settings.ledRestoreHint')} checked={prefs.ledRestore} onChange={(ledRestore) => setPrefs({ ledRestore })} />
					<Toggle
						label={t('settings.lowBattery')}
						hint={notifPerm === 'denied' ? t('settings.notifDenied') : t('settings.lowBatteryHint')}
						checked={prefs.lowBattery}
						onChange={async (lowBattery) => {
							if (lowBattery && typeof Notification !== 'undefined' && Notification.permission === 'default') {
								const r = await Notification.requestPermission();
								if (r !== 'granted') return toast(t('settings.notifDenied'), 'err');
							}
							setPrefs({ lowBattery });
						}}
					/>
					{prefs.lowBattery && <Slider label={t('settings.lowBatteryAt')} value={prefs.lowBatteryAt} min={10} max={50} step={5} unit="%" onChange={(lowBatteryAt) => setPrefs({ lowBatteryAt })} />}
				</div>
			</Panel>

			<Panel title={t('settings.install')} hint={t('settings.installHint')}>
				{standalone ? (
					<p className="hint">{t('settings.installed')}</p>
				) : (
					<button
						className="primary"
						disabled={!canInstall}
						onClick={async () => {
							if (!deferred) return;
							await deferred.prompt();
							deferred = null;
						}}
					>
						{t('settings.installButton')}
					</button>
				)}
				{!standalone && !canInstall && <p className="hint">{t('settings.installManual')}</p>}
			</Panel>

			<Panel title={t('settings.device')}>
				<dl className="info">
					<dt>{t('settings.model')}</dt>
					<dd>Attack Shark X11</dd>
					<dt>{t('settings.connection')}</dt>
					<dd>{s.mode === 'wired' ? t('conn.wired') : t('conn.wireless')}</dd>
					<dt>{t('settings.firmware')}</dt>
					<dd>{s.info.firmware ?? '—'}</dd>
					<dt>{t('settings.profile')}</dt>
					<dd>{s.info.profile ? `${s.info.profile} / ${s.info.profiles ?? '?'}` : '—'}</dd>
					<dt>{t('power.battery')}</dt>
					<dd>{s.battery ? `${s.battery.percent}%${s.battery.charging ? ` · ${t('conn.charging')}` : ''}` : '—'}</dd>
				</dl>
			</Panel>

			<Panel title={t('settings.danger')} hint={t('settings.factoryHint')}>
				{confirmReset ? (
					<div className="confirm-row">
						<span className="warn">{t('settings.factoryConfirm')}</span>
						<button className="ghost" onClick={() => setConfirmReset(false)}>
							{t('common.cancel')}
						</button>
						<button
							className="danger-btn"
							disabled={busy || s.busy}
							onClick={() =>
								run(async () => {
									const d = factoryDefaults();
									await device.applyPolling(d.polling);
									await device.applyDpi(d.dpi);
									await device.applyLighting(d.lighting);
									await device.applyButtons(d.buttons);
									setConfirmReset(false);
								}, 'settings.factoryDone')
							}
						>
							{busy ? t('common.applying') : t('settings.factoryYes')}
						</button>
					</div>
				) : (
					<button className="danger-btn" onClick={() => setConfirmReset(true)}>
						{t('settings.factory')}
					</button>
				)}
			</Panel>
		</>
	);
}
