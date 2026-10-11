import { describe, expect, it, vi } from "vitest";
import { DeletableService } from "@/services/crud/DeletableService";

describe("DeletableService", () => {
  it("delegates to repository.delete", async () => {
    const del = vi.fn().mockResolvedValue({ id: 3 });
    const service = new DeletableService({ delete: del });

    await expect(service.delete(3)).resolves.toEqual({ id: 3 });
    expect(del).toHaveBeenCalledWith(3);
  });
});
