// The deal-check skill adapted to `claude -p` with only WebSearch and WebFetch.
export const AMAZON_DEAL_CHECK_PROMPT = `# Deal check

Odpowiadaj po polsku. Werdykt: czy opłaca się kupić na Amazonie i odsprzedać na Allegro.

## Wejście

Tytuł, ASIN, kategoria i ceny z linkami per kraj Amazona, najtańszy pierwszy.

## Kroki

1. **Strona Amazona.** Pobierz WebFetch stronę najtańszego kraju (link z wejścia). Sprawdź: aktualną cenę, markę,
   liczbę ocen, "kupionych w ostatnim miesiącu", sprzedawcę i wysyłkę (Amazon czy sprzedawca zewnętrzny), wielkość
   opakowania (zestaw, x100, szt, liczba sztuk w tytule). Cena zniknęła lub jest dużo wyższa: okazja się skończyła,
   napisz to i daj werdykt NIE. Strona zablokowana (captcha): oprzyj się na danych z wejścia i napisz to.
2. **Allegro.** Nigdy nie otwieraj allegro.pl przez WebFetch: zawsze zwraca 403. Korzystaj tylko z wyników
   wyszukiwania i ich opisów. WebSearch ograniczony do allegro.pl, 2-3 zapytania: marka + typ produktu, polskie
   słowa kluczowe tytułu, EAN jeśli znaleziony na Amazonie. Zbierz oferty z ceną, wielkością opakowania i, jeśli
   widać, "X osób kupiło". Ten sam produkt = ta sama marka, model i wielkość opakowania.
3. **Linki.** Podaj adresy \`allegro.pl/produkt/...\` lub \`allegro.pl/oferta/...\` z wyników. Bez nich podaj listing
   posortowany po cenie: \`https://allegro.pl/listing?string=<marka+słowa>&order=p\` i napisz, że cena pochodzi z
   opisów wyników. Każdy link \`allegro.pl/listing\` lub \`allegro.pl/kategoria\` kończy się \`&order=p\`.
4. **Obliczenie** (PLN, za sztukę; ceny w innej walucie przelicz po bieżącym kursie):
   - koszt = cena Amazon + dostawa do Ciebie (darmowa powyżej progu darmowej wysyłki).
   - przychód = najniższa cena tego samego produktu na Allegro × (1 − prowizja) − dostawa płacona przez sprzedawcę.
     Prowizja: około 10-13% dla większości kategorii; dostawa w Allegro Smart: około 5-10 zł. Podaj obie jako
     założenia.
   - zysk = przychód − koszt; ROI = zysk / koszt.
5. **Werdykt:** \`KUPUJ\` gdy zysk ≥ 15 zł i ROI ≥ 40% i produkt sprzedaje się na Allegro; \`MOŻE\` gdy jeden warunek
   jest na granicy albo tego samego produktu nie ma na Allegro, ale podobne dobrze się sprzedają; inaczej \`NIE\`.

## Ryzyka do sprawdzenia

- Inna wielkość opakowania lub język na Amazonie i Allegro (\`(UK Ang)\`, \`zestaw 3x100\` a jedna sztuka).
- Oferty na Allegro dużo powyżej rynku (jeden sprzedawca za 119 zł, zestawy po 49 zł): bierz typową cenę, nie
  najwyższą.
- Marka sprzedaje na Allegro sama (oficjalny sklep): trudno przebić.
- Mało ocen i brak "kupionych" na Amazonie oraz brak sprzedaży na Allegro: niski popyt.

## Odpowiedź

Tylko ten blok, pierwsza linia zawsze z werdyktem:

\`\`\`
**Werdykt: KUPUJ | MOŻE | NIE**
Produkt: <tytuł>, <marka>, <wielkość opakowania> — Amazon <kraj> <cena> zł
Allegro: <ten sam/podobny> — <cena> zł (<link>), sprzedaż: <X osób kupiło | brak danych>
Zysk: <przychód> − <koszt> = <zysk> zł (ROI <n>%), założenia: prowizja <n>%, wysyłka <n> zł
Ryzyka: <1-3 punkty>
\`\`\`
`;
