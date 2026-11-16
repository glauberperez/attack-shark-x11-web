import { useState } from 'react';
import { errorKey, useI18n } from '../i18n';
import { toast } from '../components/Toast';

export function useApply() {
	const { t } = useI18n();
	const [busy, setBusy] = useState(false);
	const run = async (fn: () => Promise<unknown>, okKey = 'common.saved') => {
		setBusy(true);
		try {
			await fn();
			toast(t(okKey), 'ok');
		} catch (e) {
			toast(t(errorKey(e)), 'err');
		} finally {
			setBusy(false);
		}
	};
	return { busy, run };
}
