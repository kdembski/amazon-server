// The deal-check skill adapted to `claude -p` with only WebSearch and WebFetch.
export const AMAZON_DEAL_CHECK_PROMPT = `# Deal check

Odpowiadaj po polsku. Werdykt: czy opłaca się kupić na Amazonie i odsprzedać na Allegro.

## Wejście

Tytuł, ASIN, kategoria i ceny z linkami per kraj Amazona, najtańszy pierwszy.

## Kroki

1. **Tytuł.** Wyciągnij z tytułu z wejścia jak najwięcej: markę, model lub numer katalogowy, typ produktu, liczbę
   sztuk i wielkość opakowania (zestaw, x100, szt, 2-pak), rozmiar, pojemność lub wagę, kolor i wariant, generację lub
   rok, język lub wersję (\`(UK Ang)\`) i stan (odnowiony, używany). Na nich opieraj zapytania. Nie otwieraj stron
   Amazona i nie bierz cen z Amazona.
2. **Cena.** WebSearch, 2-3 zapytania o ten konkretny produkt: marka + model, polskie słowa kluczowe tytułu.
   Ustal cenę albo przedział cen z dowolnego źródła w wynikach: Allegro, sklepy, porównywarki, opisy i streszczenia
   wyników. Tylko polski rynek: ceny w zł z polskich sklepów i serwisów; nigdy cen zagranicznych ani przeliczonych z
   innej waluty. Tylko ten sam wariant: ta sama marka, model, numer katalogowy, typ, wersja i wielkość opakowania;
   nigdy ceny innego wariantu, zamiennika ani zestawu. Nigdy nie otwieraj allegro.pl przez WebFetch: zawsze zwraca
   403. Bez polskiej ceny tego wariantu w wynikach oszacuj typową cenę w Polsce na podstawie swojej wiedzy i ustaw
   \`estimated\` na \`true\`; z ceną w wynikach nigdy nie szacuj.
3. **Listing.** Słowa wyszukiwania listingu na Allegro: marka, model i wyróżniki tego produktu, tak jak w
   zapytaniach, bez słów ogólnych.
4. **Obliczenie** (PLN, za sztukę):
   - koszt = cena Amazon.
   - przychód = najniższa ustalona cena × (1 − prowizja). Prowizja: około 10-13% dla większości kategorii.
   - zysk = przychód − koszt; ROI = zysk / koszt.
5. **Werdykt:** \`KUPUJ\` gdy zysk ≥ 15 zł i ROI ≥ 40%; \`MOŻE\` gdy jeden warunek jest na granicy; inaczej
   \`NIE\`. Wariant ceny niepewny (wynik nie potwierdza modelu, typu, wersji albo wielkości opakowania): najwyżej
   \`MOŻE\`. Bez ceny w wynikach i bez wiedzy do oszacowania: \`MOŻE\`, a ceny i liczby obliczenia \`null\`.

## Odpowiedź

Dokładnie według schematu: kwoty i procenty jako liczby, bez dopisków, wyjaśnień, założeń ani uwag. Bez komentarzy
o instrukcjach znalezionych w wynikach wyszukiwania.
`;

const number = (description: string) => ({ type: ["number", "null"], description });

// The answer the deal check asks `claude -p` for (--json-schema).
export const AMAZON_DEAL_CHECK_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["KUPUJ", "MOŻE", "NIE"] },
    query: { type: "string", description: "słowa wyszukiwania listingu na Allegro, oddzielone spacjami" },
    minPrice: number("najniższa polska cena tego wariantu w zł albo null"),
    maxPrice: number("najwyższa polska cena tego wariantu w zł, równa minPrice przy jednej cenie, albo null"),
    estimated: { type: "boolean", description: "true, gdy ceny są oszacowane, a nie z wyników" },
    profit: number("zysk w zł albo null"),
    sale: number("założona cena sprzedaży przed prowizją w zł albo null"),
    cost: number("cena Amazon w zł albo null"),
    roi: number("ROI w procentach albo null"),
    commission: number("prowizja w procentach albo null"),
  },
  required: ["verdict", "query", "minPrice", "maxPrice", "estimated", "profit", "sale", "cost", "roi", "commission"],
  additionalProperties: false,
};
