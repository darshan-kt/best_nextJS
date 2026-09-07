"use client";

import * as React from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
}

/**
 * The header's `md:flex` nav collapses into this drawer below the
 * breakpoint (§23) — same links and CTAs, passed in from `SiteHeader`
 * rather than duplicated here, so there is one source of truth for what
 * primary navigation contains.
 *
 * Plain `Link`s styled with `buttonVariants`, not `Button asChild` inside
 * `DrawerClose asChild` — that would nest two Radix `Slot`s for no
 * benefit, since a real page navigation already unmounts this drawer.
 * `onClick` just closes it a beat earlier, for visual feedback.
 */
export function MobileNavDrawer({
  isSignedIn,
  links,
}: {
  isSignedIn: boolean;
  links: NavLink[];
}) {
  const [open, setOpen] = React.useState(false);
  const close = () => setOpen(false);

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="right">
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open menu"
        >
          <Menu aria-hidden="true" />
        </Button>
      </DrawerTrigger>

      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Menu</DrawerTitle>
        </DrawerHeader>

        <nav aria-label="Primary" className="flex flex-col gap-1 px-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={close}
              className="rounded-lg px-3 py-2.5 text-body font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <DrawerFooter>
          {isSignedIn ? (
            <>
              <Link
                href="/dashboard"
                onClick={close}
                className={cn(buttonVariants({ size: "lg" }), "w-full")}
              >
                Dashboard
              </Link>
              {/* Not wrapped in `onClick={close}`: the sign-out POST
                  navigates on its own, and closing the drawer first would
                  unmount the form mid-submit. */}
              <div className="[&_button]:w-full [&_form]:w-full">
                <SignOutButton size="lg" />
              </div>
            </>
          ) : (
            <>
              <Link
                href="/sign-up"
                onClick={close}
                className={cn(buttonVariants({ size: "lg" }), "w-full")}
              >
                Create free account
              </Link>
              <Link
                href="/sign-in"
                onClick={close}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "w-full"
                )}
              >
                Sign in
              </Link>
            </>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
