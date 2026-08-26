import type { Metadata } from "next";
import Link from "next/link";
import { Library, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/shared/page-shell";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { can } from "@/features/auth/policy";
import { requireUserRecord } from "@/features/auth/session";

export const metadata: Metadata = {
  title: "Dashboard · LMS Platform",
};

export default async function DashboardPage() {
  // Authentication is enforced here, in the component that renders the
  // protected data — not in middleware, and never by hiding links (§12).
  // The record-backed variant is used because this page shows user fields
  // and must tolerate a still-valid token for a deleted account.
  const user = await requireUserRecord("/dashboard");
  const actor = { id: user.id, roles: user.roles };

  // The admin entry point is hidden from users who cannot use it, but
  // /admin enforces this independently — hiding the link is presentation,
  // not protection.
  const showAdminLink = can(actor, { type: "admin:access" });

  return (
    <PageShell width="narrow">
      <PageHeader
        title={`Welcome${user.name ? `, ${user.name}` : ""}`}
        description={user.email}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/courses">
                <Library aria-hidden="true" />
                Browse courses
              </Link>
            </Button>

            <SignOutButton />
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Your account</CardTitle>
          <CardDescription>
            Roles determine what you can access across the platform.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            {actor.roles.length > 0 ? (
              actor.roles.map((role) => (
                // Neutral, not accent: a row of roles is information, not a
                // call to action, and tinting all of them teal would spend
                // the accent on nothing (§21).
                <Badge key={role} variant="secondary">
                  {role}
                </Badge>
              ))
            ) : (
              <span className="text-body-sm text-muted-foreground">
                No roles assigned
              </span>
            )}
          </div>

          {showAdminLink ? (
            <Button asChild variant="outline" className="w-fit">
              <Link href="/admin">
                <ShieldCheck aria-hidden="true" />
                Admin area
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </PageShell>
  );
}
