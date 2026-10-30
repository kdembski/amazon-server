import { Marketplace } from "@prisma/client";
import { PrismaClient } from "@@prisma/PrismaClient";

export class ExclusionRuleFingerprintRepository {
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.exclusionRuleFingerprint;
  }

  async getByMarketplace(marketplace: Marketplace) {
    const row = await this.delegate.findUnique({
      where: { marketplace },
      select: { scopes: true },
    });
    if (!row) return undefined;
    return new Map(Object.entries(row.scopes as Record<string, string>));
  }

  async set(marketplace: Marketplace, fingerprint: Map<string, string>) {
    const scopes = Object.fromEntries(fingerprint);
    await this.delegate.upsert({
      where: { marketplace },
      create: { marketplace, scopes },
      update: { scopes },
    });
  }
}
