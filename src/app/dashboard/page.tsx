import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Welcome{user.name ? `, ${user.name}` : ""}
          </h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>

        <SignOutButton />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Your account</CardTitle>
          <CardDescription>
            Roles determine what you can access across the platform.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {actor.roles.length > 0 ? (
              actor.roles.map((role) => (
                <Badge key={role} variant="secondary">
                  {role}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">
                No roles assigned
              </span>
            )}
          </div>

          {showAdminLink ? (
            <Button asChild variant="outline" size="sm" className="w-fit">
              <Link href="/admin">
                <ShieldCheck className="size-4" aria-hidden="true" />
                Admin area
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
