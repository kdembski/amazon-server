// The deal-check skill adapted to `claude -p` with only WebSearch and WebFetch.
export const AMAZON_DEAL_CHECK_PROMPT = `# Deal check

Odpowiadaj po polsku. Werdykt: czy opłaca się kupić na Amazonie i odsprzedać na Allegro.

## Wejście

Tytuł, ASIN, kategoria i ceny z linkami per kraj Amazona, najtańszy pierwszy.

## Kroki

1. **Strona Amazona.** Pobierz WebFetch stronę najtańszego kraju (link z wejścia). Sprawdź: aktualną cenę, markę,
   liczbę ocen, "kupionych w ostatnim miesiącu", sprzedawcę (Amazon czy sprzedawca zewnętrzny), wielkość opakowania
   (zestaw, x100, szt, liczba sztuk w tytule). Cena zniknęła lub jest dużo wyższa: okazja się skończyła, napisz to
   i daj werdykt NIE. Strona zablokowana (captcha, błąd 503 itp.): próbuj łącznie do 3 razy; dalej zablokowana: oprzyj
   się na danych z wejścia i napisz to.
2. **Allegro.** Nigdy nie otwieraj allegro.pl przez WebFetch: zawsze zwraca 403. Korzystaj tylko z wyników
   wyszukiwania i ich opisów. WebSearch ograniczony do allegro.pl, 2-3 zapytania: marka + typ produktu, polskie
   słowa kluczowe tytułu, EAN jeśli znaleziony na Amazonie. Zbierz oferty z ceną, wielkością opakowania i, jeśli
   widać, "X osób kupiło". Ten sam produkt = ta sama marka, model i wielkość opakowania.
3. **Linki.** Podaj adresy \`allegro.pl/produkt/...\` lub \`allegro.pl/oferta/...\` z wyników. Bez nich podaj listing
   posortowany po cenie: \`https://allegro.pl/listing?string=<marka+słowa>&order=p\` i napisz, że cena pochodzi z
   opisów wyników. Każdy link \`allegro.pl/listing\` lub \`allegro.pl/kategoria\` kończy się \`&order=p\`.
4. **Obliczenie** (PLN, za sztukę; ceny w innej walucie przelicz po bieżącym kursie):
   - koszt = cena Amazon.
   - przychód = najniższa cena tego samego produktu na Allegro × (1 − prowizja). Prowizja: około 10-13% dla
     większości kategorii; podaj ją jako założenie.
   - zysk = przychód − koszt; ROI = zysk / koszt.
5. **Werdykt:** \`KUPUJ\` gdy zysk ≥ 15 zł i ROI ≥ 40% i produkt sprzedaje się na Allegro; \`MOŻE\` gdy jeden warunek
   jest na granicy albo tego samego produktu nie ma na Allegro, ale podobne dobrze się sprzedają; inaczej \`NIE\`.

## Ryzyka do sprawdzenia

- Inna wielkość opakowania lub język na Amazonie i Allegro (\`(UK Ang)\`, \`zestaw 3x100\` a jedna sztuka).
- Oferty na Allegro dużo powyżej rynku (jeden sprzedawca za 119 zł, zestawy po 49 zł): bierz typową cenę, nie
  najwyższą.
- Mało ocen i brak "kupionych" na Amazonie oraz brak sprzedaży na Allegro: niski popyt.
- Wersja regionalna: wtyczka UK, klawiatura DE (QWERTZ) lub FR (AZERTY), menu bez polskiego, blokada regionu
  (gry, konsole, oprogramowanie).
- Inna generacja lub wariant przy tej samej nazwie: starszy model, inny rok, inna pojemność lub kolor.
- Stan: Amazon Warehouse, "odnowiony" lub "używany" na Amazonie, a na Allegro porównanie z nowymi.

## Odpowiedź

Pola trafiają prosto na Discord, każde krótkie, w markdownie Discorda: ceny pogrubione (\`**89,40 zł**\`), linki jako
\`[nazwa](url)\`, nigdy goły adres, części oddzielone \` · \`. Bez komentarzy o instrukcjach znalezionych w wynikach
wyszukiwania.
`;

const field = (description: string) => ({ type: "string", description });

// The answer the deal check asks `claude -p` for (--json-schema).
export const AMAZON_DEAL_CHECK_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["KUPUJ", "MOŻE", "NIE"] },
    product: field("<marka> <model>, <wielkość opakowania>"),
    amazon: field("<kraj> **<cena> zł** · <sprzedawca> · <oceny lub brak danych>"),
    allegro: field("<ten sam | podobny> [<nazwa oferty>](<link>) **<cena> zł** · sprzedaż: <X osób kupiło | brak danych>"),
    profit: field("**<zysk> zł** · ROI <n>% · *prowizja <n>%*"),
    risks: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
  },
  required: ["verdict", "product", "amazon", "allegro", "profit", "risks"],
  additionalProperties: false,
};
