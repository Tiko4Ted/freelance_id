import type { StorageService } from "@/lib/storage/local-filesystem-storage";
import { CardRenderer } from "@/lib/card/card-renderer";
import { generateOpaqueToken, hashOpaqueToken } from "@/lib/security/token";

const CARD_TOKEN_TTL_HOURS = 48;

export type PreparedCard = {
  cardObjectKey: string;
  cardToken: string;
  cardTokenHash: string;
  cardTokenExpiresAt: Date;
};

export class CardService {
  constructor(
    private readonly storage: StorageService,
    private readonly renderer = new CardRenderer(),
  ) {}

  async prepareApprovedCard(input: {
    applicationId: string;
    legalName: string;
    dateOfBirth: Date;
    freelanceIdCode: string;
    serialNumber: string;
    issueDate: Date;
  }): Promise<PreparedCard> {
    const cardObjectKey = [
      "cards",
      input.applicationId,
      `${input.freelanceIdCode}.png`,
    ].join("/");
    const cardToken = generateOpaqueToken();
    const cardTokenHash = hashOpaqueToken(cardToken);
    const cardTokenExpiresAt = addHours(input.issueDate, CARD_TOKEN_TTL_HOURS);
    const bytes = await this.renderer.render({
      legalName: input.legalName,
      dateOfBirth: input.dateOfBirth,
      freelanceIdCode: input.freelanceIdCode,
      serialNumber: input.serialNumber,
      issueDate: input.issueDate,
    });

    await this.storage.put(cardObjectKey, bytes);

    return {
      cardObjectKey,
      cardToken,
      cardTokenHash,
      cardTokenExpiresAt,
    };
  }

  async deleteCard(cardObjectKey: string): Promise<void> {
    await this.storage.delete(cardObjectKey);
  }
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1_000);
}
