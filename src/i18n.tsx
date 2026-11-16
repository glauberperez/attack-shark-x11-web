import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const en = {
	'app.title': 'X11 Web Config',
	'app.tagline': 'Unofficial configurator for the Attack Shark X11',
	'app.unofficial': 'Unofficial · not affiliated with Attack Shark',
	'nav.performance': 'Performance',
	'nav.dpi': 'DPI',
	'nav.lighting': 'Lighting',
	'nav.power': 'Power',
	'nav.backup': 'Backup',
	'nav.log': 'Device log',
	'conn.connect': 'Connect mouse',
	'conn.disconnect': 'Disconnect',
	'conn.connecting': 'Connecting…',
	'conn.connected': 'Connected',
	'conn.wired': 'Wired',
	'conn.wireless': '2.4 GHz',
	'conn.charging': 'charging',
	'hero.title': 'Configure your X11 in the browser',
	'hero.body': 'Plug in the 2.4 GHz receiver or the USB cable, click Connect and pick the mouse. Settings are saved to the mouse memory, so they work on any computer.',
	'hero.privacy': 'Everything runs locally. Nothing is uploaded.',
	'hero.unsupported': 'This browser does not support WebHID. Open this page in Chrome, Edge, Brave, Opera or another Chromium-based browser.',
	'hero.insecure': 'WebHID only works on secure pages. Open this site over https:// (or on localhost).',
	'linux.title': 'On Linux? Allow access once',
	'linux.body': 'Linux only lets root open HID devices by default. Run this once, then unplug and replug the receiver:',
	'common.apply': 'Apply',
	'common.applying': 'Saving…',
	'common.saved': 'Saved to the mouse',
	'common.reset': 'Discard changes',
	'common.unsaved': 'Unsaved changes',
	'common.copy': 'Copy',
	'common.copied': 'Copied',
	'perf.polling': 'Polling rate',
	'perf.pollingHint': 'How often the mouse reports its position. Higher is smoother, lower saves battery.',
	'perf.debounce': 'Click debounce',
	'perf.debounceHint': 'Minimum time between clicks. Raise it if you get unwanted double clicks.',
	'dpi.stages': 'DPI stages',
	'dpi.stagesHint': 'The DPI button cycles through the enabled stages. Click a stage to make it active.',
	'dpi.stage': 'Stage',
	'dpi.active': 'Active',
	'dpi.enabled': 'Enabled',
	'dpi.color': 'Indicator color',
	'dpi.sensor': 'Sensor',
	'dpi.angleSnap': 'Angle snapping',
	'dpi.angleSnapHint': 'Straightens small deviations in your movement.',
	'dpi.ripple': 'Ripple control',
	'dpi.rippleHint': 'Smooths sensor jitter at high DPI, adds a little latency.',
	'dpi.errNoStage': 'Enable at least one DPI stage.',
	'dpi.errActiveDisabled': 'The active stage must be enabled.',
	'light.effect': 'Effect',
	'light.color': 'Color',
	'light.speed': 'Speed',
	'light.brightness': 'Brightness',
	'light.mode.0': 'Off',
	'light.mode.1': 'Static',
	'light.mode.2': 'Breathing',
	'light.mode.3': 'Neon',
	'light.mode.4': 'Color breathing',
	'light.mode.5': 'DPI color',
	'light.mode.6': 'DPI breathing',
	'power.sleep': 'Sleep after',
	'power.sleepHint': 'Turns the lighting off and lowers power use when the mouse is idle.',
	'power.deepSleep': 'Deep sleep after',
	'power.deepSleepHint': 'The mouse disconnects to save battery. Click to wake it up.',
	'power.battery': 'Battery',
	'power.batteryUnknown': 'Waiting for the mouse to report its battery…',
	'unit.min': 'min',
	'unit.ms': 'ms',
	'unit.hz': 'Hz',
	'backup.title': 'Backup & restore',
	'backup.body': 'A snapshot of all settings is taken the moment you connect. Save it before experimenting so you can always go back.',
	'backup.save': 'Save backup file',
	'backup.restore': 'Restore from file',
	'backup.restoring': 'Restoring…',
	'backup.restored': 'Backup restored',
	'backup.reload': 'Reload from mouse',
	'backup.snapshot': 'Snapshot taken on connect',
	'log.empty': 'No messages yet.',
	'log.clear': 'Clear',
	'err.writeFailed': 'The mouse did not accept the change. Try again.',
	'err.verifyMismatch': 'The mouse acknowledged, but reading back shows different values.',
	'err.invalidBackup': 'This file is not an X11 backup.',
	'err.notConnected': 'Connect the mouse first.',
	'err.generic': 'Something went wrong. Details are in the device log.',
	'mouse.notSupported': 'Button remapping and macros are not available yet.',
	'footer.credits': 'Protocol research by',
	'footer.source': 'Source code',
};

type Key = keyof typeof en;

const pt: Record<Key, string> = {
	'app.title': 'X11 Web Config',
	'app.tagline': 'Configurador não oficial para o Attack Shark X11',
	'app.unofficial': 'Não oficial · sem vínculo com a Attack Shark',
	'nav.performance': 'Desempenho',
	'nav.dpi': 'DPI',
	'nav.lighting': 'Iluminação',
	'nav.power': 'Energia',
	'nav.backup': 'Backup',
	'nav.log': 'Log do dispositivo',
	'conn.connect': 'Conectar mouse',
	'conn.disconnect': 'Desconectar',
	'conn.connecting': 'Conectando…',
	'conn.connected': 'Conectado',
	'conn.wired': 'Cabo',
	'conn.wireless': '2.4 GHz',
	'conn.charging': 'carregando',
	'hero.title': 'Configure seu X11 pelo navegador',
	'hero.body': 'Conecte o receptor 2.4 GHz ou o cabo USB, clique em Conectar e escolha o mouse. As configurações ficam salvas na memória do mouse e funcionam em qualquer computador.',
	'hero.privacy': 'Tudo roda localmente. Nada é enviado para a internet.',
	'hero.unsupported': 'Este navegador não suporta WebHID. Abra a página no Chrome, Edge, Brave, Opera ou outro navegador baseado em Chromium.',
	'hero.insecure': 'O WebHID só funciona em páginas seguras. Abra este site por https:// (ou em localhost).',
	'linux.title': 'No Linux? Libere o acesso uma vez',
	'linux.body': 'Por padrão o Linux só deixa o root abrir dispositivos HID. Rode isto uma vez e depois desconecte e reconecte o receptor:',
	'common.apply': 'Aplicar',
	'common.applying': 'Salvando…',
	'common.saved': 'Salvo no mouse',
	'common.reset': 'Descartar alterações',
	'common.unsaved': 'Alterações não salvas',
	'common.copy': 'Copiar',
	'common.copied': 'Copiado',
	'perf.polling': 'Polling rate',
	'perf.pollingHint': 'Quantas vezes por segundo o mouse informa a posição. Mais alto é mais suave, mais baixo economiza bateria.',
	'perf.debounce': 'Debounce do clique',
	'perf.debounceHint': 'Tempo mínimo entre cliques. Aumente se aparecerem cliques duplos indesejados.',
	'dpi.stages': 'Estágios de DPI',
	'dpi.stagesHint': 'O botão de DPI alterna entre os estágios ativados. Clique num estágio para torná-lo o atual.',
	'dpi.stage': 'Estágio',
	'dpi.active': 'Atual',
	'dpi.enabled': 'Ativado',
	'dpi.color': 'Cor do indicador',
	'dpi.sensor': 'Sensor',
	'dpi.angleSnap': 'Angle snapping',
	'dpi.angleSnapHint': 'Corrige pequenos desvios para deixar o movimento mais reto.',
	'dpi.ripple': 'Ripple control',
	'dpi.rippleHint': 'Suaviza o tremor do sensor em DPI alto, com um pouco mais de latência.',
	'dpi.errNoStage': 'Ative pelo menos um estágio de DPI.',
	'dpi.errActiveDisabled': 'O estágio atual precisa estar ativado.',
	'light.effect': 'Efeito',
	'light.color': 'Cor',
	'light.speed': 'Velocidade',
	'light.brightness': 'Brilho',
	'light.mode.0': 'Desligado',
	'light.mode.1': 'Estático',
	'light.mode.2': 'Respiração',
	'light.mode.3': 'Neon',
	'light.mode.4': 'Respiração colorida',
	'light.mode.5': 'Cor do DPI',
	'light.mode.6': 'Respiração do DPI',
	'power.sleep': 'Dormir após',
	'power.sleepHint': 'Apaga a iluminação e reduz o consumo quando o mouse fica parado.',
	'power.deepSleep': 'Sono profundo após',
	'power.deepSleepHint': 'O mouse desconecta para economizar bateria. Clique para acordar.',
	'power.battery': 'Bateria',
	'power.batteryUnknown': 'Aguardando o mouse informar a bateria…',
	'unit.min': 'min',
	'unit.ms': 'ms',
	'unit.hz': 'Hz',
	'backup.title': 'Backup e restauração',
	'backup.body': 'Uma cópia de todas as configurações é feita no momento em que você conecta. Salve antes de experimentar para sempre poder voltar.',
	'backup.save': 'Salvar arquivo de backup',
	'backup.restore': 'Restaurar de arquivo',
	'backup.restoring': 'Restaurando…',
	'backup.restored': 'Backup restaurado',
	'backup.reload': 'Recarregar do mouse',
	'backup.snapshot': 'Cópia feita ao conectar',
	'log.empty': 'Nenhuma mensagem ainda.',
	'log.clear': 'Limpar',
	'err.writeFailed': 'O mouse não aceitou a alteração. Tente de novo.',
	'err.verifyMismatch': 'O mouse confirmou, mas a leitura mostra valores diferentes.',
	'err.invalidBackup': 'Este arquivo não é um backup do X11.',
	'err.notConnected': 'Conecte o mouse primeiro.',
	'err.generic': 'Algo deu errado. Os detalhes estão no log do dispositivo.',
	'mouse.notSupported': 'Remapear botões e macros ainda não está disponível.',
	'footer.credits': 'Pesquisa do protocolo por',
	'footer.source': 'Código-fonte',
};

export type Lang = 'en' | 'pt';
const dicts: Record<Lang, Record<Key, string>> = { en, pt };

function detect(): Lang {
	try {
		const saved = localStorage.getItem('lang');
		if (saved === 'en' || saved === 'pt') return saved;
	} catch {
		return navigator.language?.toLowerCase().startsWith('pt') ? 'pt' : 'en';
	}
	return navigator.language?.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

interface I18n {
	lang: Lang;
	setLang: (l: Lang) => void;
	t: (k: string) => string;
}

const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
	const [lang, setLangState] = useState<Lang>(detect);
	useEffect(() => {
		document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
	}, [lang]);
	const value = useMemo<I18n>(
		() => ({
			lang,
			setLang: (l) => {
				setLangState(l);
				try {
					localStorage.setItem('lang', l);
				} catch {
					return;
				}
			},
			t: (k) => dicts[lang][k as Key] ?? en[k as Key] ?? k,
		}),
		[lang],
	);
	return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
	const v = useContext(Ctx);
	if (!v) throw new Error('useI18n outside provider');
	return v;
}

export function errorKey(e: unknown) {
	const m = e instanceof Error ? e.message : String(e);
	if (m in en) return m;
	if (`err.${m}` in en) return `err.${m}`;
	return 'err.generic';
}
