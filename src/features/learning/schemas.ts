import { z } from "zod";

/**
 * Payload shapes for the lightweight content-block types (§11).
 *
 * `LessonContentBlock.data` is `Json?` in the schema — Prisma does not, and
 * cannot, type-check the contents of a JSON column. That makes every row
 * external input the moment it leaves the database, exactly like a form
 * submission or a query parameter, and §9 requires it be validated before
 * anything trusts its shape. QUIZ and EXERCISE are not here: they own real
 * relational rows (`Quiz`, `Exercise`) rather than a JSON blob, so their
 * shape is already enforced by the schema.
 *
 * Each schema is deliberately narrow. TEXT holds plain text, never markup —
 * the renderer emits it as literal React text, so there is no HTML to
 * sanitize and no XSS surface from lesson content, without a markdown or
 * sanitizer dependency (§29, §40).
 */

export const textBlockSchema = z.object({
  /** Split into paragraphs on blank lines at render time. */
  body: z.string().min(1),
});
export type TextBlockData = z.infer<typeof textBlockSchema>;

export const imageBlockSchema = z.object({
  src: z.url(),
  alt: z.string().min(1),
  caption: z.string().optional(),
});
export type ImageBlockData = z.infer<typeof imageBlockSchema>;

export const videoBlockSchema = z.object({
  src: z.url(),
  title: z.string().min(1),
  /** Optional poster frame; native `<video>` shows a blank box without it. */
  posterSrc: z.url().optional(),
});
export type VideoBlockData = z.infer<typeof videoBlockSchema>;

export const codeBlockSchema = z.object({
  code: z.string().min(1),
  /** Display label only in this milestone — no syntax highlighter is
   *  installed, so this does not yet select a grammar. */
  language: z.string().optional(),
  filename: z.string().optional(),
});
export type CodeBlockData = z.infer<typeof codeBlockSchema>;

/**
 * A curated external video (ROS2_COURSE_DESIGN.md §14/§15) — deliberately
 * not `VIDEO`. `VIDEO`'s schema/renderer assume a directly playable media
 * URL (a native `<video><source>`), which YouTube does not serve; showing
 * one requires an iframe instead, which is what `EMBED` is for. Scoped
 * specifically to YouTube (`provider` is a single literal, not an open
 * string) rather than a generic arbitrary-iframe embed — that keeps the
 * CSP `frame-src` addition in `src/proxy.ts` narrow (one host, not a
 * wildcard) and, combined with the strict `videoId` format below, means
 * the iframe `src` this app constructs can never be attacker-influenced
 * into pointing somewhere else.
 *
 * Attribution fields are required, not decorative: §15 of the design doc
 * requires every recommended video to carry why it was selected, and a
 * bare iframe with no context is a worse learning experience than a
 * bare link — the learner should know what they're about to watch and
 * why before watching it.
 */
export const embedBlockSchema = z.object({
  provider: z.literal("youtube"),
  /** YouTube's video id is always exactly 11 characters from this set —
   *  validated here so a malformed value fails at the same boundary every
   *  other block type's data does, not by producing a broken iframe. */
  videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/, "Invalid YouTube video id"),
  title: z.string().min(1),
  creator: z.string().min(1),
  whySelected: z.string().optional(),
  /** Display label only, e.g. "12 min" — not used for playback. */
  durationLabel: z.string().optional(),
});
export type EmbedBlockData = z.infer<typeof embedBlockSchema>;

export const calloutVariants = ["INFO", "TIP", "WARNING", "DANGER"] as const;

export const calloutBlockSchema = z.object({
  variant: z.enum(calloutVariants),
  title: z.string().optional(),
  body: z.string().min(1),
});
export type CalloutBlockData = z.infer<typeof calloutBlockSchema>;

/**
 * A downloadable reference (cheat sheets, source code, exercise files —
 * §17 of the design doc). External URL only: this codebase has no file
 * storage/upload feature yet (no S3 or equivalent provider is wired up
 * anywhere), so there is nothing to upload *to* — building that is a
 * separate, considerably larger feature than closing a content-block gap.
 */
export const fileBlockSchema = z.object({
  href: z.url(),
  label: z.string().min(1),
  description: z.string().optional(),
  /** Display label only, e.g. "240 KB" — instructor-authored, not derived
   *  from the actual file (there's nothing here to inspect it). */
  sizeLabel: z.string().optional(),
});
export type FileBlockData = z.infer<typeof fileBlockSchema>;

/**
 * One schema per lightweight type, keyed the same way the `switch` in
 * `BlockRenderer` is — adding a type means adding one entry here and one
 * case there, not touching every call site (§11).
 */
export const lightweightBlockSchemas = {
  TEXT: textBlockSchema,
  IMAGE: imageBlockSchema,
  VIDEO: videoBlockSchema,
  CODE: codeBlockSchema,
  EMBED: embedBlockSchema,
  CALLOUT: calloutBlockSchema,
  FILE: fileBlockSchema,
} as const;

export type LightweightBlockType = keyof typeof lightweightBlockSchemas;
