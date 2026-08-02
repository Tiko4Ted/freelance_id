import { createSelfieRetentionPurgeService } from "@/lib/application-container";
import {
  runScheduledSelfiePurgeJob,
  selfieRetentionPurgeSchedule,
  startSelfieRetentionPurgeScheduler,
} from "@/lib/jobs/selfie-retention-scheduler";

async function main() {
  const service = createSelfieRetentionPurgeService();

  if (process.argv.includes("--watch")) {
    if ((process.env.SCHEDULER_DRIVER ?? "node-cron") !== "node-cron") {
      console.info(
        "Selfie retention node-cron scheduler disabled by SCHEDULER_DRIVER.",
      );
      return;
    }

    startSelfieRetentionPurgeScheduler({
      service,
      onResult(result) {
        console.info(formatResult(result));
      },
      onError(error) {
        console.error(error);
      },
    });
    console.info(
      `Selfie retention purge scheduler started with cron '${selfieRetentionPurgeSchedule}'.`,
    );
    return;
  }

  const result = await runScheduledSelfiePurgeJob(service);
  console.info(formatResult(result));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

function formatResult(result: {
  applicationsPurged: number;
  thumbnailsDeleted: number;
}): string {
  return `Purged ${result.thumbnailsDeleted} selfie thumbnail(s) across ${result.applicationsPurged} application(s).`;
}
