import { Response } from "express";
import { ResponseErrorService } from "@/shared/http/ResponseErrorService";

// Sends the result of `getResult` as JSON, or its error through `onError`
export async function respond(
  response: Response,
  getResult: () => unknown,
  onError = (error: unknown) => new ResponseErrorService(response).send(error)
) {
  try {
    response.json(await getResult());
  } catch (error) {
    onError(error);
  }
}
