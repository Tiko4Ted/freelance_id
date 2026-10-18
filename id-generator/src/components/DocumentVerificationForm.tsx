"use client";

import { useCallback, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { DocumentScanCamera } from "@/components/DocumentScanCamera";
import { submitDocumentVerification } from "@/app/verify-document/actions";
import {
  initialDocumentVerificationFormState,
  type DocumentVerificationFormState,
} from "@/app/verify-document/form-state";
import {
  documentTypes,
  residenceCountries,
} from "@/lib/identity/document-verification";

export function DocumentVerificationForm({
  applicationId,
  initialValues,
}: {
  applicationId: string;
  initialValues?: Partial<DocumentVerificationFormState["values"]>;
}) {
  const [state, formAction] = useFormState(
    submitDocumentVerification,
    initialDocumentVerificationFormState,
  );
  const [documentCaptured, setDocumentCaptured] = useState(
    Boolean(initialValues?.documentScanConfirmed),
  );
  const [selectedDocumentType, setSelectedDocumentType] = useState(
    initialValues?.documentType ?? "",
  );
  const values = {
    ...initialDocumentVerificationFormState.values,
    ...initialValues,
    ...(Object.keys(state.errors).length > 0 ? state.values : {}),
    documentScanConfirmed: documentCaptured,
  };
  const handleCaptureComplete = useCallback((captured: boolean) => {
    setDocumentCaptured(captured);
  }, []);

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <input name="applicationId" type="hidden" value={applicationId} />
      {documentCaptured ? (
        <input name="documentScanConfirmed" type="hidden" value="on" />
      ) : null}
      <FormError state={state} />

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
          onChange={setSelectedDocumentType}
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

      <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] p-4">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-neutral-100">
              Align your document
            </p>
            <p className="mt-1 text-xs leading-5 text-neutral-400">
              This is a guided demo frame. We do not read, validate, or store document contents.
            </p>
          </div>
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-[10px] font-semibold text-emerald-200">
            DEMO
          </span>
        </div>
        <DocumentScanCamera
          documentType={selectedDocumentType}
          onCaptureComplete={handleCaptureComplete}
        />
        <InlineError message={state.errors.documentScanConfirmed?.[0]} />
      </div>

      <label className="flex items-start gap-3 text-sm leading-6 text-neutral-200">
        <input
          className="mt-1 h-4 w-4 rounded border-neutral-500 bg-neutral-950 text-cyan-300"
          defaultChecked={values.documentConsent}
          name="documentConsent"
          type="checkbox"
        />
        <span>
          I confirm that this document belongs to me and that the selected details are accurate.
        </span>
      </label>
      <InlineError message={state.errors.documentConsent?.[0]} />

      <SubmitButton disabled={!documentCaptured} />
    </form>
  );
}

function SelectField({
  error,
  label,
  name,
  onChange,
  options,
  placeholder,
  value,
}: {
  error?: string;
  label: string;
  name: string;
  onChange?: (value: string) => void;
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
        onChange={(event) => onChange?.(event.target.value)}
        value={value}
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

function SubmitButton({ disabled }: { disabled: boolean }) {
  const status = useFormStatus();

  return (
    <button
      className="h-11 rounded-md bg-cyan-300 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-300"
      disabled={disabled || status.pending}
      type="submit"
    >
      {status.pending ? "Saving verification..." : "Continue to facial verification"}
    </button>
  );
}
