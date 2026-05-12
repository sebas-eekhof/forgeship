"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({ value }: { value: string }) {
	const [copied, setCopied] = useState(false);

	return (
		<button
			type="button"
			onClick={async () => {
				await navigator.clipboard.writeText(value);
				setCopied(true);
				window.setTimeout(() => setCopied(false), 1600);
			}}
			className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-300 hover:text-blue-700"
			title={copied ? "Copied" : "Copy"}
		>
			{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
		</button>
	);
}
