import { Buffer } from 'buffer';

const g = globalThis as unknown as { Buffer?: typeof Buffer };
g.Buffer ??= Buffer;
const proto = Uint8Array.prototype as unknown as { toHex?: () => string };
proto.toHex ??= function (this: Uint8Array) {
	return Array.from(this, (x) => x.toString(16).padStart(2, '0')).join('');
};

const [{ StrictMode }, { createRoot }, { App }, { I18nProvider }] = await Promise.all([import('react'), import('react-dom/client'), import('./App'), import('./i18n')]);
await import('./styles.css');

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<I18nProvider>
			<App />
		</I18nProvider>
	</StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		void navigator.serviceWorker.register('./sw.js');
	});
}
