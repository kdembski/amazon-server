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

  async createMany(dtos: CreateDto[]) {
    const models: Model[] = [];

    for (const dto of dtos) {
      const model = await this.create(dto);
      models.push(model);
    }

    return models;
  }
}
