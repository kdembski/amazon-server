import { DiscordCommandT } from "@/types/discord.types";
import {
  CacheType,
  ChatInputCommandInteraction,
  Client,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
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
    this.commands.ping = {
      data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("ping desc"),
      async execute(interaction: ChatInputCommandInteraction<CacheType>) {
        await interaction.reply("Pong!");
      },
    };

    this.client.on(Events.InteractionCreate, (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      this.commands[interaction.commandName].execute(interaction);
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
