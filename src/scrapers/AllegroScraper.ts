import { connect } from "puppeteer-real-browser";

export class AllegroScraper {
  constructor() {
    this.scrapPlp("lenovo");
  }

  private getPlpLink(search: string) {
    return `https://allegro.pl/listing?string=${search.replaceAll(
      " ",
      "%20"
    )}&stan=nowe`;
  }

  async scrapPlp(search?: string) {
    if (!search) return;

    const { browser, page } = await connect({
      headless: false,
      args: [],
      customConfig: {},
      turnstile: true,
      connectOption: {},
      disableXvfb: false,
      ignoreAllFlags: false,
    });

    page.setExtraHTTPHeaders({ Referer: "https://allegro.pl/" });
    await page.goto(this.getPlpLink("lenovo"), {
      waitUntil: "domcontentloaded",
    });
    await new Promise((r) => setTimeout(r, 3000));

    const prices = await page.evaluate(() => {
      const listing = document.querySelector(".opbox-listing");
      const items = listing?.querySelectorAll("article");
      if (!items) return;
      const prices = [...items].map((item) => {
        const el = item.querySelector(`[tabindex="0"]`);
        console.log(el);
        return el?.getAttribute("aria-label");
      });
      console.log(items);
      return prices;
    });
    console.log(prices?.length);

    browser.close();
  }
}
