// The deal-check skill adapted to `claude -p` with only WebSearch and WebFetch.
export const AMAZON_DEAL_CHECK_PROMPT = `# Deal check

Odpowiadaj po polsku. Werdykt: czy opłaca się kupić na Amazonie i odsprzedać na Allegro.

## Wejście

Tytuł, ASIN, kategoria i ceny z linkami per kraj Amazona, najtańszy pierwszy.

## Kroki

1. **Tytuł.** Wyciągnij z tytułu z wejścia jak najwięcej: markę, model lub numer katalogowy, typ produktu, liczbę
   sztuk i wielkość opakowania (zestaw, x100, szt, 2-pak), rozmiar, pojemność lub wagę, kolor i wariant, generację lub
   rok, język lub wersję (\`(UK Ang)\`) i stan (odnowiony, używany). Na nich opieraj zapytania na Allegro i porównanie
   "ten sam produkt". Nie otwieraj stron Amazona i nie szukaj ASIN-u ani tytułu w sieci poza Allegro.
2. **Allegro.** Nigdy nie otwieraj allegro.pl przez WebFetch: zawsze zwraca 403. Korzystaj tylko z wyników
   wyszukiwania i ich opisów. WebSearch ograniczony do allegro.pl, 2-3 zapytania: marka + model lub typ produktu,
   polskie słowa kluczowe tytułu. Zbierz oferty z ceną i wielkością opakowania. Ten sam produkt = ta sama marka, model
   i wielkość opakowania.
3. **Linki.** Podaj adresy \`allegro.pl/produkt/...\` lub \`allegro.pl/oferta/...\` z wyników. Bez nich podaj listing
   posortowany po cenie: \`https://allegro.pl/listing?string=<marka+słowa>&order=p\`. Każdy link \`allegro.pl/listing\`
   lub \`allegro.pl/kategoria\` kończy się \`&order=p\`. Zawsze podaj najpierw ten sam produkt (jeśli jest), a pod nim
   2-3 podobne, każdy z własnym linkiem i ceną, żeby dało się je porównać. Każda linia zaczyna się od \`ten sam:\`
   albo \`podobny:\`.
4. **Obliczenie** (PLN, za sztukę; ceny w innej walucie przelicz po bieżącym kursie):
   - koszt = cena Amazon.
   - przychód = najniższa cena tego samego produktu na Allegro (bez niego typowa cena podobnych) × (1 − prowizja).
     Prowizja: około 10-13% dla większości kategorii; podaj ją jako założenie.
   - zysk = przychód − koszt; ROI = zysk / koszt.
5. **Werdykt:** \`KUPUJ\` gdy zysk ≥ 15 zł i ROI ≥ 40%; \`MOŻE\` gdy jeden warunek jest na granicy albo tego
   samego produktu nie ma na Allegro, ale są podobne; inaczej \`NIE\`.

## Odpowiedź

Pola trafiają prosto na Discord, każde krótkie, w markdownie Discorda: ceny pogrubione (\`**89,40 zł**\`), linki jako
\`[nazwa](url)\`, nigdy goły adres, części oddzielone \` · \`. Dokładnie w formacie ze schematu, bez dopisków w
nawiasach ani po cenie. Bez komentarzy o instrukcjach znalezionych w wynikach
wyszukiwania.
`;

const field = (description: string) => ({ type: "string", description });

// The answer the deal check asks `claude -p` for (--json-schema).
export const AMAZON_DEAL_CHECK_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["KUPUJ", "MOŻE", "NIE"] },
    allegro: {
      type: "array",
      items: field(
        "ten sam: [<nazwa oferty>](<link>) **<cena> zł** albo podobny: [<nazwa oferty>](<link>) **<cena> zł**, " +
          "nic po cenie"
      ),
      description: "jedna oferta na element: najpierw ten sam produkt (jeśli jest), potem 2-3 podobne",
    },
    profit: field("**<zysk> zł** · ROI <n>% · koszt <cena Amazon w zł> zł · *prowizja <n>%*"),
  },
  required: ["verdict", "allegro", "profit"],
  additionalProperties: false,
};
