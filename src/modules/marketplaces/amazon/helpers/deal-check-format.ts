import { DealCheckNumbers } from "@/modules/marketplaces/amazon/types/deal-check";
import { DiscordFormatter } from "@/shared/discord/DiscordFormatter";

// Brackets in the label would end the markdown link early; encodeURIComponent leaves parentheses in the URL.
export const getListingLink = (query: string) => {
  const label = query.trim();
  const words = encodeURIComponent(label).replace(/%20/g, "+").replace(/\(/g, "%28").replace(/\)/g, "%29");
  return `[${label.replace(/\[/g, "(").replace(/\]/g, ")")}](https://allegro.pl/listing?string=${words}&order=p)`;
};

export const getPriceRange = (min: number | null, max: number | null) => {
  if (min === null) return "brak cen w wynikach wyszukiwania";
  if (max === null || max === min) return `${min.toFixed(2)} zł`;
  return `${min.toFixed(2)} – ${max.toFixed(2)} zł`;
};

const money = (value: number) => `${value.toFixed(2)} zł`;
const percent = (value: number) => `${Math.round(value)}%`;

export const getProfitLine = ({ profit, sale, cost, roi, commission }: DealCheckNumbers) => {
  const cells: [string, number | null, (value: number) => string][] = [
    ["Zysk", profit, money],
    ["Sprzedaż", sale, money],
    ["Koszt", cost, money],
    ["ROI", roi, percent],
    ["Prowizja", commission, percent],
  ];
  return cells
    .filter(([, value]) => value !== null)
    .map(([name, value, format]) => `${name}: **${format(value!)}**`)
    .join(DiscordFormatter.spacing(3));
};
