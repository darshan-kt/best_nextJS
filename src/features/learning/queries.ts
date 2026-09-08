import { prisma } from "@/db/client";
import type { ContentBlockType } from "@/db/generated/enums";
import { exerciseConfigSchema, type ExerciseConfig } from "@/features/exercises/schemas";
import {
  datasetSelect,
  toDatasetDetail,
  type DatasetDetail,
} from "@/features/datasets/queries";
import {
  datasetExplorerBlockSchema,
  type DatasetExplorerBlockData,
} from "@/features/datasets/schemas";
import {
  labProtocolBlockSchema,
  type LabProtocolBlockData,
} from "@/features/labs/schemas";
import type { HardwareDeviceDetail } from "@/features/hardware/queries";
import {
  distributionSimBlockSchema,
  type DistributionSimBlockData,
} from "@/features/statistics/schemas";
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
  /**
   * Whether `/hardware/<slug>` is actually reachable for this device.
   *
   * `DEVICE_CARD` renders a link to that route, and the route resolves
   * through `getHardwareDeviceBySlug`, which only returns a device whose
   * home section belongs to a PUBLISHED + PUBLIC course. A card for a
   * device in a DRAFT course therefore linked to a 404 — including from
   * inside the very course that owns the device, which is where all eight
   * of them currently are.
   *
   * Selected here rather than re-queried per card: `getLessonContentBlocks`
   * already has the device row in hand, so this is one extra join for the
   * whole lesson instead of one query per block (§26).
   */
  homeSection: {
    select: { course: { select: { status: true, visibility: true } } },
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
  | {
      id: string;
      position: number;
      kind: "DEVICE_CARD";
      device: HardwareDeviceDetail;
      /** False when `/hardware/<slug>` would 404 for this viewer. */
      catalogPageIsReachable: boolean;
    }
  | {
      id: string;
      position: number;
      kind: "DISTRIBUTION_SIM";
      data: DistributionSimBlockData;
    }
  | {
      id: string;
      position: number;
      kind: "DATASET_EXPLORER";
      dataset: DatasetDetail;
      data: DatasetExplorerBlockData;
    }
  /** JSON present but did not match its type's schema — a bad row, not a
   *  bad request; rendered as an inline notice rather than failing the
   *  whole lesson (§28). */
  | {
      id: string;
      position: number;
      kind: "LAB_PROTOCOL";
      data: LabProtocolBlockData;
    }
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
      dataset: { select: datasetSelect },
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
          ? {
              id,
              position,
              kind: "DEVICE_CARD",
              device: block.hardwareDevice,
              // Same predicate as `PUBLIC_HOME_SECTION_FILTER`, which is
              // what `/hardware/<slug>` itself filters on. Kept as a
              // boolean rather than the raw status so the renderer states
              // the question it actually cares about — "can the viewer
              // open this?" — instead of re-deriving it.
              // `homeSection` is nullable, and a device without one has no
              // catalogue page at all — `PUBLIC_HOME_SECTION_FILTER` cannot
              // match it — so null is "not reachable" rather than an edge
              // case worth a separate branch.
              catalogPageIsReachable:
                block.hardwareDevice.homeSection?.course.status === "PUBLISHED" &&
                block.hardwareDevice.homeSection?.course.visibility === "PUBLIC",
            }
          : { id, position, kind: "INVALID", blockType: block.type };
      }

      case "LAB_PROTOCOL": {
        // Lightweight, like DISTRIBUTION_SIM: the payload is the block.
        // Nothing is cross-checked against a row here because a lab points
        // at no row — the device and fallback-lesson slugs it carries are
        // verified at SEED time instead (`seedContentBlock`), which is the
        // only moment both sides of each link are in scope.
        const parsed = labProtocolBlockSchema.safeParse(block.data);
        return parsed.success
          ? { id, position, kind: "LAB_PROTOCOL", data: parsed.data }
          : { id, position, kind: "INVALID", blockType: block.type };
      }

      case "DISTRIBUTION_SIM": {
        const parsed = distributionSimBlockSchema.safeParse(block.data);
        return parsed.success
          ? { id, position, kind: "DISTRIBUTION_SIM", data: parsed.data }
          : { id, position, kind: "INVALID", blockType: block.type };
      }

      case "DATASET_EXPLORER": {
        if (!block.dataset) {
          return { id, position, kind: "INVALID", blockType: block.type };
        }

        const dataset = toDatasetDetail(block.dataset);
        const parsed = datasetExplorerBlockSchema.safeParse(block.data);
        if (!dataset || !parsed.success) {
          return { id, position, kind: "INVALID", blockType: block.type };
        }

        // Cross-check the block against the dataset it points at. The Zod
        // schema cannot do this — it validates the block in isolation and
        // has no view of the row — so a block naming a column the dataset
        // does not declare would otherwise render an empty chart with no
        // indication anything was wrong (§28).
        const declared = new Set(dataset.columns.map((column) => column.key));
        const referenced = [parsed.data.valueColumn, parsed.data.secondaryColumn]
          .filter((key): key is string => typeof key === "string");

        if (!referenced.every((key) => declared.has(key))) {
          return { id, position, kind: "INVALID", blockType: block.type };
        }

        return {
          id,
          position,
          kind: "DATASET_EXPLORER",
          dataset,
          data: parsed.data,
        };
      }

      default:
        return { id, position, kind: "UNSUPPORTED", blockType: block.type };
    }
  });
}
