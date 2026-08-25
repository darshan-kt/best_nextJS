"use client";

import { useActionState } from "react";
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
  /** Rendered above the password field; sign-up adds a name field. */
  children?: React.ReactNode;
  passwordAutoComplete: "current-password" | "new-password";
  passwordHint?: string;
}

function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function AuthForm({
  action,
  submitLabel,
  pendingLabel,
  callbackUrl,
  children,
  passwordAutoComplete,
  passwordHint,
}: AuthFormProps) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {callbackUrl ? (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      ) : null}

      {children}

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="password"
          className="text-sm font-medium text-foreground"
        >
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={passwordAutoComplete}
          required
          aria-describedby={passwordHint ? "password-hint" : undefined}
        />
        {passwordHint ? (
          <p id="password-hint" className="text-sm text-muted-foreground">
            {passwordHint}
          </p>
        ) : null}
      </div>

      {state.error ? (
        // role="alert" so screen readers announce the failure rather than
        // leaving the user wondering why nothing happened (§24).
        <p
          role="alert"
          className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          {state.error}
        </p>
      ) : null}

      <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
    </form>
  );
}
