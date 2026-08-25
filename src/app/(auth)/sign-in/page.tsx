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
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>
          Sign in to continue your learning.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <AuthForm
          action={signInAction}
          submitLabel="Sign in"
          pendingLabel="Signing in…"
          callbackUrl={callbackUrl}
          passwordAutoComplete="current-password"
        />

        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/sign-up"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
