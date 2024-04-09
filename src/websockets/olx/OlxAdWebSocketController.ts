import { OlxAdService } from "@/services/olx/OlxAdService";
import { WebSocketController } from "@/websockets/WebSocketController";
import { Server } from "http";
import { WebSocket } from "ws";

export class OlxAdWebSocketController extends WebSocketController {
  service;

  constructor(server: Server, service = new OlxAdService()) {
    super(server, "/olx/ads");
    this.service = service;
  }

  init() {
    super.init();

    this.webSocketServer.on("connection", (ws) => {
      ws.on("message", (data) => {
        const adId = JSON.parse(data.toString());

        this.webSocketServer.clients.forEach((client) => {
          if (client.readyState !== WebSocket.OPEN) {
            return;
          }

          this.onMessage(adId, client);
        });
      });
    });
  }

  private async onMessage(adId: number, ws: WebSocket) {
    const ad = await this.service.selectable.getById(adId);
    ws.send(JSON.stringify({ ad }));
  }
}
