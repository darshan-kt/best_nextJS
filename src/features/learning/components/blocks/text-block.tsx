import type { TextBlockData } from "../../schemas";

/**
 * Renders as literal React text, never `dangerouslySetInnerHTML`. Lesson
 * content is authored data, not code the platform controls end to end, so
 * treating it as markup would be an XSS hole — plain text has none (§29).
 *
 * Paragraphs are split on blank lines rather than stored as an array,
 * which keeps the JSON payload a single field an instructor tool can edit
 * as a textarea instead of a structured list.
 */
export function TextBlock({ data }: { data: TextBlockData }) {
  const paragraphs = data.body.split(/\n{2,}/).filter((p) => p.trim());

  return (
    <div className="flex flex-col gap-4">
      {paragraphs.map((paragraph, index) => (
        <p
          key={index}
          className="text-pretty text-body leading-relaxed text-foreground"
        >
          {paragraph}
        </p>
      ))}
    </div>
  );
}
