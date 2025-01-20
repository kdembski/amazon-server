import { ToCreateInputMapperI } from "@/interfaces/crud/CRUDMapper";
import { CreatableRepositoryI } from "@/interfaces/crud/CRUDRepository";
import { CreatableServiceI } from "@/interfaces/crud/CRUDService";

export class CreatableService<CreateDto, CreateInput, Model>
  implements CreatableServiceI<CreateDto, Model>
{
  private repository;
  private mapper;

  constructor(
    repository: CreatableRepositoryI<CreateInput, Model>,
    mapper: ToCreateInputMapperI<CreateDto, CreateInput>
  ) {
    this.repository = repository;
    this.mapper = mapper;
  }

  create(dto: CreateDto) {
    const input = this.mapper.toCreateInput(dto);
    return this.repository.create(input);
  }

  createMany(dtos: CreateDto[]) {
    return dtos.map((dto) => this.create(dto));
  }
}
