import { prisma } from "@/db/client";
import { can, type Actor } from "@/features/auth/policy";
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
 * Loads one course by slug, or null when the viewer may not see it.
 *
 * "Not found" and "not allowed" deliberately collapse into the same
 * answer. Distinguishing them would let anyone probe slugs and learn which
 * private courses exist — the 403 itself becomes the leak (§29). The
 * caller renders a 404 either way.
 *
 * Unlike the listing, this path uses `can()` alone: a single row is
 * already loaded, so there is no scalability argument for duplicating the
 * rule in SQL, and one authority is better than two.
 */
export async function getCourseBySlug(
  slug: string,
  actor: Actor | null
): Promise<CourseDetail | null> {
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
    },
  });

  if (!course || !can(actor, { type: "course:view", course })) {
    return null;
  }

  const { id, title, subtitle, description, publishedAt, instructor } = course;

  return { id, slug: course.slug, title, subtitle, description, publishedAt, instructor };
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
