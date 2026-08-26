import { z } from "zod";

/**
 * Chat request validation (§9). The POST body to `/api/chat` is external
 * input like any other — a request, not a trusted value because it came
 * from this app's own UI.
 */
export const sendChatMessageSchema = z.object({
  courseSlug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/i, "Invalid course"),
  /** Optional: a course-level question (from the course page) has none. */
  lessonSlug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/i, "Invalid lesson")
    .optional(),
  message: z.string().trim().min(1).max(4000),
});

export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;
