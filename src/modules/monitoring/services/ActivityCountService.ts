import { ActivityEventCreateMapper } from "@/modules/monitoring/mappers/ActivityEventCreateMapper";
import { ActivityEventRepository } from "@/modules/monitoring/repositories/ActivityEventRepository";
import { ActivityCounter } from "@/modules/monitoring/services/ActivityCounter";
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

  increment(type: ActivityEventType, marketplace: Marketplace, count = 1) {
    const key = `${type}:${marketplace}`;
    const current = this.counter.counts.get(key);
    if (current) current.count += count;
    else this.counter.counts.set(key, { type, marketplace, count });
  }

  // Increments during the write go to a new map; a failed write puts its counts back
  async flush() {
    const counts = [...this.counter.counts.values()];
    if (!counts.length) return;
    this.counter.counts = new Map();

    try {
      await this.repository.createMany(
        counts.map(({ type, marketplace, count }) => {
          return this.mapper.toCreateInput({ type, marketplace, data: { count } });
        }),
      );
    } catch (error) {
      counts.forEach(({ type, marketplace, count }) => {
        this.increment(type, marketplace, count);
      });
      throw error;
    }
  }

  getCount(type: ActivityEventType, from: Date, to: Date) {
    return this.repository.getSum(type, from, to);
  }
}
