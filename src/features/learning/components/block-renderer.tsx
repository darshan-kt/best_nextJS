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
 * Adding a tenth block type is: one new schema in `schemas.ts`, one new
 * component in `blocks/`, one new case here. No other file in the app
 * conditions on block type — the alternative, scattering `if (type ===
 * "IMAGE")` across the lesson page, is exactly what §11 rules out. (This
 * switch itself is the one deliberate exception: `RenderableBlock` also
 * needs a case in `src/features/chat/context.ts`'s grounding-text switch —
 * flagged there, not a gap in this rule.)
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

    case "INVALID":
      return <UnsupportedBlock blockType={block.blockType} invalid />;

    case "UNSUPPORTED":
      return <UnsupportedBlock blockType={block.blockType} />;
  }
}
