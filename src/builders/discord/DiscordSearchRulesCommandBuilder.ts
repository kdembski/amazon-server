import {
  CacheType,
  ChatInputCommandInteraction,
  InteractionContextType,
  SlashCommandBuilder,
} from "discord.js";
import { DiscordCommandBuilder } from "@/builders/discord/DiscordCommandBuilder";
import { SearchRuleService } from "@/services/search-rule/SearchRuleService";
import {
  describeSearchRule,
  isGlobalExclusion,
  parseSearchRule,
} from "@/helpers/searchRule";

// Matches the VarChar(63) of SearchRule.value.
const MAX_RULE_LENGTH = 63;

export class DiscordSearchRulesCommandBuilder extends DiscordCommandBuilder {
  private service;

  constructor(service = new SearchRuleService()) {
    super();
    this.service = service;
  }

  build() {
    return {
      rules: {
        data: new SlashCommandBuilder()
          .setName("rules")
          .setDescription("Obsługa zasad wyszukiwania")
          .setContexts(InteractionContextType.Guild)
          .addSubcommand((subcommand) =>
            subcommand
              .setName("show")
              .setDescription(
                "Wyświetla wszystkie zasady, według których wybierane są ogłoszenia do scrapowania"
              )
          )
          .addSubcommand((subcommand) =>
            subcommand
              .setName("add")
              .setDescription("Dodaje zasadę wyszukiwania")
              .addStringOption((option) =>
                option
                  .setName("rule")
                  .setDescription("Zasada wyszukiwania")
                  .setRequired(true)
              )
          )
          .addSubcommand((subcommand) =>
            subcommand
              .setName("remove")
              .setDescription("Usuwa zasadę wyszukiwania")
              .addStringOption((option) =>
                option
                  .setName("rule")
                  .setDescription("Zasada wyszukiwania")
                  .setRequired(true)
              )
          ),
        execute: async (
          interaction: ChatInputCommandInteraction<CacheType>
        ) => {
          const subcommand = interaction.options.getSubcommand();

          switch (subcommand) {
            case "show":
              return this.listSearchRules(interaction);
            case "add":
              return this.addSearchRule(interaction);
            case "remove":
              return this.removeSearchRule(interaction);
          }
        },
      },
    };
  }

  private listSearchRules(interaction: ChatInputCommandInteraction<CacheType>) {
    this.service
      .getAll()
      .then(async (rules) => {
        const join = (values: string[]) =>
          values.map((value) => `\`${value}\``).join(", ") || "-";
        const values = rules.map((rule) => rule.value);
        const exclusions = values.filter((value) => this.isExclusion(value));

        this.sendReply(interaction, [
          {
            title: "Zasady wyszukiwania",
            description: [
              "Scrapowane są tylko ogłoszenia, których nazwa pasuje do co najmniej jednej zasady.",
              "`a+b` – musi zawierać *a* i *b*",
              "`a|b` – musi zawierać *a* lub *b*",
              "`!a` – nie może zawierać *a*",
              "Zasada złożona z samych `!` wyklucza ogłoszenia ze wszystkich zasad. Wielkość liter nie ma znaczenia.",
            ].join("\n"),
            fields: [
              {
                name: "Zasady",
                value: join(values.filter((value) => !exclusions.includes(value))),
              },
              {
                name: "Globalne wykluczenia",
                value: join(exclusions),
              },
            ],
          },
        ]);
      })
      .catch((e) => {
        this.sendErrorReply(
          interaction,
          `Nie udało się pobrać zasad. ${e}`
        );
      });
  }

  private async addSearchRule(
    interaction: ChatInputCommandInteraction<CacheType>
  ) {
    const value = interaction.options.getString("rule", true).trim();
    if (value.length > MAX_RULE_LENGTH) {
      this.sendErrorReply(
        interaction,
        `Zasada może mieć maksymalnie ${MAX_RULE_LENGTH} znaki`
      );
      return;
    }

    let parsed;
    try {
      parsed = parseSearchRule(value);
    } catch (e) {
      this.sendErrorReply(interaction, (e as Error).message);
      return;
    }

    const rule = await this.service.getByValue(value);
    if (rule) {
      this.sendErrorReply(
        interaction,
        `Zasada **${value}** jest już na liście`
      );
      return;
    }

    this.service.creatable
      .create({ value })
      .then(() => {
        this.sendSuccessReply(
          interaction,
          `Dodano **${value}**: ${describeSearchRule(parsed)}`
        );
      })
      .catch((e) => {
        this.sendErrorReply(interaction, `Dodawanie nie powiodło się. ${e}`);
      });
  }

  private async removeSearchRule(
    interaction: ChatInputCommandInteraction<CacheType>
  ) {
    const value = interaction.options.getString("rule", true);
    const rule = await this.service.getByValue(value);

    if (!rule) {
      this.sendErrorReply(interaction, `Nie znaleziono zasady **${value}**`);
      return;
    }

    this.service.deletable
      .delete(rule.id)
      .then(() => {
        this.sendSuccessReply(
          interaction,
          `Usunięto **${value}** z zasad`
        );
      })
      .catch((e) => {
        this.sendErrorReply(interaction, `Usuwanie nie powiodło się. ${e}`);
      });
  }

  private isExclusion(value: string) {
    try {
      return isGlobalExclusion(parseSearchRule(value));
    } catch {
      return false;
    }
  }
}
