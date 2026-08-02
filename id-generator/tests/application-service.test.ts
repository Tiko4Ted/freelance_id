import { ApplicationStatus } from "@/generated/prisma/client";
import { InMemoryDomainEventBus } from "@/lib/events/domain-event-bus";
import type {
  ApplicationCooldownRecord,
  ApplicationRepository,
  CreateApplicationRecord,
  CreatedApplicationRecord,
} from "@/lib/repositories/application-repository";
import { ApplicationService } from "@/lib/services/application-service";
import type { ValidatedApplicationForm } from "@/lib/validation/application-form";
import { describe, expect, it } from "vitest";

class FakeApplicationRepository implements ApplicationRepository {
  created: CreateApplicationRecord[] = [];

  constructor(private readonly records: ApplicationCooldownRecord[]) {}

  async findByApplicantIdentity(): Promise<ApplicationCooldownRecord[]> {
    return this.records;
  }

  async create(input: CreateApplicationRecord): Promise<CreatedApplicationRecord> {
    this.created.push(input);
    return {
      id: "application-1",
      legalName: input.legalName,
      email: input.email,
    };
  }
}

describe("ApplicationService", () => {
  it("blocks reapply during a 30-day rejection cooldown", async () => {
    const repository = new FakeApplicationRepository([
      rejectedRecord({ reapplyCooldownUntil: new Date("2026-08-20T00:00:00Z") }),
    ]);
    const service = new ApplicationService(
      repository,
      new InMemoryDomainEventBus(),
    );

    await expect(
      service.submitApplication(validApplication(), new Date("2026-08-02T00:00:00Z")),
    ).resolves.toMatchObject({
      status: "blocked",
      message: expect.stringContaining("prior application was rejected"),
    });
    expect(repository.created).toHaveLength(0);
  });

  it("allows reapply after the cooldown expires", async () => {
    const repository = new FakeApplicationRepository([
      rejectedRecord({ reapplyCooldownUntil: new Date("2026-08-01T00:00:00Z") }),
    ]);
    const service = new ApplicationService(
      repository,
      new InMemoryDomainEventBus(),
    );

    await expect(
      service.submitApplication(validApplication(), new Date("2026-08-02T00:00:00Z")),
    ).resolves.toEqual({ status: "created", applicationId: "application-1" });
    expect(repository.created).toHaveLength(1);
  });

  it("allows reapply when an admin override is set", async () => {
    const repository = new FakeApplicationRepository([
      rejectedRecord({
        adminOverrideCooldown: true,
        reapplyCooldownUntil: new Date("2026-08-20T00:00:00Z"),
      }),
    ]);
    const service = new ApplicationService(
      repository,
      new InMemoryDomainEventBus(),
    );

    await expect(
      service.submitApplication(validApplication(), new Date("2026-08-02T00:00:00Z")),
    ).resolves.toEqual({ status: "created", applicationId: "application-1" });
    expect(repository.created).toHaveLength(1);
  });
});

function rejectedRecord(
  overrides: Partial<ApplicationCooldownRecord>,
): ApplicationCooldownRecord {
  return {
    id: "prior-application",
    status: ApplicationStatus.REJECTED,
    rejectionReason: "Incomplete scan",
    reapplyCooldownUntil: new Date("2026-08-20T00:00:00Z"),
    adminOverrideCooldown: false,
    ...overrides,
  };
}

function validApplication(): ValidatedApplicationForm {
  return {
    legalName: "Mary Ann Smith",
    normalizedLegalName: "mary ann smith",
    dateOfBirth: new Date("1990-05-20T00:00:00Z"),
    email: "mary@example.com",
    phone: "+1 555 123 4567",
    consentAt: new Date("2026-08-02T00:00:00Z"),
  };
}
