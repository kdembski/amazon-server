import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import type { Server } from "node:http";
import { WebSocketServer } from "ws";
import { WebSocketController } from "@/websockets/WebSocketController";

type FakeClient = { readyState: number; send: ReturnType<typeof vi.fn> };

const { wss } = vi.hoisted(() => ({
  wss: {
    handleUpgrade: vi.fn(),
    emit: vi.fn(),
    on: vi.fn(),
    clients: new Set<FakeClient>(),
  },
}));

vi.mock("ws", () => ({
  WebSocketServer: vi.fn(function () {
    return wss;
  }),
  WebSocket: { OPEN: 1 },
}));

const fakeSocket = () => ({ on: vi.fn(), send: vi.fn() });

const setup = () => {
  const server = new EventEmitter();
  const controller = new WebSocketController();
  controller.init(server as unknown as Server, "/amazon/ads");
  const connectionHandler = wss.on.mock.calls.find(
    ([event]) => event === "connection"
  )![1] as (ws: unknown) => void;
  return { server, controller, connectionHandler };
};

describe("WebSocketController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    wss.clients.clear();
    wss.handleUpgrade.mockImplementation((_req, _socket, _head, cb) =>
      cb("socket")
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("creates a server in noServer mode so it does not hijack every upgrade", () => {
    setup();
    expect(WebSocketServer).toHaveBeenCalledWith({ noServer: true });
  });

  it("upgrades only requests for its route and emits connection", () => {
    const { server } = setup();
    const request = { url: "/amazon/ads?x=1" };

    server.emit("upgrade", request, "socket", "head");
    server.emit("upgrade", { url: "/other" }, "socket", "head");
    server.emit("upgrade", {}, "socket", "head");

    expect(wss.handleUpgrade).toHaveBeenCalledTimes(1);
    expect(wss.handleUpgrade).toHaveBeenCalledWith(
      request,
      "socket",
      "head",
      expect.any(Function)
    );
    expect(wss.emit).toHaveBeenCalledWith("connection", "socket", request);
  });

  it("pings every connected client every 40 seconds and logs socket errors", () => {
    const { connectionHandler } = setup();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const ws = fakeSocket();
    const other = fakeSocket();

    connectionHandler(ws);
    connectionHandler(other);
    vi.advanceTimersByTime(39_999);
    expect(ws.send).not.toHaveBeenCalled();
    vi.advanceTimersByTime(40_001);

    expect(ws.send).toHaveBeenCalledTimes(2);
    expect(ws.send).toHaveBeenCalledWith("ping");
    expect(other.send).toHaveBeenCalledTimes(2);

    const errorHandler = ws.on.mock.calls.find(
      ([event]) => event === "error"
    )![1] as (e: unknown) => void;
    errorHandler("boom");
    expect(error).toHaveBeenCalledWith("boom");
  });

  it("sendToAll sends only to open clients", () => {
    const { controller } = setup();
    const open: FakeClient = { readyState: 1, send: vi.fn() };
    const closed: FakeClient = { readyState: 3, send: vi.fn() };
    wss.clients.add(open);
    wss.clients.add(closed);

    controller.sendToAll("data");

    expect(open.send).toHaveBeenCalledWith("data");
    expect(closed.send).not.toHaveBeenCalled();
  });

  it("throws when used before init", () => {
    expect(() => new WebSocketController().sendToAll("x")).toThrow(
      "Web socket server is `undefined`. Run `init` method first"
    );
  });
});
