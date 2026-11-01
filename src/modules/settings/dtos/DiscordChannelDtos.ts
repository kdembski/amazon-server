import { DiscordChannelRepository } from "@/modules/settings/repositories/DiscordChannelRepository";

export interface DiscordChannelCreateDto {
  name: string;
  token: string;
}

export interface DiscordChannelUpdateDto {
  name?: string;
  token?: string;
}

export type DiscordChannelSelectDto = NonNullable<
  Awaited<ReturnType<DiscordChannelRepository["getById"]>>
>;
