import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Rendered whenever a guard calls `forbidden()` — an authenticated user
 * who lacks permission. Distinct from the sign-in redirect, which is for
 * users who are not authenticated at all.
 */
export default function Forbidden() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="size-6" aria-hidden="true" />
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          You don&apos;t have access to this page
        </h1>
        <p className="text-sm text-muted-foreground">
          Your account doesn&apos;t have the required permissions. If you
          think this is a mistake, contact an administrator.
        </p>
      </div>

      <Button asChild variant="outline" className="mt-2">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
