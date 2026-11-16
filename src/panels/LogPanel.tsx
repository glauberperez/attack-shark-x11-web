import { device } from '../device/useDevice';
import type { LogEntry } from '../device/manager';
import { useI18n } from '../i18n';
import { Panel } from '../components/ui';

export function LogPanel({ log }: { log: LogEntry[] }) {
	const { t } = useI18n();
	return (
		<Panel
			title={t('nav.log')}
			aside={
				<button className="ghost small" onClick={device.clearLog}>
					{t('log.clear')}
				</button>
			}
		>
			<div className="log" id="log">
				{log.length === 0 && <p className="hint">{t('log.empty')}</p>}
				{log.map((l, i) => (
					<div key={log.length - i} className={`log-line ${l.dir}`}>
						<time>{new Date(l.t).toLocaleTimeString()}</time>
						<b>{l.dir}</b>
						<span>{l.msg}</span>
					</div>
				))}
			</div>
		</Panel>
	);
}
