import _ from "lodash";
import { ScraperMetrics, ScraperMetricValue } from "@/modules/monitoring/dtos/ScraperMetricDtos";
import { TimeRange } from "@/modules/monitoring/interfaces/TimeRange";

// The scraper labels traffic with its route: proxy, direct4 or direct6
const DIRECT_ROUTES = ["direct4", "direct6"];

// Summed metric rows of one scraper or group and the KPIs computed from them
export class ScraperMetricSums {
  private sums;

  constructor(sums: ScraperMetricValue[]) {
    this.sums = sums;
  }

  total(metric: string, outcomes?: string[]) {
    return _.sumBy(this.sums, (sum) => {
      const matches = sum.metric === metric && (!outcomes || (sum.outcome !== null && outcomes.includes(sum.outcome)));
      return matches ? sum.value : 0;
    });
  }

  wasted() {
    return (
      this.total("requests") -
      this.total("requests", ["ok", "http_404"]) +
      this.total("responses", ["captcha", "invalid", "empty", "parse_error"])
    );
  }

  proxyBytes() {
    return this.bytes(["proxy"]);
  }

  directBytes() {
    return this.bytes(DIRECT_ROUTES);
  }

  itemsPerSecond({ from, to }: TimeRange) {
    const given = this.total("items", ["given_up"]);
    const seconds = (to.getTime() - from.getTime()) / 1000;
    return (this.total("items") - given) / seconds;
  }

  summarize(range: TimeRange): ScraperMetrics {
    const requests = this.total("requests");
    const items = this.total("items");
    const dataItems = this.total("items", ["data"]);
    const bytesIn = this.total("bytes_in");
    const bytesOut = this.total("bytes_out");
    const bytes = bytesIn + bytesOut;
    const connections = this.total("connections");

    return {
      itemsPerSecond: this.itemsPerSecond(range),
      requests,
      wastedPercent: requests > 0 ? (this.wasted() / requests) * 100 : 0,
      captchaPercent: requests > 0 ? (this.total("responses", ["captcha"]) / requests) * 100 : 0,
      kbPerItem: dataItems > 0 ? bytes / 1024 / dataItems : null,
      reusePercent: requests > 0 ? Math.max(0, 1 - connections / requests) * 100 : 0,
      attemptsPerItem: items > 0 ? this.total("item_attempts") / items : null,
      bytesIn,
      bytesOut,
      connections,
    };
  }

  private bytes(routes: string[]) {
    return this.total("bytes_in", routes) + this.total("bytes_out", routes);
  }
}
