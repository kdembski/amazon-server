export interface SelectableServiceI<SelectResult> {
  getById: (id: number) => Promise<SelectResult>;
}

export interface CreatableServiceI<CreateDto, Model> {
  create: (data: CreateDto) => Promise<Model>;
}

export interface UpdatableServiceI<UpdateInput, Model> {
  update: (id: number, data: UpdateInput) => Promise<Model>;
}

export interface DeletableServiceI<Model> {
  delete: (id: number) => Promise<Model>;
}
