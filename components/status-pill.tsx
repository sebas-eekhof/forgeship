import { clsx } from "clsx";
import type { AppStatus } from "@/types/app";

const styles: Record<AppStatus, string> = {
	idle: "bg-slate-100 text-slate-700 ring-slate-200",
	building: "bg-amber-50 text-amber-700 ring-amber-200",
	running: "bg-emerald-50 text-emerald-700 ring-emerald-200",
	stopped: "bg-slate-100 text-slate-600 ring-slate-200",
	failed: "bg-rose-50 text-rose-700 ring-rose-200",
};

export function StatusPill({ status }: { status: AppStatus }) {
	return (
		<span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1", styles[status])}>
			<span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
			{status}
		</span>
	);
}
