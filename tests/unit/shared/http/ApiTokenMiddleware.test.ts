import { describe, expect, it, vi } from "vitest";
import type { Request } from "express";
import { ApiTokenMiddleware } from "@/shared/http/ApiTokenMiddleware";
import { fakeResponse, unitLogger } from "../../../support/fakes";

const call = (token: string | undefined, authorization: string | undefined) => {
  const { response, status, send } = fakeResponse();
  const request = {
    header: vi.fn((name: string) => (name === "Authorization" ? authorization : undefined)),
  } as unknown as Request;
  const next = vi.fn();

  new ApiTokenMiddleware(token).handle(request, response, next);

  return { next, status, send };
};

describe("ApiTokenMiddleware", () => {
  it("calls next for Authorization: Bearer <token>", () => {
    const { next, status } = call("secret", "Bearer secret");

    expect(next).toHaveBeenCalledOnce();
    expect(status).not.toHaveBeenCalled();
  });

  it.each([undefined, "Bearer wrong", "secret", "Basic secret"])(
    "rejects Authorization %s with 401",
    (authorization) => {
      const { next, status, send } = call("secret", authorization);

      expect(status).toHaveBeenCalledWith(401);
      expect(send).toHaveBeenCalledWith("Invalid API token");
      expect(next).not.toHaveBeenCalled();
    }
  );

  it.each(["Bearer ", "Bearer undefined", undefined])(
    "rejects every request when API_TOKEN is unset (Authorization %s)",
    (authorization) => {
      const { next, status } = call(undefined, authorization);

      expect(status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    }
  );

  it("does not log a rejected request", () => {
    call("secret", "Bearer wrong");

    expect(unitLogger().warn).not.toHaveBeenCalled();
    expect(unitLogger().error).not.toHaveBeenCalled();
  });

  it("reads the token from API_TOKEN by default", () => {
    vi.stubEnv("API_TOKEN", "from-env");
    const { response } = fakeResponse();
    const next = vi.fn();
    const request = { header: () => "Bearer from-env" } as unknown as Request;

    new ApiTokenMiddleware().handle(request, response, next);

    expect(next).toHaveBeenCalledOnce();
    vi.unstubAllEnvs();
  });
});
