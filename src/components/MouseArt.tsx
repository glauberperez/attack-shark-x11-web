import { useId } from 'react';
import { LightMode, type Settings } from '../device/codec';

const BODY = 'M260 190 Q263 145 294 119 L365 91 Q384 84 403 91 L474 119 Q505 145 508 190 L536 570 Q546 720 493 810 Q448 885 384 890 Q320 885 275 810 Q222 720 232 570 Z';

export function MouseArt({ settings, size = 260 }: { settings?: Settings; size?: number }) {
	const uid = useId().replace(/:/g, '');
	const id = (n: string) => `${n}-${uid}`;
	const url = (n: string) => `url(#${id(n)})`;

	const stage = settings ? settings.dpi.stages[settings.dpi.current - 1] : undefined;
	const mode = settings?.lighting.mode ?? LightMode.Static;
	const dpiColor = stage?.color ?? '#23e9f2';
	const glow = mode === LightMode.Off ? 'transparent' : mode === LightMode.StaticDpi || mode === LightMode.BreathingDpi ? dpiColor : (settings?.lighting.color ?? '#aeb8c8');
	const anim = mode === LightMode.Breathing || mode === LightMode.BreathingDpi ? 'breathe' : mode === LightMode.Neon || mode === LightMode.ColorBreathing ? 'neon' : '';
	const speed = settings ? 3.2 - settings.lighting.speed * 0.5 : 2;
	const brightness = settings ? 0.15 + (settings.lighting.brightness / 8) * 0.3 : 0.35;

	return (
		<svg className={`mouse-art ${anim}`} viewBox="196 70 376 880" width={size * 0.43} height={size} role="img" aria-label="Mouse preview" style={{ '--glow': glow, '--speed': `${speed}s`, '--bright': brightness } as React.CSSProperties}>
			<defs>
				<linearGradient id={id('shell')} x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stopColor="#25272b" />
					<stop offset=".38" stopColor="#111316" />
					<stop offset=".72" stopColor="#191b1f" />
					<stop offset="1" stopColor="#080a0d" />
				</linearGradient>
				<linearGradient id={id('button')} x1="0" y1="0" x2="0.15" y2="1">
					<stop offset="0" stopColor="#17191d" />
					<stop offset=".55" stopColor="#0d0f12" />
					<stop offset="1" stopColor="#202226" />
				</linearGradient>
				<linearGradient id={id('wheel')} x1="0" y1="0" x2="1" y2="0">
					<stop offset="0" stopColor="#777d84" />
					<stop offset=".22" stopColor="#262b31" />
					<stop offset=".5" stopColor="#535a62" />
					<stop offset=".8" stopColor="#252a30" />
					<stop offset="1" stopColor="#a3a8ad" />
				</linearGradient>
				<linearGradient id={id('side')} x1="0" y1="0" x2="1" y2="0">
					<stop offset="0" stopColor="#090b0e" />
					<stop offset=".5" stopColor="#34383e" />
					<stop offset="1" stopColor="#101216" />
				</linearGradient>
				<filter id={id('blur')} filterUnits="userSpaceOnUse" x="100" y="650" width="568" height="320">
					<feGaussianBlur stdDeviation="22" />
				</filter>
				<filter id={id('glow')} filterUnits="userSpaceOnUse" x="340" y="460" width="88" height="50">
					<feGaussianBlur stdDeviation="7" />
				</filter>
				<clipPath id={id('body')}>
					<path d={BODY} />
				</clipPath>
			</defs>

			<g className="underglow">
				<ellipse cx="384" cy="830" rx="205" ry="80" fill="var(--glow)" filter={url('blur')} />
			</g>

			<path d={BODY} fill={url('shell')} stroke="#30343a" strokeWidth="2.2" />
			<path d="M260 190 Q255 350 250 540 Q240 705 285 790" fill="none" stroke="#454950" strokeOpacity=".42" strokeWidth="3" />
			<path d="M508 190 Q520 390 526 570 Q535 710 486 790" fill="none" stroke="#05070a" strokeOpacity=".8" strokeWidth="5" />

			<g clipPath={url('body')}>
				<path d="M232 442 Q384 453 536 442 L548 900 L220 900 Z" fill="#111317" opacity=".52" />
				<path d="M444 466 Q500 520 507 630 Q514 727 474 806 Q462 829 444 837 Q471 766 466 670 Q462 566 414 486 Z" fill="#33363b" opacity=".35" />
				<path d="M260 190 Q263 145 294 119 L365 91 L368 466 Q314 467 257 451 Z" fill={url('button')} stroke="#080a0d" strokeWidth="2" />
				<path d="M403 91 L474 119 Q505 145 508 190 L511 451 Q455 467 400 466 Z" fill={url('button')} stroke="#080a0d" strokeWidth="2" />
				<path d="M384 91 L384 467" stroke="#05070a" strokeWidth="3" opacity=".9" />
				<path d="M384 92 L384 466" stroke="#45494f" strokeWidth=".7" opacity=".28" />
				<path d="M257 451 Q384 469 511 451" fill="none" stroke="#05070a" strokeWidth="5" />
				<path d="M260 448 Q384 464 508 448" fill="none" stroke="#3a3e44" strokeWidth="1" opacity=".35" />
			</g>

			<path d="M365 152 Q365 137 380 134 L388 134 Q403 137 403 152 L403 245 Q403 263 384 265 Q365 263 365 245 Z" fill="#080a0d" stroke="#343940" strokeWidth="2" />
			<rect x="370" y="143" width="28" height="112" rx="13" fill={url('wheel')} stroke="#858b92" strokeOpacity=".45" strokeWidth="1.2" />
			<g stroke="#11151a" strokeWidth="2" opacity=".9" fill="none">
				{[153, 163, 173, 183, 193, 203, 213, 223, 233].map((y) => (
					<path key={y} d={`M372 ${y} Q384 ${y + 4} 396 ${y}`} />
				))}
				<path d="M375 243 Q384 246 393 243" />
			</g>
			<path d="M371 148 Q369 198 372 247" fill="none" stroke="#aeb4bb" strokeOpacity=".35" strokeWidth="1.2" />

			<path d="M252 381 Q245 384 244 398 L241 461 Q241 475 250 477 L257 474 L259 386 Z" fill={url('side')} stroke="#41464e" strokeWidth="1.5" />
			<path d="M245 493 Q240 497 240 511 L238 590 Q238 604 248 607 L257 601 L258 497 Z" fill={url('side')} stroke="#41464e" strokeWidth="1.5" />
			<path d="M247 397 L248 462 M244 510 L243 590" stroke="#6c737c" strokeOpacity=".22" strokeWidth="1.4" />

			<rect x="369" y="482" width="30" height="7" rx="3.5" fill={dpiColor} opacity=".5" filter={url('glow')} />
			<rect className="dpi-led" x="372" y="483" width="24" height="5.5" rx="2.75" fill={dpiColor} />
			<rect x="375" y="484" width="18" height="2" rx="1" fill="#ffffff" opacity=".35" />

			<path d="M260 190 Q263 145 294 119 L365 91" fill="none" stroke="#555a62" strokeOpacity=".28" strokeWidth="1.2" />
			<path d="M403 91 L474 119 Q505 145 508 190" fill="none" stroke="#555a62" strokeOpacity=".2" strokeWidth="1.2" />
			<path d="M232 570 Q222 720 275 810 Q320 885 384 890 Q448 885 493 810 Q546 720 536 570" fill="none" stroke="#454a52" strokeOpacity=".18" strokeWidth="1.5" />
		</svg>
	);
}
