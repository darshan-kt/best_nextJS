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
import { signUpAction } from "@/features/auth/actions";
import { AuthForm } from "@/features/auth/components/auth-form";
import { PASSWORD_MIN_LENGTH } from "@/features/auth/password";
import { getCurrentUser } from "@/features/auth/session";

export const metadata: Metadata = {
  title: "Create account · LMS Platform",
};

export default async function SignUpPage({
  searchParams,
}: PageProps<"/sign-up">) {
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
        <CardTitle asChild>
          <h1>Create your account</h1>
        </CardTitle>
        <CardDescription>
          Start learning in a couple of minutes.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        {/* The name field is a prop rather than hand-written markup passed
            as children, so both auth forms render identical field rows. */}
        <AuthForm
          action={signUpAction}
          submitLabel="Create account"
          pendingLabel="Creating account…"
          callbackUrl={callbackUrl}
          includeName
          passwordAutoComplete="new-password"
          passwordHint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        />

        <p className="text-body-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className={`rounded-sm font-medium text-accent-foreground underline underline-offset-4 ${focusRing}`}
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
