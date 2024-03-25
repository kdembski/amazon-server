import { ToUpdateInputMapperI } from "@/interfaces/crud/CRUDMapper";
import { UpdatableRepositoryI } from "@/interfaces/crud/CRUDRepository";
import { UpdatableServiceI } from "@/interfaces/crud/CRUDService";

export class UpdatableService<UpdateDto, UpdateInput, Model>
  implements UpdatableServiceI<UpdateDto, Model>
{
  private repository;
  private mapper;

  constructor(
    repository: UpdatableRepositoryI<UpdateInput, Model>,
    mapper: ToUpdateInputMapperI<UpdateDto, UpdateInput>
  ) {
    this.repository = repository;
    this.mapper = mapper;
  }

  update(id: number, dto: UpdateDto) {
    const input = this.mapper.toUpdateInput(dto);
    return this.repository.update(id, input);
  }
}
