import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const schema = readFileSync(
  join(process.cwd(), "prisma", "schema.prisma"),
  "utf8",
);

describe("schema compliance", () => {
  it("does not define government identifier fields", () => {
    expect(schema.toLowerCase()).not.toContain("kra");
  });

  it("uses UUID primary keys on persisted models", () => {
    const modelBlocks = schema.match(/model\s+\w+\s+\{[\s\S]*?\n\}/g) ?? [];

    expect(modelBlocks.length).toBeGreaterThan(0);
    for (const block of modelBlocks) {
      expect(block).toMatch(
        /id\s+String\s+@id\s+@default\(uuid\(\)\)\s+@db\.Uuid/,
      );
      expect(block).toMatch(
        /createdAt\s+DateTime\s+@default\(now\(\)\)\s+@map\("created_at"\)/,
      );
      expect(block).toMatch(
        /updatedAt\s+DateTime\s+@updatedAt\s+@map\("updated_at"\)/,
      );
    }
  });
});
