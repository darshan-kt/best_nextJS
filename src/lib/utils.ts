import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * The type scale has to be declared to tailwind-merge, not just to Tailwind.
 *
 * tailwind-merge resolves conflicts by classifying each utility into a group,
 * and it only knows the *default* font sizes. Faced with `text-title-sm` it
 * fell back to reading it as a text *colour*, so any component combining a
 * scale step with a colour — `cn("text-title-sm", "text-card-foreground")`,
 * which is most of them — had its font size silently dropped as the "losing"
 * colour. The card title rendered at 16px instead of 24px because of this.
 *
 * Every custom step must be listed here. If a step is added to `globals.css`
 * and not to this array, it will start disappearing in exactly the same way.
 */
const FONT_SIZE_STEPS = [
  "caption",
  "body-sm",
  "body",
  "lede",
  "title-sm",
  "title",
  "title-lg",
  "display",
] as const

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [...FONT_SIZE_STEPS] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * The focus ring — defined once, consumed by every interactive primitive.
 *
 * Before this existed the codebase had four different treatments (`ring-3`
 * at 50% on Button and Input, `ring-[3px]` on Badge, a bare `ring-3` on the
 * auth link, `focus-within:ring-2` at full opacity on the course card), so
 * tabbing through a page changed the shape of the indicator as it went.
 * Anything focusable should use one of these two constants (§21, §24).
 */
export const focusRing =
  "outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/45"

/**
 * The same ring, raised by a descendant receiving focus. For composites
 * where the focusable element is a child covering the whole surface — a
 * card whose title link is stretched across it, for instance.
 */
export const focusRingWithin =
  "outline-none has-[:focus-visible]:border-ring has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/45"
