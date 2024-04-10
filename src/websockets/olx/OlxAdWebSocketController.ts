import { OlxAdService } from "@/services/olx/OlxAdService";
import { OlxProductService } from "@/services/olx/OlxProductService";
import { WebSocketController } from "@/websockets/WebSocketController";
import { Server } from "http";
import { WebSocket } from "ws";

export class OlxAdWebSocketController extends WebSocketController {
  adService;
  productService;

  constructor(
    server: Server,
    adService = new OlxAdService(),
    productService = new OlxProductService()
  ) {
    super(server, "/olx/ads");
    this.adService = adService;
    this.productService = productService;
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
    const ad = await this.adService.selectable.getById(adId);
    const products = await this.productService.getRelated(
      ad.productAd?.product.brand,
      ad.productAd?.product.model
    );
    ws.send(JSON.stringify({ ad, products }));
  }
}
