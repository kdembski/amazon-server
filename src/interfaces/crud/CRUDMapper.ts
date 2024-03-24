export interface ToCreateInputMapperI<CreateDto, CreateInput> {
  toCreateInput: (dto: CreateDto) => CreateInput;
}
