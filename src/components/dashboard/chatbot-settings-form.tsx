"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, TrashIcon } from "lucide-react";
import { Chatbot } from "@prisma/client";

export default function ChatbotSettingsForm({ chatbot }: { chatbot: Chatbot }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState(chatbot.name);
  const [description, setDescription] = useState(chatbot.description || "");
  const [systemPrompt, setSystemPrompt] = useState(chatbot.systemPrompt || "");
  const [modelId, setModelId] = useState(chatbot.modelId);
  const [primaryColor, setPrimaryColor] = useState(chatbot.primaryColor || "#0ea5e9");
  const [welcomeMessage, setWelcomeMessage] = useState(chatbot.welcomeMessage || "");
  const [isActive, setIsActive] = useState(chatbot.isActive);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/chatbots/${chatbot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          systemPrompt,
          modelId,
          primaryColor,
          welcomeMessage,
          isActive,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update chatbot");
      }

      setSuccess("Chatbot updated successfully!");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this chatbot? This action cannot be undone.")) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/chatbots/${chatbot.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete chatbot");
      }

      router.push("/dashboard/chatbots");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="rounded-md bg-destructive/15 text-destructive p-3 text-sm font-medium">
            {error}
          </div>
        )}
        
        {success && (
          <div className="rounded-md bg-emerald-500/15 text-emerald-600 p-3 text-sm font-medium">
            {success}
          </div>
        )}

        {/* Basic Info */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold text-lg">General Profile</h3>
              <p className="text-sm text-muted-foreground">The visible details of your bot.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Status</span>
              <label className="relative inline-flex cursor-pointer items-center">
                <input 
                  type="checkbox" 
                  className="peer sr-only" 
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary peer-focus:ring-offset-2 peer-focus:ring-offset-background"></div>
              </label>
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">Chatbot Name *</label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">Description</label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="welcomeMessage" className="text-sm font-medium">Welcome Message</label>
              <input
                id="welcomeMessage"
                type="text"
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="primaryColor" className="text-sm font-medium">Brand Color</label>
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

        {/* AI Config */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="mb-2">
            <h3 className="font-semibold text-lg">AI Configuration</h3>
            <p className="text-sm text-muted-foreground">Adjust the brain and personality of your bot.</p>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="modelId" className="text-sm font-medium">AI Model</label>
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
            <label htmlFor="systemPrompt" className="text-sm font-medium">System Prompt</label>
            <textarea
              id="systemPrompt"
              rows={6}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            {isLoading && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="rounded-xl border border-destructive bg-destructive/5 p-6 mt-12">
        <h3 className="font-semibold text-lg text-destructive mb-1">Danger Zone</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete this chatbot and all of its conversations, settings, and attached knowledge bases.
        </p>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="inline-flex h-10 items-center justify-center rounded-md bg-destructive px-6 py-2 text-sm font-medium text-destructive-foreground ring-offset-background transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        >
          {isDeleting ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : <TrashIcon className="mr-2 h-4 w-4" />}
          Delete Chatbot
        </button>
      </div>
    </div>
  );
}
