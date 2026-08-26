"use client";

import { useActionState, useId } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthFormState } from "../actions";

/**
 * Shared form shell for sign-in and sign-up.
 *
 * A Client Component because it needs `useActionState` for pending and
 * error state; the pages that render it stay Server Components (§7).
 */

interface AuthFormProps {
  action: (
    state: AuthFormState,
    formData: FormData
  ) => Promise<AuthFormState>;
  submitLabel: string;
  pendingLabel: string;
  callbackUrl?: string;
  /**
   * Renders the name field above email. Previously the sign-up page passed
   * this in as `children` with its own hand-written label markup, which is
   * how the two forms drifted; the form now owns every field it renders.
   */
  includeName?: boolean;
  passwordAutoComplete: "current-password" | "new-password";
  passwordHint?: string;
}

/**
 * Submitting now looks like submitting: the button shows a spinner and
 * `aria-busy` rather than only swapping its label, which made a pending
 * button visually identical to a disabled one (§21 — loading is a state the
 * design system owes every action).
 */
function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" className="w-full" loading={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

/** One field row — label, control, optional hint — so the three fields on
 *  these two pages cannot drift apart. */
function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="text-body-sm font-medium text-foreground"
      >
        {label}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-caption text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function AuthForm({
  action,
  submitLabel,
  pendingLabel,
  callbackUrl,
  includeName = false,
  passwordAutoComplete,
  passwordHint,
}: AuthFormProps) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(action, {});
  const errorId = useId();

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {callbackUrl ? (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      ) : null}

      {includeName ? (
        <Field id="name" label="Name">
          <Input
            id="name"
            name="name"
            type="text"
            inputSize="lg"
            autoComplete="name"
            required
            placeholder="Ada Lovelace"
          />
        </Field>
      ) : null}

      <Field id="email" label="Email">
        <Input
          id="email"
          name="email"
          type="email"
          inputSize="lg"
          autoComplete="email"
          required
          placeholder="you@example.com"
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? errorId : undefined}
        />
      </Field>

      <Field id="password" label="Password" hint={passwordHint}>
        <Input
          id="password"
          name="password"
          type="password"
          inputSize="lg"
          autoComplete={passwordAutoComplete}
          required
          aria-invalid={state.error ? true : undefined}
          aria-describedby={
            [passwordHint ? "password-hint" : null, state.error ? errorId : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
        />
      </Field>

      {state.error ? (
        // role="alert" so screen readers announce the failure rather than
        // leaving the user wondering why nothing happened (§24).
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-body-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {state.error}
        </p>
      ) : null}

      <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
    </form>
  );
}
