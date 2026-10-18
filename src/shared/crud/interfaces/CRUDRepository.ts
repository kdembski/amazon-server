export interface SelectableRepositoryI<SelectResult> {
  getById: (id: number) => Promise<SelectResult>;
}

export interface CreatableRepositoryI<CreateInput, Model> {
  create: (data: CreateInput) => Promise<Model>;
}

export interface UpdatableRepositoryI<UpdateInput, Model> {
  update: (id: number, data: UpdateInput) => Promise<Model>;
}

export interface DeletableRepositoryI<Model> {
  delete: (id: number) => Promise<Model>;
}
