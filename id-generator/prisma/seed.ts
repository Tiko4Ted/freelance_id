import "dotenv/config";

import { prisma } from "../src/lib/db";

async function main() {
  await prisma.idSequence.upsert({
    where: { name: "freelance_id" },
    create: { name: "freelance_id", counter: 0 },
    update: {},
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
