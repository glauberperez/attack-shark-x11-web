import { useRef, useState } from 'react';
import { device } from '../device/useDevice';
import { setPrefs, usePrefs, type Preset } from '../store';
import { useI18n } from '../i18n';
import { Panel } from '../components/ui';
import { toast } from '../components/Toast';
import { useApply } from './useApply';

function download(name: string, text: string) {
	const a = document.createElement('a');
	a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
	a.download = name;
	a.click();
	setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'preset';

export function PresetsPanel({ deviceBusy }: { deviceBusy: boolean }) {
	const { t, lang } = useI18n();
	const prefs = usePrefs();
	const [name, setName] = useState('');
	const [renaming, setRenaming] = useState<string | null>(null);
	const file = useRef<HTMLInputElement>(null);
	const { busy, run } = useApply();

	const create = () => {
		const reports = device.currentReports();
		if (!reports) return;
		const p: Preset = { id: crypto.randomUUID(), name: name.trim() || `${t('presets.preset')} ${prefs.presets.length + 1}`, created: Date.now(), reports };
		setPrefs((s) => ({ presets: [...s.presets, p] }));
		setName('');
		toast(t('presets.created'));
	};

	const overwrite = (p: Preset) => {
		const reports = device.currentReports();
		if (!reports) return;
		setPrefs((s) => ({ presets: s.presets.map((x) => (x.id === p.id ? { ...x, reports, created: Date.now() } : x)) }));
		toast(t('presets.updated'));
	};

	return (
		<>
			<Panel title={t('presets.title')} hint={t('presets.hint')}>
				<div className="preset-create">
					<input type="text" placeholder={t('presets.namePlaceholder')} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
					<button className="primary" onClick={create}>
						{t('presets.create')}
					</button>
				</div>
			</Panel>
			<Panel
				title={t('presets.saved')}
				aside={
					<button className="ghost small" onClick={() => file.current?.click()}>
						{t('presets.import')}
					</button>
				}
			>
				{prefs.presets.length === 0 && <p className="hint">{t('presets.none')}</p>}
				<div className="preset-list">
					{prefs.presets.map((p) => (
						<div key={p.id} className="preset-row">
							{renaming === p.id ? (
								<input
									type="text"
									defaultValue={p.name}
									autoFocus
									maxLength={40}
									onBlur={(e) => {
										const v = e.target.value.trim();
										if (v) setPrefs((s) => ({ presets: s.presets.map((x) => (x.id === p.id ? { ...x, name: v } : x)) }));
										setRenaming(null);
									}}
									onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
								/>
							) : (
								<div className="preset-name">
									<strong>{p.name}</strong>
									<small>{new Date(p.created).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en')}</small>
								</div>
							)}
							<div className="preset-actions">
								<button className="primary small" disabled={busy || deviceBusy} onClick={() => run(() => device.applyReports(p.reports), 'presets.applied')}>
									{t('presets.apply')}
								</button>
								<button className="small" onClick={() => overwrite(p)}>
									{t('presets.save')}
								</button>
								<button className="small ghost" onClick={() => setRenaming(p.id)}>
									{t('presets.rename')}
								</button>
								<button className="small ghost" onClick={() => download(`x11-${slug(p.name)}.json`, JSON.stringify({ device: 'attack-shark-x11', version: 2, name: p.name, reports: p.reports }, null, 2))}>
									{t('presets.export')}
								</button>
								<button className="small ghost danger" onClick={() => setPrefs((s) => ({ presets: s.presets.filter((x) => x.id !== p.id) }))}>
									{t('presets.delete')}
								</button>
							</div>
						</div>
					))}
				</div>
				<input
					ref={file}
					type="file"
					accept="application/json,.json"
					hidden
					onChange={async (e) => {
						const f = e.target.files?.[0];
						e.target.value = '';
						if (!f) return;
						try {
							const j = JSON.parse(await f.text()) as { device?: string; name?: string; reports?: Record<string, string> };
							if (j.device !== 'attack-shark-x11' || !j.reports) throw new Error('invalidBackup');
							const p: Preset = { id: crypto.randomUUID(), name: j.name ?? f.name.replace(/\.json$/, ''), created: Date.now(), reports: j.reports };
							setPrefs((s) => ({ presets: [...s.presets, p] }));
							toast(t('presets.imported'));
						} catch {
							toast(t('err.invalidBackup'), 'err');
						}
					}}
				/>
			</Panel>
		</>
	);
}
