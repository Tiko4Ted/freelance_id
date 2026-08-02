import { randomUUID } from "node:crypto";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type LockedSequenceRow = {
  counter: number;
};

type TransactionClient = Prisma.TransactionClient;

export interface IdSequenceRepository {
  nextCounter(sequenceName: string): Promise<number>;
}

export class PrismaIdSequenceRepository implements IdSequenceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async nextCounter(sequenceName: string): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      await this.ensureSequenceRow(tx, sequenceName);

      const rows = await tx.$queryRaw<LockedSequenceRow[]>`
        SELECT counter
        FROM id_sequences
        WHERE name = ${sequenceName}
        FOR UPDATE
      `;

      const current = rows[0]?.counter;
      if (current === undefined) {
        throw new Error(`ID sequence '${sequenceName}' could not be locked.`);
      }

      const next = current + 1;
      await tx.$executeRaw`
        UPDATE id_sequences
        SET counter = ${next}, updated_at = NOW()
        WHERE name = ${sequenceName}
      `;

      return next;
    });
  }

  private async ensureSequenceRow(
    tx: TransactionClient,
    sequenceName: string,
  ): Promise<void> {
    await tx.$executeRaw`
      INSERT INTO id_sequences (id, name, counter, created_at, updated_at)
      VALUES (${randomUUID()}::uuid, ${sequenceName}, 0, NOW(), NOW())
      ON CONFLICT (name) DO NOTHING
    `;
  }
}
