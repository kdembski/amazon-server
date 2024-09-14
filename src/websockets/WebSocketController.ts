import { parse } from "url";
import { WebSocketServer } from "ws";
import { Server } from "http";
import { WebSocket } from "ws";

export class WebSocketController {
  protected webSocketServer?: WebSocketServer;
  private keepAliveInterval?: ReturnType<typeof setInterval>;

  init(server: Server, route: string) {
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

    this.initKeepAlive();
  }

  private initKeepAlive() {
    if (!this.webSocketServer) return this.throwUndefinedServer();

    this.webSocketServer.on("connection", (ws) => {
      ws.on("error", (data) => console.error(data));

      this.keepAliveInterval = setInterval(() => {
        ws.send("ping");
      }, 40000);
    });
  }

  sendToAll(data: string) {
    console.log({ data });
    if (!this.webSocketServer) return this.throwUndefinedServer();

    this.webSocketServer.clients.forEach((client) => {
      console.log("Client ready state: " + client.readyState);
      if (client.readyState !== WebSocket.OPEN) {
        return;
      }

      client.send(data);
    });
  }

  protected throwUndefinedServer() {
    throw Error("Web socket server is `undefined`. Run `init` method first");
  }
}
