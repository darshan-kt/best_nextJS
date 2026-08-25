import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
      <Link
        href="/"
        className="flex items-center gap-2 rounded-lg text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <GraduationCap className="size-6" aria-hidden="true" />
        <span className="font-heading text-lg font-semibold">LMS Platform</span>
      </Link>

      {children}
    </div>
  );
}
