import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { CountryRepository } from "@/repositories/currency/CountryRepository";
import { fakePrisma } from "../../../support/fakes";

const setup = () => {
  const db = fakePrisma();
  return { repository: new CountryRepository(db.prisma), delegate: db.country };
};

describe("CountryRepository", () => {
  it("reads by id and all", async () => {
    const { repository, delegate } = setup();

    await repository.getById(1);
    await repository.getAll();

    expect(delegate.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(delegate.findMany).toHaveBeenCalledWith();
  });

  it("writes delegate to prisma", async () => {
    const { repository, delegate } = setup();
    const data = { name: "Germany" } as Prisma.CountryCreateInput;

    await repository.create(data);
    await repository.update(2, { name: "x" });
    await repository.delete(3);

    expect(delegate.create).toHaveBeenCalledWith({ data });
    expect(delegate.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { name: "x" },
    });
    expect(delegate.delete).toHaveBeenCalledWith({ where: { id: 3 } });
  });
});
