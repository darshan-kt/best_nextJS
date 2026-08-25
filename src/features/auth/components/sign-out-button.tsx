import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOutAction } from "../actions";

/**
 * Sign-out is a state change, so it is a POST via a form rather than a
 * link. A GET link would be triggerable by any page that can embed a URL,
 * letting a third-party site sign the user out unbidden.
 *
 * No `"use client"` needed: a form with a Server Action works without
 * client JavaScript.
 */
export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="outline" size="sm">
        <LogOut className="size-4" aria-hidden="true" />
        Sign out
      </Button>
    </form>
  );
}
