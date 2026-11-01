import { DiscordChannelUpdateDto } from "@/modules/settings/dtos/DiscordChannelDtos";
import { ToUpdateInputMapperI } from "@/shared/crud/interfaces/CRUDMapper";
import { Prisma } from "@prisma/client";

export class DiscordChannelUpdateMapper
  implements
    ToUpdateInputMapperI<DiscordChannelUpdateDto, Prisma.DiscordChannelUpdateInput>
{
  toUpdateInput(dto: DiscordChannelUpdateDto) {
    return {
      name: dto.name,
      token: dto.token,
      updatedAt: new Date(Date.now()),
    };
  }
}
