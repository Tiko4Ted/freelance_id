import { describe, expect, it } from "vitest";

import {
  IdGenerationService,
  splitLegalName,
} from "@/lib/services/id-generation-service";

class IncrementingSequenceRepository {
  private counter = 0;

  async nextCounter(): Promise<number> {
    this.counter += 1;
    return this.counter;
  }
}

describe("IdGenerationService", () => {
  it("generates deterministic freelance and serial identifiers", async () => {
    const service = new IdGenerationService(new IncrementingSequenceRepository());

    await expect(service.generateForLegalName("Mary Ann Smith")).resolves.toEqual(
      {
        freelanceIdCode: "FL-MARY-SMITH-000001",
        serialNumber: "SER-SMITH-000001",
        counter: 1,
      },
    );

    await expect(service.generateForLegalName("Mary Ann Smith")).resolves.toEqual(
      {
        freelanceIdCode: "FL-MARY-SMITH-000002",
        serialNumber: "SER-SMITH-000002",
        counter: 2,
      },
    );
  });

  it("normalizes names into safe code tokens", () => {
    expect(splitLegalName("  Jean-Luc   O'Neill  ")).toEqual({
      firstName: "JEANLUC",
      lastName: "ONEILL",
    });
  });
});
