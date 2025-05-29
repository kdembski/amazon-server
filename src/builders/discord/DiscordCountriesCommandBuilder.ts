import { CountryService } from "@/services/currency/CountryService";
import { getSpacing } from "@/helpers/discord";
import {
  CacheType,
  ChatInputCommandInteraction,
  InteractionContextType,
  SlashCommandBuilder,
} from "discord.js";
import { DiscordCommandBuilder } from "@/builders/discord/DiscordCommandBuilder";

export class DiscordCountriesCommandBuilder extends DiscordCommandBuilder {
  private service;

  constructor(service = new CountryService()) {
    super();
    this.service = service;
  }

  build() {
    return {
      countries: {
        data: new SlashCommandBuilder()
          .setName("countries")
          .setDescription("Obsługa rynków")
          .setContexts(InteractionContextType.Guild)
          .addSubcommand((subcommand) =>
            subcommand
              .setName("ls")
              .setDescription("Wyświetl listę dostępnych rynków")
          )
          .addSubcommand((subcommand) =>
            subcommand
              .setName("add")
              .setDescription("Dodaj rynek do aktywnych")
              .addStringOption((option) =>
                option
                  .setName("code")
                  .setDescription("Kod rynku")
                  .setRequired(true)
              )
          )
          .addSubcommand((subcommand) =>
            subcommand
              .setName("rm")
              .setDescription("Usuń rynek z aktywnych")
              .addStringOption((option) =>
                option
                  .setName("code")
                  .setDescription("Kod rynku")
                  .setRequired(true)
              )
          ),
        execute: async (
          interaction: ChatInputCommandInteraction<CacheType>
        ) => {
          const subcommand = interaction.options.getSubcommand();

          switch (subcommand) {
            case "ls":
              return this.listCountries(interaction);
            case "add":
              return this.addCountryToActive(interaction);
            case "rm":
              return this.removeCountryFromActive(interaction);
          }
        },
      },
    };
  }

  private listCountries(interaction: ChatInputCommandInteraction<CacheType>) {
    this.service
      .getAll()
      .then((countries) => {
        const active = countries
          .filter((country) => country.active)
          .map((country) => `${country.name} **(${country.code})**`)
          .join(getSpacing(4));

        const inactive = countries
          .filter((country) => !country.active)
          .map((country) => `${country.name} **(${country.code})**`)
          .join(getSpacing(4));

        this.sendReply(interaction, [
          {
            title: "Lista rynków",
            description: "Tylko z aktywnych rynków będą pojawiać się okazje.",
            fields: [
              {
                name: "Aktywne",
                value: active,
              },
              {
                name: "Nieaktywne",
                value: inactive,
              },
            ],
          },
        ]);
      })
      .catch((e) => {
        this.sendErrorReply(interaction, `Nie udało się pobrać listy. ${e}`);
      });
  }

  private async addCountryToActive(
    interaction: ChatInputCommandInteraction<CacheType>
  ) {
    const code = interaction.options.getString("code", true);
    const country = await this.service.getByCode(code);

    if (!country) {
      this.sendErrorReply(
        interaction,
        `Nie znaleziono rynku z kodem **${code}**`
      );
      return;
    }

    if (country.active) {
      this.sendInfoReply(interaction, `Rynek ${country.name} jest już aktywny`);
      return;
    }

    this.service
      .updateActive(country?.id, true)
      .then(() => {
        this.sendSuccessReply(
          interaction,
          `Dodano **${country.name}** do aktywnych rynków`
        );
      })
      .catch((e) => {
        this.sendErrorReply(interaction, `Dodawanie nie powiodło się. ${e}`);
      });
  }

  private async removeCountryFromActive(
    interaction: ChatInputCommandInteraction<CacheType>
  ) {
    const code = interaction.options.getString("code", true);
    const country = await this.service.getByCode(code);

    if (!country) {
      this.sendErrorReply(
        interaction,
        `Nie znaleziono rynku z kodem **${code}**`
      );
      return;
    }

    if (!country.active) {
      this.sendInfoReply(interaction, `Rynek ${country.name} nie jest aktywny`);
      return;
    }

    this.service
      .updateActive(country?.id, false)
      .then(() => {
        this.sendSuccessReply(
          interaction,
          `Usunięto **${country.name}** z aktywnych rynków`
        );
      })
      .catch((e) => {
        this.sendErrorReply(interaction, `Usuwanie nie powiodło się. ${e}`);
      });
  }
}
