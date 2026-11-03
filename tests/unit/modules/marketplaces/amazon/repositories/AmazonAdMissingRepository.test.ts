import { describe, expect, it } from "vitest";
import { AmazonAdMissingRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdMissingRepository";
import { fakePrisma } from "../../../../../support/fakes";

const setup = () => {
  const db = fakePrisma();
  return {
    repository: new AmazonAdMissingRepository(db.prisma),
    delegate: db.amazonAdMissing,
    $executeRaw: db.$executeRaw,
  };
};

describe("AmazonAdMissingRepository", () => {
  it("getByAdIds selects the countries of the ads", async () => {
    const { repository, delegate } = setup();
    delegate.findMany.mockResolvedValue([{ adId: 1, countryId: 2 }]);

    expect(await repository.getByAdIds([1, 3])).toEqual([{ adId: 1, countryId: 2 }]);
    expect(delegate.findMany).toHaveBeenCalledWith({
      where: { adId: { in: [1, 3] } },
      select: { adId: true, countryId: true },
    });
  });

  it("createMany skips existing rows and returns the count", async () => {
    const { repository, delegate } = setup();
    delegate.createMany.mockResolvedValue({ count: 1 });
    const data = [{ adId: 1, countryId: 2, createdAt: new Date(1) }];

    expect(await repository.createMany(data)).toBe(1);
    expect(delegate.createMany).toHaveBeenCalledWith({ data, skipDuplicates: true });
  });

  it("deleteOlderThan deletes in batches until a batch is not full", async () => {
    const { repository, $executeRaw } = setup();
    $executeRaw.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    const date = new Date(5);

    expect(await repository.deleteOlderThan(date, 2)).toBe(3);

    expect($executeRaw).toHaveBeenCalledTimes(2);
    const [strings, ...values] = $executeRaw.mock.calls[0];
    expect(strings.join("?")).toBe("DELETE FROM AmazonAdMissing WHERE createdAt < ? LIMIT ?");
    expect(values).toEqual([date, 2]);
  });
});
