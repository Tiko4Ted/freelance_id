import "dotenv/config";

import { prisma } from "../src/lib/db";

async function main() {
  await prisma.idSequence.upsert({
    where: { name: "freelance_id" },
    create: { name: "freelance_id", counter: 0 },
    update: {},
  });

  if (
    process.env.ADMIN_EMAIL &&
    process.env.ADMIN_PASSWORD_HASH &&
    process.env.ADMIN_TOTP_SECRET
  ) {
    await prisma.adminUser.upsert({
      where: { email: process.env.ADMIN_EMAIL.toLowerCase() },
      create: {
        email: process.env.ADMIN_EMAIL.toLowerCase(),
        passwordHash: process.env.ADMIN_PASSWORD_HASH,
        totpSecret: process.env.ADMIN_TOTP_SECRET,
        mfaEnabled: true,
      },
      update: {
        passwordHash: process.env.ADMIN_PASSWORD_HASH,
        totpSecret: process.env.ADMIN_TOTP_SECRET,
        mfaEnabled: true,
      },
    });
  }
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
