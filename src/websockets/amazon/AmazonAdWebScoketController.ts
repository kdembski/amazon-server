import { AmazonAdUpdateDto } from "@/dtos/amazon/AmazonAdDtos";
import { AmazonAdService } from "@/services/amazon/AmazonAdService";
import { WebSocketController } from "@/websockets/WebSocketController";
import { Server } from "http";

export class AmazonAdWebSocketController extends WebSocketController {
  private static instance: AmazonAdWebSocketController;
  private adService;

  public static getInstance() {
    if (!this.instance) {
      this.instance = new AmazonAdWebSocketController();
    }

    return this.instance;
  }

  private constructor(adService = new AmazonAdService()) {
    super();
    this.adService = adService;
  }

  init(server: Server) {
    super.init(server, "/amazon/ads");

    if (!this.webSocketServer) return this.throwUndefinedServer();

    this.webSocketServer.on("connection", (ws) => {
      ws.on("message", async () => {});
    });
  }
}
