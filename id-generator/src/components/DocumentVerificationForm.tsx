"use client";

import { useFormState, useFormStatus } from "react-dom";

import { saveDocumentDetails } from "@/app/verify-document/actions";
import {
  initialDocumentVerificationFormState,
  type DocumentVerificationFormState,
} from "@/app/verify-document/form-state";
import { residenceCountries, documentTypes } from "@/lib/identity/document-verification";

export function DocumentVerificationForm({
  applicationId,
  initialValues,
}: {
  applicationId: string;
  initialValues?: Partial<DocumentVerificationFormState["values"]>;
}) {
  const [state, formAction] = useFormState(
    saveDocumentDetails,
    initialDocumentVerificationFormState,
  );
  const values = {
    ...initialDocumentVerificationFormState.values,
    ...initialValues,
    ...(Object.keys(state.errors).length > 0 ? state.values : {}),
  };

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <input name="applicationId" type="hidden" value={applicationId} />
      <FormError state={state} />

      <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] p-4">
        <p className="text-sm font-semibold text-neutral-100">First, confirm your document details</p>
        <p className="mt-1 text-xs leading-5 text-neutral-400">
          Your selections will be saved and shown again before the camera opens.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          error={state.errors.countryOfResidence?.[0]}
          label="Country of residence"
          name="countryOfResidence"
          options={residenceCountries}
          placeholder="Select country"
          value={values.countryOfResidence}
        />
        <SelectField
          error={state.errors.documentType?.[0]}
          label="Document type"
          name="documentType"
          options={documentTypes}
          placeholder="Select document"
          value={values.documentType}
        />
      </div>

      <SelectField
        error={state.errors.documentIssuingCountry?.[0]}
        label="Issuing country"
        name="documentIssuingCountry"
        options={residenceCountries}
        placeholder="Select issuing country"
        value={values.documentIssuingCountry}
      />

      <SubmitButton />
    </form>
  );
}

function SelectField({
  error,
  label,
  name,
  options,
  placeholder,
  value,
}: {
  error?: string;
  label: string;
  name: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  placeholder: string;
  value: string;
}) {
  const errorId = `${name}-error`;

  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium text-neutral-100" htmlFor={name}>
        {label}
      </label>
      <select
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        className="h-11 rounded-md border border-neutral-700 bg-neutral-950 px-3 text-base text-neutral-50 outline-none transition focus:border-cyan-300"
        id={name}
        name={name}
        defaultValue={value}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <InlineError id={errorId} message={error} />
    </div>
  );
}

function FormError({ state }: { state: DocumentVerificationFormState }) {
  if (!state.errors.form?.[0]) {
    return null;
  }

  return (
    <div
      className="rounded-md border border-red-500/40 bg-red-950/40 p-3 text-sm text-red-100"
      role="alert"
    >
      {state.errors.form[0]}
    </div>
  );
}

function InlineError({ id, message }: { id?: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="text-sm text-red-300" id={id} role="alert">
      {message}
    </p>
  );
}

function SubmitButton() {
  const status = useFormStatus();

  return (
    <button
      className="h-11 rounded-md bg-cyan-300 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-300"
      disabled={status.pending}
      type="submit"
    >
      {status.pending ? "Saving details..." : "Next: scan document"}
    </button>
  );
}
