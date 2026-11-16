import { LightMode, type Settings } from '../device/codec';

const SHELL = 'M100 20C129 20 149 29 156 48C167 82 174 140 175 192C177 250 146 288 100 288C55 288 25 253 27 202C28 174 40 158 40 139C40 117 33 95 39 66C44 39 71 20 100 20Z';

export function MouseArt({ settings, size = 260 }: { settings?: Settings; size?: number }) {
	const stage = settings ? settings.dpi.stages[settings.dpi.current - 1] : undefined;
	const mode = settings?.lighting.mode ?? LightMode.Static;
	const dpiColor = stage?.color ?? '#3ee6f0';
	const glow = mode === LightMode.Off ? 'transparent' : mode === LightMode.StaticDpi || mode === LightMode.BreathingDpi ? dpiColor : (settings?.lighting.color ?? '#3ee6f0');
	const anim = mode === LightMode.Breathing || mode === LightMode.BreathingDpi ? 'breathe' : mode === LightMode.Neon || mode === LightMode.ColorBreathing ? 'neon' : '';
	const speed = settings ? 3.2 - settings.lighting.speed * 0.5 : 2;
	const brightness = settings ? 0.25 + (settings.lighting.brightness / 8) * 0.5 : 0.6;

	return (
		<svg className={`mouse-art ${anim}`} viewBox="0 0 200 310" width={size * 0.65} height={size} role="img" aria-label="Mouse preview" style={{ '--glow': glow, '--speed': `${speed}s`, '--bright': brightness } as React.CSSProperties}>
			<defs>
				<radialGradient id="shell-shade" cx="0.62" cy="0.58" r="0.75">
					<stop offset="0" stopColor="#2b2f38" />
					<stop offset="0.55" stopColor="#16181d" />
					<stop offset="1" stopColor="#08090b" />
				</radialGradient>
				<linearGradient id="hump" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stopColor="#ffffff" stopOpacity="0" />
					<stop offset="0.5" stopColor="#ffffff" stopOpacity="0.07" />
					<stop offset="1" stopColor="#ffffff" stopOpacity="0" />
				</linearGradient>
				<linearGradient id="wheel" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0" stopColor="#1a1c21" />
					<stop offset="0.5" stopColor="#5a5f6b" />
					<stop offset="1" stopColor="#1a1c21" />
				</linearGradient>
				<filter id="under" filterUnits="userSpaceOnUse" x="-20" y="200" width="240" height="140">
					<feGaussianBlur stdDeviation="12" />
				</filter>
				<filter id="led" x="-200%" y="-200%" width="500%" height="500%">
					<feGaussianBlur stdDeviation="2.5" />
				</filter>
			</defs>
			<ellipse cx="100" cy="292" rx="70" ry="10" fill="#000" opacity="0.6" filter="url(#under)" />
			<g className="underglow">
				<ellipse cx="104" cy="282" rx="58" ry="14" fill="var(--glow)" filter="url(#under)" />
			</g>
			<path d={SHELL} fill="url(#shell-shade)" stroke="#2c303a" strokeWidth="1.5" />
			<path d="M120 135C150 150 162 200 150 250" fill="none" stroke="url(#hump)" strokeWidth="26" strokeLinecap="round" />
			<path d="M100 20V112M41 108C70 120 132 121 160 104" fill="none" stroke="#050506" strokeWidth="2" strokeLinecap="round" />
			<rect x="91" y="46" width="18" height="36" rx="9" fill="#0b0c0f" />
			<rect x="93.5" y="49" width="13" height="30" rx="6.5" fill="url(#wheel)" />
			<path d="M95 55h10M95 60h10M95 65h10M95 70h10M95 75h10" stroke="#0b0c0f" strokeWidth="1.2" opacity="0.7" />
			<path d="M37 98c-3 11-3 20-2 27M36 133c-1 9 0 18 2 26" fill="none" stroke="#3a3f4a" strokeWidth="5" strokeLinecap="round" />
			<rect x="95" y="122" width="10" height="3.2" rx="1.6" fill={dpiColor} filter="url(#led)" opacity="0.9" />
			<rect className="dpi-led" x="95" y="122" width="10" height="3.2" rx="1.6" fill={dpiColor} />
		</svg>
	);
}
