import { ArrowRight, Boxes, GitBranch, Lock, Rocket, Server } from "lucide-react";
import { redirect } from "next/navigation";
import { loginAction, registerAction } from "@/app/actions";
import { FadeIn, ScaleIn } from "@/components/animated";
import { getCurrentUser } from "@/utils/auth";
import { userCount } from "@/utils/db";

export const dynamic = "force-dynamic";

export default async function Home() {
	const user = await getCurrentUser();

	if (user) {
		redirect("/dashboard");
	}

	const hasUsers = (await userCount()) > 0;

	return (
		<main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_32rem),linear-gradient(135deg,#f8fafc,#eff6ff_48%,#ffffff)] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
			<div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
				<FadeIn className="space-y-8">
					<div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/70 px-3 py-1 text-sm font-semibold text-blue-700 shadow-sm backdrop-blur">
						<Rocket className="h-4 w-4" />
						Bun-first open source deployments
					</div>
					<div className="max-w-3xl space-y-5">
						<h1 className="text-5xl font-black tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
							Ship Next.js apps from GitHub to Docker.
						</h1>
						<p className="max-w-2xl text-lg leading-8 text-slate-600">
							Connect a repository, attach Postgres, Redis, or MariaDB, add a domain, and watch live container logs from one clean control panel.
						</p>
					</div>
					<div className="grid max-w-3xl gap-3 sm:grid-cols-3">
						<Feature icon={<GitBranch className="h-5 w-5" />} title="Git SSH" text="Use the generated deploy key." />
						<Feature icon={<Server className="h-5 w-5" />} title="Docker" text="Containers run on your host." />
						<Feature icon={<Boxes className="h-5 w-5" />} title="Presets" text="Databases boot beside apps." />
					</div>
				</FadeIn>

				<ScaleIn delay={0.15}>
					<div className="rounded-2xl border border-white/70 bg-white/85 p-6 shadow-2xl shadow-blue-950/10 backdrop-blur">
						<div className="mb-6 flex items-center justify-between">
							<div>
								<h2 className="text-2xl font-black tracking-tight">{hasUsers ? "Sign in" : "Create owner account"}</h2>
								<p className="mt-1 text-sm text-slate-500">{hasUsers ? "Welcome back to your deployment panel." : "The first account becomes the instance owner."}</p>
							</div>
							<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
								<Lock className="h-5 w-5" />
							</div>
						</div>

						<form action={hasUsers ? loginAction : registerAction} className="space-y-4">
							{!hasUsers ? (
								<label className="block">
									<span className="text-sm font-semibold text-slate-700">Name</span>
									<input name="name" required className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
								</label>
							) : null}
							<label className="block">
								<span className="text-sm font-semibold text-slate-700">Email</span>
								<input name="email" type="email" required className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
							</label>
							<label className="block">
								<span className="text-sm font-semibold text-slate-700">Password</span>
								<input name="password" type="password" required minLength={8} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
							</label>
							<button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700">
								{hasUsers ? "Open dashboard" : "Create account"}
								<ArrowRight className="h-4 w-4" />
							</button>
						</form>
					</div>
				</ScaleIn>
			</div>
		</main>
	);
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
	return (
		<div className="rounded-lg border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur">
			<div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">{icon}</div>
			<div className="font-bold">{title}</div>
			<div className="mt-1 text-sm text-slate-500">{text}</div>
		</div>
	);
}
