import Link from "next/link";
import { BookOpen, GraduationCap, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";

const colorTokens = [
  { name: "Background", className: "bg-background border" },
  { name: "Foreground", className: "bg-foreground" },
  { name: "Primary", className: "bg-primary" },
  { name: "Secondary", className: "bg-secondary" },
  { name: "Muted", className: "bg-muted" },
  { name: "Accent", className: "bg-accent" },
  { name: "Destructive", className: "bg-destructive" },
  { name: "Border", className: "bg-border" },
];

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-6 py-16 sm:px-10">
      {/* Header */}
      <header className="flex flex-col gap-4">
        <Badge variant="secondary" className="w-fit gap-1.5">
          <Sparkles className="size-3.5" aria-hidden="true" />
          Milestone 1 — Foundation
        </Badge>
        <h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Design System Preview
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          This page proves the pinned stack, design tokens, and shared
          component primitives are wired up correctly. It is a token
          showcase, not the final marketing page.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/sign-up">Create account</Link>
          </Button>
        </div>
      </header>

      {/* Typography */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Typography
        </h2>
        <div className="flex flex-col gap-2 rounded-xl border border-border p-6">
          <p className="font-heading text-4xl font-semibold text-foreground">
            Heading / 4xl
          </p>
          <p className="font-heading text-2xl font-semibold text-foreground">
            Heading / 2xl
          </p>
          <p className="text-lg text-foreground">Body / lg</p>
          <p className="text-sm text-foreground">Body / sm</p>
          <p className="text-sm text-muted-foreground">Muted / sm</p>
        </div>
      </section>

      {/* Color tokens */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Color Tokens
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {colorTokens.map((token) => (
            <div key={token.name} className="flex flex-col gap-2">
              <div
                className={`h-16 rounded-lg ${token.className}`}
                aria-hidden="true"
              />
              <span className="text-sm text-muted-foreground">
                {token.name}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Buttons & Badges */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Buttons &amp; Badges
        </h2>
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-6">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <div className="mx-2 h-6 w-px bg-border" aria-hidden="true" />
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </section>

      {/* Form elements */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Form Elements
        </h2>
        <div className="flex flex-col gap-4 rounded-xl border border-border p-6 sm:max-w-sm">
          <Input placeholder="you@example.com" aria-label="Email" />
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground">Course progress</span>
              <span className="text-muted-foreground">62%</span>
            </div>
            <Progress value={62} />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
      </section>

      {/* Card example */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Course Card
        </h2>
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Introduction to Machine Learning</CardTitle>
            <CardDescription>
              12 modules &middot; 48 lessons &middot; Beginner friendly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <GraduationCap className="size-4" aria-hidden="true" />
              <span>3,204 students enrolled</span>
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <Badge variant="secondary" className="gap-1.5">
              <BookOpen className="size-3.5" aria-hidden="true" />
              In Progress
            </Badge>
            <Button size="sm">Continue</Button>
          </CardFooter>
        </Card>
      </section>

      {/* Empty & error states */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Empty &amp; Error States
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <EmptyState
            icon={<BookOpen className="size-5" aria-hidden="true" />}
            title="No courses yet"
            description="Enrolled courses will appear here once you join one."
            action={<Button size="sm">Browse courses</Button>}
          />
          <ErrorState />
        </div>
      </section>
    </div>
  );
}
