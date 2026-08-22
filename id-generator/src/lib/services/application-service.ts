import { ApplicationStatus } from "@/generated/prisma/client";
import type { DomainEventBus } from "@/lib/events/domain-event-bus";
import type { ApplicationRepository } from "@/lib/repositories/application-repository";
import type { ValidatedApplicationForm } from "@/lib/validation/application-form";

const REAPPLY_COOLDOWN_DAYS = 30;

export type SubmitApplicationResult =
  | {
      status: "created";
      applicationId: string;
    }
  | {
      status: "blocked";
      message: string;
    };

export class ApplicationService {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly eventBus: DomainEventBus,
  ) {}

  /**
   * Creates a pending application after enforcing identity-level reapply
   * cooldown rules, then emits the application.submitted domain event.
   */
  async submitApplication(
    input: ValidatedApplicationForm,
    now = new Date(),
  ): Promise<SubmitApplicationResult> {
    const priorApplications =
      await this.applicationRepository.findByApplicantIdentity({
        normalizedLegalName: input.normalizedLegalName,
        dateOfBirth: input.dateOfBirth,
      });

    const activeRejection = priorApplications.find((application) => {
      if (
        application.status !== ApplicationStatus.REJECTED ||
        application.adminOverrideCooldown ||
        !application.reapplyCooldownUntil
      ) {
        return false;
      }
      return application.reapplyCooldownUntil.getTime() > now.getTime();
    });

    if (activeRejection) {
      return { 
        status: "blocked", 
        message: `A prior application was rejected within the last ${REAPPLY_COOLDOWN_DAYS} days. Please wait until the cooldown expires or contact an administrator for review.` 
      };
    }

    const existingPending = priorApplications.find(
      (app) => app.status === ApplicationStatus.PENDING
    );

    if (existingPending) {
      return { status: "created", applicationId: existingPending.id };
    }

    const application = await this.applicationRepository.create({
      legalName: input.legalName,
      normalizedLegalName: input.normalizedLegalName,
      dateOfBirth: input.dateOfBirth,
      email: input.email,
      phone: input.phone,
      consentAt: input.consentAt,
      status: ApplicationStatus.PENDING,
    });

    await this.eventBus.publish({
      type: "application.submitted",
      payload: {
        applicationId: application.id,
        legalName: application.legalName,
        email: application.email,
      },
    });

    return { status: "created", applicationId: application.id };
  }

  private async findActiveCooldown(
    input: ValidatedApplicationForm,
    now: Date,
  ): Promise<string | null> {
    const priorApplications =
      await this.applicationRepository.findByApplicantIdentity({
        normalizedLegalName: input.normalizedLegalName,
        dateOfBirth: input.dateOfBirth,
      });

    const activeRejection = priorApplications.find((application) => {
      if (
        application.status !== ApplicationStatus.REJECTED ||
        application.adminOverrideCooldown ||
        !application.reapplyCooldownUntil
      ) {
        return false;
      }

      return application.reapplyCooldownUntil.getTime() > now.getTime();
    });

    if (!activeRejection) {
      return null;
    }

    return [
      `A prior application was rejected within the last ${REAPPLY_COOLDOWN_DAYS} days.`,
      "Please wait until the cooldown expires or contact an administrator for review.",
    ].join(" ");
  }
}
