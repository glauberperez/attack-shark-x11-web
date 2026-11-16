import { useEffect, useState, type ReactNode } from 'react';
import { device, useDevice } from './device/useDevice';
import type { DeviceState } from './device/manager';
import { useI18n, type Lang } from './i18n';
import { MouseArt } from './components/MouseArt';
import { CopyBlock } from './components/ui';
import { Toaster } from './components/Toast';
import { PerformancePanel } from './panels/PerformancePanel';
import { DpiPanel } from './panels/DpiPanel';
import { LightingPanel } from './panels/LightingPanel';
import { PowerPanel } from './panels/PowerPanel';
import { BackupPanel } from './panels/BackupPanel';
import { LogPanel } from './panels/LogPanel';

const UDEV = `echo 'KERNEL=="hidraw*", ATTRS{idVendor}=="1d57", ATTRS{idProduct}=="fa60", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="1d57", ATTRS{idProduct}=="fa55", TAG+="uaccess"' | sudo tee /etc/udev/rules.d/70-attack-shark-x11.rules
sudo udevadm control --reload-rules && sudo udevadm trigger`;

const REPO = 'https://github.com/glauberperez/attack-shark-x11-web';
const UPSTREAM = 'https://github.com/HarukaYamamoto0/attack-shark-x11-driver';

type Tab = 'performance' | 'dpi' | 'lighting' | 'power' | 'backup' | 'log';

const ICONS: Record<Tab, ReactNode> = {
	performance: <path d="M4 14a8 8 0 1 1 16 0M12 14l4-5" />,
	dpi: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0" />,
	lighting: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z" />,
	power: <path d="M3 8h15v8H3zM20 11v2M6 11h6v2H6z" />,
	backup: <path d="M4 7h16v13H4zM8 4h8v3M9 13l3 3 3-3M12 9v7" />,
	log: <path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" />,
};

function Icon({ tab }: { tab: Tab }) {
	return (
		<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
			{ICONS[tab]}
		</svg>
	);
}

function LangSwitch() {
	const { lang, setLang } = useI18n();
	return (
		<div className="lang" role="group" aria-label="Language">
			{(['en', 'pt'] as Lang[]).map((l) => (
				<button key={l} className={lang === l ? 'on' : ''} aria-pressed={lang === l} onClick={() => setLang(l)}>
					{l.toUpperCase()}
				</button>
			))}
		</div>
	);
}

function Battery({ b }: { b: NonNullable<DeviceState['battery']> }) {
	return (
		<span className={`pill battery ${b.percent <= 20 ? 'low' : ''}`} title={`${b.percent}%`}>
			<svg viewBox="0 0 26 12" width="22" height="11" aria-hidden="true">
				<rect x="0.5" y="0.5" width="22" height="11" rx="2.5" fill="none" stroke="currentColor" />
				<rect x="23.5" y="4" width="2" height="4" rx="1" fill="currentColor" />
				<rect x="2" y="2" width={(19 * b.percent) / 100} height="8" rx="1.5" fill="currentColor" />
			</svg>
			{b.percent}%{b.charging && ' ⚡'}
		</span>
	);
}

function TopBar({ s }: { s: DeviceState }) {
	const { t } = useI18n();
	const connected = s.status === 'connected';
	return (
		<header className="topbar">
			<div className="brand">
				<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
					<path d="M12 2c-4.4 0-7 3.4-7 9v4c0 4.4 3 7 7 7s7-2.6 7-7v-4c0-5.6-2.6-9-7-9Z" fill="none" stroke="var(--accent)" strokeWidth="1.8" />
					<path d="M12 2v8M5.2 10h13.6" stroke="var(--accent)" strokeWidth="1.8" />
				</svg>
				<div>
					<strong>{t('app.title')}</strong>
					<small>{t('app.unofficial')}</small>
				</div>
			</div>
			<div className="topbar-right">
				{connected && (
					<span className="pill on">
						<i className="dot" />
						{t('conn.connected')} · {s.mode === 'wired' ? t('conn.wired') : t('conn.wireless')}
					</span>
				)}
				{connected && s.battery && <Battery b={s.battery} />}
				<LangSwitch />
				{connected && (
					<button className="ghost" onClick={() => void device.disconnect()}>
						{t('conn.disconnect')}
					</button>
				)}
			</div>
		</header>
	);
}

function Welcome({ s }: { s: DeviceState }) {
	const { t } = useI18n();
	const blocked = s.status === 'unsupported' || s.status === 'insecure';
	const isLinux = /linux/i.test(navigator.userAgent) && !/android/i.test(navigator.userAgent);
	return (
		<main className="welcome">
			<div className="welcome-art">
				<MouseArt size={300} />
			</div>
			<div className="welcome-body">
				<h1>{t('hero.title')}</h1>
				<p className="lead">{t('hero.body')}</p>
				{blocked ? (
					<div className="alert">{t(s.status === 'insecure' ? 'hero.insecure' : 'hero.unsupported')}</div>
				) : (
					<button className="primary big" disabled={s.status === 'connecting'} onClick={() => void device.connect()}>
						{s.status === 'connecting' ? t('conn.connecting') : t('conn.connect')}
					</button>
				)}
				{s.status === 'error' && s.error && <div className="alert">{s.error}</div>}
				<p className="hint">{t('hero.privacy')}</p>
				<details className="linux" open={isLinux && s.status === 'error'}>
					<summary>{t('linux.title')}</summary>
					<p className="hint">{t('linux.body')}</p>
					<CopyBlock text={UDEV} />
				</details>
			</div>
		</main>
	);
}

function Dashboard({ s }: { s: DeviceState }) {
	const { t } = useI18n();
	const [tab, setTab] = useState<Tab>(() => {
		const h = location.hash.slice(1) as Tab;
		return h in ICONS ? h : 'dpi';
	});
	useEffect(() => {
		history.replaceState(null, '', `#${tab}`);
	}, [tab]);
	useEffect(() => {
		const onHash = () => {
			const h = location.hash.slice(1) as Tab;
			if (h in ICONS) setTab(h);
		};
		window.addEventListener('hashchange', onHash);
		return () => window.removeEventListener('hashchange', onHash);
	}, []);

	const settings = s.settings;
	const stage = settings?.dpi.stages[settings.dpi.current - 1];

	return (
		<div className="dash">
			<nav className="sidebar" aria-label="Sections">
				{(Object.keys(ICONS) as Tab[]).map((k) => (
					<button key={k} className={tab === k ? 'on' : ''} aria-current={tab === k ? 'page' : undefined} onClick={() => setTab(k)}>
						<Icon tab={k} />
						<span>{t(`nav.${k}`)}</span>
					</button>
				))}
			</nav>
			<main className="content">
				{!settings && <div className="loading">{t('conn.connecting')}</div>}
				{settings && tab === 'performance' && <PerformancePanel settings={settings} deviceBusy={s.busy} />}
				{settings && tab === 'dpi' && <DpiPanel dpi={settings.dpi} deviceBusy={s.busy} />}
				{settings && tab === 'lighting' && <LightingPanel lighting={settings.lighting} deviceBusy={s.busy} />}
				{settings && tab === 'power' && <PowerPanel lighting={settings.lighting} battery={s.battery} deviceBusy={s.busy} />}
				{tab === 'backup' && <BackupPanel deviceBusy={s.busy} />}
				{tab === 'log' && <LogPanel log={s.log} />}
			</main>
			<aside className="preview">
				<MouseArt settings={settings} size={280} />
				{settings && stage && (
					<div className="readout">
						<div>
							<small>DPI</small>
							<strong style={{ color: stage.color }}>{stage.value}</strong>
						</div>
						<div>
							<small>{t('perf.polling')}</small>
							<strong>
								{settings.polling}
								<em> Hz</em>
							</strong>
						</div>
					</div>
				)}
				<p className="hint center">{t('mouse.notSupported')}</p>
			</aside>
		</div>
	);
}

export function App() {
	const s = useDevice();
	const { t } = useI18n();
	useEffect(() => device.boot(), []);
	const showDash = s.status === 'connected';
	return (
		<>
			<TopBar s={s} />
			{showDash ? <Dashboard s={s} /> : <Welcome s={s} />}
			<footer className="footer">
				{t('footer.credits')} <a href={UPSTREAM}>attack-shark-x11-driver</a> (MIT) · <a href={REPO}>{t('footer.source')}</a> · {t('app.unofficial')}
			</footer>
			<Toaster />
		</>
	);
}
