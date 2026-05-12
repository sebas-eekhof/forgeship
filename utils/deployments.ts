import type { Application, PresetKey } from "@/types/app";
import { deployAppContainer, deployPresetContainer } from "@/utils/docker";
import { sql } from "@/utils/db";

export function queueDeployment(applicationId: string, presetKeys: PresetKey[] = [], deploymentId?: string) {
	setTimeout(() => {
		deployApplication(applicationId, presetKeys, deploymentId).catch((error) => {
			console.error("Deployment failed", error);
		});
	}, 0);
}

export async function deployApplication(applicationId: string, presetKeys: PresetKey[] = [], deploymentId?: string) {
	const [app] = await sql<Application[]>`select * from applications where id = ${applicationId}`;

	if (!app) {
		return;
	}

	const [deployment] = deploymentId
		? await sql`select * from deployments where id = ${deploymentId}`
		: await sql`
			insert into deployments (application_id, status)
			values (${applicationId}, 'building')
			returning *
		`;

	await sql`update applications set status = 'building', updated_at = now() where id = ${applicationId}`;

	try {
		for (const preset of presetKeys) {
			const service = await deployPresetContainer(app.slug, preset);
			await sql`
				insert into services (application_id, preset, name, container_id, status, connection_url)
				values (${app.id}, ${preset}, ${service.name}, ${service.id}, 'running', ${service.connectionUrl})
				on conflict do nothing
			`;
		}

		const domains = await sql<{ hostname: string }[]>`
			select hostname from domains
			where application_id = ${applicationId}
		`;
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
}
