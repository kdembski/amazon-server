import { describe, expect, it } from "vitest";
import { ResponseErrorService } from "@/shared/http/ResponseErrorService";
import { fakeResponse, fakeSystemLogService } from "../../../support/fakes";

describe("ResponseErrorService", () => {
  it("maps P2002 to 422 with the constraint target", () => {
    const { response, status, send } = fakeResponse();
    new ResponseErrorService(response).send({
      code: "P2002",
      meta: { target: "asin_UNIQUE" },
    });

    expect(status).toHaveBeenCalledWith(422);
    expect(send).toHaveBeenCalledWith(
      "Unique constraint failed on the 'asin_UNIQUE'"
    );
  });

  it("uses the status of the error", () => {
    const { response, status, send } = fakeResponse();
    new ResponseErrorService(response).send(
      Object.assign(new Error("Exclusion rule must be a string"), { status: 400 })
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith("Exclusion rule must be a string");
  });

  it("returns 422 for a missing related record", () => {
    const { response, status } = fakeResponse();
    new ResponseErrorService(response).send({
      code: "P2003",
      meta: { field_name: "categoryId" },
    });

    expect(status).toHaveBeenCalledWith(422);
  });

  it("maps P1001 to 503", () => {
    const { response, status, send } = fakeResponse();
    new ResponseErrorService(response).send({ code: "P1001" });

    expect(status).toHaveBeenCalledWith(503);
    expect(send).toHaveBeenCalledWith("Can't reach database server");
  });

  it("uses the last line of the message for errors without code", () => {
    const { response, status, send } = fakeResponse();
    new ResponseErrorService(response).send(
      new Error("first line\r\nlast line")
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(send).toHaveBeenCalledWith("last line");
  });

  it("dumps code and meta for other Prisma codes", () => {
    const { response, status, send } = fakeResponse();
    new ResponseErrorService(response).send({
      code: "P2025",
      meta: { cause: "x" },
    });

    expect(status).toHaveBeenCalledWith(500);
    expect(send).toHaveBeenCalledWith(
      "P2025::\n\n" + JSON.stringify({ cause: "x" }, null, 2)
    );
  });

  it("logs a 5xx as error with the request", () => {
    const { response } = fakeResponse();
    const logger = fakeSystemLogService();
    const req = {
      method: "PUT",
      originalUrl: "/amazon/ads/5?x=1",
      params: { id: "5" },
      query: { x: "1" },
      body: { prices: [] },
    };
    Object.assign(response, { req });
    const error = new Error("db down");

    new ResponseErrorService(response, logger.service).send(error);

    expect(logger.error).toHaveBeenCalledWith(
      "ResponseErrorService",
      "PUT /amazon/ads/5?x=1 failed with 500: db down",
      {
        error,
        request: {
          method: "PUT",
          path: "/amazon/ads/5?x=1",
          params: { id: "5" },
          query: { x: "1" },
          body: { prices: [] },
          status: 500,
        },
      }
    );
  });

  it("logs a 4xx as warn", () => {
    const { response } = fakeResponse();
    const logger = fakeSystemLogService();
    const error = Object.assign(new Error("invalid"), { status: 400 });

    new ResponseErrorService(response, logger.service).send(error);

    expect(logger.warn).toHaveBeenCalledWith(
      "ResponseErrorService",
      "Request failed with 400: invalid",
      { error, request: undefined }
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("does not throw for errors without a message", () => {
    const { response, status, send } = fakeResponse();

    expect(() => new ResponseErrorService(response).send("boom")).not.toThrow();
    expect(status).toHaveBeenCalledWith(500);
    expect(send).toHaveBeenCalledWith("boom");
  });
});
