import { AmazonAdWebSocketController } from "@/websockets/amazon/AmazonAdWebScoketController";
import { Server } from "http";

export function useWebSockets(server: Server) {
  AmazonAdWebSocketController.getInstance().init(server);
}
