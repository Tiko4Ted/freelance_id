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
  const handleCaptureComplete = useCallback((captured: boolean) => {
    setDocumentCaptured(captured);
  }, []);

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <input name="applicationId" type="hidden" value={applicationId} />
      <input name="countryOfResidence" type="hidden" value={values.countryOfResidence} />
      <input name="documentType" type="hidden" value={values.documentType} />
      <input name="documentIssuingCountry" type="hidden" value={values.documentIssuingCountry} />
      {documentCaptured ? (
        <input name="documentScanConfirmed" type="hidden" value="on" />
      ) : null}

      <div className="flex justify-end">
        <Link
          className="rounded-md border border-neutral-700 px-3 py-2 text-xs font-semibold text-neutral-200 transition hover:border-cyan-300/60 hover:text-white active:translate-y-px"
          href={`/verify-document?applicationId=${applicationId}`}
        >
          Back
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-2 sm:p-3">
        <DocumentScanCamera
          documentType={values.documentType}
          onCaptureComplete={handleCaptureComplete}
        />
        <InlineError message={state.errors.documentScanConfirmed?.[0]} />
      </div>

      <label className="flex items-start gap-3 px-1 text-sm leading-6 text-neutral-200">
        <input
          className="mt-1 h-4 w-4 rounded border-neutral-500 bg-neutral-950 text-cyan-300"
          defaultChecked={values.documentConsent}
          name="documentConsent"
          type="checkbox"
        />
        <span>I confirm this document belongs to me.</span>
      </label>
      <InlineError message={state.errors.documentConsent?.[0]} />

      <SubmitButton disabled={!documentCaptured} />
      <FormError state={state} />
    </form>
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
      {status.pending ? "Saving..." : "Continue"}
    </button>
  );
}
