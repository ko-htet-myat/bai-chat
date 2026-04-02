"use client";

import { useChat } from "@ai-sdk/react";
import { useParams } from "next/navigation";
import { useRef, useEffect, useState } from "react";
import { Send, User, Bot, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageResponse } from "@/components/ai-elements/message";
import { cn } from "@/lib/utils";
import { DefaultChatTransport } from "ai";
import {
  ChatbotUIMessage,
  getSuggestedQuestionsFromParts,
  stripSuggestedQuestionsFromAnswer,
} from "@/lib/chatbot-response";

export default function ChatbotTestPage() {
  const { id } = useParams();
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { messages, sendMessage, status, error, regenerate } = useChat<ChatbotUIMessage>({
    transport: new DefaultChatTransport({
      api: `/api/chatbots/${id}/chat`,
    }),
    id: `chat-${id}`,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isLoading = status === "streaming" || status === "submitted";
  const latestSuggestedQuestions = [...messages]
    .reverse()
    .find((message) => message.role === "assistant" && getSuggestedQuestionsFromParts(message.parts).length > 0);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;
    setInputValue("");
    await sendMessage({ text });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestedQuestionClick = (question: string) => {
    if (isLoading) return;
    setInputValue(question);
  };

  const getMessageText = (message: ChatbotUIMessage) =>
    message.parts
      .filter(
        (part): part is Extract<ChatbotUIMessage["parts"][number], { type: "text"; text: string }> =>
          part.type === "text" && typeof part.text === "string"
      )
      .map((part) => part.text)
      .join("");

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Minimal Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Chat</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => regenerate()} 
          disabled={messages.length === 0 || isLoading}
          className="h-8 w-8"
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
        </Button>
      </header>

      {/* Full Screen Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
          {messages.length === 0 && (
            <div className="h-[60vh] flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Start typing...</p>
            </div>
          )}
          
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex gap-2.5",
                m.role === "user" && "flex-row-reverse"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                m.role === "user" ? "bg-primary" : "bg-muted"
              )}>
                {m.role === "user" ? (
                  <User className="w-3 h-3 text-primary-foreground" />
                ) : (
                  <Bot className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
              
              <div className={cn(
                "flex-1 max-w-[80%]",
                m.role === "user" && "text-right"
              )}>
                <div className={cn(
                  "px-3 py-2 rounded-2xl text-sm inline-block",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "rounded-bl-sm border border-border/60 bg-background/80"
                )}>
                  <MessageResponse
                    className={cn(
                      "leading-6",
                      m.role === "user" &&
                        "[&_a]:text-inherit [&_a]:decoration-primary-foreground/60 [&_blockquote]:border-primary-foreground/25 [&_code]:bg-primary-foreground/12 [&_pre]:border-primary-foreground/15 [&_pre]:bg-primary-foreground/10"
                    )}
                  >
                    {m.role === "assistant"
                      ? stripSuggestedQuestionsFromAnswer(getMessageText(m))
                      : getMessageText(m)}
                  </MessageResponse>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                <Bot className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="flex gap-1 items-center px-2">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="text-center text-sm text-destructive">
              {error.message || "Error"}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Bottom Input */}
      <footer className="px-4 py-3 border-t border-border/50">
        <div className="max-w-3xl mx-auto">
          {latestSuggestedQuestions && !inputValue.trim() && (
            <div className="mb-3 flex flex-wrap gap-2">
              {getSuggestedQuestionsFromParts(latestSuggestedQuestions.parts).map((question) => (
                <button
                  key={`${latestSuggestedQuestions.id}-${question}`}
                  type="button"
                  className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-left text-xs text-foreground transition hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isLoading}
                  onClick={() => handleSuggestedQuestionClick(question)}
                >
                  {question}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-center">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              className="flex-1 px-4 py-2.5 bg-muted/50 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-primary/30 text-sm"
              rows={1}
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              size="icon"
              className="h-9 w-9 rounded-xl shrink-0"
              disabled={isLoading || !inputValue.trim()}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
