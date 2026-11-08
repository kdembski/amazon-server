import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";

// Deletes in batches so one DELETE never holds locks on a large part of the table
export class BatchDeleter {
  private prisma;

  constructor(prisma = PrismaClient.getInstance()) {
    this.prisma = prisma;
  }

  // `table` and `column` go into the SQL as they are: pass only constants
  async deleteOlderThan(table: string, column: string, date: Date, batchSize = 10_000) {
    let total = 0;
    let deleted;

    do {
      deleted = await this.prisma.$executeRaw(
        Prisma.sql`DELETE FROM ${Prisma.raw(table)} WHERE ${Prisma.raw(column)} < ${date} LIMIT ${batchSize}`
      );
      total += deleted;
    } while (deleted === batchSize);

    return total;
  }
}
