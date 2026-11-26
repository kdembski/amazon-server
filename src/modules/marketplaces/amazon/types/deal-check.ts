import { APIEmbed } from "discord.js";

export interface DealCheckPrice {
  country: string;
  value: string;
  currency: string;
  url: string;
}

export type DealCheckNumbers = Record<"profit" | "sale" | "cost" | "roi" | "commission", number | null>;

export interface DealCheckAnswer extends DealCheckNumbers {
  verdict: string;
  query: string;
  minPrice: number | null;
  maxPrice: number | null;
  estimated: boolean;
}

export interface DealCheckWaiter {
  alert: APIEmbed;
  channelId: number;
}
