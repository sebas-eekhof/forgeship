"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PresetKey, Runtime } from "@/types/app";
import { createSession, createUser, destroySession, requireUser, verifyUser } from "@/utils/auth";
import { deployAppContainer, deployPresetContainer, startContainer, stopContainer } from "@/utils/docker";
import { migrate, sql } from "@/utils/db";
import { ensureSshKey } from "@/utils/ssh";
import { domainFromSlug, optional, required, slugify } from "@/utils/strings";

export async function registerAction(formData: FormData) {
	const name = required(formData.get("name"), "Name");
	const email = required(formData.get("email"), "Email");
	const password = required(formData.get("password"), "Password");

	if (password.length < 8) {
		throw new Error("Password must be at least 8 characters.");
	}

	const user = await createUser(name, email, password);
	await createSession(user.id);
	redirect("/dashboard");
}

export async function loginAction(formData: FormData) {
	const email = required(formData.get("email"), "Email");
	const password = required(formData.get("password"), "Password");
	const user = await verifyUser(email, password);

	if (!user) {
		throw new Error("Invalid email or password.");
	}

	await createSession(user.id);
	redirect("/dashboard");
}

export async function logoutAction() {
	await destroySession();
	redirect("/");
}

export async function createApplicationAction(formData: FormData) {
	const user = await requireUser();
	await migrate();

	const name = required(formData.get("name"), "Name");
	const repositoryUrl = required(formData.get("repository_url"), "Repository URL");
	const branch = optional(formData.get("branch")) ?? "main";
	const runtime = (optional(formData.get("runtime")) ?? "bun") as Runtime;
	const port = Number(optional(formData.get("port")) ?? "3000");
	const installCommand = optional(formData.get("install_command"));
	const buildCommand = optional(formData.get("build_command"));
	const startCommand = optional(formData.get("start_command"));
	const presetKeys = formData.getAll("presets").filter((value): value is PresetKey => typeof value === "string") as PresetKey[];
	const baseSlug = slugify(optional(formData.get("slug")) ?? name);
	const slug = baseSlug || crypto.randomUUID();
	const hostname = optional(formData.get("domain")) ?? domainFromSlug(slug);

	const [app] = await sql`
		insert into applications (
			user_id,
			name,
			slug,
			repository_url,
			branch,
			runtime,
			port,
			install_command,
			build_command,
			start_command,
			status
		)
		values (
			${user.id},
			${name},
			${slug},
			${repositoryUrl},
			${branch},
			${runtime},
			${Number.isFinite(port) ? port : 3000},
			${installCommand},
			${buildCommand},
			${startCommand},
			'building'
		)
		returning *
	`;

	await sql`insert into domains (application_id, hostname) values (${app.id}, ${hostname})`;
	const [deployment] = await sql`
		insert into deployments (application_id, status)
		values (${app.id}, 'building')
		returning *
	`;

	try {
		for (const preset of presetKeys) {
			const service = await deployPresetContainer(app.slug, preset);
			await sql`
				insert into services (application_id, preset, name, container_id, status, connection_url)
				values (${app.id}, ${preset}, ${service.name}, ${service.id}, 'running', ${service.connectionUrl})
			`;
		}

		const containerId = await deployAppContainer(app, [hostname]);

		await sql`
			update applications
			set status = 'running', container_id = ${containerId}, updated_at = now(), last_error = null
			where id = ${app.id}
		`;
		await sql`
			update deployments
			set status = 'running', container_id = ${containerId}, finished_at = now()
			where id = ${deployment.id}
		`;
	} catch (error) {
		const message = error instanceof Error ? error.message : "Deployment failed.";
		await sql`
			update applications
			set status = 'failed', last_error = ${message}, updated_at = now()
			where id = ${app.id}
		`;
		await sql`
			update deployments
			set status = 'failed', logs = ${message}, finished_at = now()
			where id = ${deployment.id}
		`;
	}

	revalidatePath("/dashboard");
	redirect(`/apps/${app.id}`);
}

export async function addDomainAction(applicationId: string, formData: FormData) {
	const user = await requireUser();
	const hostname = required(formData.get("hostname"), "Domain").toLowerCase();
	const [app] = await sql`select * from applications where id = ${applicationId} and user_id = ${user.id}`;

	if (!app) {
		throw new Error("Application not found.");
	}

	await sql`insert into domains (application_id, hostname) values (${applicationId}, ${hostname})`;
	revalidatePath(`/apps/${applicationId}`);
}

export async function redeployAction(applicationId: string) {
	const user = await requireUser();
	const [app] = await sql`select * from applications where id = ${applicationId} and user_id = ${user.id}`;

	if (!app) {
		throw new Error("Application not found.");
	}

	const domains = await sql<{ hostname: string }[]>`select hostname from domains where application_id = ${applicationId}`;
	const [deployment] = await sql`
		insert into deployments (application_id, status)
		values (${applicationId}, 'building')
		returning *
	`;

	await sql`update applications set status = 'building', updated_at = now() where id = ${applicationId}`;

	try {
		const containerId = await deployAppContainer(app, domains.map((domain) => domain.hostname));
		await sql`
			update applications
			set status = 'running', container_id = ${containerId}, updated_at = now(), last_error = null
			where id = ${applicationId}
		`;
		await sql`
			update deployments
			set status = 'running', container_id = ${containerId}, finished_at = now()
			where id = ${deployment.id}
		`;
	} catch (error) {
		const message = error instanceof Error ? error.message : "Deployment failed.";
		await sql`
			update applications
			set status = 'failed', last_error = ${message}, updated_at = now()
			where id = ${applicationId}
		`;
		await sql`
			update deployments
			set status = 'failed', logs = ${message}, finished_at = now()
			where id = ${deployment.id}
		`;
	}

	revalidatePath(`/apps/${applicationId}`);
}

export async function stopApplicationAction(applicationId: string) {
	const user = await requireUser();
	const [app] = await sql`select container_id from applications where id = ${applicationId} and user_id = ${user.id}`;

	if (!app?.container_id) {
		throw new Error("Application is not attached to a container.");
	}

	await stopContainer(app.container_id);
	await sql`update applications set status = 'stopped', updated_at = now() where id = ${applicationId}`;
	revalidatePath(`/apps/${applicationId}`);
}

export async function startApplicationAction(applicationId: string) {
	const user = await requireUser();
	const [app] = await sql`select container_id from applications where id = ${applicationId} and user_id = ${user.id}`;

	if (!app?.container_id) {
		throw new Error("Application is not attached to a container.");
	}

	await startContainer(app.container_id);
	await sql`update applications set status = 'running', updated_at = now() where id = ${applicationId}`;
	revalidatePath(`/apps/${applicationId}`);
}

export async function getPublicKeyAction() {
	await requireUser();
	const { publicKey } = await ensureSshKey();
	return publicKey.trim();
}
