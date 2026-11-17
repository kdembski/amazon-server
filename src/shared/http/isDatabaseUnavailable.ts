// Prisma codes of an unreachable or busy database, not of an invalid row
const CONNECTION_ERROR_CODES = ["P1001", "P1002", "P1008", "P1017", "P2024"];
// mariadb codes of a lost, refused or timed-out connection; Prisma wraps them in P2039
const DRIVER_CONNECTION_ERROR_CODES = [45001, 45009, 45012, 45013, 45019, 45026, 45028, 45042, 45061];

type PrismaLikeError = {
  code?: unknown;
  errorCode?: unknown;
  meta?: { driverAdapterError?: { cause?: { code?: unknown } } };
};

export function isDatabaseUnavailable(error: unknown) {
  const { code, errorCode, meta } = (error ?? {}) as PrismaLikeError;
  return (
    CONNECTION_ERROR_CODES.includes((code ?? errorCode) as string) ||
    DRIVER_CONNECTION_ERROR_CODES.includes(meta?.driverAdapterError?.cause?.code as number)
  );
}
