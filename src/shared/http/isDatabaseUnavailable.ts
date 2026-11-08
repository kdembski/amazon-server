// Prisma codes of an unreachable or busy database, not of an invalid row
const CONNECTION_ERROR_CODES = ["P1001", "P1002", "P1008", "P1017", "P2024"];

export function isDatabaseUnavailable(error: unknown) {
  const { code, errorCode } = (error ?? {}) as { code?: unknown; errorCode?: unknown };
  return CONNECTION_ERROR_CODES.includes((code ?? errorCode) as string);
}
