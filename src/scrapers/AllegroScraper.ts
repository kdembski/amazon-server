import { addExtra } from "puppeteer-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import rebrowserPuppeteer from "rebrowser-puppeteer";
import UserAgent from "user-agents";

export class AllegroScraper {
  constructor() {}

  private getPlpLink(search: string) {
    return `https://allegro.pl/listing?string=${search.replaceAll(
      " ",
      "%20"
    )}&stan=nowe`;
  }

  async scrapPlp(search?: string) {
    if (!search) return;
    const puppeteer = addExtra(rebrowserPuppeteer);
    puppeteer.use(stealth());

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    const userAgent = new UserAgent().toString();

    await page.setUserAgent(userAgent);
    await page.setExtraHTTPHeaders({ Referer: "https://allegro.pl/" });

    await page.goto(this.getPlpLink(search), {
      waitUntil: "domcontentloaded",
    });
    await new Promise((r) => setTimeout(r, 3000));

    const prices = await page.evaluate(() => {
      const listing = document.querySelector(".opbox-listing");
      const items = listing?.querySelectorAll("article");

      if (!items) return;

      const prices = [...items].map((item) => {
        const el = item.querySelector(`[tabindex="0"]`);
        return el?.getAttribute("aria-label");
      });

      return prices;
    });

    //browser.close();
  }
}
