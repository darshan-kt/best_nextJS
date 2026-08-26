import { CodeBlock } from "@/features/learning/components/blocks/code-block";
import { ImageBlock } from "@/features/learning/components/blocks/image-block";
import type { RichText } from "../schemas";

/**
 * Renders a `RichText` (body + optional inline visuals) — the shape used
 * everywhere an exercise needs more than a bare string: a goal, a step, a
 * debugging scenario. Reuses the existing `ImageBlock`/`CodeBlock`
 * lightweight-block renderers directly rather than a parallel visual
 * component, since the underlying data is identical.
 */
export function RichTextView({ content }: { content: RichText }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-body text-pretty text-foreground">{content.body}</p>

      {content.visuals?.map((visual, index) =>
        visual.kind === "IMAGE" ? (
          <ImageBlock key={index} data={visual.data} />
        ) : (
          <CodeBlock key={index} data={visual.data} />
        )
      )}
    </div>
  );
}
