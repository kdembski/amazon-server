import { DiscordCategoriesCommandBuilder } from "@/builders/discord/DiscordCategoriesCommandBuilder";
import { DiscordCountriesCommandBuilder } from "@/builders/discord/DiscordCountriesCommandBuilder";
import { DiscordCommandT } from "@/types/discord.types";
import {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  REST,
  Routes,
} from "discord.js";

export class DiscordCommandService {
  private static instance: DiscordCommandService;
  private client;
  private commands: Record<string, DiscordCommandT> = {};

  private constructor(
    client = new Client({ intents: [GatewayIntentBits.Guilds] })
  ) {
    this.client = client;
  }

  public static getInstance(): DiscordCommandService {
    if (!DiscordCommandService.instance) {
      DiscordCommandService.instance = new DiscordCommandService();
    }

    return DiscordCommandService.instance;
  }

  async login() {
    await this.client.login(process.env.DISCORD_BOT_TOKEN);
    this.init();
    this.register();
  }

  private init() {
    this.commands = {
      ...new DiscordCountriesCommandBuilder().build(),
      ...new DiscordCategoriesCommandBuilder().build(),
    };

    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      const command = this.commands[interaction.commandName];

      if (!command) {
        const error = `DiscordCommandService: command ${interaction.commandName} not found`;
        console.error(error);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (e) {
        console.error(`DiscordCommandService: ${e}`);

        const errorReply = {
          content: "*Wystapił bład podaczas wykonywania komendy*",
          flags: MessageFlags.Ephemeral as const,
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorReply);
          return;
        }

        await interaction.reply(errorReply);
      }
    });
  }

  private async register() {
    const token = process.env.DISCORD_BOT_TOKEN;
    const clientId = process.env.DISCORD_APP_ID;
    const guildId = process.env.DISCORD_SERVER_ID;

    if (!token || !clientId || !guildId) return;
    const rest = new REST().setToken(token);

    rest
      .put(Routes.applicationGuildCommands(clientId, guildId), {
        body: Object.values(this.commands).map((command) =>
          command.data.toJSON()
        ),
      })
      .then(() => {
        console.log(`Successfully reloaded commands.`);
      })
      .catch((e) => {
        console.error(`DiscordCommandService: ${e}`);
      });
  }
}
