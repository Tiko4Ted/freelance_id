import { prisma } from "@/lib/db";
import { InMemoryDomainEventBus } from "@/lib/events/domain-event-bus";
import {
  ConsoleEmailTransport,
  ResendEmailTransport,
  SmtpEmailTransport,
  type EmailTransport,
} from "@/lib/notifications/email-transport";
import { PrismaApplicationRepository } from "@/lib/repositories/application-repository";
import { ApplicationService } from "@/lib/services/application-service";
import { NotificationService } from "@/lib/services/notification-service";

export function createApplicationService(): ApplicationService {
  const eventBus = new InMemoryDomainEventBus();
  const notificationService = new NotificationService(createEmailTransport());
  notificationService.subscribeTo(eventBus);

  return new ApplicationService(
    new PrismaApplicationRepository(prisma),
    eventBus,
  );
}

function createEmailTransport(): EmailTransport {
  const fromAddress =
    process.env.EMAIL_FROM ?? "Freelance ID Demo <no-reply@example.com>";

  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    return new SmtpEmailTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD,
      fromAddress,
    });
  }

  if (process.env.RESEND_API_KEY) {
    return new ResendEmailTransport(process.env.RESEND_API_KEY, fromAddress);
  }

  return new ConsoleEmailTransport();
}
