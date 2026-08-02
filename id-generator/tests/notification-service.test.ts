import { SMTPServer } from "smtp-server";
import { describe, expect, it } from "vitest";

import { InMemoryDomainEventBus } from "@/lib/events/domain-event-bus";
import { SmtpEmailTransport } from "@/lib/notifications/email-transport";
import type {
  ApplicationRepository,
  CreateApplicationRecord,
  CreatedApplicationRecord,
} from "@/lib/repositories/application-repository";
import { ApplicationService } from "@/lib/services/application-service";
import { NotificationService } from "@/lib/services/notification-service";
import type { ValidatedApplicationForm } from "@/lib/validation/application-form";

describe("NotificationService", () => {
  it("sends the confirmation email through a dev SMTP catcher with the demo disclaimer", async () => {
    const receivedMessages: string[] = [];
    const server = new SMTPServer({
      authOptional: true,
      disabledCommands: ["STARTTLS"],
      onData(stream, _session, callback) {
        let body = "";
        stream.on("data", (chunk: Buffer) => {
          body += chunk.toString("utf8");
        });
        stream.on("end", () => {
          receivedMessages.push(body);
          callback();
        });
      },
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });

    const address = server.server.address();
    if (address === null || typeof address === "string") {
      throw new Error("SMTP catcher did not expose a TCP port.");
    }

    try {
      const eventBus = new InMemoryDomainEventBus();
      new NotificationService(
        new SmtpEmailTransport({
          host: "127.0.0.1",
          port: address.port,
          fromAddress: "Freelance ID Demo <no-reply@example.com>",
        }),
      ).subscribeTo(eventBus);

      const service = new ApplicationService(
        new AlwaysCreateApplicationRepository(),
        eventBus,
      );

      await service.submitApplication(validApplication());

      const normalizedMessage = receivedMessages[0].replace(/=\r?\n/g, "");

      expect(receivedMessages).toHaveLength(1);
      expect(normalizedMessage).toContain(
        "Application received. Proceed to the identity scan",
      );
      expect(normalizedMessage).toContain(
        "This is a portfolio demo, not real KYC or government identity verification.",
      );
    } finally {
      await new Promise<void>((resolve) => {
        server.close(resolve);
      });
    }
  }, 15_000);
});

class AlwaysCreateApplicationRepository implements ApplicationRepository {
  async findByApplicantIdentity() {
    return [];
  }

  async create(input: CreateApplicationRecord): Promise<CreatedApplicationRecord> {
    return {
      id: "application-1",
      legalName: input.legalName,
      email: input.email,
    };
  }
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
