export function required(value: FormDataEntryValue | null, label: string) {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new Error(`${label} is required.`);
	}

	return value.trim();
}

export function optional(value: FormDataEntryValue | null) {
	if (typeof value !== "string") {
		return null;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

export function slugify(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)+/g, "")
		.slice(0, 48);
}

export function randomToken(bytes = 32) {
	const values = new Uint8Array(bytes);
	crypto.getRandomValues(values);
	return Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
}

export async function sha256(value: string) {
	const data = new TextEncoder().encode(value);
	const digest = await crypto.subtle.digest("SHA-256", data);
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function dockerName(value: string) {
	return `forge-${slugify(value)}`;
}

export function domainFromSlug(slug: string) {
	return `${slug}.localhost`;
}
