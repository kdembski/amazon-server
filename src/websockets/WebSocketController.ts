import { parse } from "url";
import { WebSocketServer } from "ws";
import { Server } from "http";

export class WebSocketController {
  protected webSocketServer: WebSocketServer;
  private keepAliveInterval?: ReturnType<typeof setInterval>;

  constructor(server: Server, route: string) {
    const webSocketServer = new WebSocketServer({ noServer: true });
    this.webSocketServer = webSocketServer;

    server.on("upgrade", (request, socket, head) => {
      const { pathname } = parse(request.url || "");

      if (pathname !== route) {
        return;
      }

      webSocketServer.handleUpgrade(request, socket, head, (ws) => {
        webSocketServer.emit("connection", ws, request);
      });
    });
  }

  init() {
    this.webSocketServer.on("connection", (ws) => {
      ws.on("error", (data) => console.error(data));

      this.keepAliveInterval = setInterval(() => {
        ws.send("");
      }, 40000);
    });
  }
}
