import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { migrate, sql } from "@/utils/db";
import { randomToken, sha256 } from "@/utils/strings";

export const sessionCookie = "forge_session";

export type User = {
	id: string;
	name: string;
	email: string;
	created_at: string;
};

export async function createUser(name: string, email: string, password: string) {
	await migrate();

	const passwordHash = await Bun.password.hash(password, {
		algorithm: "argon2id",
	});

	const [user] = await sql<User[]>`
		insert into users (name, email, password_hash)
		values (${name}, ${email.toLowerCase()}, ${passwordHash})
		returning id, name, email, created_at
	`;

	return user;
}

export async function verifyUser(email: string, password: string) {
	await migrate();

	const [user] = await sql<(User & { password_hash: string })[]>`
		select id, name, email, password_hash, created_at
		from users
		where email = ${email.toLowerCase()}
	`;

	if (!user) {
		return null;
	}

	const valid = await Bun.password.verify(password, user.password_hash);

	if (!valid) {
		return null;
	}

	return {
		id: user.id,
		name: user.name,
		email: user.email,
		created_at: user.created_at,
	};
}

export async function createSession(userId: string) {
	await migrate();

	const token = randomToken();
	const tokenHash = await sha256(token);
	const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

	await sql`
		insert into sessions (user_id, token_hash, expires_at)
		values (${userId}, ${tokenHash}, ${expiresAt})
	`;

	const cookieStore = await cookies();
	cookieStore.set(sessionCookie, token, {
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		expires: expiresAt,
		path: "/",
	});
}

export async function destroySession() {
	const cookieStore = await cookies();
	const token = cookieStore.get(sessionCookie)?.value;

	if (token) {
		await migrate();
		await sql`delete from sessions where token_hash = ${await sha256(token)}`;
	}

	cookieStore.delete(sessionCookie);
}

export async function getCurrentUser() {
	const cookieStore = await cookies();
	const token = cookieStore.get(sessionCookie)?.value;

	if (!token) {
		return null;
	}

	await migrate();

	const [session] = await sql<User[]>`
		select users.id, users.name, users.email, users.created_at
		from sessions
		join users on users.id = sessions.user_id
		where sessions.token_hash = ${await sha256(token)}
			and sessions.expires_at > now()
	`;

	return session ?? null;
}

export async function requireUser() {
	const user = await getCurrentUser();

	if (!user) {
		redirect("/");
	}

	return user;
}
