import { WebSocketHibernationServer } from "..";


export interface Env {
    WEBSOCKET_HIBERNATION_SERVER: DurableObjectNamespace<WebSocketHibernationServer>;
}

export interface CustomWebSocket extends Env {
    username: string,
    roomId: string,
}
