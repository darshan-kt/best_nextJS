import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { focusRing } from "@/lib/utils";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12 sm:py-16">
      <Link
        href="/"
        // The shared ring — this link previously used a bare `ring-3` with
        // no border change, a fourth distinct focus treatment (§24).
        className={`flex items-center gap-2 rounded-lg border border-transparent px-2 py-1 text-foreground transition-colors hover:text-accent-foreground ${focusRing}`}
      >
        <GraduationCap className="size-6 text-accent-foreground" aria-hidden="true" />
        <span className="font-heading text-lede font-semibold tracking-[-0.01em]">
          LMS Platform
        </span>
      </Link>

      {children}
    </div>
  );
}
