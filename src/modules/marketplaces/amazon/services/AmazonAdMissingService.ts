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

  async getCountryIdsByAd(adIds: number[]) {
    if (!adIds.length) return {};

    const rows = await this.repository.getByAdIds(adIds);
    return _.mapValues(_.groupBy(rows, "adId"), (adRows) => adRows.map((row) => row.countryId));
  }

  async store(ads: { id: number; countryIds: number[] }[]) {
    const data = ads.flatMap(({ id, countryIds }) =>
      countryIds.map((countryId) => this.mapper.toCreateManyInput(id, countryId))
    );
    if (!data.length) return 0;

    return this.repository.createMany(data);
  }

  deleteOlderThan(date: Date) {
    return this.repository.deleteOlderThan(date);
  }
}
