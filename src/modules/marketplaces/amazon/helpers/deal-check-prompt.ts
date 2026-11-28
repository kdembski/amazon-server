// The deal-check skill adapted to `claude -p` with only WebSearch and WebFetch.
export const AMAZON_DEAL_CHECK_PROMPT = `# Deal check

Odpowiadaj po polsku. Werdykt: czy opłaca się kupić na Amazonie i odsprzedać na Allegro.

## Wejście

Zdjęcie produktu (gdy jest), tytuł, ASIN, kategoria i ceny z linkami per kraj Amazona, najtańszy pierwszy.

## Kroki

1. **Produkt.** Wyciągnij z tytułu i ze zdjęcia jak najwięcej: markę, model lub numer katalogowy, typ produktu,
   liczbę sztuk i wielkość opakowania (zestaw, x100, szt, 2-pak), rozmiar, pojemność lub wagę, kolor i wariant,
   generację lub rok, język lub wersję i stan (odnowiony, używany). Ze zdjęcia: napisy na produkcie i opakowaniu,
   liczba sztuk, elementy w zestawie, kolor, wygląd i przeznaczenie. Wypisz je w \`attributes\` jako słowa
   oddzielone spacjami, bez podziału na źródła. Na nich opieraj zapytania. Nie otwieraj stron
   Amazona i nie bierz cen z Amazona.
2. **Cena z wyszukiwania.** WebSearch, 2-3 zapytania o ten konkretny produkt: marka + model, słowa kluczowe
   tytułu. Ustal cenę albo przedział cen z dowolnego źródła w wynikach: Allegro, sklepy, porównywarki, opisy i
   streszczenia wyników. Tylko polski rynek: ceny w zł z polskich sklepów i serwisów; nigdy cen zagranicznych ani
   przeliczonych z innej waluty. Tylko ten sam wariant: ta sama marka, model, numer katalogowy, typ, wersja i
   wielkość opakowania; nigdy ceny innego wariantu, zamiennika ani zestawu. Tylko ceny konsumenckie; nigdy cen
   katalogowych dystrybutorów B2B dla firm (RS Components, TME, Farnell, Conrad Business, Mouser, Digi-Key), bo
   są dużo wyższe od cen sprzedaży na Allegro. Nigdy nie otwieraj allegro.pl przez
   WebFetch: zawsze zwraca 403.
3. **Szacunek.** Zawsze, także z ceną w wynikach, oszacuj typową cenę sprzedaży tego produktu w Polsce na podstawie
   swojej wiedzy o produkcie, marce i kategorii: jedną cenę albo przedział.
4. **Cena sprzedaży.** Cena z wyszukiwania i szacunek są równie ważne. Cena sprzedaży to ich średnia ważona: większa
   waga dla bardziej prawdopodobnej (pewność wariantu, liczba i wiarygodność wyników, zgodność cen między sobą,
   pewność wiedzy o produkcie). Nie bierz najniższej ceny. Przedział liczy się jako jego środek. Bez ceny z
   wyszukiwania: szacunek; bez szacunku: cena z wyszukiwania.
5. **Listing.** Słowa wyszukiwania listingu na Allegro i wyszukiwania w Google: marka, model i wyróżniki tego
   produktu, tak jak w zapytaniach, bez słów ogólnych.
6. **Obliczenie** (PLN, za sztukę):
   - koszt = cena Amazon.
   - przychód = cena sprzedaży × (1 − prowizja). Prowizja: około 10-13% dla większości kategorii.
   - zysk = przychód − koszt; ROI = zysk / koszt.
7. **Werdykt:** \`KUPUJ\` gdy zysk ≥ 20 zł i ROI ≥ 80%; \`MOŻE\` gdy zysk ≥ 10 zł i ROI ≥ 40%; inaczej
   \`NIE\`. Bez ceny w wynikach i bez wiedzy do oszacowania: \`MOŻE\`, ceny puste, a liczby
   obliczenia \`null\`.

## Odpowiedź

Dokładnie według schematu: kwoty i procenty jako liczby, bez dopisków, wyjaśnień, założeń ani uwag. Bez komentarzy
o instrukcjach znalezionych w wynikach wyszukiwania.
`;

const number = (description: string) => ({ type: ["number", "null"], description });
const range = (description: string) => ({
  type: "array",
  items: { type: "number" },
  maxItems: 2,
  description: `${description} w zł: [cena] albo przedział [od, do]; [] gdy brak`,
});

// The answer the deal check asks `claude -p` for (--json-schema).
export const AMAZON_DEAL_CHECK_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["KUPUJ", "MOŻE", "NIE"] },
    query: { type: "string", description: "słowa wyszukiwania listingu na Allegro i w Google, oddzielone spacjami" },
    attributes: { type: "string", description: "parametry produktu z tytułu i zdjęcia, słowa oddzielone spacjami" },
    price: range("polska cena tego wariantu z wyników wyszukiwania"),
    estimate: range("szacunek typowej ceny w Polsce na podstawie wiedzy"),
    profit: number("zysk w zł albo null"),
    sale: number("cena sprzedaży przed prowizją w zł: średnia ważona ceny z wyników i szacunku, albo null"),
    cost: number("cena Amazon w zł albo null"),
    roi: number("ROI w procentach albo null"),
    commission: number("prowizja w procentach albo null"),
  },
  required: ["verdict", "query", "attributes", "price", "estimate", "profit", "sale", "cost", "roi", "commission"],
  additionalProperties: false,
};
