import { getCurrentUser } from "@/utils/auth";
import { getApplication } from "@/utils/db";
import { getContainerLogs } from "@/utils/docker";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const user = await getCurrentUser();

	if (!user) {
		return new Response("Unauthorized", { status: 401 });
	}

	const { id } = await params;
	const app = await getApplication(user.id, id);

	if (!app?.container_id) {
		return new Response("No container is attached to this application.", { status: 404 });
	}

	const dockerResponse = await getContainerLogs(app.container_id);

	if (!dockerResponse.body) {
		return new Response("No Docker log stream available.", { status: 502 });
	}

	const decoder = new TextDecoder();
	const encoder = new TextEncoder();
	const reader = dockerResponse.body.getReader();

	const stream = new ReadableStream({
		async pull(controller) {
			const { done, value } = await reader.read();

			if (done) {
				controller.close();
				return;
			}

			const text = decoder.decode(value, { stream: true });
			const lines = text.split(/\r?\n/).filter(Boolean);

			for (const line of lines) {
				controller.enqueue(encoder.encode(`data: ${line.replace(/\u0000/g, "")}\n\n`));
			}
		},
		cancel() {
			reader.cancel();
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream; charset=utf-8",
			"Cache-Control": "no-cache, no-transform",
			Connection: "keep-alive",
		},
	});
}
