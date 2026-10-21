export function serializeError(
  error: unknown,
  depth = 3
): Record<string, unknown> {
  if (typeof error !== "object" || error === null) {
    return { message: String(error) };
  }

  const { name, message, stack, code, meta, status, cause } = error as Record<
    string,
    unknown
  >;

  return {
    name,
    message,
    stack,
    code,
    meta,
    status,
    cause:
      cause === undefined || depth <= 1
        ? undefined
        : serializeError(cause, depth - 1),
  };
}
