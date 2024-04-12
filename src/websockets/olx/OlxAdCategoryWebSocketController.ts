import { OlxAdCategoryService } from "@/services/olx/OlxAdCategoryService";
import { WebSocketController } from "@/websockets/WebSocketController";
import { Server } from "http";

export class OlxAdCategoryWebSocketController extends WebSocketController {
  private static instance: OlxAdCategoryWebSocketController;
  private static categoryService: OlxAdCategoryService;

  public static getInstance(categoryService = new OlxAdCategoryService()) {
    this.categoryService = categoryService;

    if (!this.instance) {
      this.instance = new OlxAdCategoryWebSocketController();
    }

    return this.instance;
  }

  private constructor() {
    super();
  }

  init(server: Server) {
    super.init(server, "/olx/ads/categories");

    if (!this.webSocketServer) return this.throwUndefinedServer();

    this.webSocketServer.on("connection", (ws) => {
      ws.on("message", () => {
        this.sendCategoriesToAll();
      });
    });
  }

  async sendCategoriesToAll() {
    const categories =
      await OlxAdCategoryWebSocketController.categoryService.getAll();

    this.sendToAll(JSON.stringify(categories));
  }
}
