---
name: deal-check
description: Use when the user sends a screenshot of a Discord anomaly alert (product title, ASIN, prices per Amazon country in PLN, image, category) or an Amazon link and asks whether the deal is worth buying for resale, mainly on Allegro, or asks for the same or a similar offer on Allegro.
---

# Deal check

Answer in Polish. Verdict: is buying on Amazon and reselling on Allegro worth it.

## Input

From the screenshot read: title, ASIN, the cheapest country and its price, the other countries' prices, category.

## Steps

1. **Amazon page.** Fetch the cheapest country's page (amazon.pl for Polska; other `tld` per country):
   ```bash
   S=<scratchpad>/deal
   bash ~/Documents/projects/amazon-server/.claude/skills/exclusion-rules/amazon/fetch.sh "$S" "https://www.amazon.pl/dp/<ASIN>"
   ```
   Grep the HTML for: `productTitle`, `Marka:`, `a-offscreen` (current price), `ocen` (reviews), `kupion`
   (bought per month), `Sprzedawca`/`Wysyłka` (Amazon or a third-party seller). Check the pack size
   (`zestaw`, `x100`, `szt`, number of items in the title and images). A price that is gone or much higher
   means the deal is over: say so and stop.
2. **Allegro.** Direct fetches of allegro.pl return 403 (curl and WebFetch); do not try them. Use
   `WebSearch` with `allowed_domains: ["allegro.pl"]`, `mode: "standard"`, 2-3 queries in one turn:
   brand + product type, Polish keywords of the title, EAN if found on Amazon. Collect offers with
   price, pack size and, if shown, "X osób kupiło". Same product = same brand, model and pack size.
3. **Links.** Give the `allegro.pl/produkt/...` or `allegro.pl/oferta/...` URLs from the results. Without
   them, give the listing sorted by price:
   `https://allegro.pl/listing?string=<brand+keywords>&order=p` and say the price comes from search snippets.
   Every `allegro.pl/listing` or `allegro.pl/kategoria` link, also under Sources, ends with `&order=p`
   (cheapest first); replace an existing `order=` value.
4. **Calculation** (PLN, per unit):
   - cost = Amazon price + delivery to you (free over the Prime/free-shipping threshold).
   - revenue = lowest Allegro price of the same product × (1 − commission) − delivery paid by the seller.
     Commission: about 10-13% for most categories; delivery under Allegro Smart: about 5-10 zł. State both
     as assumptions.
   - profit = revenue − cost; ROI = profit / cost.
5. **Verdict:** `KUPUJ` when profit ≥ 15 zł and ROI ≥ 40% and the product sells on Allegro;
   `MOŻE` when one condition is borderline or the same product is not on Allegro but similar ones sell well;
   otherwise `NIE`.

## Risks to check

- Pack size or language differs between Amazon and Allegro (`(UK Ang)`, `zestaw 3x100` vs one piece).
- Allegro offers listed far above the market (one seller at 119 zł while sets cost 49 zł): use the
  typical price, not the highest one.
- The brand sells on Allegro itself (official shop): hard to undercut.
- Price error on Amazon: the order may be cancelled.
- Few reviews and no "kupionych" on Amazon plus no sales on Allegro: low demand.

## Output

```
**Werdykt: KUPUJ | MOŻE | NIE**
Produkt: <title>, <brand>, <pack size> — Amazon <country> <price> zł
Allegro: <same/similar> — <price> zł (<link>), sprzedaż: <X osób kupiło | brak danych>
Zysk: <revenue> − <cost> = <profit> zł (ROI <n>%), założenia: prowizja <n>%, wysyłka <n> zł
Ryzyka: <1-3 bullets>
```
