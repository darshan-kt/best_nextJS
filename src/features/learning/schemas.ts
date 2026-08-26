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
 * One schema per lightweight type, keyed the same way the `switch` in
 * `BlockRenderer` is — adding a type means adding one entry here and one
 * case there, not touching every call site (§11).
 */
export const lightweightBlockSchemas = {
  TEXT: textBlockSchema,
  IMAGE: imageBlockSchema,
  VIDEO: videoBlockSchema,
  CODE: codeBlockSchema,
} as const;

export type LightweightBlockType = keyof typeof lightweightBlockSchemas;
