"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Loader2, MessageSquarePlus, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageResponse } from "@/components/ai-elements/message";
import { cn } from "@/lib/utils";

type WidgetFrameProps = {
  apiKey: string;
  chatbotName: string;
  initialPrimaryColor: string;
  initialWelcomeMessage: string;
};

type WidgetMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

function getStorageKey(apiKey: string) {
  return `bai-chat-widget-session:${apiKey}`;
}

function generateSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function WidgetFrame({
  apiKey,
  chatbotName,
  initialPrimaryColor,
  initialWelcomeMessage,
}: WidgetFrameProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const storageKey = getStorageKey(apiKey);
    const existingSessionId = window.localStorage.getItem(storageKey);
    const nextSessionId = existingSessionId || generateSessionId();

    if (!existingSessionId) {
      window.localStorage.setItem(storageKey, nextSessionId);
    }

    setSessionId(nextSessionId);
    setIsReady(true);
  }, [apiKey]);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    async function loadHistory() {
      try {
        setError(null);
        const res = await fetch(
          `/api/widget/${apiKey}/history?sessionId=${encodeURIComponent(sessionId)}`
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load conversation history");
        }

        if (cancelled || !data.conversation) return;

        setConversationId(data.conversation.id);
        setMessages(data.conversation.messages);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load conversation history");
        }
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [apiKey, sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const hasMessages = messages.length > 0;
  const accentStyles = useMemo(
    () => ({
      backgroundColor: initialPrimaryColor,
      borderColor: `${initialPrimaryColor}33`,
      color: "#ffffff",
    }),
    [initialPrimaryColor]
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const message = input.trim();
    if (!message || isLoading || !sessionId) return;

    const optimisticMessage: WidgetMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: message,
    };

    setMessages((current) => [...current, optimisticMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/widget/${apiKey}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId,
          message,
          sessionId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      setConversationId(data.conversationId);
      setMessages((current) => [...current, data.message]);
    } catch (err) {
      setMessages((current) =>
        current.filter((entry) => entry.id !== optimisticMessage.id)
      );
      setError(err instanceof Error ? err.message : "Failed to send message");
      setInput(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setError(null);
  };

  if (!isReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-2xl shadow-sm"
              style={accentStyles}
            >
              <Bot className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{chatbotName}</p>
              <p className="truncate text-xs text-muted-foreground">
                Ask anything about our content
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full"
              onClick={handleNewChat}
              type="button"
            >
              <MessageSquarePlus className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full"
              onClick={() => window.parent.postMessage({ type: "BAI_CHAT_WIDGET_CLOSE" }, "*")}
              type="button"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {!hasMessages && (
            <div className="rounded-3xl border border-border/60 bg-background px-4 py-4 shadow-sm">
              <p className="text-sm font-medium">{initialWelcomeMessage}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Your conversation history is stored for this browser session.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[88%] rounded-[1.5rem] px-4 py-3 text-sm shadow-sm",
                  message.role === "user"
                    ? "text-white"
                    : "border border-border/60 bg-background"
                )}
                style={message.role === "user" ? accentStyles : undefined}
              >
                <MessageResponse>{message.text}</MessageResponse>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-[1.5rem] border border-border/60 bg-background px-4 py-3 shadow-sm">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="border-t border-border/60 bg-background px-4 py-4">
        <form className="mx-auto flex max-w-2xl items-end gap-3" onSubmit={handleSubmit}>
          <textarea
            className="min-h-[52px] flex-1 resize-none rounded-[1.4rem] border border-border/70 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
            disabled={isLoading}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Type your message..."
            rows={1}
            value={input}
          />
          <button
            className="flex size-12 shrink-0 items-center justify-center rounded-full shadow-sm transition disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
            disabled={isLoading || !input.trim()}
            style={!isLoading && input.trim() ? accentStyles : undefined}
            type="submit"
          >
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </form>
      </footer>
    </div>
  );
}
