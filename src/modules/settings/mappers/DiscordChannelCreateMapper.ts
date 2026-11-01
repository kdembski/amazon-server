import { DiscordChannelCreateDto } from "@/modules/settings/dtos/DiscordChannelDtos";
import { ToCreateInputMapperI } from "@/shared/crud/interfaces/CRUDMapper";
import { Prisma } from "@prisma/client";

export class DiscordChannelCreateMapper
  implements
    ToCreateInputMapperI<DiscordChannelCreateDto, Prisma.DiscordChannelCreateInput>
{
  toCreateInput(dto: DiscordChannelCreateDto) {
    return {
      name: dto.name,
      token: dto.token,
      createdAt: new Date(Date.now()),
      updatedAt: new Date(Date.now()),
    };
  }
}
