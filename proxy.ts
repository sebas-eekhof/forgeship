import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const sessionCookie = "forge_session";

export function proxy(request: NextRequest) {
	const hasSession = Boolean(request.cookies.get(sessionCookie)?.value);
	const isProtected = request.nextUrl.pathname.startsWith("/dashboard") || request.nextUrl.pathname.startsWith("/apps");

	if (isProtected && !hasSession) {
		return NextResponse.redirect(new URL("/", request.url));
	}

	if (request.nextUrl.pathname === "/" && hasSession) {
		return NextResponse.redirect(new URL("/dashboard", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/", "/dashboard/:path*", "/apps/:path*"],
};
