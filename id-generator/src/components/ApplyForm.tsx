"use client";

import { useFormState, useFormStatus } from "react-dom";

import { submitApplicationForm } from "@/app/apply/actions";
import {
  initialApplyFormState,
  type ApplyFormState,
} from "@/app/apply/form-state";

const consentCopy =
  "I consent to submission of my details for this identity verification workflow. I understand that my information will be processed securely according to the platform's terms of service.";

export function ApplyForm() {
  const [state, formAction] = useFormState(
    submitApplicationForm,
    initialApplyFormState,
  );

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormError state={state} />

      <Field
        autoComplete="name"
        error={state.errors.legalName?.[0]}
        label="Legal name"
        name="legalName"
        type="text"
        value={state.values.legalName}
      />
      <Field
        error={state.errors.dateOfBirth?.[0]}
        label="Date of birth"
        name="dateOfBirth"
        type="date"
        value={state.values.dateOfBirth}
      />
      <Field
        autoComplete="email"
        error={state.errors.email?.[0]}
        label="Email"
        name="email"
        type="email"
        value={state.values.email}
      />
      <Field
        autoComplete="tel"
        error={state.errors.phone?.[0]}
        label="Phone"
        name="phone"
        type="tel"
        value={state.values.phone}
      />

      <div className="grid gap-2">
        <label className="flex items-start gap-3 text-sm leading-6 text-neutral-200">
          <input
            className="mt-1 h-4 w-4 rounded border-neutral-500 bg-neutral-950 text-cyan-300"
            defaultChecked={state.values.consent}
            name="consent"
            type="checkbox"
          />
          <span>{consentCopy}</span>
        </label>
        <InlineError message={state.errors.consent?.[0]} />
      </div>

      <SubmitButton />
    </form>
  );
}

function Field(props: {
  autoComplete?: string;
  error?: string;
  label: string;
  name: string;
  type: string;
  value: string;
}) {
  const errorId = `${props.name}-error`;

  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium text-neutral-100" htmlFor={props.name}>
        {props.label}
      </label>
      <input
        aria-describedby={props.error ? errorId : undefined}
        aria-invalid={Boolean(props.error)}
        autoComplete={props.autoComplete}
        className="h-11 rounded-md border border-neutral-700 bg-neutral-950 px-3 text-base text-neutral-50 outline-none transition focus:border-cyan-300"
        defaultValue={props.value}
        id={props.name}
        name={props.name}
        type={props.type}
      />
      <InlineError id={errorId} message={props.error} />
    </div>
  );
}

function FormError({ state }: { state: ApplyFormState }) {
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
      className="mt-2 h-11 rounded-md bg-cyan-300 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-300"
      disabled={status.pending}
      type="submit"
    >
      {status.pending ? "Submitting..." : "Continue to scan"}
    </button>
  );
}
