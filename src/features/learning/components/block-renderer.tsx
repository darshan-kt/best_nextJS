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
 */
export function BlockRenderer({ block }: { block: RenderableBlock }) {
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
        <PlaceholderBlock
          kind="QUIZ"
          title={block.quiz.title}
          description={block.quiz.description}
        />
      );

    case "EXERCISE":
      return (
        <PlaceholderBlock
          kind="EXERCISE"
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
