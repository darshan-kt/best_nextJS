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
import { PageHeader, PageShell } from "@/components/shared/page-shell";

/**
 * The design-system showcase (§44, Milestone 1).
 *
 * Its job is to make the token layer inspectable: every step of the type
 * scale, the accent in each of its roles, and every interactive state of
 * every primitive on one page. If something here looks wrong, the tokens
 * are wrong — that is the point of the page.
 */

const typeScale = [
  { token: "text-display", label: "Display", className: "text-display" },
  { token: "text-title-lg", label: "Title / lg", className: "text-title-lg" },
  { token: "text-title", label: "Title", className: "text-title" },
  { token: "text-title-sm", label: "Title / sm", className: "text-title-sm" },
  { token: "text-lede", label: "Lede", className: "text-lede" },
  { token: "text-body", label: "Body", className: "text-body" },
  { token: "text-body-sm", label: "Body / sm", className: "text-body-sm" },
  { token: "text-caption", label: "Caption", className: "text-caption" },
];

const colorTokens = [
  { name: "Primary", role: "Actions", className: "bg-primary" },
  { name: "Accent", role: "Tints, links", className: "bg-accent" },
  { name: "Ring", role: "Focus", className: "bg-ring" },
  { name: "Foreground", role: "Text", className: "bg-foreground" },
  { name: "Muted", role: "Surfaces", className: "bg-muted" },
  { name: "Secondary", role: "Quiet fills", className: "bg-secondary" },
  { name: "Border", role: "Edges", className: "bg-border" },
  { name: "Destructive", role: "Failure only", className: "bg-destructive" },
];

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-caption font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </h2>
        {note ? (
          <p className="text-body-sm text-muted-foreground">{note}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default function Home() {
  return (
    <PageShell className="gap-12 sm:gap-16">
      <PageHeader
        size="display"
        eyebrow={
          <Badge variant="accent" className="w-fit">
            <Sparkles aria-hidden="true" />
            Milestone 1 — Foundation
          </Badge>
        }
        title="Design System Preview"
        description="This page proves the pinned stack, design tokens, and shared component primitives are wired up correctly. It is a token showcase, not the final marketing page."
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/courses">Browse courses</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href="/sign-up">Create account</Link>
          </Button>
        </div>
      </PageHeader>

      <Section
        title="Type scale"
        note="A 1.25 ratio anchored at 1rem. Line-height and tracking are bound to each step, so headings tighten and small text opens up without anyone deciding it per page."
      >
        <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {typeScale.map((step) => (
            <div
              key={step.token}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-6 py-4"
            >
              <p
                className={`font-heading text-foreground ${step.className} ${
                  step.className.startsWith("text-title") ||
                  step.className === "text-display"
                    ? "font-semibold"
                    : ""
                }`}
              >
                {step.label}
              </p>
              <code className="text-caption text-muted-foreground">
                {step.token}
              </code>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Colour"
        note="One accent hue in three roles — primary action, subtle tint, focus ring. Everything else is neutral, and destructive is reserved for failure."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {colorTokens.map((token) => (
            <div key={token.name} className="flex flex-col gap-2">
              <div
                className={`h-16 rounded-lg border border-border ${token.className}`}
                aria-hidden="true"
              />
              <div className="flex flex-col">
                <span className="text-body-sm font-medium text-foreground">
                  {token.name}
                </span>
                <span className="text-caption text-muted-foreground">
                  {token.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Buttons"
        note="Every variant shares one focus ring, one disabled treatment, and one loading treatment."
      >
        <div className="flex flex-col gap-5 rounded-xl border border-border p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button>Default</Button>
            <Button size="lg">Large</Button>
            <Button disabled>Disabled</Button>
            <Button loading>Saving</Button>
            <Button variant="outline" loading>
              Loading
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-6">
          <Badge>Default</Badge>
          <Badge variant="accent">Accent</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="ghost">Ghost</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </Section>

      <Section
        title="Form elements"
        note="Fields and buttons share one control-height ladder, so a row of them lines up."
      >
        <div className="flex flex-col gap-5 rounded-xl border border-border p-6 sm:max-w-md">
          <Input placeholder="Default field" aria-label="Default field" />
          <Input inputSize="lg" placeholder="Large field" aria-label="Large field" />
          <Input disabled placeholder="Disabled field" aria-label="Disabled field" />
          <Input
            aria-label="Invalid field"
            aria-invalid
            defaultValue="Invalid value"
          />

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-body-sm">
              <span className="text-foreground">Course progress</span>
              <span className="text-muted-foreground tabular-nums">62%</span>
            </div>
            <Progress value={62} />
          </div>

          <Skeleton className="h-control w-full" />
        </div>
      </Section>

      <Section title="Course card">
        <Card size="sm" interactive className="max-w-sm">
          <CardHeader>
            <CardTitle>Introduction to Machine Learning</CardTitle>
            <CardDescription>
              12 modules &middot; 48 lessons &middot; Beginner friendly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
              <GraduationCap className="size-4" aria-hidden="true" />
              <span className="tabular-nums">3,204 students enrolled</span>
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <Badge variant="accent">
              <BookOpen aria-hidden="true" />
              In Progress
            </Badge>
            <Button size="sm">Continue</Button>
          </CardFooter>
        </Card>
      </Section>

      <Section title="Empty & error states">
        <div className="grid gap-5 sm:grid-cols-2">
          <EmptyState
            icon={<BookOpen className="size-6" aria-hidden="true" />}
            title="No courses yet"
            description="Enrolled courses will appear here once you join one."
            action={<Button>Browse courses</Button>}
          />
          <ErrorState />
        </div>
      </Section>
    </PageShell>
  );
}
