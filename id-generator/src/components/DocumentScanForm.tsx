"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { submitDocumentVerification } from "@/app/verify-document/actions";
import {
  initialDocumentVerificationFormState,
  type DocumentVerificationFormState,
} from "@/app/verify-document/form-state";
import { DocumentScanCamera } from "@/components/DocumentScanCamera";
import {
  documentTypes,
  getDocumentType,
  residenceCountries,
} from "@/lib/identity/document-verification";

export function DocumentScanForm({
  applicationId,
  initialValues,
}: {
  applicationId: string;
  initialValues: DocumentVerificationFormState["values"];
}) {
  const [state, formAction] = useFormState(
    submitDocumentVerification,
    initialDocumentVerificationFormState,
  );
  const [documentCaptured, setDocumentCaptured] = useState(false);
  const values = {
    ...initialValues,
    ...(Object.keys(state.errors).length > 0 ? state.values : {}),
  };
  const selectedDocument = getDocumentType(values.documentType) ?? documentTypes[0];
  const handleCaptureComplete = useCallback((captured: boolean) => {
    setDocumentCaptured(captured);
  }, []);

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <input name="applicationId" type="hidden" value={applicationId} />
      <input name="countryOfResidence" type="hidden" value={values.countryOfResidence} />
      <input name="documentType" type="hidden" value={values.documentType} />
      <input name="documentIssuingCountry" type="hidden" value={values.documentIssuingCountry} />
      {documentCaptured ? (
        <input name="documentScanConfirmed" type="hidden" value="on" />
      ) : null}
      <FormError state={state} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-cyan-300">SCAN STEP</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Now scan your document</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-400">
            Your details are saved below. Place the selected document inside the guide when you are ready.
          </p>
        </div>
        <Link
          className="shrink-0 rounded-md border border-neutral-700 px-3 py-2 text-xs font-semibold text-neutral-200 transition hover:border-cyan-300/60 hover:text-white active:translate-y-px"
          href={`/verify-document?applicationId=${applicationId}`}
        >
          Back
        </Link>
      </div>

      <dl className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-3">
        <SummaryItem
          label="Residence"
          value={formatCountry(values.countryOfResidence)}
        />
        <SummaryItem label="Document" value={selectedDocument.label} />
        <SummaryItem
          label="Issuing country"
          value={formatCountry(values.documentIssuingCountry)}
        />
      </dl>

      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.04] p-3 sm:p-4">
        <div className="mb-4 flex items-center justify-between gap-3 px-1">
          <div>
            <p className="text-sm font-semibold text-neutral-100">Document camera</p>
            <p className="mt-1 text-xs leading-5 text-neutral-400">
              The frame is shaped for your {selectedDocument.frameLabel.toLowerCase()}.
            </p>
          </div>
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-[10px] font-semibold text-emerald-200">
            DEMO
          </span>
        </div>
        <DocumentScanCamera
          documentType={values.documentType}
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

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-neutral-100">{value}</dd>
    </div>
  );
}

function formatCountry(value: string): string {
  return residenceCountries.find((country) => country.value === value)?.label ?? "Not selected";
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

function InlineError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="mt-3 text-sm text-red-300" role="alert">
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
