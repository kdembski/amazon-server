import { APIEmbed } from "discord.js";

export interface DealCheckPrice {
  country: string;
  value: string;
  currency: string;
  url: string;
}

export interface DealCheckNumbers {
  profit: number | null;
  sale: number | null;
  cost: number | null;
  roi: number | null;
  commission: number | null;
}

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
