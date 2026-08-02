import type { ApplicationFormErrors } from "@/lib/validation/application-form";

export type ApplyFormState = {
  errors: ApplicationFormErrors;
  values: {
    legalName: string;
    dateOfBirth: string;
    email: string;
    phone: string;
    consent: boolean;
  };
};

export const initialApplyFormState: ApplyFormState = {
  errors: {},
  values: {
    legalName: "",
    dateOfBirth: "",
    email: "",
    phone: "",
    consent: false,
  },
};
