import { expect, vi } from "vitest";
import { MessageFlags } from "discord.js";
import { getSpacing } from "@/helpers/discord";

// Prefixes produced by DiscordCommandBuilder's reply helpers.
export const replyPrefix = {
  error: `:no_entry:${getSpacing(3)}`,
  ok: `:white_check_mark:${getSpacing(3)}`,
  info: `:information_source:${getSpacing(3)}`,
};

type Reply = ReturnType<typeof vi.fn>;

// Builders reply through un-awaited promise chains, so wait for the reply.
export async function expectEphemeralReply(reply: Reply, content: string) {
  await vi.waitFor(() => expect(reply).toHaveBeenCalledTimes(1));
  expect(reply.mock.calls[0][0]).toEqual({
    content,
    flags: MessageFlags.Ephemeral,
  });
}

export async function expectEphemeralEmbed(reply: Reply) {
  await vi.waitFor(() => expect(reply).toHaveBeenCalledTimes(1));
  const payload = reply.mock.calls[0][0];
  expect(payload.flags).toBe(MessageFlags.Ephemeral);
  expect(payload.embeds).toHaveLength(1);
  return payload.embeds[0];
}
