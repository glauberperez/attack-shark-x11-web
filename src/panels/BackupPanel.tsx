import { useRef } from 'react';
import { device } from '../device/useDevice';
import { useI18n } from '../i18n';
import { Panel } from '../components/ui';
import { useApply } from './useApply';

export function BackupPanel({ deviceBusy }: { deviceBusy: boolean }) {
	const { t } = useI18n();
	const file = useRef<HTMLInputElement>(null);
	const { busy, run } = useApply();

	const save = () => {
		const json = device.exportBackup();
		if (!json) return;
		const a = document.createElement('a');
		a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
		a.download = `x11-backup-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		setTimeout(() => URL.revokeObjectURL(a.href), 1000);
	};

	return (
		<Panel title={t('backup.title')} hint={t('backup.body')}>
			<div className="backup-actions">
				<button className="primary" onClick={save}>
					{t('backup.save')}
				</button>
				<button disabled={busy || deviceBusy} onClick={() => file.current?.click()}>
					{busy ? t('backup.restoring') : t('backup.restore')}
				</button>
				<button className="ghost" disabled={busy || deviceBusy} onClick={() => void device.reload()}>
					{t('backup.reload')}
				</button>
				<input
					ref={file}
					type="file"
					accept="application/json,.json"
					hidden
					onChange={async (e) => {
						const f = e.target.files?.[0];
						e.target.value = '';
						if (f) await run(async () => device.restoreBackup(await f.text()), 'backup.restored');
					}}
				/>
			</div>
		</Panel>
	);
}
