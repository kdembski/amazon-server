import express from "express";
import { createApp } from "@/app";

export const API_TOKEN_HEADER = "Bearer api-token";

// Requests without an Authorization header get the valid token from tests/integration/env.ts.
export const createTestApp = () => {
  const app = express();
  app.use((request, _response, next) => {
    request.headers.authorization ??= API_TOKEN_HEADER;
    next();
  });
  app.use(createApp());
  return app;
};
