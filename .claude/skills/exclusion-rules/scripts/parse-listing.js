// Usage: node parse-listing.js <html-dir> <out.tsv>
// Reads bestseller pages and search/category listings; writes one row per product:
// source file, price (zł), review count, bought last month, rating, title.
import fs from "node:fs";
import path from "node:path";
const [dir, out] = process.argv.slice(2);

const decode = (s) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&");
const number = (raw) => {
  if (!raw) return "";
  const value = parseFloat(raw.replace(/[\s\u00a0]/g, "").replace(",", "."));
  return String(Math.round(/tys/.test(raw) ? value * 1000 : value));
};
const rating = (card) => ((card.match(/([\d,]+) z 5 gwiazdek/) || [])[1] || "").replace(",", ".");
const price = (raw) => (raw ? raw.replace(/[\s\u00a0]|zł/g, "").replace(",", ".") : "");

const rows = new Map();
const add = (file, row) => {
  if (row.title && !rows.has(row.title)) rows.set(row.title, [file, row.price, row.reviews, row.bought, row.rating, row.title].join("\t"));
};

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".html"))) {
  const html = decode(decode(fs.readFileSync(path.join(dir, file), "utf8")));

  for (const card of html.split('id="gridItemRoot"').slice(1)) {
    add(file, {
      title: ((card.match(/line-clamp[^>]*>([^<]+)/) || [])[1] || "").trim(),
      price: price((card.match(/p13n-sc-price[^>]*>([^<]+)/) || [])[1]),
      reviews: number((card.match(/a-size-small">([\d\s\u00a0.,]+)</) || [])[1]),
      bought: "",
      rating: rating(card),
    });
  }

  for (const part of html.split('<h2 aria-label="').slice(1)) {
    const card = part.slice(0, 8000);
    add(file, {
      title: part.slice(0, part.indexOf('"')).trim(),
      price: price((card.match(/a-offscreen">([\d\s\u00a0.,]+zł)/) || [])[1]),
      reviews: number((card.match(/aria-label="([\d\s\u00a0]+) ocen/) || [])[1]),
      bought: number((card.match(/([\d\s.,]+(?:\s*tys\.)?)\+\s*kupionych w ciągu ostatniego miesiąca/) || [])[1]),
      rating: rating(card),
    });
  }
}

fs.writeFileSync(out, [...rows.values()].join("\n") + "\n");
console.log(`${rows.size} products -> ${out}`);
