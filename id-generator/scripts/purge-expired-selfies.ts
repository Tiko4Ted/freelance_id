import { createSelfieRetentionPurgeService } from "@/lib/application-container";

async function main() {
  const result = await createSelfieRetentionPurgeService().purgeExpired();

  console.info(
    `Purged ${result.thumbnailsDeleted} selfie thumbnail(s) across ${result.applicationsPurged} application(s).`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
