import { describe, expect, it, vi } from "vitest";
import { respond } from "@/shared/http/respond";
import { HttpError } from "@/shared/http/HttpError";
import { fakeResponse } from "../../../support/fakes";

describe("respond", () => {
  it("sends the result as JSON", async () => {
    const { response, json } = fakeResponse();

    await respond(response, async () => ({ ok: true }));

    expect(json).toHaveBeenCalledWith({ ok: true });
  });

  it("answers a thrown error through ResponseErrorService", async () => {
    const { response, status, send, json } = fakeResponse();

    await respond(response, () => {
      throw new HttpError(400, "bad");
    });

    expect(status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith("bad");
    expect(json).not.toHaveBeenCalled();
  });

  it("passes the error to onError", async () => {
    const { response } = fakeResponse();
    const onError = vi.fn();
    const error = new Error("boom");

    await respond(response, () => Promise.reject(error), onError);

    expect(onError).toHaveBeenCalledWith(error);
  });
});
