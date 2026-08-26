"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { enrollAction, type EnrollFormState } from "../actions";

/**
 * The enroll control.
 *
 * A Client Component only because it needs `useActionState` for the
 * pending and error states (§28); the page rendering it stays a Server
 * Component (§7). Without JavaScript the form still posts and the page
 * re-renders with the new enrollment — the interactivity is an
 * enhancement, not a requirement.
 *
 * Uses `Button`'s `loading` prop rather than swapping the label by hand,
 * so this action is visually consistent with every other in-flight action
 * in the app (sign-in, sign-out) instead of inventing its own pending
 * treatment (§21).
 */

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto">
      {pending ? "Enrolling…" : "Enroll in this course"}
    </Button>
  );
}

export function EnrollButton({ slug }: { slug: string }) {
  const [state, formAction] = useActionState<EnrollFormState, FormData>(
    enrollAction,
    {}
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="slug" value={slug} />

      <SubmitButton />

      {state.error ? (
        <p
          // `role="alert"` so the failure is announced rather than only
          // shown — a screen reader user who submits and hears nothing has
          // no way to know it failed (§24).
          role="alert"
          className="flex items-center gap-2 text-body-sm text-destructive"
        >
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
