import {
  CacheType,
  ChatInputCommandInteraction,
  InteractionContextType,
  SlashCommandBuilder,
} from "discord.js";
import { DiscordCommandBuilder } from "@/builders/discord/DiscordCommandBuilder";
import { AmazonAdCategoryService } from "@/services/amazon/AmazonAdCategoryService";

export class DiscordCategoriesCommandBuilder extends DiscordCommandBuilder {
  private service;

  constructor(service = new AmazonAdCategoryService()) {
    super();
    this.service = service;
  }

  build() {
    return {
      categories: {
        data: new SlashCommandBuilder()
          .setName("categories")
          .setDescription("Obsługa kategorii")
          .setContexts(InteractionContextType.Guild)
          .addSubcommand((subcommand) =>
            subcommand
              .setName("list")
              .setDescription("Wyświetla listę dostępnych kategorii")
          )
          .addSubcommand((subcommand) =>
            subcommand
              .setName("activate")
              .setDescription("Dodaje kategorię do aktywnych")
              .addStringOption((option) =>
                option
                  .setName("name")
                  .setDescription("Nazwa kategorii")
                  .setRequired(true)
              )
          )
          .addSubcommand((subcommand) =>
            subcommand
              .setName("deactivate")
              .setDescription("Usuwa kategorię z aktywnych")
              .addStringOption((option) =>
                option
                  .setName("name")
                  .setDescription("Nazwa kategorii")
                  .setRequired(true)
              )
          ),
        execute: async (
          interaction: ChatInputCommandInteraction<CacheType>
        ) => {
          const subcommand = interaction.options.getSubcommand();

          switch (subcommand) {
            case "list":
              return this.listCategories(interaction);
            case "activate":
              return this.addCategoryToActive(interaction);
            case "deactivate":
              return this.removeCategoryFromActive(interaction);
          }
        },
      },
    };
  }

  private listCategories(interaction: ChatInputCommandInteraction<CacheType>) {
    this.service
      .getAll()
      .then((categories) => {
        const active = categories
          .filter((cat) => cat.active)
          .map((cat) => `[${cat.name}](https://www.amazon.pl/s?i=${cat.name})`)
          .join(", ");

        const inactive = categories
          .filter((cat) => !cat.active)
          .map((cat) => `[${cat.name}](https://www.amazon.pl/s?i=${cat.name})`)
          .join(", ");

        this.sendReply(interaction, [
          {
            title: "Lista kategorii",
            description: "Tylko aktywne kategorie będą scrapowane.",
            fields: [
              {
                name: "Aktywne",
                value: active.length ? active : "-",
              },
              {
                name: "Nieaktywne",
                value: inactive.length ? inactive : "-",
              },
            ],
          },
        ]);
      })
      .catch((e) => {
        this.sendErrorReply(interaction, `Nie udało się pobrać listy. ${e}`);
      });
  }

  private async addCategoryToActive(
    interaction: ChatInputCommandInteraction<CacheType>
  ) {
    const name = interaction.options.getString("name", true);
    const category = await this.service.getByName(name);

    if (!category) {
      this.sendErrorReply(
        interaction,
        `Nie znaleziono kategorii o nazwie **${name}**`
      );
      return;
    }

    if (category.active) {
      this.sendInfoReply(
        interaction,
        `Kategoria **${category.name}** jest już aktywna`
      );
      return;
    }

    this.service
      .updateActive(category?.id, true)
      .then(() => {
        this.sendSuccessReply(
          interaction,
          `Dodano **${category.name}** do aktywnych kategorii`
        );
      })
      .catch((e) => {
        this.sendErrorReply(interaction, `Dodawanie nie powiodło się. ${e}`);
      });
  }

  private async removeCategoryFromActive(
    interaction: ChatInputCommandInteraction<CacheType>
  ) {
    const name = interaction.options.getString("name", true);
    const category = await this.service.getByName(name);

    if (!category) {
      this.sendErrorReply(
        interaction,
        `Nie znaleziono kategorii o nazwie **${name}**`
      );
      return;
    }

    if (!category.active) {
      this.sendInfoReply(
        interaction,
        `Kategoria **${category.name}** nie jest aktywna`
      );
      return;
    }

    this.service
      .updateActive(category?.id, false)
      .then(() => {
        this.sendSuccessReply(
          interaction,
          `Usunięto **${category.name}** z aktywnych kategorii`
        );
      })
      .catch((e) => {
        this.sendErrorReply(interaction, `Usuwanie nie powiodło się. ${e}`);
      });
  }
}
