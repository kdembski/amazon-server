import { OlxAdCategoryWebSocketController } from "@/websockets/olx/OlxAdCategoryWebSocketController";
import { OlxAdWebSocketController } from "@/websockets/olx/OlxAdWebSocketController";
import { Server } from "http";

export function useWebSockets(server: Server) {
  OlxAdWebSocketController.getInstance().init(server);
  OlxAdCategoryWebSocketController.getInstance().init(server);
}
