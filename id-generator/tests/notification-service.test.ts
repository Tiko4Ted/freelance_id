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
  it("sends the confirmation email through a dev SMTP catcher with the verification disclaimer", async () => {
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
          fromAddress: "Freelance ID <no-reply@example.com>",
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
        "This workflow is not real KYC or government identity verification.",
      );
    } finally {
      await new Promise<void>((resolve) => {
        server.close(resolve);
      });
    }
  }, 15_000);

  it("sends approval email with ID, serial, and DOB-gated card link", async () => {
    const transport = new RecordingEmailTransport();
    const service = new NotificationService(transport);
    const originalBaseUrl = process.env.APP_BASE_URL;
    process.env.APP_BASE_URL = "https://id.example.test";

    try {
      await service.sendApplicationApprovedEmail({
        to: "mary@example.com",
        legalName: "Mary Ann Smith",
        freelanceIdCode: "FL-MARY-SMITH-000001",
        serialNumber: "SER-SMITH-000001",
        cardUrl: `${process.env.APP_BASE_URL}/card/raw-token`,
      });
    } finally {
      process.env.APP_BASE_URL = originalBaseUrl;
    }

    expect(transport.messages[0]).toMatchObject({
      to: "mary@example.com",
      subject: "Freelance ID approved",
    });
    expect(transport.messages[0].text).toContain(
      "Freelance ID: FL-MARY-SMITH-000001",
    );
    expect(transport.messages[0].text).toContain("Serial: SER-SMITH-000001");
    expect(transport.messages[0].text).toContain(
      "https://id.example.test/card/raw-token",
    );
    expect(transport.messages[0].text).toContain("requires your date of birth");
  });
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

class RecordingEmailTransport {
  messages: {
    to: string;
    subject: string;
    text: string;
  }[] = [];

  async send(message: {
    to: string;
    subject: string;
    text: string;
  }): Promise<void> {
    this.messages.push(message);
  }
}
