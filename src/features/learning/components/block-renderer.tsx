import type { Actor, EnrollmentSubject } from "@/features/auth/policy";
import { QuizBlock } from "@/features/quizzes/components/quiz-block";
import type { RenderableBlock } from "../queries";
import { TextBlock } from "./blocks/text-block";
import { ImageBlock } from "./blocks/image-block";
import { VideoBlock } from "./blocks/video-block";
import { CodeBlock } from "./blocks/code-block";
import { PlaceholderBlock } from "./blocks/placeholder-block";
import { UnsupportedBlock } from "./blocks/unsupported-block";

/**
 * The one place that switches on content-block kind (§11).
 *
 * Adding a ninth block type is: one new schema in `schemas.ts`, one new
 * component in `blocks/`, one new case here. No other file in the app
 * conditions on block type — the alternative, scattering `if (type ===
 * "IMAGE")` across the lesson page, is exactly what §11 rules out.
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
        <PlaceholderBlock
          title={block.exercise.title}
          description={block.exercise.instructions}
        />
      );

    case "INVALID":
      return <UnsupportedBlock blockType={block.blockType} invalid />;

    case "UNSUPPORTED":
      return <UnsupportedBlock blockType={block.blockType} />;
  }
}
