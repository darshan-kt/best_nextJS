import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ContentBlockType } from "@/db/generated/enums";
import { lightweightBlockSchemas } from "@/features/learning/schemas";

/**
 * BLOCK-TYPE COVERAGE.
 *
 * Adding a `ContentBlockType` touches four TypeScript files
 * (PHASE_1A_ARCHITECTURE.md §0.1). TypeScript catches three of them: once
 * a `RenderableBlock` variant exists, the exhaustive switches in
 * `block-renderer.tsx` and `chat/context.ts` fail to compile without a
 * case for it.
 *
 * It does NOT catch the one that matters most. `getLessonContentBlocks`
 * ends in `default: return { kind: "UNSUPPORTED" }`, so a new enum value
 * with no parse case compiles cleanly, passes every existing test, and
 * fails silently in production as an "unsupported block" notice inside a
 * published lesson. That is the hole this file closes, and it is why the
 * assertions below read the sources rather than relying on the type
 * checker.
 *
 * Source scanning is deliberately blunt. A cleverer runtime check would
 * need to render every block type, which needs jsdom and React testing
 * utilities that `vitest.config.mts` explicitly declines to install (§40).
 * Reading four files for a `case "X":` costs nothing, runs in the existing
 * tier, and fails for exactly the right reason.
 */

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

const BLOCK_TYPES = Object.values(ContentBlockType);

const SWITCH_SITES = [
  {
    label: "BlockRenderer (renders the block)",
    path: "src/features/learning/components/block-renderer.tsx",
  },
  {
    label: "chat grounding (describes the block to the assistant)",
    path: "src/features/chat/context.ts",
  },
  {
    label: "getLessonContentBlocks (parses the row into a RenderableBlock)",
    path: "src/features/learning/queries.ts",
  },
] as const;

describe("content block type coverage", () => {
  it("has at least the eleven types the course content relies on", () => {
    // A guard against the enum silently shrinking: every value below is
    // referenced by seeded course content.
    expect(BLOCK_TYPES).toEqual(
      expect.arrayContaining([
        "TEXT",
        "IMAGE",
        "VIDEO",
        "QUIZ",
        "EXERCISE",
        "CODE",
        "CALLOUT",
        "FILE",
        "EMBED",
        "SPEC_TABLE",
        "DEVICE_CARD",
        "DISTRIBUTION_SIM",
        "DATASET_EXPLORER",
      ])
    );
  });

  for (const site of SWITCH_SITES) {
    describe(site.label, () => {
      const source = readSource(site.path);

      for (const blockType of BLOCK_TYPES) {
        it(`handles ${blockType}`, () => {
          expect(
            source.includes(`case "${blockType}":`),
            `${site.path} has no \`case "${blockType}":\`. Adding a block type ` +
              `requires a case in all three switch sites — see ` +
              `PHASE_1A_ARCHITECTURE.md §0.1.`
          ).toBe(true);
        });
      }
    });
  }

  it("does not let a lightweight schema be registered under an unknown type", () => {
    // The reverse direction: a typo in `lightweightBlockSchemas` would
    // register a schema nothing ever reaches.
    for (const key of Object.keys(lightweightBlockSchemas)) {
      expect(BLOCK_TYPES).toContain(key);
    }
  });

  it("keeps LAB_PROTOCOL out of the enum until it has an implementation", () => {
    // Phase 1F adds it, together with its schema, renderer and grounding
    // case. Declaring it early would force this file to carry an exemption
    // list, which would weaken the very invariant it exists to hold — see
    // the enum comment in prisma/schema.prisma.
    expect(BLOCK_TYPES).not.toContain("LAB_PROTOCOL");
  });
});
