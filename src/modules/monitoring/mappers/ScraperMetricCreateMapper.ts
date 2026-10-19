import { ScraperMetricsDto } from "@/modules/monitoring/dtos/ScraperMetricDtos";
import { Prisma } from "@prisma/client";

export class ScraperMetricCreateMapper {
  toCreateInputs(
    scraper: string,
    dto: ScraperMetricsDto
  ): Prisma.ScraperMetricCreateManyInput[] {
    const createdAt = new Date(Date.now());
    const periodStart = new Date(dto.periodStart);

    return dto.metrics.map((item) => ({
      scraper,
      marketplace: dto.marketplace,
      flow: dto.flow,
      metric: item.metric,
      country: item.country ?? null,
      outcome: item.outcome ?? null,
      value: item.value,
      periodStart,
      createdAt,
    }));
  }
}
