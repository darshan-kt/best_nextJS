import { prisma } from "@/db/client";
import {
  can,
  isPubliclyVisible,
  type Actor,
  type CourseSubject,
} from "@/features/auth/policy";
import { getEnrollment } from "@/features/enrollment/queries";
import { CATALOG_VISIBILITY, isListableInCatalog } from "./visibility";
import { PAGE_SIZE } from "./search-params";

/**
 * Catalogue data access (application layer, §5).
 *
 * Server-side only: it reaches the database through the shared Prisma
 * client, which imports the validated server environment and would fail
 * loudly if it were ever pulled into a client bundle.
 */

/**
 * A course as the catalogue needs it.
 *
 * Defined as an explicit domain type rather than inferred from Prisma so
 * that the presentation layer depends on the domain, not on the ORM (§5),
 * and so that the `select` below stays deliberate. Listings should never
 * ship columns the UI does not render (§29).
 */
export interface CatalogCourse {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  publishedAt: Date | null;
  instructor: {
    name: string | null;
  };
}

export interface CatalogPage {
  courses: CatalogCourse[];
  /** True when a further page exists, without a second COUNT query. */
  hasMore: boolean;
}

interface ListCatalogCoursesArgs {
  /** The viewer, or null when signed out. Both are normal. */
  actor: Actor | null;
  query?: string | undefined;
  page?: number;
}

/**
 * Lists the courses visible in the public catalogue.
 *
 * Authorization runs in two places, on purpose (see `visibility.ts`):
 *
 *   1. `CATALOG_VISIBILITY` filters in SQL, so unpublished and PRIVATE
 *      courses never leave the database.
 *   2. Every row is then re-checked through `can()`, the single
 *      authorization decision point (§12). At most `PAGE_SIZE` rows reach
 *      this check, so it costs nothing measurable, and it means a future
 *      change to the `where` clause cannot silently widen what is shown.
 */
export async function listCatalogCourses({
  actor,
  query,
  page = 1,
}: ListCatalogCoursesArgs): Promise<CatalogPage> {
  const rows = await prisma.course.findMany({
    where: {
      ...CATALOG_VISIBILITY,
      ...(query ? { OR: buildSearchFilter(query) } : {}),
    },
    select: {
      id: true,
      slug: true,
      title: true,
      subtitle: true,
      publishedAt: true,
      // Selected for the policy re-check below, not for display.
      status: true,
      visibility: true,
      instructorId: true,
      instructor: { select: { name: true } },
    },
    orderBy: [
      // Newest first, with `id` as a tiebreaker so that courses published
      // in the same transaction cannot swap places between pages and make
      // a row appear twice or not at all.
      { publishedAt: "desc" },
      { id: "desc" },
    ],
    skip: (page - 1) * PAGE_SIZE,
    // One extra row answers "is there a next page?" without a COUNT over
    // the whole catalogue, which gets expensive as the catalogue grows.
    take: PAGE_SIZE + 1,
  });

  const hasMore = rows.length > PAGE_SIZE;
  const visible = rows.slice(0, PAGE_SIZE).filter(
    (course) =>
      isListableInCatalog(course) &&
      can(actor, { type: "course:view", course })
  );

  return {
    courses: visible.map(({ id, slug, title, subtitle, publishedAt, instructor }) => ({
      id,
      slug,
      title,
      subtitle,
      publishedAt,
      instructor,
    })),
    hasMore,
  };
}

/**
 * A single course, as the detail page needs it.
 */
export interface CourseDetail extends CatalogCourse {
  description: string | null;
}

/**
 * A lesson as the curriculum outline shows it.
 *
 * No content — that arrives with the learning player in Milestone 6, and
 * a listing has no business loading lesson bodies it will not render.
 */
export interface CurriculumLesson {
  id: string;
  slug: string;
  title: string;
  durationMinutes: number | null;
}

export interface CurriculumSection {
  id: string;
  title: string;
  summary: string | null;
  lessons: CurriculumLesson[];
}

export interface CourseWithCurriculum extends CourseDetail {
  /**
   * The fields `can()` needs to answer `course:learn` for this course.
   * Carried through explicitly rather than re-fetched at the call site:
   * the page has already loaded the row, and a second query to re-ask a
   * question this one answered would be waste.
   */
  policySubject: CourseSubject;
  sections: CurriculumSection[];
  /** Denormalised for the header; cheap to derive, tedious to recompute. */
  lessonCount: number;
  totalDurationMinutes: number;
}

/**
 * Loads a course together with its curriculum outline.
 *
 * One query, not one per section: a nested `select` becomes a small number
 * of statements Prisma issues together, whereas fetching sections and then
 * looping to fetch lessons is the N+1 pattern §10 forbids.
 *
 * Only published lessons are returned. A half-written lesson inside a
 * published course is not something a prospective learner should see, and
 * filtering here rather than in the component means it never reaches the
 * client at all.
 */
export async function getCourseWithCurriculum(
  slug: string,
  actor: Actor | null
): Promise<CourseWithCurriculum | null> {
  const course = await prisma.course.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      subtitle: true,
      description: true,
      publishedAt: true,
      status: true,
      visibility: true,
      instructorId: true,
      instructor: { select: { name: true } },
      sections: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          title: true,
          summary: true,
          lessons: {
            where: { isPublished: true },
            orderBy: { position: "asc" },
            select: {
              id: true,
              slug: true,
              title: true,
              durationMinutes: true,
            },
          },
        },
      },
    },
  });

  if (!course) {
    return null;
  }

  const courseSubject: CourseSubject = {
    instructorId: course.instructorId,
    status: course.status,
    visibility: course.visibility,
  };

  // Enrollment only changes the outcome once the cheap checks (public
  // course, instructor, moderator) have already failed — the common case
  // is a published public course or an anonymous visitor, and `getEnrollment`
  // would otherwise run a needless query on every one of those (§26).
  const enrollment = isPubliclyVisible(courseSubject)
    ? null
    : await getEnrollment(actor?.id ?? null, course.id);

  if (
    !can(actor, { type: "course:view", course: courseSubject, enrollment })
  ) {
    return null;
  }

  const lessons = course.sections.flatMap((section) => section.lessons);

  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    subtitle: course.subtitle,
    description: course.description,
    publishedAt: course.publishedAt,
    instructor: course.instructor,
    policySubject: courseSubject,
    sections: course.sections,
    lessonCount: lessons.length,
    totalDurationMinutes: lessons.reduce(
      (total, lesson) => total + (lesson.durationMinutes ?? 0),
      0
    ),
  };
}

export interface CourseLessonRef {
  id: string;
  slug: string;
}

/**
 * Published lessons for several courses at once, in curriculum order, keyed
 * by course id. Built for the dashboard (§44, Milestone 9): a student's
 * enrollments span many courses, and computing "next incomplete lesson" for
 * each one must not cost one query per course (§26, §42) — this is one
 * query regardless of how many course ids are passed.
 *
 * A course id with no published lessons still gets a `[]` entry rather than
 * a missing map key, matching `getCompletedLessonIdsByEnrollments`'s same
 * choice for the same reason.
 */
export async function getPublishedLessonsForCourses(
  courseIds: readonly string[]
): Promise<Map<string, CourseLessonRef[]>> {
  const result = new Map<string, CourseLessonRef[]>(
    courseIds.map((id) => [id, []])
  );

  if (courseIds.length === 0) {
    return result;
  }

  const courses = await prisma.course.findMany({
    where: { id: { in: courseIds as string[] } },
    select: {
      id: true,
      sections: {
        orderBy: { position: "asc" },
        select: {
          lessons: {
            where: { isPublished: true },
            orderBy: { position: "asc" },
            select: { id: true, slug: true },
          },
        },
      },
    },
  });

  for (const course of courses) {
    result.set(
      course.id,
      course.sections.flatMap((section) => section.lessons)
    );
  }

  return result;
}

/**
 * Case-insensitive substring search across the fields a learner would
 * recognise a course by.
 *
 * `contains` is honest about what this is: a simple filter for a small
 * catalogue. It cannot use a B-tree index and will not rank results.
 * PostgreSQL full-text search or a dedicated search service is the answer
 * once the catalogue is large enough for that to matter — but choosing
 * between them needs real courses and real queries to learn from, and
 * neither exists yet (§39). The call site is this one function, so the
 * swap stays local.
 */
function buildSearchFilter(query: string) {
  const mode = "insensitive" as const;

  return [
    { title: { contains: query, mode } },
    { subtitle: { contains: query, mode } },
    { description: { contains: query, mode } },
  ];
}
