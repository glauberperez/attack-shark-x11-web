import { useId } from 'react';
import { LightMode, type Settings } from '../device/codec';

const BODY =
	'M210 42C226 42 238 31 260 29C288 27 310 36 320 54C331 84 335 150 337 228C340 330 345 420 332 482C315 545 264 572 210 572C156 572 105 545 88 482C75 420 80 330 83 228C85 150 89 84 100 54C110 36 132 27 160 29C182 31 194 42 210 42Z';
const VB = { x: 50, y: 12, w: 320, h: 600 };
const LED_OFF = '#1b1e23';

function ledState(settings?: Settings) {
	if (!settings) return { color: '#2ee6f2', anim: '' };
	const { mode, color } = settings.lighting;
	const dpi = settings.dpi.stages[settings.dpi.current - 1]?.color ?? color;
	switch (mode) {
		case LightMode.Off:
			return { color: LED_OFF, anim: 'off' };
		case LightMode.Breathing:
			return { color, anim: 'breathe' };
		case LightMode.Neon:
			return { color: '#ff2d55', anim: 'neon' };
		case LightMode.ColorBreathing:
			return { color: '#ff2d55', anim: 'neon breathe' };
		case LightMode.StaticDpi:
			return { color: dpi, anim: '' };
		case LightMode.BreathingDpi:
			return { color: dpi, anim: 'breathe' };
		default:
			return { color, anim: '' };
	}
}

export function MouseArt({ settings, size = 260 }: { settings?: Settings; size?: number }) {
	const uid = useId().replace(/:/g, '');
	const id = (n: string) => `${n}-${uid}`;
	const url = (n: string) => `url(#${id(n)})`;

	const led = ledState(settings);
	const speed = settings ? 3.2 - settings.lighting.speed * 0.5 : 2;
	const brightness = settings ? 0.35 + (settings.lighting.brightness / 8) * 0.65 : 1;

	return (
		<svg className="mouse-art" viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} width={(size * VB.w) / VB.h} height={size} role="img" aria-label="Mouse preview">
			<defs>
				<radialGradient id={id('palm')} cx="210" cy="330" r="210" gradientUnits="userSpaceOnUse">
					<stop offset="0" stopColor="#2c2e33" />
					<stop offset="0.45" stopColor="#1a1b1f" />
					<stop offset="1" stopColor="#0c0d10" />
				</radialGradient>
				<linearGradient id={id('buttons')} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#1d1e22" />
					<stop offset="1" stopColor="#141518" />
				</linearGradient>
				<linearGradient id={id('rim')} x1="0" y1="0" x2="1" y2="0">
					<stop offset="0" stopColor="#3a3d44" stopOpacity="0.9" />
					<stop offset="0.12" stopColor="#3a3d44" stopOpacity="0" />
					<stop offset="0.88" stopColor="#3a3d44" stopOpacity="0" />
					<stop offset="1" stopColor="#3a3d44" stopOpacity="0.6" />
				</linearGradient>
				<linearGradient id={id('chrome')} x1="0" y1="0" x2="1" y2="0">
					<stop offset="0" stopColor="#f2f3f5" />
					<stop offset="0.18" stopColor="#8d9198" />
					<stop offset="0.5" stopColor="#202226" />
					<stop offset="0.82" stopColor="#8d9198" />
					<stop offset="1" stopColor="#f2f3f5" />
				</linearGradient>
				<linearGradient id={id('side')} x1="0" y1="0" x2="1" y2="0">
					<stop offset="0" stopColor="#5a5e66" />
					<stop offset="0.5" stopColor="#2a2c31" />
					<stop offset="1" stopColor="#15161a" />
				</linearGradient>
				<filter id={id('floor')} filterUnits="userSpaceOnUse" x="0" y="420" width="420" height="240">
					<feGaussianBlur stdDeviation="24" />
				</filter>
				<filter id={id('glow')} filterUnits="userSpaceOnUse" x="170" y="215" width="80" height="45">
					<feGaussianBlur stdDeviation="5" />
				</filter>
				<clipPath id={id('body')}>
					<path d={BODY} />
				</clipPath>
			</defs>

			<ellipse cx="210" cy="562" rx="150" ry="34" fill="#c9ced8" opacity="0.22" filter={url('floor')} />

			<path d={BODY} fill={url('palm')} />

			<g clipPath={url('body')}>
				<path d="M60 20H360V220C300 226 120 226 60 220Z" fill={url('buttons')} />
				<rect x="60" y="20" width="300" height="580" fill={url('rim')} />
				<path d="M98 58C91 110 89 170 91 219M322 58C329 110 331 170 329 219" fill="none" stroke="#08090b" strokeWidth="2" opacity="0.9" />
				<path d="M100 59C93 110 92 170 93 218M320 59C327 110 328 170 327 218" fill="none" stroke="#33363d" strokeWidth="1" opacity="0.5" />
				<path d="M84 219C150 225 270 225 336 219" fill="none" stroke="#060708" strokeWidth="3" />
				<path d="M86 222C150 228 270 228 334 222" fill="none" stroke="#34373e" strokeWidth="1" opacity="0.45" />
				<path d="M210 132V220" stroke="#060708" strokeWidth="2.5" />
				<path d="M188 42V66M232 42V66" stroke="#060708" strokeWidth="2" />
			</g>

			<path d={BODY} fill="none" stroke="#2b2e35" strokeWidth="1.5" />

			<rect x="186" y="60" width="48" height="76" rx="16" fill="#060708" />
			<rect x="193" y="66" width="34" height="64" rx="12" fill={url('chrome')} />
			<g stroke="#0a0b0d" strokeWidth="1.6" opacity="0.75">
				{Array.from({ length: 11 }, (_, i) => 72 + i * 5).map((y) => (
					<path key={y} d={`M195 ${y}H225`} />
				))}
			</g>
			<rect x="193" y="66" width="34" height="64" rx="12" fill="none" stroke="#000" strokeOpacity="0.6" strokeWidth="1.5" />

			<rect x="72" y="150" width="13" height="64" rx="6.5" fill={url('side')} stroke="#0b0c0e" strokeWidth="1.2" />
			<rect x="70" y="224" width="13" height="78" rx="6.5" fill={url('side')} stroke="#0b0c0e" strokeWidth="1.2" />

			<g className={`led ${led.anim}`} style={{ '--speed': `${speed}s`, '--bright': brightness } as React.CSSProperties}>
				{led.anim !== 'off' && <rect x="192" y="229" width="36" height="12" rx="6" fill={led.color} opacity="0.7" filter={url('glow')} />}
				<rect x="199" y="232.5" width="22" height="5" rx="2.5" fill={led.color} />
				{led.anim !== 'off' && <rect x="202" y="233.5" width="16" height="1.6" rx="0.8" fill="#ffffff" opacity="0.45" />}
			</g>
		</svg>
	);
}
