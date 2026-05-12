import { ArrowUpRight, Boxes, Database, Globe2, KeyRound, Plus, Server, Sparkles } from "lucide-react";
import Link from "next/link";
import { createApplicationAction } from "@/app/actions";
import { FadeIn, ScaleIn } from "@/components/animated";
import { CopyButton } from "@/components/copy-button";
import { GithubHint, AppShell } from "@/components/shell";
import { StatusPill } from "@/components/status-pill";
import { presets } from "@/utils/presets";
import { requireUser } from "@/utils/auth";
import { getApplications, getDashboardStats } from "@/utils/db";
import { ensureSshKey } from "@/utils/ssh";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
	const user = await requireUser();
	const [stats, apps, ssh] = await Promise.all([
		getDashboardStats(user.id),
		getApplications(user.id),
		ensureSshKey(),
	]);

	return (
		<AppShell user={user}>
			<div className="space-y-8">
				<FadeIn className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
					<div>
						<div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
							<Sparkles className="h-4 w-4" />
							Control plane ready
						</div>
						<h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">Deployments</h1>
						<p className="mt-2 max-w-2xl text-slate-600">Create Docker-backed Next.js apps from GitHub, attach services, route domains, and inspect live logs.</p>
					</div>
					<a href="#new" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700">
						<Plus className="h-4 w-4" />
						New app
					</a>
				</FadeIn>

				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					<StatCard icon={<Boxes className="h-5 w-5" />} label="Applications" value={stats.apps} delay={0} />
					<StatCard icon={<ArrowUpRight className="h-5 w-5" />} label="Running" value={stats.running} delay={0.04} />
					<StatCard icon={<Database className="h-5 w-5" />} label="Preset services" value={stats.services} delay={0.08} />
					<StatCard icon={<Globe2 className="h-5 w-5" />} label="Domains" value={stats.domains} delay={0.12} />
				</div>

				<section className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
					<ScaleIn>
						<div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
							<div className="mb-5 flex items-center justify-between">
								<div>
									<h2 className="text-lg font-black tracking-tight">Applications</h2>
									<p className="text-sm text-slate-500">Every app is routed through the background Traefik proxy.</p>
								</div>
							</div>
							<div className="space-y-3">
								{apps.length === 0 ? (
									<div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
										<Server className="mx-auto h-8 w-8 text-blue-600" />
										<h3 className="mt-3 font-bold">No applications yet</h3>
										<p className="mt-1 text-sm text-slate-500">Create your first app and ForgeShip will launch Docker containers for it.</p>
									</div>
								) : (
									apps.map((app) => (
										<Link key={app.id} href={`/apps/${app.id}`} className="group flex items-center justify-between rounded-lg border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/40">
											<div className="min-w-0">
												<div className="flex items-center gap-3">
													<h3 className="truncate font-bold">{app.name}</h3>
													<StatusPill status={app.status} />
												</div>
												<div className="mt-1 truncate text-sm text-slate-500">{app.repository_url}</div>
											</div>
											<ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:text-blue-700" />
										</Link>
									))
								)}
							</div>
						</div>
					</ScaleIn>

					<ScaleIn delay={0.08}>
						<div id="ssh" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
							<div className="flex items-center justify-between">
								<div>
									<h2 className="text-lg font-black tracking-tight">GitHub SSH key</h2>
									<p className="text-sm text-slate-500">Add this public key to GitHub for private repositories.</p>
								</div>
								<KeyRound className="h-5 w-5 text-blue-600" />
							</div>
							<div className="mt-4 flex gap-2">
								<pre className="max-h-28 flex-1 overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-6 text-slate-100">{ssh.publicKey.trim()}</pre>
								<CopyButton value={ssh.publicKey.trim()} />
							</div>
							<div className="mt-4">
								<GithubHint />
							</div>
						</div>
					</ScaleIn>
				</section>

				<section id="new" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
					<div className="mb-6">
						<h2 className="text-lg font-black tracking-tight">Create application</h2>
						<p className="text-sm text-slate-500">ForgeShip starts preset services first, then starts your Next.js container on the shared proxy network.</p>
					</div>
					<form action={createApplicationAction} className="grid gap-6 lg:grid-cols-2">
						<div className="space-y-4">
							<FormField label="Name" name="name" placeholder="Acme web" required />
							<FormField label="Slug" name="slug" placeholder="acme-web" />
							<FormField label="Repository SSH or HTTPS URL" name="repository_url" placeholder="git@github.com:acme/web.git" required />
							<div className="grid gap-4 sm:grid-cols-3">
								<FormField label="Branch" name="branch" placeholder="main" />
								<label className="block">
									<span className="text-sm font-semibold text-slate-700">Runtime</span>
									<select name="runtime" defaultValue="bun" className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100">
										<option value="bun">Bun</option>
										<option value="node">Node.js</option>
									</select>
								</label>
								<FormField label="Port" name="port" placeholder="3000" />
							</div>
							<FormField label="Domain" name="domain" placeholder="app.example.com" />
						</div>
						<div className="space-y-4">
							<FormField label="Install command" name="install_command" placeholder="bun install --frozen-lockfile" />
							<FormField label="Build command" name="build_command" placeholder="bun run build" />
							<FormField label="Start command" name="start_command" placeholder="bun run start -- -H 0.0.0.0 -p 3000" />
							<div id="presets">
								<div className="text-sm font-semibold text-slate-700">Presets</div>
								<div className="mt-2 grid gap-3 sm:grid-cols-3">
									{presets.map((preset) => (
										<label key={preset.key} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm font-semibold transition hover:border-blue-200 hover:bg-blue-50/50">
											<input type="checkbox" name="presets" value={preset.key} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
											{preset.name}
										</label>
									))}
								</div>
							</div>
							<button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700">
								<Plus className="h-4 w-4" />
								Create and deploy
							</button>
						</div>
					</form>
				</section>
			</div>
		</AppShell>
	);
}

function StatCard({ icon, label, value, delay }: { icon: React.ReactNode; label: string; value: number; delay: number }) {
	return (
		<FadeIn delay={delay} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
			<div className="flex items-center justify-between">
				<div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">{icon}</div>
				<div className="text-3xl font-black tracking-tight">{value}</div>
			</div>
			<div className="mt-4 text-sm font-semibold text-slate-500">{label}</div>
		</FadeIn>
	);
}

function FormField({ label, name, placeholder, required = false }: { label: string; name: string; placeholder: string; required?: boolean }) {
	return (
		<label className="block">
			<span className="text-sm font-semibold text-slate-700">{label}</span>
			<input
				name={name}
				required={required}
				placeholder={placeholder}
				className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
			/>
		</label>
	);
}
