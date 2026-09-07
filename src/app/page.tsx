import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Cpu,
  Gauge,
  GraduationCap,
  Sparkles,
  Wrench,
} from "lucide-react";

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
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";
import { SiteChrome } from "@/components/marketing/site-chrome";
import type { Actor } from "@/features/auth/policy";
import { getCurrentActor } from "@/features/auth/session";
import { CourseCard } from "@/features/courses/components/course-card";
import {
  getCatalogStats,
  listCatalogCourses,
  type CatalogCourse,
  type CatalogStats,
} from "@/features/courses/queries";

export const metadata: Metadata = {
  title: "LMS Platform — Learn robotics and applied AI by building",
  description:
    "Hands-on courses in ROS 2, robotics hardware, and applied AI — real projects, instantly graded quizzes, and a course-aware AI assistant.",
};

const FEATURES = [
  {
    icon: Wrench,
    title: "Hands-on from lesson one",
    description:
      "Every module pairs theory with a real terminal, a real ROS 2 stack, or a real device — not another slide deck.",
  },
  {
    icon: Bot,
    title: "An assistant that knows the lesson",
    description:
      "Ask a question and get an answer grounded in the exact lesson you're on, not a generic chatbot bolted on top.",
  },
  {
    icon: Gauge,
    title: "Real grading, instantly",
    description:
      "Quizzes are scored server-side the moment you submit, with multiple question types and clear feedback on every answer.",
  },
  {
    icon: GraduationCap,
    title: "Progress you can see",
    description:
      "Track completion lesson by lesson and pick up exactly where you left off, on any device.",
  },
] as const;

const ROBOTICS_HIGHLIGHTS = [
  {
    href: "/courses",
    label: "ROS 2 Fundamentals",
    description:
      "From \"what is a node\" to publishers, subscribers, and turtlesim — no simulator experience assumed.",
  },
  {
    href: "/hardware",
    label: "Hardware device catalogue",
    description:
      "Specs, ROS driver support, and side-by-side comparisons for the sensors these courses actually use.",
  },
  {
    href: "/courses",
    label: "Hands-on robotics projects",
    description:
      "Object tracking, navigation, and more — built incrementally, one working checkpoint at a time.",
  },
] as const;

/**
 * The public marketing homepage (§20, §21).
 *
 * Replaces the Milestone 1 token-showcase placeholder, which moved to
 * `/design-system` rather than being deleted. Structured after a
 * conventional EdTech landing page (hero → trust stats → value props →
 * course showcase → specialty → final CTA), but every number and course
 * on it is real: `getCatalogStats()` and `listCatalogCourses()` read the
 * actual database rather than shipping invented enrollment counts (§29).
 */
export default async function HomePage() {
  // `getCurrentActor()` awaited first, on its own — its `auth()` call
  // reads cookies and is what trips Next's dynamic-rendering detection
  // (see courses/page.tsx). Running it inside a `Promise.all` with the
  // Prisma calls below let the build's static-generation probe reach the
  // database before that detection had a chance to bail it out.
  const actor = await getCurrentActor();
  const [stats, catalogPage] = await Promise.all([
    getCatalogStats(),
    listCatalogCourses({ actor: null, page: 1 }),
  ]);

  const featuredCourses = catalogPage.courses.slice(0, 3);

  return (
    <SiteChrome>
      <HeroSection />
      {stats.courseCount > 0 ? <StatsBand stats={stats} /> : null}
      <FeaturesSection />
      <FeaturedCoursesSection courses={featuredCourses} />
      <RoboticsBand />
      <FinalCtaSection actor={actor} />
    </SiteChrome>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-accent/40">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 sm:px-10 sm:py-28 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div className="flex flex-col gap-6">
          <Badge variant="accent" className="w-fit">
            <Sparkles aria-hidden="true" />
            Robotics &amp; applied AI, taught hands-on
          </Badge>

          <h1 className="font-heading text-title-lg font-semibold text-balance text-foreground sm:text-display">
            Learn by building, not by watching.
          </h1>

          <p className="max-w-xl text-pretty text-lede text-muted-foreground">
            Real ROS 2 systems, real hardware, real code — with a course
            assistant that has actually read the lesson you&apos;re stuck
            on, and quizzes that grade themselves the moment you submit.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/courses">
                Browse courses
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/sign-up">Create free account</Link>
            </Button>
          </div>
        </div>

        <HeroPreviewCard />
      </div>
    </section>
  );
}

/**
 * An illustrative product mockup, not a live screenshot — built from the
 * same primitives the real lesson player uses, referencing real shipped
 * content (ROS 2 Fundamentals' Module 6 QoS callout) so it reads as
 * authentic rather than generic stock UI (§22).
 */
function HeroPreviewCard() {
  return (
    <div className="relative mx-auto w-full max-w-sm lg:mx-0">
      <div
        aria-hidden="true"
        className="absolute -top-8 -right-8 size-32 rounded-full bg-primary/25 blur-2xl"
      />
      <Card className="relative">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>ROS 2 Fundamentals</CardTitle>
            <Badge variant="secondary">Module 6</Badge>
          </div>
          <CardDescription>
            Topics, Publishers, and Subscribers
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-body-sm">
              <span className="text-foreground">Course progress</span>
              <span className="tabular-nums text-muted-foreground">68%</span>
            </div>
            <Progress value={68} />
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3">
            <Bot
              className="mt-0.5 size-4 shrink-0 text-accent-foreground"
              aria-hidden="true"
            />
            <p className="text-body-sm text-muted-foreground">
              &ldquo;A publisher needs a queue depth — Module 9 covers why
              10 is a safe default here.&rdquo;
            </p>
          </div>
        </CardContent>

        <CardFooter className="justify-between">
          <span className="text-muted-foreground">Lesson 4 of 5</span>
          <Button size="sm">Continue</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function StatsBand({ stats }: { stats: CatalogStats }) {
  const items = [
    { label: "Published courses", value: stats.courseCount },
    { label: "Lessons ready to learn from", value: stats.lessonCount },
    { label: "Hardware devices documented", value: stats.hardwareDeviceCount },
  ];

  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-14 sm:grid-cols-3 sm:px-10">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex flex-col gap-1 text-center sm:text-left"
          >
            <span className="font-heading text-title-lg font-semibold tabular-nums text-foreground">
              {item.value}
            </span>
            <span className="text-body-sm text-muted-foreground">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 text-center">
        <h2 className="font-heading text-title font-semibold text-balance text-foreground sm:text-title-lg">
          Built the way engineers actually learn
        </h2>
        <p className="text-pretty text-lede text-muted-foreground">
          No filler modules, no padded runtime — every piece of the
          platform exists to get you from reading to doing, faster.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <Card key={feature.title} size="sm">
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-lg bg-accent">
                <feature.icon
                  className="size-5 text-accent-foreground"
                  aria-hidden="true"
                />
              </div>
              <CardTitle className="mt-3">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-body-sm text-pretty text-muted-foreground">
                {feature.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function FeaturedCoursesSection({ courses }: { courses: CatalogCourse[] }) {
  return (
    <section className="border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-title font-semibold text-foreground sm:text-title-lg">
              Featured courses
            </h2>
            <p className="max-w-xl text-pretty text-body text-muted-foreground">
              Full curricula, not previews — every course below ships with
              real lessons today.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/courses">
              Browse all courses
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <div className="mt-10">
          {courses.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<BookOpen className="size-6" aria-hidden="true" />}
              title="New courses are on the way"
              description="Nothing is published yet — check back soon, or browse the catalogue for what's coming."
              action={
                <Button asChild>
                  <Link href="/courses">Go to catalogue</Link>
                </Button>
              }
            />
          )}
        </div>
      </div>
    </section>
  );
}

function RoboticsBand() {
  return (
    <section className="border-t border-border bg-foreground text-background">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
        <div className="flex flex-col gap-4">
          <Badge variant="accent" className="w-fit">
            <Cpu aria-hidden="true" />
            Robotics &amp; embedded AI
          </Badge>
          <h2 className="font-heading text-title font-semibold text-balance sm:text-title-lg">
            If you&apos;re deep in robotics, we built this for you.
          </h2>
          <p className="max-w-2xl text-pretty text-lede text-background/70">
            Most platforms treat robotics as a footnote. Here it&apos;s the
            specialty — real ROS 2, real drivers, real sensors, documented
            in depth.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {ROBOTICS_HIGHLIGHTS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="group flex flex-col gap-2 rounded-xl border border-background/15 p-6 transition-colors hover:border-background/30 hover:bg-background/5"
            >
              <span className="flex items-center justify-between gap-2 font-heading text-body font-semibold">
                {item.label}
                <ArrowRight
                  className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
              <span className="text-body-sm text-pretty text-background/70">
                {item.description}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection({ actor }: { actor: Actor | null }) {
  return (
    <section className="border-t border-border bg-accent/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-20 text-center sm:px-10 sm:py-28">
        <h2 className="font-heading text-title font-semibold text-balance text-foreground sm:text-title-lg">
          Ready to start building?
        </h2>
        <p className="max-w-xl text-pretty text-lede text-muted-foreground">
          Create a free account and pick up your first lesson today — no
          credit card, no sales call.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {actor ? (
            <Button asChild size="lg">
              <Link href="/dashboard">Go to your dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg">
                <Link href="/sign-up">Create free account</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/courses">Browse courses first</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
