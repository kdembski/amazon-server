import { OlxAdWebSocketController } from "@/websockets/olx/OlxAdWebSocketController";
import { Server } from "http";

export function useWebSockets(server: Server) {
  const init = () => {
    new OlxAdWebSocketController(server).init();
  };

  return { init };
}
