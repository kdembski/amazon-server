import { AppModule } from "@/shared/types/app-module";
import { SettingRouter } from "@/modules/settings/routes/SettingRouter";
import { DiscordChannelRouter } from "@/modules/settings/routes/DiscordChannelRouter";

export function createSettingsModule(): AppModule {
  return {
    routers: [new SettingRouter(), new DiscordChannelRouter()],
  };
}
