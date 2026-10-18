import { Router } from "express";

export interface SubRouterI {
  readonly path: string;
  build(): SubRouterI;
  get router(): Router;
}
