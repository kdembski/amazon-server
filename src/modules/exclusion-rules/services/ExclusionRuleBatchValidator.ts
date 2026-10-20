const invalid = (message: string) =>
  Object.assign(new Error(message), { status: 400 });

export class ExclusionRuleBatchValidator {
  validate<T extends object>(batch: T) {
    if (typeof batch !== "object" || batch === null) {
      throw invalid("Exclusion rule batch must be an object");
    }
    return batch;
  }

  validateList<T>(items: T[] | undefined, name: string) {
    if (items === undefined) return [];
    if (!Array.isArray(items)) {
      throw invalid(`Exclusion rule batch "${name}" must be an array`);
    }
    return items;
  }

  validateId(id: unknown) {
    if (!Number.isInteger(id) || (id as number) < 1) {
      throw invalid(
        `Exclusion rule id ${JSON.stringify(id)} must be a positive integer`
      );
    }
    return id as number;
  }
}
