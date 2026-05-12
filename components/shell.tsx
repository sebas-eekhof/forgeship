import { Boxes, GitBranch, KeyRound, LogOut, PanelsTopLeft, Server, ShipWheel } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/actions";
import type { User } from "@/utils/auth";

export function AppShell({ user, children }: { user: User; children: ReactNode }) {
	return (
		<div className="min-h-screen bg-slate-50 text-slate-950">
			<aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-white/90 px-5 py-6 backdrop-blur xl:block">
				<Link href="/dashboard" className="flex items-center gap-3">
					<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
						<ShipWheel className="h-5 w-5" />
					</div>
					<div>
						<div className="text-lg font-black tracking-tight">ForgeShip</div>
						<div className="text-xs font-medium text-slate-500">Open Docker platform</div>
					</div>
				</Link>
				<nav className="mt-10 space-y-2">
					<NavItem href="/dashboard" icon={<PanelsTopLeft className="h-4 w-4" />} label="Dashboard" />
					<NavItem href="/dashboard#new" icon={<Boxes className="h-4 w-4" />} label="Applications" />
					<NavItem href="/dashboard#ssh" icon={<KeyRound className="h-4 w-4" />} label="SSH key" />
					<NavItem href="/dashboard#presets" icon={<Server className="h-4 w-4" />} label="Presets" />
				</nav>
				<div className="absolute bottom-6 left-5 right-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
					<div className="text-sm font-semibold">{user.name}</div>
					<div className="truncate text-xs text-slate-500">{user.email}</div>
					<form action={logoutAction} className="mt-4">
						<button className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-700">
							<LogOut className="h-4 w-4" />
							Sign out
						</button>
					</form>
				</div>
			</aside>
			<header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 px-4 py-4 backdrop-blur xl:hidden">
				<div className="flex items-center justify-between">
					<Link href="/dashboard" className="flex items-center gap-2 font-black">
						<ShipWheel className="h-5 w-5 text-blue-600" />
						ForgeShip
					</Link>
					<form action={logoutAction}>
						<button className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200">
							<LogOut className="h-4 w-4" />
						</button>
					</form>
				</div>
			</header>
			<main className="xl:pl-72">
				<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
			</main>
		</div>
	);
}

function NavItem({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
	return (
		<Link
			href={href}
			className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
		>
			{icon}
			{label}
		</Link>
	);
}

export function GithubHint() {
	return (
		<div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
			<GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
			<p>
				Add the SSH public key to your GitHub account or repository deploy keys, then use an SSH clone URL like
				<span className="font-mono"> git@github.com:org/app.git</span>.
			</p>
		</div>
	);
}
