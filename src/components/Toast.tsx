import { useEffect, useState } from 'react';

type Kind = 'ok' | 'err';
type Msg = { id: number; text: string; kind: Kind };

let push: ((m: Msg) => void) | null = null;
let seq = 0;

export function toast(text: string, kind: Kind = 'ok') {
	push?.({ id: ++seq, text, kind });
}

export function Toaster() {
	const [msgs, setMsgs] = useState<Msg[]>([]);
	useEffect(() => {
		push = (m) => {
			setMsgs((s) => [...s.slice(-2), m]);
			setTimeout(() => setMsgs((s) => s.filter((x) => x.id !== m.id)), 3500);
		};
		return () => {
			push = null;
		};
	}, []);
	return (
		<div className="toaster" role="status" aria-live="polite">
			{msgs.map((m) => (
				<div key={m.id} className={`toast ${m.kind}`}>
					{m.text}
				</div>
			))}
		</div>
	);
}
