import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";

export class DiscordChannelRepository {
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.discordChannel;
  }

  getById(id: number) {
    return this.delegate.findUnique({ where: { id } });
  }

  getAll() {
    return this.delegate.findMany({ orderBy: { id: "asc" } });
  }

  create(data: Prisma.DiscordChannelCreateInput) {
    return this.delegate.create({ data });
  }

  update(id: number, data: Prisma.DiscordChannelUpdateInput) {
    return this.delegate.update({ where: { id }, data });
  }

  delete(id: number) {
    return this.delegate.delete({ where: { id } });
  }
}
