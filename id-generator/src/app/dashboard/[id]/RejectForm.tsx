"use client";

import { useFormState } from "react-dom";

import {
  rejectApplicationAction,
  type RejectActionState,
} from "./actions";

const initialState: RejectActionState = { message: null };

export function RejectForm({ applicationId }: { applicationId: string }) {
  const [state, formAction] = useFormState(
    rejectApplicationAction.bind(null, applicationId),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-neutral-100">
          Rejection reason
        </span>
        <textarea
          className="min-h-24 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-50 outline-none focus:border-cyan-300"
          name="rejectionReason"
          required
        />
      </label>
      {state.message ? (
        <p className="rounded-md border border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-100">
          {state.message}
        </p>
      ) : null}
      <button
        className="h-10 rounded-md border border-red-400 px-3 text-sm font-semibold text-red-100 transition hover:bg-red-950/40"
        type="submit"
      >
        Reject
      </button>
    </form>
  );
}
