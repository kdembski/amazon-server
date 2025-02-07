import { AmazonAdWebSocketController } from "@/websockets/amazon/AmazonAdWebScoketController";
import { Server } from "http";

export function useWebSockets(server: Server) {
  const amazonAdWebSocketController = AmazonAdWebSocketController.getInstance();
  amazonAdWebSocketController.init(server);
  amazonAdWebSocketController.initScrap(server);
}
