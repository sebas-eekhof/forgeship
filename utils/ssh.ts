const keyDir = `${process.cwd()}/.keys`;
const privateKeyPath = `${keyDir}/forge_deploy_ed25519`;
const publicKeyPath = `${privateKeyPath}.pub`;

async function ensureDir() {
	await Bun.write(`${keyDir}/.keep`, "");
}

export async function ensureSshKey() {
	await ensureDir();

	if (await Bun.file(publicKeyPath).exists()) {
		return {
			privateKeyPath,
			publicKey: await Bun.file(publicKeyPath).text(),
		};
	}

	const process = Bun.spawn([
		"ssh-keygen",
		"-t",
		"ed25519",
		"-C",
		"forge-deploy-key",
		"-f",
		privateKeyPath,
		"-N",
		"",
	], {
		stdout: "pipe",
		stderr: "pipe",
	});

	const exitCode = await process.exited;

	if (exitCode !== 0) {
		const error = await new Response(process.stderr).text();
		throw new Error(error || "Unable to generate SSH key.");
	}

	await Bun.spawn(["chmod", "600", privateKeyPath]).exited;

	return {
		privateKeyPath,
		publicKey: await Bun.file(publicKeyPath).text(),
	};
}
