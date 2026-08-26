import type { RenderableBlock } from "@/features/learning/queries";

/**
 * Grounding-context assembly (§16) — the scoped-down alternative to real
 * RAG this milestone deliberately chose (§35): no vector store, no
 * embeddings pipeline. The current lesson's already-fetched content blocks
 * go straight into the system prompt. Real RAG is a clean addition later —
 * this function's signature doesn't change, only what feeds it would.
 *
 * Pure and framework-free, like `deriveCourseProgress` beside it in spirit
 * — no Prisma, no network call, so the prompt text itself is unit-testable
 * without a live model.
 */

export interface GroundingCourseInfo {
  title: string;
  description: string | null;
}

export interface GroundingLessonInfo {
  title: string;
  blocks: readonly RenderableBlock[];
}

const SYSTEM_PREFACE =
  "You are the course assistant for an online learning platform. You help " +
  "a student understand the course they are enrolled in and, when given, " +
  "the specific lesson they are currently viewing.";

const GUARDRAILS =
  "Answer only using the course and lesson information provided below, " +
  "plus general knowledge needed to explain it clearly. If the student " +
  "asks about something this course doesn't cover, say so rather than " +
  "guessing. Keep answers concise and encouraging.";

/**
 * Renders one content block down to plain text for the prompt. Returns
 * null for a block with nothing useful to ground on (an INVALID/UNSUPPORTED
 * row, or an IMAGE with no caption) — filtered out by the caller rather
 * than emitting an empty section.
 */
function extractBlockText(block: RenderableBlock): string | null {
  switch (block.kind) {
    case "TEXT":
      return block.data.body;
    case "CODE":
      return `Code example${
        block.data.filename ? ` (${block.data.filename})` : ""
      }:\n${block.data.code}`;
    case "IMAGE":
      return block.data.caption ? `Image: ${block.data.caption}` : null;
    case "VIDEO":
      return `Video: ${block.data.title}`;
    case "EMBED":
      return `Video: ${block.data.title} (${block.data.creator})`;
    case "CALLOUT":
      return block.data.title
        ? `${block.data.title}: ${block.data.body}`
        : block.data.body;
    case "FILE":
      return `Downloadable resource: ${block.data.label}`;
    case "QUIZ":
      return `This lesson includes a quiz titled "${block.quiz.title}".`;
    case "EXERCISE": {
      const { config } = block.exercise;
      // Gives the assistant enough to actually help a stuck learner —
      // the DEBUGGING scenario in particular is exactly the situation a
      // student is likely to ask about — without leaking the solution or
      // hints into the grounding context and spoiling the exercise.
      const summary =
        config.type === "DEBUGGING"
          ? config.scenario.body
          : config.goal.body;
      return `This lesson includes a ${config.type.toLowerCase()} exercise titled "${block.exercise.title}": ${summary}`;
    }
    case "INVALID":
    case "UNSUPPORTED":
      return null;
  }
}

export function buildGroundingPrompt(
  course: GroundingCourseInfo,
  lesson: GroundingLessonInfo | null
): string {
  const sections = [SYSTEM_PREFACE, `Course: ${course.title}`];

  if (course.description) {
    sections.push(course.description);
  }

  if (lesson) {
    const lessonText = lesson.blocks
      .map(extractBlockText)
      .filter((text): text is string => text !== null)
      .join("\n\n");

    sections.push(
      `The student is currently viewing the lesson "${lesson.title}". Its content:\n\n` +
        (lessonText || "(This lesson has no content yet.)")
    );
  }

  sections.push(GUARDRAILS);

  return sections.join("\n\n");
}
