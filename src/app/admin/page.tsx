import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/shared/page-shell";
import { prisma } from "@/db/client";
import { requireAdminAccess } from "@/features/auth/guards";

export const metadata: Metadata = {
  title: "Admin · LMS Platform",
};

export default async function AdminPage() {
  // Authentication *and* authorization, both server-side. A STUDENT who
  // types this URL directly gets a 403 regardless of what the dashboard
  // chose to render (§12).
  const actor = await requireAdminAccess("/admin");

  const [userCount, courseCount] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
  ]);

  const stats = [
    { label: "Users", value: userCount },
    { label: "Courses", value: courseCount },
  ];

  return (
    <PageShell width="narrow">
      <PageHeader
        title="Admin"
        description={`Signed in as ${actor.roles.join(", ") || "no roles"}.`}
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              {/* The figure is the point of the card, so it takes a
                  deliberate step off the scale rather than an ad-hoc
                  `text-3xl`. */}
              <CardTitle className="text-title tabular-nums">
                {stat.value.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
