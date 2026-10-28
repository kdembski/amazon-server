import _ from "lodash";
import { ActivityEventCreateMapper } from "@/modules/monitoring/mappers/ActivityEventCreateMapper";
import { ActivityEventRepository } from "@/modules/monitoring/repositories/ActivityEventRepository";
import { ActivityCount, ActivityCounter } from "@/modules/monitoring/services/ActivityCounter";
import { ActivityEventType, Marketplace } from "@prisma/client";

// Counts high-volume events in memory; flush stores one ActivityEvent per type and marketplace with data.count
export class ActivityCountService {
  private repository;
  private counter;
  private mapper;

  constructor(
    repository = new ActivityEventRepository(),
    counter = ActivityCounter.getInstance(),
    mapper = new ActivityEventCreateMapper(),
  ) {
    this.repository = repository;
    this.counter = counter;
    this.mapper = mapper;
  }

  increment(type: ActivityEventType, marketplace: Marketplace, countryIds: number[] = []) {
    const ids = _.uniq(countryIds);
    this.add({
      type,
      marketplace,
      count: 1,
      prices: ids.length ? { [ids.length]: 1 } : {},
      countries: Object.fromEntries(ids.map((id) => [id, 1])),
    });
  }

  // Increments during the write go to a new map; a failed write puts its counts back
  async flush() {
    const counts = [...this.counter.counts.values()];
    if (!counts.length) return;
    this.counter.counts = new Map();

    try {
      await this.repository.createMany(
        counts.map(({ type, marketplace, count, prices, countries }) => {
          return this.mapper.toCreateInput({
            type,
            marketplace,
            data: { count, prices, countries },
          });
        }),
      );
    } catch (error) {
      counts.forEach((count) => this.add(count));
      throw error;
    }
  }

  getCount(type: ActivityEventType, from: Date, to: Date) {
    return this.repository.getSum(type, from, to);
  }

  async getCountWithMinPrices(type: ActivityEventType, minPrices: number, from: Date, to: Date) {
    const rows = await this.repository.getData(type, from, to);
    return _.sumBy(rows, (data) => {
      const { prices = {} } = data as { prices?: Record<string, number> };
      return _.sumBy(Object.entries(prices), ([n, count]) => (Number(n) >= minPrices ? count : 0));
    });
  }

  private add(entry: ActivityCount) {
    const key = `${entry.type}:${entry.marketplace}`;
    const current = this.counter.counts.get(key);
    if (!current) {
      this.counter.counts.set(key, entry);
      return;
    }

    current.count += entry.count;
    this.addCounts(current.prices, entry.prices);
    this.addCounts(current.countries, entry.countries);
  }

  private addCounts(target: Record<string, number>, source: Record<string, number>) {
    Object.entries(source).forEach(([key, count]) => {
      target[key] = (target[key] ?? 0) + count;
    });
  }
}
