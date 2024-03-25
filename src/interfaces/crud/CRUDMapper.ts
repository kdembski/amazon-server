export interface ToCreateInputMapperI<CreateDto, CreateInput> {
  toCreateInput: (dto: CreateDto) => CreateInput;
}

export interface ToUpdateInputMapperI<UpdateDto, UpdateInput> {
  toUpdateInput: (dto: UpdateDto) => UpdateInput;
}
