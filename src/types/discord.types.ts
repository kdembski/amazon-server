import {
  CacheType,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

export type DiscordCommandT = {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction<CacheType>) => void;
};
