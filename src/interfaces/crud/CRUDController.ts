import { Request, Response } from "express";

export interface SelectableControllerI {
  getById: (request: Request<{ id: string }>, response: Response) => void;
}

export interface CreatableControllerI<CreateDto> {
  create: (request: Request<{}, {}, CreateDto>, response: Response) => void;
}

export interface UpdatableControllerI<UpdateInput> {
  update: (
    request: Request<{ id: string }, {}, UpdateInput>,
    response: Response
  ) => void;
}

export interface DeletableControllerI {
  delete: (request: Request<{ id: string }>, response: Response) => void;
}
