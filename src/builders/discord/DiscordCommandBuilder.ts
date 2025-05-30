import { getSpacing } from "@/helpers/discord";
import {
  APIEmbed,
  CacheType,
  ChatInputCommandInteraction,
  JSONEncodable,
  MessageFlags,
} from "discord.js";

export abstract class DiscordCommandBuilder {
  abstract build(): void;

  protected async sendReply(
    interaction: ChatInputCommandInteraction<CacheType>,
    embeds: (APIEmbed | JSONEncodable<APIEmbed>)[]
  ) {
    return interaction.reply({
      embeds,
      flags: MessageFlags.Ephemeral,
    });
  }

  protected async sendInfoReply(
    interaction: ChatInputCommandInteraction<CacheType>,
    message: string
  ) {
    return interaction.reply({
      content: `:information_source:${getSpacing(3)}${message}`,
      flags: MessageFlags.Ephemeral,
    });
  }

  protected async sendSuccessReply(
    interaction: ChatInputCommandInteraction<CacheType>,
    message: string
  ) {
    return interaction.reply({
      content: `:white_check_mark:${getSpacing(3)}${message}`,
      flags: MessageFlags.Ephemeral,
    });
  }

  protected async sendErrorReply(
    interaction: ChatInputCommandInteraction<CacheType>,
    message: string
  ) {
    return interaction.reply({
      content: `:no_entry:${getSpacing(3)}${message}`,
      flags: MessageFlags.Ephemeral,
    });
  }
}
