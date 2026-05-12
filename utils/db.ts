import type { Application, DashboardStats, Deployment, Domain, Service } from "@/types/app";

const databaseUrl = process.env.DATABASE_URL;

let client: Bun.SQL | null = null;

function getSql() {
	if (!databaseUrl) {
		throw new Error("DATABASE_URL is missing.");
	}

	if (!client) {
		client = new Bun.SQL(databaseUrl);
	}

	return client;
}

type SqlTag = Bun.SQL & (<T = unknown>(strings: TemplateStringsArray, ...values: unknown[]) => Bun.SQL.Query<T>);

export const sql = Object.assign(
	<T = unknown>(strings: TemplateStringsArray, ...values: unknown[]) => getSql()<T>(strings, ...values),
	{
		unsafe: <T = unknown>(statement: string, values?: unknown[]) => getSql().unsafe<T>(statement, values),
	}
) as SqlTag;

let migrated = false;

export async function migrate() {
	if (migrated) {
		return;
	}

	await sql.unsafe(`
		create extension if not exists pgcrypto;

		create table if not exists users (
			id uuid primary key default gen_random_uuid(),
			name text not null,
			email text not null unique,
			password_hash text not null,
			created_at timestamptz not null default now()
		);

		create table if not exists sessions (
			id uuid primary key default gen_random_uuid(),
			user_id uuid not null references users(id) on delete cascade,
			token_hash text not null unique,
			expires_at timestamptz not null,
			created_at timestamptz not null default now()
		);

		create table if not exists applications (
			id uuid primary key default gen_random_uuid(),
			user_id uuid not null references users(id) on delete cascade,
			name text not null,
			slug text not null unique,
			repository_url text not null,
			branch text not null default 'main',
			runtime text not null default 'bun',
			install_command text,
			build_command text,
			start_command text,
			port integer not null default 3000,
			status text not null default 'idle',
			container_id text,
			image_name text,
			last_error text,
			created_at timestamptz not null default now(),
			updated_at timestamptz not null default now()
		);

		create table if not exists domains (
			id uuid primary key default gen_random_uuid(),
			application_id uuid not null references applications(id) on delete cascade,
			hostname text not null unique,
			created_at timestamptz not null default now()
		);

		create table if not exists services (
			id uuid primary key default gen_random_uuid(),
			application_id uuid not null references applications(id) on delete cascade,
			preset text not null,
			name text not null,
			container_id text,
			status text not null default 'idle',
			connection_url text,
			created_at timestamptz not null default now()
		);

		create table if not exists deployments (
			id uuid primary key default gen_random_uuid(),
			application_id uuid not null references applications(id) on delete cascade,
			container_id text,
			status text not null default 'building',
			logs text,
			created_at timestamptz not null default now(),
			finished_at timestamptz
		);
	`);

	migrated = true;
}

export async function userCount() {
	await migrate();
	const [row] = await sql<{ count: string }[]>`select count(*)::text as count from users`;
	return Number(row?.count ?? 0);
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
	await migrate();
	const [row] = await sql<DashboardStats[]>`
		select
			(select count(*)::int from applications where user_id = ${userId}) as apps,
			(select count(*)::int from applications where user_id = ${userId} and status = 'running') as running,
			(select count(*)::int from services s join applications a on a.id = s.application_id where a.user_id = ${userId}) as services,
			(select count(*)::int from domains d join applications a on a.id = d.application_id where a.user_id = ${userId}) as domains
	`;
	return row ?? { apps: 0, running: 0, services: 0, domains: 0 };
}

export async function getApplications(userId: string) {
	await migrate();
	return sql<Application[]>`
		select * from applications
		where user_id = ${userId}
		order by created_at desc
	`;
}

export async function getApplication(userId: string, id: string) {
	await migrate();
	const [app] = await sql<Application[]>`
		select * from applications
		where user_id = ${userId} and id = ${id}
	`;
	return app ?? null;
}

export async function getApplicationBundle(userId: string, id: string) {
	const app = await getApplication(userId, id);

	if (!app) {
		return null;
	}

	const [domains, services, deployments] = await Promise.all([
		sql<Domain[]>`select * from domains where application_id = ${id} order by created_at desc`,
		sql<Service[]>`select * from services where application_id = ${id} order by created_at desc`,
		sql<Deployment[]>`select * from deployments where application_id = ${id} order by created_at desc limit 8`,
	]);

	return { app, domains, services, deployments };
}
