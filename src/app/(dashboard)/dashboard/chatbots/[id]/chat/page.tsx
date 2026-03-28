"use client";

import { useChat } from "@ai-sdk/react";
import { useParams } from "next/navigation";
import { useRef, useEffect, useState } from "react";
import { Send, User, Bot, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DefaultChatTransport } from "ai";

export default function ChatbotTestPage() {
  const { id } = useParams();
  const [mounted, setMounted] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { messages, sendMessage, status, error, regenerate } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/chatbots/${id}/chat`,
    }),
    id: `chat-${id}`,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isLoading = status === "streaming" || status === "submitted";

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    await sendMessage({ text: inputValue });
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getMessageText = (msg: any) => {
    if (typeof msg.content === "string") return msg.content;
    if (Array.isArray(msg.content)) {
      return msg.content.filter((p: any) => p.type === "text").map((p: any) => p.text).join("");
    }
    if (msg.parts) {
      return msg.parts.filter((p: any) => p.type === "text").map((p: any) => p.text).join("");
    }
    return "";
  };

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
                    : "rounded-bl-sm"
                )}>
                  {getMessageText(m)}
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
