import type { DomainEventBus } from "@/lib/events/domain-event-bus";
import type { EmailTransport } from "@/lib/notifications/email-transport";

export class NotificationService {
  constructor(private readonly emailTransport: EmailTransport) {}

  subscribeTo(bus: DomainEventBus): void {
    bus.subscribe("application.submitted", async (event) => {
      await this.sendApplicationSubmittedEmail({
        to: event.payload.email,
        legalName: event.payload.legalName,
      });
    });

    bus.subscribe("application.rejected", async (event) => {
      await this.sendApplicationRejectedEmail({
        to: event.payload.email,
        legalName: event.payload.legalName,
        rejectionReason: event.payload.rejectionReason,
        reapplyCooldownUntil: event.payload.reapplyCooldownUntil,
      });
    });

    bus.subscribe("application.approved", async (event) => {
      await this.sendApplicationApprovedEmail({
        to: event.payload.email,
        legalName: event.payload.legalName,
        freelanceIdCode: event.payload.freelanceIdCode,
        serialNumber: event.payload.serialNumber,
        cardUrl: `${getAppBaseUrl()}/card/${event.payload.cardToken}`,
      });
    });
  }

  /**
   * Sends the applicant's confirmation email after a submission domain event.
   */
  async sendApplicationSubmittedEmail(input: {
    to: string;
    legalName: string;
  }): Promise<void> {
    await this.emailTransport.send({
      to: input.to,
      subject: "Application received - proceed to identity scan",
      text: [
        `Hello ${input.legalName},`,
        "",
        "Application received. Proceed to the identity scan to continue your Freelance ID application.",
      ].join("\n"),
    });
  }

  async sendApplicationRejectedEmail(input: {
    to: string;
    legalName: string;
    rejectionReason: string;
    reapplyCooldownUntil: Date;
  }): Promise<void> {
    await this.emailTransport.send({
      to: input.to,
      subject: "Freelance ID application update",
      text: [
        `Hello ${input.legalName},`,
        "",
        "Your Freelance ID application was rejected after admin review.",
        `Reason: ${input.rejectionReason}`,
        `You may reapply after ${input.reapplyCooldownUntil.toISOString().slice(0, 10)}.`,
      ].join("\n"),
    });
  }

  async sendApplicationApprovedEmail(input: {
    to: string;
    legalName: string;
    freelanceIdCode: string;
    serialNumber: string;
    cardUrl: string;
  }): Promise<void> {
    await this.emailTransport.send({
      to: input.to,
      subject: "Freelance ID approved",
      text: [
        `Hello ${input.legalName},`,
        "",
        "Your Freelance ID application was approved.",
        `Freelance ID: ${input.freelanceIdCode}`,
        `Serial: ${input.serialNumber}`,
        `Download your card: ${input.cardUrl}`,
        "",
        "The card link expires in 48 hours and requires your date of birth.",
      ].join("\n"),
    });
  }
}

function getAppBaseUrl(): string {
  return (
    process.env.APP_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_BASE_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}
