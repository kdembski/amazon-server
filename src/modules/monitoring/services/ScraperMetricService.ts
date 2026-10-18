import { ScraperMetricsDto } from "@/modules/monitoring/dtos/ScraperMetricDtos";
import { ScraperMetricCreateMapper } from "@/modules/monitoring/mappers/ScraperMetricCreateMapper";
import { ScraperMetricRepository } from "@/modules/monitoring/repositories/ScraperMetricRepository";

export class ScraperMetricService {
  private repository;
  private mapper;

  constructor(
    repository = new ScraperMetricRepository(),
    mapper = new ScraperMetricCreateMapper()
  ) {
    this.repository = repository;
    this.mapper = mapper;
  }

  async add(scraper: string, dto: ScraperMetricsDto) {
    const rows = this.mapper.toCreateInputs(scraper, dto);
    if (rows.length === 0) {
      return 0;
    }
    return this.repository.createMany(rows);
  }

  deleteOlderThan(date: Date) {
    return this.repository.deleteOlderThan(date);
  }
}
