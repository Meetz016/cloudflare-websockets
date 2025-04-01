import { DurableObject } from "cloudflare:workers";
import { CustomWebSocket } from "./interfaces/customWebsocket.interface";

// Worker
export default {
	async fetch(
		request: Request,
		env: CustomWebSocket,
		ctx: ExecutionContext,
	): Promise<Response> {
		if (request.url.endsWith("/websocket")) {
			const upgradeHeader = request.headers.get("Upgrade");
			if (!upgradeHeader || upgradeHeader !== "websocket") {
				return new Response("Durable Object expected Upgrade: websocket", {
					status: 426,
				});
			}

			// This example will refer to the same Durable Object,
			// since the name "foo" is hardcoded.
			let id = env.WEBSOCKET_HIBERNATION_SERVER.idFromName("foo");
			let stub = env.WEBSOCKET_HIBERNATION_SERVER.get(id);

			return stub.fetch(request);
		}

		return new Response(null, {
			status: 400,
			statusText: "Bad Request",
			headers: {
				"Content-Type": "text/plain",
			},
		});
	},
};

// Durable Object
export class WebSocketHibernationServer extends DurableObject {
	async fetch(request: Request): Promise<Response> {
		// Creates two ends of a WebSocket connection.
		const webSocketPair = new WebSocketPair();
		const [client, server] = Object.values(webSocketPair);

		// Calling `acceptWebSocket()` informs the runtime that this WebSocket is to begin terminating
		// request within the Durable Object. It has the effect of "accepting" the connection,
		// and allowing the WebSocket to send and receive messages.
		// Unlike `ws.accept()`, `state.acceptWebSocket(ws)` informs the Workers Runtime that the WebSocket
		// is "hibernatable", so the runtime does not need to pin this Durable Object to memory while
		// the connection is open. During periods of inactivity, the Durable Object can be evicted
		// from memory, but the WebSocket connection will remain open. If at some later point the
		// WebSocket receives a message, the runtime will recreate the Durable Object
		// (run the `constructor`) and deliver the message to the appropriate handler.
		this.ctx.acceptWebSocket(server);
		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	}

	async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
		ws.send(
			`[Durable Object] message: ${message}, connections: ${this.ctx.getWebSockets().length}`,
		);
	}
	async webSocketClose(
		ws: WebSocket,
		code: number,
		reason: string,
		wasClean: boolean,
	) {
		console.log("Connection closed....")
		// If the client closes the connection, the runtime will invoke the webSocketClose() handler.
		ws.close(code, "Durable Object is closing WebSocket");
	}
}