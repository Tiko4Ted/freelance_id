import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

import { PrismaClient } from "@/generated/prisma/client";

const { Pool } = pg;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to initialize Prisma.");
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 60_000,
    idleTimeoutMillis: 30_000,
    max: 10,
  });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    transactionOptions: {
      maxWait: 90_000,
      timeout: 90_000,
    },
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
