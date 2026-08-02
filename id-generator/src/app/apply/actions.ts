"use server";

import { redirect } from "next/navigation";

import { createApplicationService } from "@/lib/application-container";
import type { ApplyFormState } from "@/app/apply/form-state";
import {
  readApplicationFormData,
  validateApplicationFormData,
} from "@/lib/validation/application-form";

export async function submitApplicationForm(
  _previousState: ApplyFormState,
  formData: FormData,
): Promise<ApplyFormState> {
  const rawForm = readApplicationFormData(formData);
  const validation = validateApplicationFormData(rawForm);
  const values = {
    legalName: rawForm.legalName,
    dateOfBirth: rawForm.dateOfBirth,
    email: rawForm.email,
    phone: rawForm.phone,
    consent: rawForm.consent === "on",
  };

  if (!validation.success) {
    return { errors: validation.errors, values };
  }

  const result = await createApplicationService().submitApplication(
    validation.data,
  );

  if (result.status === "blocked") {
    return { errors: { form: [result.message] }, values };
  }

  redirect(`/scan?applicationId=${result.applicationId}`);
}
