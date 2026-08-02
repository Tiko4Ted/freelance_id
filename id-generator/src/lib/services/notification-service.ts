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
        "Application received. Proceed to the identity scan to continue your Freelance ID demo application.",
        "",
        "This is a portfolio demo, not real KYC or government identity verification.",
      ].join("\n"),
    });
  }
}
