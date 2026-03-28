"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BotIcon, ChevronLeftIcon, Loader2Icon, Settings2Icon, DatabaseIcon } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function NewChatbotPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a helpful AI assistant. Answer the user's questions clearly and concisely."
  );
  const [modelId, setModelId] = useState("meta-llama/llama-3.3-70b-instruct:free");
  const [primaryColor, setPrimaryColor] = useState("#0ea5e9");
  const [welcomeMessage, setWelcomeMessage] = useState("Hi! How can I help you today?");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chatbots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          systemPrompt,
          modelId,
          primaryColor,
          welcomeMessage,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create chatbot");
      }

      const { chatbot } = await res.json();
      router.push(`/dashboard/chatbots/${chatbot.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-6">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <div className="w-px h-4 bg-border mx-1" />
          <Link
            href="/dashboard/chatbots"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </Link>
          <BotIcon className="w-5 h-5 text-muted-foreground ml-2" />
          <h1 className="text-lg font-semibold">Create Chatbot</h1>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="mx-auto max-w-3xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="rounded-md bg-destructive/15 text-destructive p-3 text-sm font-medium">
                {error}
              </div>
            )}

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                <div className="border-b bg-muted/30 px-6 py-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <BotIcon className="w-5 h-5" />
                    Basic Information
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Identify your chatbot and control how it appears to users.
                  </p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">
                      Chatbot Name *
                    </label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Customer Support AI"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="description" className="text-sm font-medium">
                      Description (Optional)
                    </label>
                    <input
                      id="description"
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. For our primary marketing site"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="welcomeMessage" className="text-sm font-medium">
                        Welcome Message
                      </label>
                      <input
                        id="welcomeMessage"
                        type="text"
                        value={welcomeMessage}
                        onChange={(e) => setWelcomeMessage(e.target.value)}
                        placeholder="Hi! How can I help you today?"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="primaryColor" className="text-sm font-medium">
                        Brand Color
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="primaryColor"
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="h-10 w-12 cursor-pointer rounded-md border border-input bg-background p-1"
                        />
                        <input
                          type="text"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background uppercase"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Config */}
              <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                <div className="border-b bg-muted/30 px-6 py-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Settings2Icon className="w-5 h-5" />
                    AI Configuration
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Control the personality and underlying intelligence of your bot.
                  </p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="modelId" className="text-sm font-medium">
                      AI Model
                    </label>
                    <select
                      id="modelId"
                      value={modelId}
                      onChange={(e) => setModelId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="meta-llama/llama-3.3-70b-instruct:free">Llama 3.3 70B (Free)</option>
                      <option value="google/gemini-2.0-flash-lite-preview-02-05:free">Gemini 2.0 Flash Lite (Free)</option>
                      <option value="nvidia/nemotron-3-super-120b-a12b:free">Nemotron 3 Super 120B (Free)</option>
                      <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
                      <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="systemPrompt" className="text-sm font-medium flex justify-between">
                      <span>System Prompt</span>
                      <span className="text-muted-foreground text-xs font-normal">Controls how the AI behaves</span>
                    </label>
                    <textarea
                      id="systemPrompt"
                      rows={5}
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Knowledge Base (Optional Notification) */}
              <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden border-dashed border-2">
                <div className="p-6 flex items-start gap-4">
                  <div className="mt-1 h-10 w-10 flex items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                    <DatabaseIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      Knowledge Base Phase 
                      <span className="ml-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-muted/50 text-muted-foreground">Optional</span>
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Want your chatbot to answer questions about your private documents or website? You can upload and configure a knowledge base <strong>after</strong> creating the chatbot.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Link
                href="/dashboard/chatbots"
                className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-8 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                {isLoading && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
                Create Chatbot
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
