import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Admin
        </h1>
        <p className="text-muted-foreground">
          Signed in as {actor.roles.join(", ") || "no roles"}.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Users</CardDescription>
            <CardTitle className="text-3xl">{userCount}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Courses</CardDescription>
            <CardTitle className="text-3xl">{courseCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-0">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
