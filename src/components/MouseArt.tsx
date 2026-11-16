import { LightMode, type Settings } from '../device/codec';

export function MouseArt({ settings, size = 260 }: { settings?: Settings; size?: number }) {
	const stage = settings ? settings.dpi.stages[settings.dpi.current - 1] : undefined;
	const mode = settings?.lighting.mode ?? LightMode.Static;
	const dpiColor = stage?.color ?? '#5b8cff';
	const glow = mode === LightMode.Off ? 'transparent' : mode === LightMode.StaticDpi || mode === LightMode.BreathingDpi ? dpiColor : (settings?.lighting.color ?? '#5b8cff');
	const anim = mode === LightMode.Breathing || mode === LightMode.BreathingDpi ? 'breathe' : mode === LightMode.Neon || mode === LightMode.ColorBreathing ? 'neon' : '';
	const speed = settings ? 3.2 - settings.lighting.speed * 0.5 : 2;
	const brightness = settings ? 0.35 + (settings.lighting.brightness / 8) * 0.65 : 1;

	return (
		<svg className={`mouse-art ${anim}`} viewBox="0 0 200 300" width={size * 0.67} height={size} role="img" aria-label="Mouse preview" style={{ '--glow': glow, '--speed': `${speed}s`, '--bright': brightness } as React.CSSProperties}>
			<defs>
				<linearGradient id="shell" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="var(--mouse-top)" />
					<stop offset="1" stopColor="var(--mouse-bottom)" />
				</linearGradient>
				<filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
					<feGaussianBlur stdDeviation="9" />
				</filter>
			</defs>
			<path className="glow" d="M100 18c-46 0-70 38-70 104v62c0 62 30 100 70 100s70-38 70-100v-62C170 56 146 18 100 18Z" fill="none" stroke="var(--glow)" strokeWidth="10" filter="url(#blur)" />
			<path d="M100 18c-46 0-70 38-70 104v62c0 62 30 100 70 100s70-38 70-100v-62C170 56 146 18 100 18Z" fill="url(#shell)" stroke="var(--mouse-edge)" strokeWidth="2" />
			<path d="M100 18v104M30 122h140" stroke="var(--mouse-edge)" strokeWidth="2" fill="none" />
			<rect x="91" y="44" width="18" height="40" rx="9" fill="var(--mouse-wheel)" stroke="var(--mouse-edge)" strokeWidth="2" />
			<path d="M95 54h10M95 62h10M95 70h10" stroke="var(--mouse-edge)" strokeWidth="2" />
			<circle cx="100" cy="100" r="5" fill={dpiColor} className="dpi-led" />
			<path className="strip" d="M36 210c6 36 30 62 64 66 34-4 58-30 64-66" fill="none" stroke="var(--glow)" strokeWidth="4" strokeLinecap="round" />
		</svg>
	);
}
