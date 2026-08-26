"use client";

import { useRef, useState, type FormEvent } from "react";
import { Loader2, MessageCircle, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import type { ConversationMessage } from "../queries";

/**
 * The course assistant's chat UI (§16, §20, §23) — the one client
 * component this milestone adds. A right-side drawer (§23's mobile
 * pattern calls for a drawer/bottom sheet; `right` reads reasonably on
 * both desktop and mobile without adding breakpoint-driven direction
 * logic this milestone doesn't otherwise need).
 *
 * `initialMessages` comes from the server (this course's persisted
 * conversation, if one exists) so history survives a reload; everything
 * sent after that lives in local state and is streamed in via
 * `/api/chat`, appended to the DB by the route handler itself.
 */

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function toDisplayMessages(
  messages: readonly ConversationMessage[]
): DisplayMessage[] {
  return messages.map((m) => ({
    id: m.id,
    role: m.sender === "ASSISTANT" ? "assistant" : "user",
    content: m.content,
  }));
}

export function ChatPanel({
  courseSlug,
  lessonSlug,
  initialMessages,
}: {
  courseSlug: string;
  lessonSlug?: string;
  initialMessages: readonly ConversationMessage[];
}) {
  const [messages, setMessages] = useState<DisplayMessage[]>(() =>
    toDisplayMessages(initialMessages)
  );
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextLocalId = useRef(0);

  function localId(): string {
    nextLocalId.current += 1;
    return `local-${nextLocalId.current}`;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    setError(null);
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: localId(), role: "user", content: trimmed },
    ]);
    setIsSending(true);

    const assistantId = localId();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseSlug, lessonSlug, message: trimmed }),
      });

      if (!response.ok || !response.body) {
        const data: { error?: string } | null = await response
          .json()
          .catch(() => null);
        setError(data?.error ?? "Something went wrong. Please try again.");
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m
          )
        );
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button variant="outline" className="w-fit">
          <MessageCircle aria-hidden="true" />
          Course assistant
        </Button>
      </DrawerTrigger>

      <DrawerContent className="flex h-full flex-col">
        <DrawerHeader>
          <DrawerTitle>Course assistant</DrawerTitle>
          <DrawerDescription>
            Ask a question about this course{lessonSlug ? " or lesson" : ""}.
          </DrawerDescription>
        </DrawerHeader>

        <div
          className="flex flex-1 flex-col gap-3 overflow-y-auto px-4"
          role="log"
          aria-live="polite"
          aria-label="Conversation with the course assistant"
        >
          {messages.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">
              Ask anything about this course — I can see what you&apos;re
              currently learning.
            </p>
          ) : (
            messages.map((m, index) => {
              const isStreamingReply =
                isSending &&
                m.role === "assistant" &&
                m.content === "" &&
                index === messages.length - 1;

              return (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-xl px-3.5 py-2.5 text-body-sm text-pretty",
                    m.role === "user"
                      ? "self-end bg-primary text-primary-foreground"
                      : "self-start bg-muted text-foreground"
                  )}
                >
                  {isStreamingReply ? (
                    <span role="status" className="flex items-center gap-2">
                      {/* `data-motion="essential"` exempts it from the
                          global reduced-motion freeze — a frozen spinner
                          would stop reporting progress (§25, matches
                          `Button`'s loading spinner). */}
                      <Loader2
                        className="size-4 animate-spin"
                        data-motion="essential"
                        aria-hidden="true"
                      />
                      <span className="sr-only">
                        Assistant is composing a reply…
                      </span>
                    </span>
                  ) : (
                    m.content
                  )}
                </div>
              );
            })
          )}
        </div>

        {error ? (
          <p
            id="chat-panel-error"
            role="alert"
            className="px-4 pb-2 text-body-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 border-t border-border p-4"
        >
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask a question…"
            disabled={isSending}
            aria-label="Message the course assistant"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "chat-panel-error" : undefined}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isSending || !input.trim()}
            aria-label="Send message"
          >
            <Send aria-hidden="true" />
          </Button>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
