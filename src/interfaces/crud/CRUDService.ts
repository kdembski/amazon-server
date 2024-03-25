export interface SelectableServiceI<SelectResult> {
  getById: (id: number) => Promise<SelectResult>;
}

export interface CreatableServiceI<CreateDto, Model> {
  create: (data: CreateDto) => Promise<Model>;
}

export interface UpdatableServiceI<UpdateDto, Model> {
  update: (id: number, data: UpdateDto) => Promise<Model>;
}

export interface DeletableServiceI<Model> {
  delete: (id: number) => Promise<Model>;
}
