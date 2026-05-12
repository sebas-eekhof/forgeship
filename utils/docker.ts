import type { Application, PresetKey } from "@/types/app";
import { findPreset } from "@/utils/presets";
import { dockerName, domainFromSlug } from "@/utils/strings";
import { ensureSshKey } from "@/utils/ssh";

const dockerSocket = "/var/run/docker.sock";
const dockerApi = "http://docker";
const networkName = "forge";
const proxyName = "forge-proxy";

type DockerResponse<T> = T extends undefined ? undefined : T;

async function docker<T = unknown>(path: string, init: RequestInit = {}): Promise<DockerResponse<T>> {
	const response = await fetch(`${dockerApi}${path}`, {
		...init,
		unix: dockerSocket,
		headers: {
			"Content-Type": "application/json",
			...(init.headers ?? {}),
		},
	} as RequestInit & { unix: string });

	if (response.status === 404) {
		throw new Error("Docker resource not found.");
	}

	if (!response.ok) {
		const text = await response.text();
		throw new Error(text || `Docker API failed with ${response.status}.`);
	}

	if (response.status === 204 || response.status === 304) {
		return undefined as DockerResponse<T>;
	}

	const text = await response.text();

	if (!text.length) {
		return undefined as DockerResponse<T>;
	}

	try {
		return JSON.parse(text) as DockerResponse<T>;
	} catch {
		return text as DockerResponse<T>;
	}
}

async function dockerMaybe<T = unknown>(path: string, init?: RequestInit) {
	try {
		return await docker<T>(path, init);
	} catch (error) {
		if (error instanceof Error && error.message === "Docker resource not found.") {
			return null;
		}

		throw error;
	}
}

async function pullImage(image: string) {
	await docker(`/images/create?fromImage=${encodeURIComponent(image)}`, {
		method: "POST",
	});
}

export async function ensureNetwork() {
	const network = await dockerMaybe(`/networks/${networkName}`);

	if (network) {
		return;
	}

	await docker("/networks/create", {
		method: "POST",
		body: JSON.stringify({
			Name: networkName,
			Driver: "bridge",
		}),
	});
}

export async function ensureProxy() {
	await ensureNetwork();
	await pullImage("traefik:v3.5");

	const existing = await dockerMaybe<{ Id: string; State: { Running: boolean } }>(`/containers/${proxyName}/json`);

	if (existing?.State.Running) {
		return existing.Id;
	}

	if (!existing) {
		await docker(`/containers/create?name=${proxyName}`, {
			method: "POST",
			body: JSON.stringify({
				Image: "traefik:v3.5",
				Cmd: [
					"--providers.docker=true",
					"--providers.docker.exposedbydefault=false",
					"--entrypoints.web.address=:80",
					"--api.dashboard=true",
				],
				HostConfig: {
					Binds: ["/var/run/docker.sock:/var/run/docker.sock:ro"],
					NetworkMode: networkName,
					PortBindings: {
						"80/tcp": [{ HostPort: "80" }],
					},
					RestartPolicy: { Name: "unless-stopped" },
				},
				ExposedPorts: {
					"80/tcp": {},
				},
			}),
		});
	}

	await docker(`/containers/${proxyName}/start`, { method: "POST" });
	const started = await docker<{ Id: string }>(`/containers/${proxyName}/json`);
	return started.Id;
}

function envList(env: Record<string, string>) {
	return Object.entries(env).map(([key, value]) => `${key}=${value}`);
}

function appCommand(app: Application) {
	const installCommand =
		app.install_command ??
		(app.runtime === "bun"
			? "bun install --frozen-lockfile || bun install"
			: "corepack enable && (pnpm install --frozen-lockfile || yarn install --frozen-lockfile || npm ci || npm install)");
	const buildCommand = app.build_command ?? (app.runtime === "bun" ? "bun run build" : "npm run build");
	const startCommand = app.start_command ?? (app.runtime === "bun" ? `bun run start -- -H 0.0.0.0 -p ${app.port}` : `npm run start -- -H 0.0.0.0 -p ${app.port}`);
	const branch = app.branch.replace(/'/g, "'\\''");
	const repo = app.repository_url.replace(/'/g, "'\\''");

	return [
		"set -e",
		"apk add --no-cache git openssh-client",
		"mkdir -p ~/.ssh /workspace",
		"if [ -f /run/forge/deploy_key ]; then cp /run/forge/deploy_key ~/.ssh/id_ed25519 && chmod 600 ~/.ssh/id_ed25519; fi",
		"ssh-keyscan github.com gitlab.com bitbucket.org >> ~/.ssh/known_hosts 2>/dev/null || true",
		`git clone --depth 1 --branch '${branch}' '${repo}' /workspace/app`,
		"cd /workspace/app",
		installCommand,
		buildCommand,
		startCommand,
	].join(" && ");
}

export async function deployAppContainer(app: Application, domains: string[]) {
	await ensureProxy();
	const { privateKeyPath } = await ensureSshKey();
	const containerName = dockerName(app.slug);
	const image = app.runtime === "bun" ? "oven/bun:1-alpine" : "node:22-alpine";
	const hostnames = domains.length > 0 ? domains : [domainFromSlug(app.slug)];
	const rule = hostnames.map((domain) => `Host(\`${domain}\`)`).join(" || ");
	const existing = await dockerMaybe<{ Id: string }>(`/containers/${containerName}/json`);

	await pullImage(image);

	if (existing) {
		await dockerMaybe(`/containers/${containerName}/stop?t=10`, { method: "POST" });
		await dockerMaybe(`/containers/${containerName}`, { method: "DELETE" });
	}

	const created = await docker<{ Id: string }>(`/containers/create?name=${containerName}`, {
		method: "POST",
		body: JSON.stringify({
			Image: image,
			Cmd: ["sh", "-lc", appCommand(app)],
			Labels: {
				"traefik.enable": "true",
				[`traefik.http.routers.${containerName}.rule`]: rule,
				[`traefik.http.routers.${containerName}.entrypoints`]: "web",
				[`traefik.http.services.${containerName}.loadbalancer.server.port`]: String(app.port),
			},
			HostConfig: {
				Binds: [`${privateKeyPath}:/run/forge/deploy_key:ro`],
				NetworkMode: networkName,
				RestartPolicy: { Name: "unless-stopped" },
			},
			ExposedPorts: {
				[`${app.port}/tcp`]: {},
			},
			Env: [`PORT=${app.port}`, "HOSTNAME=0.0.0.0"],
		}),
	});

	await docker(`/containers/${created.Id}/start`, { method: "POST" });
	return created.Id;
}

export async function deployPresetContainer(appSlug: string, presetKey: PresetKey) {
	await ensureNetwork();

	const preset = findPreset(presetKey);

	if (!preset) {
		throw new Error("Unknown preset.");
	}

	const containerName = dockerName(`${appSlug}-${preset.key}`);
	const existing = await dockerMaybe<{ Id: string; State: { Running: boolean } }>(`/containers/${containerName}/json`);

	await pullImage(preset.image);

	if (existing?.State.Running) {
		return {
			id: existing.Id,
			connectionUrl: preset.connectionUrl(containerName),
			name: containerName,
		};
	}

	if (!existing) {
		await docker(`/containers/create?name=${containerName}`, {
			method: "POST",
			body: JSON.stringify({
				Image: preset.image,
				Env: envList(preset.env),
				HostConfig: {
					NetworkMode: networkName,
					RestartPolicy: { Name: "unless-stopped" },
				},
				ExposedPorts: {
					[`${preset.port}/tcp`]: {},
				},
			}),
		});
	}

	await docker(`/containers/${containerName}/start`, { method: "POST" });

	const container = await docker<{ Id: string }>(`/containers/${containerName}/json`);

	return {
		id: container.Id,
		connectionUrl: preset.connectionUrl(containerName),
		name: containerName,
	};
}

export async function stopContainer(containerId: string) {
	await dockerMaybe(`/containers/${containerId}/stop?t=10`, { method: "POST" });
}

export async function startContainer(containerId: string) {
	await docker(`/containers/${containerId}/start`, { method: "POST" });
}

export async function getContainerLogs(containerId: string) {
	return fetch(`${dockerApi}/containers/${containerId}/logs?stdout=1&stderr=1&follow=1&tail=160`, {
		unix: dockerSocket,
	} as RequestInit & { unix: string });
}
