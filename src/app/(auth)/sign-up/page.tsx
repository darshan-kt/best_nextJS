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
import { Input } from "@/components/ui/input";
import { signUpAction } from "@/features/auth/actions";
import { AuthForm } from "@/features/auth/components/auth-form";
import { PASSWORD_MIN_LENGTH } from "@/features/auth/password";
import { getCurrentActor } from "@/features/auth/session";

export const metadata: Metadata = {
  title: "Create account · LMS Platform",
};

export default async function SignUpPage({
  searchParams,
}: PageProps<"/sign-up">) {
  if (await getCurrentActor()) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const rawCallback = params.callbackUrl;
  const callbackUrl =
    typeof rawCallback === "string" ? rawCallback : undefined;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Start learning in a couple of minutes.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <AuthForm
          action={signUpAction}
          submitLabel="Create account"
          pendingLabel="Creating account…"
          callbackUrl={callbackUrl}
          passwordAutoComplete="new-password"
          passwordHint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        >
          <div className="flex flex-col gap-2">
            <label
              htmlFor="name"
              className="text-sm font-medium text-foreground"
            >
              Name
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              placeholder="Ada Lovelace"
            />
          </div>
        </AuthForm>

        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
