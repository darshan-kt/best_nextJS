import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/shared/page-shell";

/**
 * Rendered whenever a guard calls `forbidden()` — an authenticated user
 * who lacks permission. Distinct from the sign-in redirect, which is for
 * users who are not authenticated at all.
 */
export default function Forbidden() {
  return (
    <PageShell width="focus" centered className="items-center gap-6 text-center">
      <div
        className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"
        aria-hidden="true"
      >
        <ShieldAlert className="size-6" />
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-title-sm font-semibold text-balance text-foreground">
          You don&apos;t have access to this page
        </h1>
        <p className="text-body-sm text-pretty text-muted-foreground">
          Your account doesn&apos;t have the required permissions. If you
          think this is a mistake, contact an administrator.
        </p>
      </div>

      <Button asChild variant="outline">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </PageShell>
  );
}
