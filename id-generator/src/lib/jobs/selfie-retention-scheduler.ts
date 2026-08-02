import cron, { type ScheduledTask } from "node-cron";

import type {
  SelfieRetentionPurgeResult,
  SelfieRetentionPurgeService,
} from "@/lib/services/selfie-retention-purge-service";

export const selfieRetentionPurgeSchedule = "0 * * * *";

export type ScheduledSelfiePurgeJobResult = SelfieRetentionPurgeResult & {
  ranAt: Date;
};

export async function runScheduledSelfiePurgeJob(
  service: SelfieRetentionPurgeService,
  now = new Date(),
): Promise<ScheduledSelfiePurgeJobResult> {
  const result = await service.purgeExpired(now);

  return {
    ...result,
    ranAt: now,
  };
}

export function startSelfieRetentionPurgeScheduler(input: {
  service: SelfieRetentionPurgeService;
  onResult?: (result: ScheduledSelfiePurgeJobResult) => void;
  onError?: (error: unknown) => void;
  schedule?: string;
}): ScheduledTask {
  const schedule = input.schedule ?? selfieRetentionPurgeSchedule;

  return cron.schedule(schedule, () => {
    void runScheduledSelfiePurgeJob(input.service)
      .then((result) => {
        input.onResult?.(result);
      })
      .catch((error: unknown) => {
        input.onError?.(error);
      });
  });
}
