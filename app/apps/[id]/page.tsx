import { ArrowLeft, ExternalLink, Globe2, Play, Plus, RefreshCcw, Square, Terminal } from "lucide-react";
import Link from "next/link";
import { addDomainAction, redeployAction, startApplicationAction, stopApplicationAction } from "@/app/actions";
import { FadeIn, ScaleIn } from "@/components/animated";
import { AppShell } from "@/components/shell";
import { LogStream } from "@/components/log-stream";
import { StatusPill } from "@/components/status-pill";
import { requireUser } from "@/utils/auth";
import { getApplicationBundle } from "@/utils/db";

export const dynamic = "force-dynamic";

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
	const user = await requireUser();
	const { id } = await params;
	const bundle = await getApplicationBundle(user.id, id);

	if (!bundle) {
		return (
			<AppShell user={user}>
				<div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
					<h1 className="text-2xl font-black tracking-tight">Application not found</h1>
					<Link href="/dashboard" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-700">
						<ArrowLeft className="h-4 w-4" />
						Back to dashboard
					</Link>
				</div>
			</AppShell>
		);
	}

	const { app, domains, services, deployments } = bundle;
	const redeploy = redeployAction.bind(null, app.id);
	const stop = stopApplicationAction.bind(null, app.id);
	const start = startApplicationAction.bind(null, app.id);
	const addDomain = addDomainAction.bind(null, app.id);

	return (
		<AppShell user={user}>
			<div className="space-y-8">
				<FadeIn className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
					<div>
						<Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-blue-700">
							<ArrowLeft className="h-4 w-4" />
							Dashboard
						</Link>
						<div className="mt-4 flex flex-wrap items-center gap-3">
							<h1 className="text-4xl font-black tracking-tight text-slate-950">{app.name}</h1>
							<StatusPill status={app.status} />
						</div>
						<p className="mt-2 max-w-3xl text-slate-600">{app.repository_url}</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<form action={redeploy}>
							<ActionButton icon={<RefreshCcw className="h-4 w-4" />} label="Redeploy" />
						</form>
						{app.status === "running" ? (
							<form action={stop}>
								<ActionButton icon={<Square className="h-4 w-4" />} label="Stop" muted />
							</form>
						) : (
							<form action={start}>
								<ActionButton icon={<Play className="h-4 w-4" />} label="Start" muted />
							</form>
						)}
					</div>
				</FadeIn>

				<div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
					<div className="space-y-6">
						<ScaleIn>
							<div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
								<div className="flex items-center justify-between">
									<div>
										<h2 className="text-lg font-black tracking-tight">Domains</h2>
										<p className="text-sm text-slate-500">Point DNS at this host and Traefik routes traffic.</p>
									</div>
									<Globe2 className="h-5 w-5 text-blue-600" />
								</div>
								<div className="mt-4 space-y-2">
									{domains.map((domain) => (
										<a key={domain.id} href={`http://${domain.hostname}`} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm font-semibold transition hover:border-blue-200 hover:bg-blue-50/40">
											{domain.hostname}
											<ExternalLink className="h-4 w-4 text-slate-400" />
										</a>
									))}
								</div>
								<form action={addDomain} className="mt-4 flex gap-2">
									<input name="hostname" placeholder="app.example.com" required className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
									<button className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700">
										<Plus className="h-4 w-4" />
									</button>
								</form>
							</div>
						</ScaleIn>

						<ScaleIn delay={0.06}>
							<div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
								<h2 className="text-lg font-black tracking-tight">Services</h2>
								<div className="mt-4 space-y-3">
									{services.length === 0 ? (
										<p className="rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-500">No preset services attached.</p>
									) : (
										services.map((service) => (
											<div key={service.id} className="rounded-lg border border-slate-200 p-4">
												<div className="flex items-center justify-between gap-3">
													<div className="font-bold">{service.name}</div>
													<StatusPill status={service.status} />
												</div>
												{service.connection_url ? (
													<code className="mt-3 block overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{service.connection_url}</code>
												) : null}
											</div>
										))
									)}
								</div>
							</div>
						</ScaleIn>

						<ScaleIn delay={0.12}>
							<div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
								<h2 className="text-lg font-black tracking-tight">Deployments</h2>
								<div className="mt-4 space-y-3">
									{deployments.map((deployment) => (
										<div key={deployment.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
											<div>
												<div className="text-sm font-semibold">{new Date(deployment.created_at).toLocaleString()}</div>
												<div className="text-xs text-slate-500">{deployment.container_id?.slice(0, 12) ?? "No container yet"}</div>
											</div>
											<StatusPill status={deployment.status} />
										</div>
									))}
								</div>
							</div>
						</ScaleIn>
					</div>

					<FadeIn delay={0.1}>
						<div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-600">
							<Terminal className="h-4 w-4 text-blue-600" />
							Streaming from Docker
						</div>
						<LogStream appId={app.id} />
						{app.last_error ? (
							<div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{app.last_error}</div>
						) : null}
					</FadeIn>
				</div>
			</div>
		</AppShell>
	);
}

function ActionButton({ icon, label, muted = false }: { icon: React.ReactNode; label: string; muted?: boolean }) {
	return (
		<button
			className={
				muted
					? "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
					: "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700"
			}
		>
			{icon}
			{label}
		</button>
	);
}
