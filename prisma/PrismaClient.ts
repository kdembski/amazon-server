import { PrismaClient as OriginalPrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

export class PrismaClient {
  private static instance: OriginalPrismaClient;

  private constructor() {}

  public static getInstance(): OriginalPrismaClient {
    if (!PrismaClient.instance) {
      // Binary prepared statements add ~40 ms per statement inside a $transaction.
      const adapter = new PrismaMariaDb(process.env.DATABASE_URL ?? "", { useTextProtocol: true });
      PrismaClient.instance = new OriginalPrismaClient({ adapter });
    }

    return PrismaClient.instance;
  }
}
