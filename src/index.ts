interface Env {}
export default {
	async fetch(request, env, ctx): Promise<Response> {
		// Service configured to receive logs
		const LOG_URL = "https://log-service.example.com/";

		async function postLog(data) {
			return await fetch(LOG_URL, {
				method: "POST",
				body: data,
			});
		}

		let response;

		try {
			response = await fetch(request);
			if (!response.ok && !response.redirected) {
				const body = await response.text();
				throw new Error(
					"Bad response at origin. Status: " +
						response.status +
						" Body: " +
						// Ensure the string is small enough to be a header
						body.trim().substring(0, 10),
				);
			}
		} catch (err) {
			// Without ctx.waitUntil(), your fetch() to Cloudflare's
			// logging service may or may not complete
			ctx.waitUntil(postLog(err.toString()));
			const stack = JSON.stringify(err.stack) || err;
			// Copy the response and initialize body to the stack trace
			response = new Response(stack, response);
			// Add the error stack into a header to find out what happened
			response.headers.set("X-Debug-stack", stack);
			response.headers.set("X-Debug-err", err);
		}
		return response;
	},
} satisfies ExportedHandler<Env>;
