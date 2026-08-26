import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, Library, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader, PageShell } from "@/components/shared/page-shell";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { can } from "@/features/auth/policy";
import { requireUserRecord } from "@/features/auth/session";
import { CourseProgressCard } from "@/features/dashboard/components/course-progress-card";
import { getStudentDashboard } from "@/features/dashboard/queries";

export const metadata: Metadata = {
  title: "Dashboard · LMS Platform",
};

/**
 * §44, Milestone 9. Extends the Milestone 3 placeholder in place — the
 * auth/role-badge/admin-link section below is unchanged — rather than a
 * separate route, so the already-correct `requireUserRecord()` and
 * `admin:access` gating isn't duplicated (§4).
 *
 * Widened from `narrow` to `wide`: the tri-width shell from Milestone 1
 * names `wide` for exactly this case, "multi-column content" (the course
 * card grid below), where `narrow` was right for a single account card.
 */
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

  // Structurally scoped to this actor — `getStudentDashboard(actor)` can
  // only ever return the signed-in user's own enrollments, the same
  // reasoning `getEnrollment(actor.id, ...)` already relies on, so there is
  // nothing here for `can()` to additionally gate (§12).
  const courses = await getStudentDashboard(actor);

  return (
    <PageShell width="wide">
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

      <div className="flex flex-col gap-4">
        <h2 className="font-heading text-title-sm font-semibold text-foreground">
          Your courses
        </h2>

        {courses.length === 0 ? (
          <EmptyState
            icon={<GraduationCap className="size-6" aria-hidden="true" />}
            title="You haven't enrolled in a course yet"
            description="Browse the catalogue and enroll in a course to start learning."
            action={
              <Button asChild>
                <Link href="/courses">
                  <Library aria-hidden="true" />
                  Browse courses
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseProgressCard key={course.enrollmentId} course={course} />
            ))}
          </div>
        )}
      </div>

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
