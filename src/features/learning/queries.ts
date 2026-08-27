import { prisma } from "@/db/client";
import type { ContentBlockType } from "@/db/generated/enums";
import { exerciseConfigSchema, type ExerciseConfig } from "@/features/exercises/schemas";
import type { HardwareDeviceDetail } from "@/features/hardware/queries";
import {
  deviceCardBlockDataSchema,
  specTableBlockDataSchema,
  type SpecTableBlockData,
} from "@/features/hardware/schemas";
import {
  calloutBlockSchema,
  codeBlockSchema,
  embedBlockSchema,
  fileBlockSchema,
  imageBlockSchema,
  textBlockSchema,
  videoBlockSchema,
  type CalloutBlockData,
  type CodeBlockData,
  type EmbedBlockData,
  type FileBlockData,
  type ImageBlockData,
  type TextBlockData,
  type VideoBlockData,
} from "./schemas";

const hardwareDeviceSelect = {
  id: true,
  slug: true,
  name: true,
  manufacturer: true,
  category: true,
  summary: true,
  heroImageSrc: true,
  heroImageAlt: true,
  supportStatus: true,
  supportStatusNote: true,
  driverPackage: true,
  driverRepoUrl: true,
  rosDistroCompat: true,
  specs: {
    orderBy: { sortOrder: "asc" as const },
    select: {
      key: true,
      label: true,
      value: true,
      unit: true,
      whyItMatters: true,
    },
  },
  topics: {
    orderBy: { sortOrder: "asc" as const },
    select: { topicName: true, messageType: true, description: true },
  },
} as const;

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
  | { id: string; position: number; kind: "EMBED"; data: EmbedBlockData }
  | { id: string; position: number; kind: "CALLOUT"; data: CalloutBlockData }
  | { id: string; position: number; kind: "FILE"; data: FileBlockData }
  | {
      id: string;
      position: number;
      kind: "QUIZ";
      quiz: { id: string; title: string; description: string | null };
    }
  | {
      id: string;
      position: number;
      kind: "EXERCISE";
      exercise: {
        title: string;
        instructions: string | null;
        config: ExerciseConfig;
      };
    }
  | {
      id: string;
      position: number;
      kind: "SPEC_TABLE";
      device: HardwareDeviceDetail;
      data: SpecTableBlockData;
    }
  | { id: string; position: number; kind: "DEVICE_CARD"; device: HardwareDeviceDetail }
  /** JSON present but did not match its type's schema — a bad row, not a
   *  bad request; rendered as an inline notice rather than failing the
   *  whole lesson (§28). */
  | { id: string; position: number; kind: "INVALID"; blockType: ContentBlockType }
  /** Any future type this player doesn't have a renderer for yet. */
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
      quiz: { select: { id: true, title: true, description: true } },
      exercise: { select: { title: true, instructions: true, config: true } },
      hardwareDevice: { select: hardwareDeviceSelect },
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

      case "EMBED": {
        const parsed = embedBlockSchema.safeParse(block.data);
        return parsed.success
          ? { id, position, kind: "EMBED", data: parsed.data }
          : { id, position, kind: "INVALID", blockType: block.type };
      }

      case "CALLOUT": {
        const parsed = calloutBlockSchema.safeParse(block.data);
        return parsed.success
          ? { id, position, kind: "CALLOUT", data: parsed.data }
          : { id, position, kind: "INVALID", blockType: block.type };
      }

      case "FILE": {
        const parsed = fileBlockSchema.safeParse(block.data);
        return parsed.success
          ? { id, position, kind: "FILE", data: parsed.data }
          : { id, position, kind: "INVALID", blockType: block.type };
      }

      case "QUIZ":
        return block.quiz
          ? { id, position, kind: "QUIZ", quiz: block.quiz }
          : { id, position, kind: "INVALID", blockType: block.type };

      case "EXERCISE": {
        if (!block.exercise) {
          return { id, position, kind: "INVALID", blockType: block.type };
        }

        const parsedConfig = exerciseConfigSchema.safeParse(block.exercise.config);
        return parsedConfig.success
          ? {
              id,
              position,
              kind: "EXERCISE",
              exercise: {
                title: block.exercise.title,
                instructions: block.exercise.instructions,
                config: parsedConfig.data,
              },
            }
          : { id, position, kind: "INVALID", blockType: block.type };
      }

      case "SPEC_TABLE": {
        if (!block.hardwareDevice) {
          return { id, position, kind: "INVALID", blockType: block.type };
        }

        const parsedData = specTableBlockDataSchema.safeParse(block.data ?? {});
        return parsedData.success
          ? {
              id,
              position,
              kind: "SPEC_TABLE",
              device: block.hardwareDevice,
              data: parsedData.data,
            }
          : { id, position, kind: "INVALID", blockType: block.type };
      }

      case "DEVICE_CARD": {
        const parsedData = deviceCardBlockDataSchema.safeParse(block.data ?? {});
        return block.hardwareDevice && parsedData.success
          ? { id, position, kind: "DEVICE_CARD", device: block.hardwareDevice }
          : { id, position, kind: "INVALID", blockType: block.type };
      }

      default:
        return { id, position, kind: "UNSUPPORTED", blockType: block.type };
    }
  });
}
