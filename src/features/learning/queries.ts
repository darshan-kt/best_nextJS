import { prisma } from "@/db/client";
import type { ContentBlockType } from "@/db/generated/enums";
import {
  codeBlockSchema,
  imageBlockSchema,
  textBlockSchema,
  videoBlockSchema,
  type CodeBlockData,
  type ImageBlockData,
  type TextBlockData,
  type VideoBlockData,
} from "./schemas";

/**
 * Lesson content (application layer, §5).
 *
 * Deliberately its own query, not folded into `getCourseWithCurriculum`:
 * the curriculum outline needs every lesson's title but none of their
 * content, and the player needs one lesson's content but not the rest of
 * the course's. Fetching block bodies for lessons nobody is viewing would
 * be exactly the "loading excessive data" §26 forbids.
 */

/**
 * One content block, ready to render.
 *
 * `kind` carries the render decision, not just the raw `ContentBlockType` —
 * a block whose JSON failed validation, or whose type this player doesn't
 * yet support, still needs a slot in the list, just not the slot its
 * database `type` would suggest. Keeping that as a distinct discriminant
 * is what lets `BlockRenderer` be one exhaustive switch instead of a
 * conditional scattered across the lesson page (§11).
 */
export type RenderableBlock =
  | { id: string; position: number; kind: "TEXT"; data: TextBlockData }
  | { id: string; position: number; kind: "IMAGE"; data: ImageBlockData }
  | { id: string; position: number; kind: "VIDEO"; data: VideoBlockData }
  | { id: string; position: number; kind: "CODE"; data: CodeBlockData }
  | {
      id: string;
      position: number;
      kind: "QUIZ";
      quiz: { title: string; description: string | null };
    }
  | {
      id: string;
      position: number;
      kind: "EXERCISE";
      exercise: { title: string; instructions: string | null };
    }
  /** JSON present but did not match its type's schema — a bad row, not a
   *  bad request; rendered as an inline notice rather than failing the
   *  whole lesson (§28). */
  | { id: string; position: number; kind: "INVALID"; blockType: ContentBlockType }
  /** CALLOUT / FILE / EMBED, or any future type this player doesn't have a
   *  renderer for yet. */
  | { id: string; position: number; kind: "UNSUPPORTED"; blockType: ContentBlockType };

export async function getLessonContentBlocks(
  lessonId: string
): Promise<RenderableBlock[]> {
  const blocks = await prisma.lessonContentBlock.findMany({
    where: { lessonId },
    orderBy: { position: "asc" },
    select: {
      id: true,
      type: true,
      position: true,
      data: true,
      quiz: { select: { title: true, description: true } },
      exercise: { select: { title: true, instructions: true } },
    },
  });

  return blocks.map((block): RenderableBlock => {
    const { id, position } = block;

    switch (block.type) {
      case "TEXT": {
        const parsed = textBlockSchema.safeParse(block.data);
        return parsed.success
          ? { id, position, kind: "TEXT", data: parsed.data }
          : { id, position, kind: "INVALID", blockType: block.type };
      }

      case "IMAGE": {
        const parsed = imageBlockSchema.safeParse(block.data);
        return parsed.success
          ? { id, position, kind: "IMAGE", data: parsed.data }
          : { id, position, kind: "INVALID", blockType: block.type };
      }

      case "VIDEO": {
        const parsed = videoBlockSchema.safeParse(block.data);
        return parsed.success
          ? { id, position, kind: "VIDEO", data: parsed.data }
          : { id, position, kind: "INVALID", blockType: block.type };
      }

      case "CODE": {
        const parsed = codeBlockSchema.safeParse(block.data);
        return parsed.success
          ? { id, position, kind: "CODE", data: parsed.data }
          : { id, position, kind: "INVALID", blockType: block.type };
      }

      case "QUIZ":
        return block.quiz
          ? { id, position, kind: "QUIZ", quiz: block.quiz }
          : { id, position, kind: "INVALID", blockType: block.type };

      case "EXERCISE":
        return block.exercise
          ? { id, position, kind: "EXERCISE", exercise: block.exercise }
          : { id, position, kind: "INVALID", blockType: block.type };

      default:
        return { id, position, kind: "UNSUPPORTED", blockType: block.type };
    }
  });
}
