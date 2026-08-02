"use client";

import { useFormState } from "react-dom";

import { type MfaActionState, verifyMfaAction } from "./actions";

const initialState: MfaActionState = { message: null };

export function MfaForm() {
  const [state, formAction] = useFormState(verifyMfaAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-neutral-100">MFA code</span>
        <input
          autoComplete="one-time-code"
          className="h-11 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 text-sm text-neutral-50 outline-none focus:border-cyan-300"
          inputMode="numeric"
          name="totp"
          pattern="[0-9 ]+"
          required
        />
      </label>
      {state.message ? (
        <p className="rounded-md border border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-100">
          {state.message}
        </p>
      ) : null}
      <button
        className="h-11 rounded-md bg-cyan-300 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-200"
        type="submit"
      >
        Verify
      </button>
    </form>
  );
}
