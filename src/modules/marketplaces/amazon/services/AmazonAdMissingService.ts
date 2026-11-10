import _ from "lodash";
import { AmazonAdMissingRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdMissingRepository";
import { AmazonAdMissingCreateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdMissingCreateMapper";

export class AmazonAdMissingService {
  private repository;
  private mapper;

  constructor(
    repository = new AmazonAdMissingRepository(),
    mapper = new AmazonAdMissingCreateMapper()
  ) {
    this.repository = repository;
    this.mapper = mapper;
  }

  async getRouteIdsByAd(adIds: number[]) {
    if (!adIds.length) return {};

    const rows = await this.repository.getByAdIds(adIds);
    return _.mapValues(_.groupBy(rows, "adId"), (adRows) => adRows.map((row) => row.routeId));
  }

  async store(ads: { id: number; routeIds: number[] }[]) {
    const data = ads.flatMap(({ id, routeIds }) =>
      routeIds.map((routeId) => this.mapper.toCreateManyInput(id, routeId))
    );
    if (!data.length) return 0;

    return this.repository.createMany(data);
  }

  deleteOlderThan(date: Date) {
    return this.repository.deleteOlderThan(date);
  }
}
