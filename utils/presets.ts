import type { PresetKey } from "@/types/app";

export type Preset = {
	key: PresetKey;
	name: string;
	image: string;
	port: number;
	env: Record<string, string>;
	connectionUrl: (containerName: string) => string;
};

export const presets: Preset[] = [
	{
		key: "postgres",
		name: "Postgres",
		image: "postgres:17-alpine",
		port: 5432,
		env: {
			POSTGRES_USER: "app",
			POSTGRES_PASSWORD: "app",
			POSTGRES_DB: "app",
		},
		connectionUrl: (containerName) => `postgresql://app:app@${containerName}:5432/app`,
	},
	{
		key: "redis",
		name: "Redis",
		image: "redis:8-alpine",
		port: 6379,
		env: {},
		connectionUrl: (containerName) => `redis://${containerName}:6379`,
	},
	{
		key: "mariadb",
		name: "MariaDB",
		image: "mariadb:12",
		port: 3306,
		env: {
			MARIADB_ROOT_PASSWORD: "app",
			MARIADB_DATABASE: "app",
			MARIADB_USER: "app",
			MARIADB_PASSWORD: "app",
		},
		connectionUrl: (containerName) => `mysql://app:app@${containerName}:3306/app`,
	},
];

export function findPreset(key: string) {
	return presets.find((preset) => preset.key === key);
}
