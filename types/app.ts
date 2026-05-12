export type Runtime = "bun" | "node";

export type PresetKey = "postgres" | "redis" | "mariadb";

export type AppStatus = "idle" | "building" | "running" | "stopped" | "failed";

export type Application = {
	id: string;
	user_id: string;
	name: string;
	slug: string;
	repository_url: string;
	branch: string;
	runtime: Runtime;
	install_command: string | null;
	build_command: string | null;
	start_command: string | null;
	port: number;
	status: AppStatus;
	container_id: string | null;
	image_name: string | null;
	last_error: string | null;
	created_at: string;
	updated_at: string;
};

export type Domain = {
	id: string;
	application_id: string;
	hostname: string;
	created_at: string;
};

export type Service = {
	id: string;
	application_id: string;
	preset: PresetKey;
	name: string;
	container_id: string | null;
	status: AppStatus;
	connection_url: string | null;
	created_at: string;
};

export type Deployment = {
	id: string;
	application_id: string;
	container_id: string | null;
	status: AppStatus;
	logs: string | null;
	created_at: string;
	finished_at: string | null;
};

export type DashboardStats = {
	apps: number;
	running: number;
	services: number;
	domains: number;
};
