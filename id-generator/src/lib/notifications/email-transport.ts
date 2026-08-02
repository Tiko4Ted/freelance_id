import nodemailer from "nodemailer";
import { Resend } from "resend";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

export interface EmailTransport {
  send(message: EmailMessage): Promise<void>;
}

export class ResendEmailTransport implements EmailTransport {
  private readonly resend: Resend;

  constructor(
    apiKey: string,
    private readonly fromAddress: string,
  ) {
    this.resend = new Resend(apiKey);
  }

  async send(message: EmailMessage): Promise<void> {
    await this.resend.emails.send({
      from: this.fromAddress,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
  }
}

export class SmtpEmailTransport implements EmailTransport {
  private readonly transport: nodemailer.Transporter;

  constructor(config: {
    host: string;
    port: number;
    user?: string;
    password?: string;
    fromAddress: string;
  }) {
    this.transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: false,
      ignoreTLS: true,
      connectionTimeout: 5_000,
      greetingTimeout: 5_000,
      socketTimeout: 5_000,
      auth:
        config.user && config.password
          ? { user: config.user, pass: config.password }
          : undefined,
    });
    this.fromAddress = config.fromAddress;
  }

  private readonly fromAddress: string;

  async send(message: EmailMessage): Promise<void> {
    await this.transport.sendMail({
      from: this.fromAddress,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
  }
}

export class ConsoleEmailTransport implements EmailTransport {
  async send(message: EmailMessage): Promise<void> {
    console.info("Email delivery skipped; no provider configured.", message);
  }
}
