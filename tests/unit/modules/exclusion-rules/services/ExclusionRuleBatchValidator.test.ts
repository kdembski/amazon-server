import { describe, expect, it } from "vitest";
import { ExclusionRuleBatchValidator } from "@/modules/exclusion-rules/services/ExclusionRuleBatchValidator";

const validator = new ExclusionRuleBatchValidator();
const rejects = (validate: () => unknown) =>
  expect(validate).toThrow(expect.objectContaining({ status: 400 }));

describe("ExclusionRuleBatchValidator.validate", () => {
  it("returns an object batch", () => {
    const batch = { delete: [1] };
    expect(validator.validate(batch)).toBe(batch);
  });

  it.each([[null], ["batch"], [5]])("rejects %j with status 400", (batch) => {
    rejects(() => validator.validate(batch as any));
  });
});

describe("ExclusionRuleBatchValidator.validateList", () => {
  it("returns an array and treats a missing list as empty", () => {
    expect(validator.validateList([1], "delete")).toEqual([1]);
    expect(validator.validateList(undefined, "delete")).toEqual([]);
  });

  it.each([[4], [null], [{}]])("rejects %j with status 400", (items) => {
    rejects(() => validator.validateList(items as any, "delete"));
  });
});

describe("ExclusionRuleBatchValidator.validateId", () => {
  it("accepts a positive integer", () => {
    expect(validator.validateId(3)).toBe(3);
  });

  it.each([[undefined], ["3"], [1.5], [0], [-1]])(
    "rejects %j with status 400",
    (id) => {
      rejects(() => validator.validateId(id));
    }
  );
});
