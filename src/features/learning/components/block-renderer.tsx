import type { Actor, EnrollmentSubject } from "@/features/auth/policy";
import { QuizBlock } from "@/features/quizzes/components/quiz-block";
import type { RenderableBlock } from "../queries";
import { TextBlock } from "./blocks/text-block";
import { ImageBlock } from "./blocks/image-block";
import { VideoBlock } from "./blocks/video-block";
import { CodeBlock } from "./blocks/code-block";
import { EmbedBlock } from "./blocks/embed-block";
import { CalloutBlock } from "./blocks/callout-block";
import { FileBlock } from "./blocks/file-block";
import { ExerciseBlock } from "./blocks/exercise-block";
import { SpecTableBlock } from "./blocks/spec-table-block";
import { DeviceCardBlock } from "./blocks/device-card-block";
import { DistributionSimBlock } from "./blocks/distribution-sim-block";
import { DatasetExplorerBlock } from "./blocks/dataset-explorer-block";
import { UnsupportedBlock } from "./blocks/unsupported-block";

/**
 * The one place that switches on content-block kind (§11). All nine of
 * §11's original content types (TEXT, IMAGE, VIDEO, CODE, EMBED, CALLOUT,
 * FILE, QUIZ, EXERCISE) render for real as of ROS 2 course Stage 0 —
 * EXERCISE was the last placeholder. SPEC_TABLE and DEVICE_CARD were added
 * for the Robotics Hardware & Sensors course (Stage 1) — both reference a
 * `HardwareDevice` row rather than owning their own data, the same
 * relational shape QUIZ/EXERCISE already use.
 *
 * Adding a block type is: one new schema, one new component in `blocks/`,
 * one new case here, and one case in `src/features/chat/context.ts`'s
 * grounding-text switch. No other file in the app conditions on block type
 * — the alternative, scattering `if (type === "IMAGE")` across the lesson
 * page, is exactly what §11 rules out.
 *
 * Those two switches are the two places it is possible to forget. As of
 * Phase 1D, `block-renderer.test.ts` fails if either one misses a
 * `ContentBlockType`, so the omission is caught by the suite rather than
 * by a learner meeting an "unsupported block" notice in a published
 * lesson.
 *
 * `DISTRIBUTION_SIM` and `DATASET_EXPLORER` were added by the Statistical
 * Distributions course (PHASE_1A_ARCHITECTURE.md §18): the first is
 * lightweight JSON, the second references a `Dataset` row the same way
 * SPEC_TABLE references a device.
 *
 * `quizContext` exists only for the `QUIZ` case (§44, Milestone 8): the
 * already-resolved actor/enrollment from the lesson page's own
 * authorization check, threaded through rather than re-queried per block,
 * so a lesson with several quizzes still resolves enrollment once (§12).
 */
export function BlockRenderer({
  block,
  quizContext,
}: {
  block: RenderableBlock;
  quizContext: {
    actor: Actor;
    enrollment: EnrollmentSubject | null;
    courseId: string;
    courseSlug: string;
    lessonSlug: string;
  };
}) {
  switch (block.kind) {
    case "TEXT":
      return <TextBlock data={block.data} />;

    case "IMAGE":
      return <ImageBlock data={block.data} />;

    case "VIDEO":
      return <VideoBlock data={block.data} />;

    case "CODE":
      return <CodeBlock data={block.data} />;

    case "EMBED":
      return <EmbedBlock data={block.data} />;

    case "CALLOUT":
      return <CalloutBlock data={block.data} />;

    case "FILE":
      return <FileBlock data={block.data} />;

    case "QUIZ":
      return (
        <QuizBlock
          quizId={block.quiz.id}
          fallbackTitle={block.quiz.title}
          fallbackDescription={block.quiz.description}
          {...quizContext}
        />
      );

    case "EXERCISE":
      return (
        <ExerciseBlock title={block.exercise.title} config={block.exercise.config} />
      );

    case "SPEC_TABLE":
      return <SpecTableBlock device={block.device} data={block.data} />;

    case "DEVICE_CARD":
      return <DeviceCardBlock device={block.device} />;

    case "DISTRIBUTION_SIM":
      return <DistributionSimBlock data={block.data} />;

    case "DATASET_EXPLORER":
      return <DatasetExplorerBlock dataset={block.dataset} data={block.data} />;

    case "INVALID":
      return <UnsupportedBlock blockType={block.blockType} invalid />;

    case "UNSUPPORTED":
      return <UnsupportedBlock blockType={block.blockType} />;
  }
}
