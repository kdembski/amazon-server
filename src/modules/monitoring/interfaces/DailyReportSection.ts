import { APIEmbedField } from "discord.js";

export interface DailyReportSection {
  getField(from: Date, to: Date): Promise<APIEmbedField>;
}
