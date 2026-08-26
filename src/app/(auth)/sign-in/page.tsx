import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { focusRing } from "@/lib/utils";
import { signInAction } from "@/features/auth/actions";
import { AuthForm } from "@/features/auth/components/auth-form";
import { getCurrentUser } from "@/features/auth/session";

export const metadata: Metadata = {
  title: "Sign in · LMS Platform",
};

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  // Someone already signed in has no reason to see a login form.
  if (await getCurrentUser()) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const rawCallback = params.callbackUrl;
  const callbackUrl =
    typeof rawCallback === "string" ? rawCallback : undefined;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        {/* The card title is this page's primary heading, so it is an h1
            and takes the title step — not the base size it had before,
            which left the page with no typographic focal point (§21). */}
        <CardTitle asChild>
          <h1>Welcome back</h1>
        </CardTitle>
        <CardDescription>Sign in to continue your learning.</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <AuthForm
          action={signInAction}
          submitLabel="Sign in"
          pendingLabel="Signing in…"
          callbackUrl={callbackUrl}
          passwordAutoComplete="current-password"
        />

        <p className="text-body-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/sign-up"
            className={`rounded-sm font-medium text-accent-foreground underline underline-offset-4 ${focusRing}`}
          >
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
