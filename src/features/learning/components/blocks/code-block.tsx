import type { CodeBlockData } from "../../schemas";

/**
 * Plain monospace, no syntax highlighting.
 *
 * No highlighter library (Shiki, Prism) is installed, and adding one is a
 * real bundle-size and dependency decision (§40) rather than something to
 * fold into a content-block renderer unasked. `language` is still shown as
 * a label, so the data model doesn't need to change when highlighting is
 * added later — only this component does.
 */
export function CodeBlock({ data }: { data: CodeBlockData }) {
  return (
    <figure className="flex flex-col overflow-hidden rounded-xl border border-border">
      {data.filename || data.language ? (
        <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-2">
          {data.filename ? (
            <span className="truncate font-mono text-caption text-foreground">
              {data.filename}
            </span>
          ) : (
            <span />
          )}
          {data.language ? (
            <span className="shrink-0 font-mono text-caption text-muted-foreground uppercase">
              {data.language}
            </span>
          ) : null}
        </div>
      ) : null}

      <pre className="overflow-x-auto bg-foreground/[0.03] px-4 py-3.5">
        <code className="font-mono text-body-sm text-foreground">
          {data.code}
        </code>
      </pre>
    </figure>
  );
}
