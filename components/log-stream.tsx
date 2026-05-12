"use client";

import { Terminal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export function LogStream({ appId }: { appId: string }) {
	const [lines, setLines] = useState<string[]>(["Connecting to container logs..."]);
	const bottomRef = useRef<HTMLDivElement | null>(null);
	const source = useMemo(() => `/api/apps/${appId}/logs`, [appId]);

	useEffect(() => {
		const events = new EventSource(source);

		events.onmessage = (event) => {
			setLines((current) => [...current.slice(-220), event.data]);
		};

		events.onerror = () => {
			setLines((current) => [...current.slice(-220), "Log stream paused. The container may still be starting."]);
			events.close();
		};

		return () => events.close();
	}, [source]);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [lines]);

	return (
		<div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950 shadow-2xl shadow-blue-950/20">
			<div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-slate-300">
				<div className="flex items-center gap-2 text-sm font-semibold">
					<Terminal className="h-4 w-4 text-blue-300" />
					Live logs
				</div>
				<div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,.9)]" />
			</div>
			<div className="h-[420px] overflow-auto px-4 py-4 font-mono text-xs leading-6 text-slate-300">
				{lines.map((line, index) => (
					<div key={`${line}-${index}`} className="whitespace-pre-wrap break-words">
						<span className="select-none text-slate-600">$ </span>
						{line}
					</div>
				))}
				<div ref={bottomRef} />
			</div>
		</div>
	);
}
