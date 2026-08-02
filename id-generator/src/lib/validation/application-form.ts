import { z } from "zod";

export const applicationFieldNames = [
  "legalName",
  "dateOfBirth",
  "email",
  "phone",
  "consent",
] as const;

export type ApplicationFieldName = (typeof applicationFieldNames)[number];

export type ApplicationFormErrors = Partial<
  Record<ApplicationFieldName | "form", string[]>
>;

export type ValidatedApplicationForm = {
  legalName: string;
  normalizedLegalName: string;
  dateOfBirth: Date;
  email: string;
  phone: string;
  consentAt: Date;
};

type RawApplicationForm = {
  legalName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  consent: string;
};

const phonePattern = /^\+?[0-9][0-9\s().-]{6,24}$/;

const rawApplicationFormSchema = z.object({
  legalName: z.string().trim().min(1, "Legal name is required."),
  dateOfBirth: z.string().trim().min(1, "Date of birth is required."),
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  phone: z
    .string()
    .trim()
    .regex(phonePattern, "Enter a valid phone number."),
  consent: z.literal("on", {
    error: "You must consent to this identity verification demo.",
  }),
});

export function readApplicationFormData(formData: FormData): RawApplicationForm {
  return {
    legalName: readString(formData, "legalName"),
    dateOfBirth: readString(formData, "dateOfBirth"),
    email: readString(formData, "email"),
    phone: readString(formData, "phone"),
    consent: readString(formData, "consent"),
  };
}

export function validateApplicationFormData(
  rawForm: RawApplicationForm,
  now = new Date(),
):
  | { success: true; data: ValidatedApplicationForm }
  | { success: false; errors: ApplicationFormErrors } {
  const parsed = rawApplicationFormSchema.safeParse(rawForm);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const dateOfBirth = parseDateOnly(parsed.data.dateOfBirth);
  if (!dateOfBirth) {
    return {
      success: false,
      errors: { dateOfBirth: ["Enter a valid date of birth."] },
    };
  }

  const age = calculateAge(dateOfBirth, now);
  if (age < 16 || age > 100) {
    return {
      success: false,
      errors: {
        dateOfBirth: ["Applicant age must be between 16 and 100 years."],
      },
    };
  }

  return {
    success: true,
    data: {
      legalName: parsed.data.legalName,
      normalizedLegalName: normalizeLegalName(parsed.data.legalName),
      dateOfBirth,
      email: parsed.data.email,
      phone: parsed.data.phone,
      consentAt: now,
    },
  };
}

export function normalizeLegalName(legalName: string): string {
  return legalName.trim().toLowerCase().replace(/\s+/g, " ");
}

function readString(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, monthIndex, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthIndex ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function calculateAge(dateOfBirth: Date, now: Date): number {
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const birthdayPassed =
    now.getUTCMonth() > dateOfBirth.getUTCMonth() ||
    (now.getUTCMonth() === dateOfBirth.getUTCMonth() &&
      now.getUTCDate() >= dateOfBirth.getUTCDate());

  if (!birthdayPassed) {
    age -= 1;
  }

  return age;
}
