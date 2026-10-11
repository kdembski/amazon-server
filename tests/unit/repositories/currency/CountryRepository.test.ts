import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { CountryRepository } from "@/repositories/currency/CountryRepository";
import { fakePrisma } from "../../../support/fakes";

const setup = () => {
  const db = fakePrisma();
  return { repository: new CountryRepository(db.prisma), delegate: db.country };
};

describe("CountryRepository", () => {
  it("reads by id, code, all and active", async () => {
    const { repository, delegate } = setup();

    await repository.getById(1);
    await repository.getByCode("de");
    await repository.getAll();
    await repository.getActive();

    expect(delegate.findUnique).toHaveBeenNthCalledWith(1, { where: { id: 1 } });
    expect(delegate.findUnique).toHaveBeenNthCalledWith(2, {
      where: { code: "de" },
    });
    expect(delegate.findMany).toHaveBeenNthCalledWith(1);
    expect(delegate.findMany).toHaveBeenNthCalledWith(2, {
      where: { active: true },
    });
  });

  it("writes delegate to prisma", async () => {
    const { repository, delegate } = setup();
    const data = { name: "Germany" } as Prisma.CountryCreateInput;

    await repository.create(data);
    await repository.update(2, { name: "x" });
    await repository.updateActive(2, false);
    await repository.delete(3);

    expect(delegate.create).toHaveBeenCalledWith({ data });
    expect(delegate.update).toHaveBeenNthCalledWith(1, {
      where: { id: 2 },
      data: { name: "x" },
    });
    expect(delegate.update).toHaveBeenNthCalledWith(2, {
      where: { id: 2 },
      data: { active: false },
    });
    expect(delegate.delete).toHaveBeenCalledWith({ where: { id: 3 } });
  });
});
