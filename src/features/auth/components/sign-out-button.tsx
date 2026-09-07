"use client";

import { useFormStatus } from "react-dom";
import { LogOut } from "lucide-react";

import { Button, type buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import { signOutAction } from "../actions";

type ButtonSize = VariantProps<typeof buttonVariants>["size"];

/**
 * Sign-out is a state change, so it is a POST via a form rather than a
 * link. A GET link would be triggerable by any page that can embed a URL,
 * letting a third-party site sign the user out unbidden.
 *
 * The form still works without client JavaScript — the Server Action is the
 * form's `action`. The small client boundary exists only to read
 * `useFormStatus`, so the button can show the same loading treatment as
 * every other in-flight action instead of appearing inert after a click.
 */
function SignOutSubmit({ size }: { size?: ButtonSize }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" size={size} loading={pending}>
      {pending ? null : <LogOut aria-hidden="true" />}
      Sign out
    </Button>
  );
}

/** `size` defaults to the button default — every existing call site keeps its current size. */
export function SignOutButton({ size }: { size?: ButtonSize } = {}) {
  return (
    <form action={signOutAction}>
      <SignOutSubmit size={size} />
    </form>
  );
}
