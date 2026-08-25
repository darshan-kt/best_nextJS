import { z } from "zod";

/**
 * Catalogue URL state (§9, §27).
 *
 * Search and pagination live in the URL, not in client state: the result
 * is shareable, linkable, restorable on reload, and navigable with the
 * back button. It also means the page stays a Server Component — the URL
 * *is* the input.
 *
 * Query strings are external input and are validated like any other (§9).
 * The parse is deliberately forgiving rather than throwing: a hand-edited
 * `?page=-4` should quietly show page 1, not a 500. Nothing here is a
 * security boundary — visibility is enforced in the query and the policy
 * layer — so the safe response to nonsense is a sane default.
 */

/** Upper bound on the search term, to keep pathological input out of SQL. */
const MAX_QUERY_LENGTH = 100;

export const PAGE_SIZE = 12;

const catalogSearchParamsSchema = z.object({
  q: z
    .string()
    .trim()
    .max(MAX_QUERY_LENGTH)
    .transform((value) => (value.length > 0 ? value : undefined))
    .optional()
    .catch(undefined),

  // `.catch(1)` covers everything a URL can throw at this: missing,
  // non-numeric, zero, negative, fractional.
  page: z.coerce.number().int().min(1).catch(1),
});

export interface CatalogSearchParams {
  /** Undefined when no search is active, never an empty string. */
  q: string | undefined;
  page: number;
}

/**
 * Parses the raw `searchParams` object Next.js provides.
 *
 * Repeated keys (`?q=a&q=b`) arrive as arrays; the first value wins rather
 * than the request being rejected.
 */
export function parseCatalogSearchParams(
  raw: Record<string, string | string[] | undefined>
): CatalogSearchParams {
  const first = (value: string | string[] | undefined): string | undefined =>
    Array.isArray(value) ? value[0] : value;

  const parsed = catalogSearchParamsSchema.parse({
    q: first(raw.q),
    page: first(raw.page) ?? 1,
  });

  return { q: parsed.q, page: parsed.page };
}

/**
 * Builds a catalogue URL, omitting defaults so that the canonical listing
 * stays a clean `/courses` rather than `/courses?q=&page=1`.
 */
export function catalogHref({ q, page }: Partial<CatalogSearchParams>): string {
  const params = new URLSearchParams();

  if (q) {
    params.set("q", q);
  }

  if (page && page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();

  return queryString ? `/courses?${queryString}` : "/courses";
}
