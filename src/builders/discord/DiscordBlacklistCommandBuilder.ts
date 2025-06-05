import {
  CacheType,
  ChatInputCommandInteraction,
  InteractionContextType,
  SlashCommandBuilder,
} from "discord.js";
import { DiscordCommandBuilder } from "@/builders/discord/DiscordCommandBuilder";
import { BlacklistedKeywordService } from "@/services/blacklist/BlacklistedKeywordService";

export class DiscordBlacklistCommandBuilder extends DiscordCommandBuilder {
  private service;

  constructor(service = new BlacklistedKeywordService()) {
    super();
    this.service = service;
  }

  build() {
    return {
      blacklist: {
        data: new SlashCommandBuilder()
          .setName("blacklist")
          .setDescription("Obsługa blacklisty")
          .setContexts(InteractionContextType.Guild)
          .addSubcommand((subcommand) =>
            subcommand
              .setName("show")
              .setDescription(
                "Wyświetla wszystkie keywordy znajdujące sie na blackliście"
              )
          )
          .addSubcommand((subcommand) =>
            subcommand
              .setName("add")
              .setDescription("Dodaje keyword do blacklisty")
              .addStringOption((option) =>
                option
                  .setName("keyword")
                  .setDescription("Słowo klucz")
                  .setRequired(true)
              )
          )
          .addSubcommand((subcommand) =>
            subcommand
              .setName("remove")
              .setDescription("Usuwa keyword z blacklisty")
              .addStringOption((option) =>
                option
                  .setName("keyword")
                  .setDescription("Słowo klucz")
                  .setRequired(true)
              )
          ),
        execute: async (
          interaction: ChatInputCommandInteraction<CacheType>
        ) => {
          const subcommand = interaction.options.getSubcommand();

          switch (subcommand) {
            case "show":
              return this.listBlacklist(interaction);
            case "add":
              return this.addKeywordToBlacklist(interaction);
            case "remove":
              return this.removeKeywordFromBlacklist(interaction);
          }
        },
      },
    };
  }

  private listBlacklist(interaction: ChatInputCommandInteraction<CacheType>) {
    this.service
      .getAll()
      .then(async (keywords) => {
        const joined = keywords
          .map((keyword) => `*${keyword.value}*`)
          .join(", ");

        this.sendReply(interaction, [
          {
            title: "Blacklista",
            description: `Ogłoszenia, które w nazwie mają conajmniej jeden z zablokowanych keywordów, bedą ignorowane przy scrapowaniu.\nWyjątkiem jest kontrukcja z "+", w takim przypadku ogłoszenie zostanie zignorowane tylko, jeżeli nazwa zawiera każdy z wyrazów połączonych plusem.`,
            fields: [
              {
                name: "Keywordy",
                value: joined ? joined : "-",
              },
            ],
          },
        ]);
      })
      .catch((e) => {
        this.sendErrorReply(
          interaction,
          `Nie udało się pobrać keywordów. ${e}`
        );
      });
  }

  private async addKeywordToBlacklist(
    interaction: ChatInputCommandInteraction<CacheType>
  ) {
    const value = interaction.options.getString("keyword", true);
    if (/\s/.test(value)) {
      this.sendErrorReply(interaction, `Keyword nie powinien zawierać spacji`);
      return;
    }

    const keyword = await this.service.getByValue(value);
    if (keyword) {
      this.sendErrorReply(
        interaction,
        `Keyword **${value}** jest już na liście`
      );
      return;
    }

    this.service.creatable
      .create({ value })
      .then(() => {
        this.sendSuccessReply(interaction, `Dodano **${value}** do blacklisty`);
      })
      .catch((e) => {
        this.sendErrorReply(interaction, `Dodawanie nie powiodło się. ${e}`);
      });
  }

  private async removeKeywordFromBlacklist(
    interaction: ChatInputCommandInteraction<CacheType>
  ) {
    const value = interaction.options.getString("keyword", true);
    const keyword = await this.service.getByValue(value);

    if (!keyword) {
      this.sendErrorReply(interaction, `Nie znaleziono keyworda **${name}**`);
      return;
    }

    this.service.deletable
      .delete(keyword.id)
      .then(() => {
        this.sendSuccessReply(
          interaction,
          `Usunięto **${value}** z blacklisty`
        );
      })
      .catch((e) => {
        this.sendErrorReply(interaction, `Usuwanie nie powiodło się. ${e}`);
      });
  }
}
