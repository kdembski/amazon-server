import { OlxAdService } from "@/services/olx/OlxAdService";
import { OlxProductService } from "@/services/olx/OlxProductService";
import { WebSocketController } from "@/websockets/WebSocketController";
import { Server } from "http";

export class OlxAdWebSocketController extends WebSocketController {
  private static instance: OlxAdWebSocketController;
  private static adService: OlxAdService;
  private static productService: OlxProductService;

  public static getInstance(
    adService = new OlxAdService(),
    productService = new OlxProductService()
  ) {
    this.adService = adService;
    this.productService = productService;

    if (!this.instance) {
      this.instance = new OlxAdWebSocketController();
    }

    return this.instance;
  }

  private constructor() {
    super();
  }

  init(server: Server) {
    super.init(server, "/olx/ads");

    if (!this.webSocketServer) return this.throwUndefinedServer();

    this.webSocketServer.on("connection", (ws) => {
      ws.on("message", async (data) => {
        const adId = JSON.parse(data.toString());
        this.sendAdToAll(adId);
      });
    });
  }

  async sendAdToAll(adId: number) {
    const messageData = await this.getAd(adId);
    this.sendToAll(messageData);
  }

  private async getAd(adId: number) {
    const ad = await OlxAdWebSocketController.adService.selectable.getById(
      adId
    );
    const products = await OlxAdWebSocketController.productService.getRelated(
      ad.productAd?.product.brand,
      ad.productAd?.product.model
    );

    products.forEach((product) => {
      product.productAds = product.productAds.filter((productAd) => {
        return productAd.ad.id !== adId;
      });
    });

    return JSON.stringify({ ad, products });
  }
}
