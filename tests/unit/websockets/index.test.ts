import { describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";
import { useWebSockets } from "@/websockets";

const { init } = vi.hoisted(() => ({ init: vi.fn() }));

vi.mock("@/websockets/amazon/AmazonAdWebScoketController", () => ({
  AmazonAdWebSocketController: { getInstance: () => ({ init }) },
}));

describe("useWebSockets", () => {
  it("initializes the Amazon ad websocket controller with the server", () => {
    const server = {} as Server;

    useWebSockets(server);

    expect(init).toHaveBeenCalledTimes(1);
    expect(init.mock.calls[0][0]).toBe(server);
  });
});
