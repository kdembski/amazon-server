import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import type { Server } from "node:http";
import { AmazonAdWebSocketController } from "@/websockets/amazon/AmazonAdWebScoketController";
import { resetSingleton } from "../../../support/fakes";

const { wss } = vi.hoisted(() => ({
  wss: { handleUpgrade: vi.fn(), emit: vi.fn(), on: vi.fn(), clients: new Set() },
}));

vi.mock("ws", () => ({
  WebSocketServer: vi.fn(function () {
    return wss;
  }),
  WebSocket: { OPEN: 1 },
}));

vi.mock("@/services/amazon/AmazonAdService", () => ({
  AmazonAdService: vi.fn(function () {
    return {};
  }),
}));

describe("AmazonAdWebSocketController", () => {
  beforeEach(() => resetSingleton(AmazonAdWebSocketController));

  it("is a singleton", () => {
    expect(AmazonAdWebSocketController.getInstance()).toBe(
      AmazonAdWebSocketController.getInstance()
    );
  });

  it("initializes on /amazon/ads and registers a message handler per connection", async () => {
    const server = new EventEmitter();

    AmazonAdWebSocketController.getInstance().init(server as unknown as Server);

    // Base class keep-alive handler first, then this controller's own one.
    const connectionHandlers = wss.on.mock.calls.filter(
      ([event]) => event === "connection"
    );
    expect(connectionHandlers).toHaveLength(2);

    server.emit("upgrade", { url: "/amazon/ads" }, "socket", "head");
    expect(wss.handleUpgrade).toHaveBeenCalledTimes(1);

    const ws = { on: vi.fn(), send: vi.fn() };
    (connectionHandlers[1][1] as (ws: unknown) => void)(ws);
    const messageHandler = ws.on.mock.calls.find(
      ([event]) => event === "message"
    )![1] as () => Promise<void>;
    await expect(messageHandler()).resolves.toBeUndefined();
  });
});
