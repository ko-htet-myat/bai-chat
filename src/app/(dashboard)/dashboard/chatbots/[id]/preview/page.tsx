"use client";

import { useChat } from "@ai-sdk/react";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DefaultChatTransport } from "ai";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  ChatbotUIMessage,
  extractEmbeddedSuggestedQuestions,
  getSuggestedQuestionsFromParts,
  stripSuggestedQuestionsFromAnswer,
} from "@/lib/chatbot-response";
import {
  readSessionStorage,
  removeSessionStorage,
  writeSessionStorage,
} from "@/lib/chat-session-storage";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ChatbotPreviewSettings = {
  name: string;
  welcomeMessage: string | null;
  primaryColor: string | null;
  isActive: boolean;
  starterQuestions?: string[];
};

function getMessageText(parts: ReadonlyArray<{ type: string; text?: string }>) {
  return parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("");
}

function getPreviewStorageKey(chatbotId: string) {
  return `bai-chat-preview:${chatbotId}`;
}

export default function ChatbotTestPage() {
  const { id } = useParams();
  const [input, setInput] = useState("");
  const [chatbot, setChatbot] = useState<ChatbotPreviewSettings | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [hasRestoredMessages, setHasRestoredMessages] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { messages, sendMessage, setMessages, status, error, regenerate } = useChat<ChatbotUIMessage>({
    transport: new DefaultChatTransport({
      api: `/api/chatbots/${id}/chat`,
    }),
    id: `chat-${id}`,
  });

  const isLoading = status === "streaming" || status === "submitted";
  const accentColor = chatbot?.primaryColor || "#0ea5e9";
  const welcomeMessage = chatbot?.welcomeMessage?.trim() || "Hi! How can I help you today?";
  const chatbotName = chatbot?.name || "Your Chatbot";
  const latestAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");
  const latestSuggestedQuestions = latestAssistantMessage
    ? (() => {
        const metadataQuestions = getSuggestedQuestionsFromParts(latestAssistantMessage.parts);

        if (metadataQuestions.length > 0) {
          return metadataQuestions;
        }

        const assistantText = latestAssistantMessage.parts
          .filter(
            (part): part is { type: "text"; text: string } =>
              part.type === "text" && typeof part.text === "string"
          )
          .map((part) => part.text)
          .join("");

        return extractEmbeddedSuggestedQuestions(assistantText);
      })()
    : [];
  const visibleQuestions =
    !input.trim() && !isLoading
      ? latestSuggestedQuestions.length > 0
        ? latestSuggestedQuestions
        : messages.length === 0
          ? chatbot?.starterQuestions ?? []
          : []
      : [];

  useEffect(() => {
    if (typeof id !== "string") {
      return;
    }

    const savedMessages = readSessionStorage<ChatbotUIMessage[]>(
      getPreviewStorageKey(id)
    );

    if (savedMessages?.length) {
      setMessages(savedMessages);
    }

    setHasRestoredMessages(true);
  }, [id, setMessages]);

  useEffect(() => {
    let isMounted = true;

    async function loadChatbot() {
      try {
        setSettingsError(null);
        const res = await fetch(`/api/chatbots/${id}`);

        if (!res.ok) {
          throw new Error("Failed to load chatbot settings");
        }

        const data = await res.json();
        if (isMounted) {
          setChatbot(data.chatbot);
        }
      } catch (err) {
        if (isMounted) {
          setSettingsError(err instanceof Error ? err.message : "Failed to load chatbot settings");
        }
      }
    }

    loadChatbot();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  useEffect(() => {
    if (!hasRestoredMessages || typeof id !== "string") {
      return;
    }

    writeSessionStorage(getPreviewStorageKey(id), messages);
  }, [hasRestoredMessages, id, messages]);

  const handlePromptSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();

    if (!text || isLoading || chatbot?.isActive === false) return;
    
    setInput("");
    await sendMessage({ text });
  };

  const handleSuggestedQuestionClick = (question: string) => {
    if (isLoading || chatbot?.isActive === false) return;
    setInput(question);
  };

  const handleDeleteHistory = () => {
    if (typeof id !== "string") {
      return;
    }

    removeSessionStorage(getPreviewStorageKey(id));
    setMessages([]);
    setInput("");
    setIsDeleteDialogOpen(false);
  };

  return (
    <TooltipProvider>
      <div className="relative h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_30%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,252,0.98))] text-foreground dark:bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(34,197,94,0.1),transparent_24%),linear-gradient(180deg,rgba(10,15,22,0.98),rgba(15,23,42,0.98))]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background/60 to-transparent" />

        <div className="relative flex h-full min-h-0 flex-col">
          <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur-2xl">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-4">
                <div
                  className="flex size-11 items-center justify-center rounded-2xl border text-white shadow-sm"
                  style={{ backgroundColor: accentColor, borderColor: `${accentColor}33` }}
                >
                  <Bot className="size-5" />
                </div>
                <div className="min-w-0">
                  <p
                    className="text-[11px] font-semibold uppercase tracking-[0.26em]"
                    style={{ color: accentColor }}
                  >
                    Live Chat Preview
                  </p>
                  <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
                    {chatbotName}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-2 text-xs text-muted-foreground md:flex">
                  <Sparkles className="size-3.5" style={{ color: accentColor }} />
                  {chatbot?.isActive === false ? "Inactive preview" : "Knowledge base mode"}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  disabled={messages.length === 0}
                  className="rounded-full border-border/70 bg-background/90 shadow-sm"
                >
                  <Trash2 className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => regenerate()}
                  disabled={messages.length === 0 || isLoading}
                  className="rounded-full border-border/70 bg-background/90 shadow-sm"
                >
                  <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
                </Button>
              </div>
            </div>
          </header>

          <Conversation className="min-h-0 flex-1 overflow-y-auto">
            <ConversationContent className="mx-auto w-full max-w-5xl px-4 py-6 pb-6 sm:px-6 sm:py-8 sm:pb-8">
              {messages.length === 0 && (
                <ConversationEmptyState
                  icon={<Bot className="size-12 opacity-20" />}
                  title={welcomeMessage}
                  description={
                    chatbot?.isActive === false
                      ? "This chatbot is currently inactive. Turn it back on in Settings to test real responses."
                      : "Your assistant is standing by with document context. Ask a real question to test grounding, tone, and response quality."
                  }
                />
              )}
               
              {messages.map((m) => (
                <Message key={m.id} from={m.role}>
                  <MessageContent
                    className={cn(
                      "rounded-[1.6rem]",
                      m.role === "assistant"
                        ? "max-w-3xl border border-border/60 bg-background/75 px-5 py-4 shadow-[0_16px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur-sm"
                        : "max-w-2xl rounded-[1.75rem] bg-foreground px-5 py-4 text-background shadow-[0_18px_50px_-28px_rgba(15,23,42,0.45)]"
                    )}
                  >
                    <MessageResponse>
                      {m.role === "assistant"
                        ? stripSuggestedQuestionsFromAnswer(getMessageText(m.parts))
                        : getMessageText(m.parts)}
                    </MessageResponse>
                  </MessageContent>
                </Message>
              ))}

              {isLoading && status === "submitted" && (
                <Message from="assistant">
                  <MessageContent className="rounded-[1.6rem] border border-border/60 bg-background/75 px-5 py-4 shadow-[0_16px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur-sm">
                    <div className="flex gap-1.5 py-1">
                        <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce"></span>
                    </div>
                  </MessageContent>
                </Message>
              )}
              
              {(error || settingsError) && (
                <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive animate-in shake">
                  <div className="w-2 h-2 bg-destructive rounded-full" />
                  {settingsError || error?.message || "Something went wrong. Please check your network or API quota."}
                </div>
              )}
              <div ref={messagesEndRef} />
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <div className="shrink-0 border-t border-border/60 bg-background/80 backdrop-blur-2xl">
            <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 sm:py-5">
              {visibleQuestions.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2 px-1">
                  {visibleQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      className="rounded-full border border-border/70 bg-background/92 px-3 py-2 text-sm text-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isLoading || chatbot?.isActive === false}
                      onClick={() => handleSuggestedQuestionClick(question)}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              )}
              <form
                className="relative w-full"
                onSubmit={handlePromptSubmit}
              >
                <textarea
                  name="message"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="block min-h-[76px] max-h-[180px] w-full resize-none overflow-y-auto rounded-[1.9rem] border border-border/70 bg-background/92 px-5 py-5 pr-24 text-[15px] leading-6 text-foreground shadow-[0_20px_60px_-36px_rgba(15,23,42,0.45)] outline-none transition-all [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden placeholder:text-muted-foreground/70 focus:border-primary/35 focus:ring-4 focus:ring-primary/10"
                  placeholder={chatbot?.isActive === false ? "This chatbot is inactive" : "Ask a question against your knowledge base..."}
                  disabled={chatbot?.isActive === false}
                  style={{
                    borderColor: `${accentColor}22`,
                    boxShadow: "0 20px 60px -36px rgba(15,23,42,0.45)",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                />

                <Button
                  type="submit"
                  disabled={isLoading || chatbot?.isActive === false}
                  size="icon"
                  className={cn(
                    "absolute right-3 bottom-3 z-10 size-12 rounded-full shadow-[0_14px_30px_-18px_rgba(15,23,42,0.7)] transition-all",
                    isLoading || chatbot?.isActive === false
                      ? "cursor-not-allowed bg-muted text-muted-foreground hover:scale-100"
                      : "text-white hover:scale-[1.02]"
                  )}
                  style={{
                    backgroundColor:
                      isLoading || chatbot?.isActive === false ? undefined : accentColor,
                  }}
                >
                  {isLoading ? (
                    <RefreshCw className="size-4 animate-spin" />
                  ) : (
                    <ArrowUp className="size-4" />
                  )}
                </Button>
              </form>
              <div className="mt-3 flex items-center justify-between gap-3 px-1 text-[11px] text-muted-foreground">
                <p>Shift + Enter for a new line</p>
                <p className="hidden sm:block">Grounded responses should come from your uploaded sources</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete preview chat history?</DialogTitle>
            <DialogDescription>
              This clears the saved admin preview conversation for this chatbot in
              the current browser session.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteHistory}
            >
              <Trash2 className="mr-2 size-4" />
              Delete History
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
