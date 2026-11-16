import { useId } from 'react';
import { LightMode, type Settings } from '../device/codec';
import mouseImage from '../assets/x11-top.webp';

const W = 506;
const H = 900;
const LED = { cx: 252, cy: 376.5, w: 38, h: 8.5 };

function ledState(settings?: Settings) {
	if (!settings) return { color: '#2ee6f2', anim: '' };
	const { mode, color } = settings.lighting;
	const dpi = settings.dpi.stages[settings.dpi.current - 1]?.color ?? color;
	switch (mode) {
		case LightMode.Off:
			return { color: '', anim: 'off' };
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
	const glowId = `glow-${useId().replace(/:/g, '')}`;
	const led = ledState(settings);
	const speed = settings ? 3.2 - settings.lighting.speed * 0.5 : 2;
	const brightness = settings ? 0.35 + (settings.lighting.brightness / 8) * 0.65 : 1;
	const x = LED.cx - LED.w / 2;
	const y = LED.cy - LED.h / 2;

	return (
		<svg className="mouse-art" viewBox={`0 0 ${W} ${H}`} width={(size * W) / H} height={size} role="img" aria-label="Mouse preview">
			<defs>
				<filter id={glowId} filterUnits="userSpaceOnUse" x={x - 30} y={y - 30} width={LED.w + 60} height={LED.h + 60}>
					<feGaussianBlur stdDeviation="6" />
				</filter>
			</defs>
			<image href={mouseImage} x="0" y="0" width={W} height={H} />
			{led.anim !== 'off' && (
				<g className={`led ${led.anim}`} style={{ '--speed': `${speed}s`, '--bright': brightness } as React.CSSProperties}>
					<rect x={x - 6} y={y - 4} width={LED.w + 12} height={LED.h + 8} rx={(LED.h + 8) / 2} fill={led.color} opacity="0.75" filter={`url(#${glowId})`} />
					<rect x={x} y={y} width={LED.w} height={LED.h} rx={LED.h / 2} fill={led.color} />
					<rect x={x + 4} y={y + 1.5} width={LED.w - 8} height="2.4" rx="1.2" fill="#ffffff" opacity="0.45" />
				</g>
			)}
		</svg>
	);
}
