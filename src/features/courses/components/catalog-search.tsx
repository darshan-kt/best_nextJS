import Link from "next/link";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Catalogue search (§7, §27).
 *
 * A plain GET form, and therefore a Server Component with no client
 * JavaScript at all: the browser serialises the field into the query
 * string and Next.js re-renders the page on the server. That gives
 * shareable result URLs, working back/forward navigation, and a search box
 * that functions before — or without — hydration.
 *
 * Submitting also drops any `page` parameter, which is the correct
 * behaviour: a new search starts at the first page of its own results.
 *
 * The field and both buttons sit on the same control height from the token
 * ladder, so the row aligns by rule rather than by coincidence (§21).
 */
export function CatalogSearch({ query }: { query: string | undefined }) {
  return (
    <form
      action="/courses"
      method="get"
      role="search"
      className="flex w-full max-w-xl flex-wrap items-center gap-2"
    >
      <div className="relative min-w-56 flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          name="q"
          // Uncontrolled: the URL is the source of truth, and the server
          // renders the current value into the markup.
          defaultValue={query ?? ""}
          placeholder="Search courses"
          aria-label="Search courses"
          className="pl-9"
        />
      </div>

      <Button type="submit">Search</Button>

      {query ? (
        <Button type="button" variant="ghost" asChild>
          {/* A link, not a reset button: clearing the search is a
              navigation back to the unfiltered catalogue. */}
          <Link href="/courses">
            <X aria-hidden="true" />
            Clear
          </Link>
        </Button>
      ) : null}
    </form>
  );
}
