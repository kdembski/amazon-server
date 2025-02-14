import { PrismaClient as OriginalPrismaClient } from "@prisma/client";

export class PrismaClient {
  private static instance: OriginalPrismaClient;

  private constructor() {}

  public static getInstance(): OriginalPrismaClient {
    if (!PrismaClient.instance) {
      PrismaClient.instance = new OriginalPrismaClient({
        log: ["info"],
      });
    }

    return PrismaClient.instance;
  }
}
