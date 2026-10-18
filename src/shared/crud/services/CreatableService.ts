import { ToCreateInputMapperI } from "@/shared/crud/interfaces/CRUDMapper";
import { CreatableRepositoryI } from "@/shared/crud/interfaces/CRUDRepository";
import { CreatableServiceI } from "@/shared/crud/interfaces/CRUDService";

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
      try {
        models.push(await this.create(dto));
      } catch (error: any) {
        if (error?.code !== "P2002") throw error;
      }
    }

    return models;
  }
}
