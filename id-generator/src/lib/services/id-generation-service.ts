import type { IdSequenceRepository } from "@/lib/repositories/id-sequence-repository";

const FREELANCE_ID_SEQUENCE = "freelance_id";

export type GeneratedFreelanceIdentity = {
  freelanceIdCode: string;
  serialNumber: string;
  counter: number;
};

export class IdGenerationService {
  constructor(private readonly sequenceRepository: IdSequenceRepository) {}

  /**
   * Generates the public freelance ID and serial number from a lock-protected
   * sequence counter. The caller persists the result in its approval transaction.
   */
  async generateForLegalName(
    legalName: string,
  ): Promise<GeneratedFreelanceIdentity> {
    const counter = await this.sequenceRepository.nextCounter(
      FREELANCE_ID_SEQUENCE,
    );
    const { firstName, lastName } = splitLegalName(legalName);
    const paddedCounter = counter.toString().padStart(6, "0");

    return {
      freelanceIdCode: `FL-${firstName}-${lastName}-${paddedCounter}`,
      serialNumber: `SER-${lastName}-${paddedCounter}`,
      counter,
    };
  }
}

export function splitLegalName(legalName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = legalName.trim().split(/\s+/).map(toCodeToken).filter(Boolean);

  if (parts.length === 0) {
    return { firstName: "UNKNOWN", lastName: "APPLICANT" };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "APPLICANT" };
  }

  return {
    firstName: parts[0],
    lastName: parts[parts.length - 1],
  };
}

function toCodeToken(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
