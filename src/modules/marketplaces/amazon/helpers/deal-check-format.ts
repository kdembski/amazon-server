import { APIEmbedField } from "discord.js";
import { DealCheckAnswer, DealCheckNumbers } from "@/modules/marketplaces/amazon/types/deal-check";

// encodeURIComponent leaves parentheses, which would end the markdown link early.
export const getSearchLinks = (query: string) => {
  const words = encodeURIComponent(query.trim()).replace(/%20/g, "+").replace(/\(/g, "%28").replace(/\)/g, "%29");
  const allegro = `[Allegro](https://allegro.pl/listing?string=${words}&order=p)`;
  return `${allegro} · [Google](https://www.google.com/search?q=${words})`;
};

const money = (value: number) => `${value.toFixed(2)} zł`;
const percent = (value: number) => `${Math.round(value)}%`;

const getRange = ([min, max]: number[]) => {
  if (min === undefined) return null;
  return max === undefined || max === min ? money(min) : `${min.toFixed(2)} – ${money(max)}`;
};

const format = (value: number | null, formatter: (value: number) => string) => {
  return value === null ? null : formatter(value);
};

// "-#" renders the details as small grey subtext under the bold value.
const getField = (name: string, value: string | null, details: (string | null)[]): APIEmbedField[] => {
  const parts = details.filter(Boolean).join(", ");
  const lines = [value && `**${value}**`, parts && `-# ${parts}`].filter(Boolean);
  return lines.length ? [{ name, value: lines.join("\n"), inline: true }] : [];
};

export const getSaleField = ({ sale, price, estimate }: DealCheckAnswer) => {
  const search = getRange(price);
  const guess = getRange(estimate);
  // The escaped asterisk marks the estimate.
  return getField("Wycena", format(sale, money), [search, guess && `${guess}\\*`]);
};

export const getProfitField = ({ profit, roi, commission }: DealCheckNumbers) => {
  const signed = (value: number) => `${value >= 0 ? "+" : ""}${money(value)}`;
  return getField("Zysk", format(profit, signed), [
    format(roi, (value) => `ROI: ${percent(value)}`),
    format(commission, (value) => `prowizja: ${percent(value)}`),
  ]);
};
