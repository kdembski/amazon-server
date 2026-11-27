import { APIEmbedField } from "discord.js";

export interface DailyReportSectionI {
  getField(from: Date, to: Date): Promise<APIEmbedField>;
}
