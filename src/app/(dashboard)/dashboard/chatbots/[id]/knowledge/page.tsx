"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { 
  GlobeIcon,
  DatabaseIcon, 
  FileTextIcon, 
  LinkIcon, 
  UploadIcon, 
  Loader2Icon,
  TrashIcon,
  CheckCircle2Icon,
  XCircleIcon
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type KnowledgeBaseItem = {
  id: string;
  name: string;
  type: string;
  content: string | null;
  fileUrl: string | null;
  status: string;
};

type CrawlPreviewPage = {
  title: string;
  url: string;
};

export default function ChatbotKnowledgePage() {
  const params = useParams();
  const chatbotId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeBaseItem | null>(null);
  const [isDeletingKnowledge, setIsDeletingKnowledge] = useState(false);

  // Upload Form State
  const [uploadType, setUploadType] = useState<"text" | "pdf" | "url" | "web_crawler">("pdf");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [maxPages, setMaxPages] = useState(10);
  const [isDiscoveringPages, setIsDiscoveringPages] = useState(false);
  const [crawlerPages, setCrawlerPages] = useState<CrawlPreviewPage[]>([]);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);

  const fetchKnowledgeBases = useCallback(async () => {
    try {
      const res = await fetch(`/api/chatbots/${chatbotId}/knowledge`);
      if (res.ok) {
        const data = await res.json();
        setKnowledgeBases(data.knowledgeBases);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [chatbotId]);

  useEffect(() => {
    fetchKnowledgeBases();
  }, [fetchKnowledgeBases]);

  useEffect(() => {
    if (uploadType !== "web_crawler") {
      setCrawlerPages([]);
      setSelectedPages([]);
    }
  }, [uploadType]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("type", uploadType);
      formData.append("name", name);
      if (uploadType === "web_crawler") {
        formData.append("maxPages", String(maxPages));
        formData.append("selectedPages", JSON.stringify(selectedPages));
      }
      
      if (uploadType === "pdf") {
        if (!file) throw new Error("Please select a PDF file");
        formData.append("file", file);
      } else {
        if (!content) throw new Error("Please provide context text or URL");
        formData.append("content", content);
      }

      const res = await fetch(`/api/chatbots/${chatbotId}/knowledge`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      // Reset form
      setName("");
      setContent("");
      setFile(null);
      setMaxPages(10);
      setCrawlerPages([]);
      setSelectedPages([]);
      
      // Refresh list
      await fetchKnowledgeBases();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDiscoverPages = async () => {
    if (!content.trim()) {
      setError("Please enter a website URL first");
      return;
    }

    setIsDiscoveringPages(true);
    setError(null);

    try {
      const res = await fetch(`/api/chatbots/${chatbotId}/knowledge/crawl`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          maxPages,
          url: content,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to discover pages");
      }

      setCrawlerPages(data.pages);
      setSelectedPages(data.pages.map((page: CrawlPreviewPage) => page.url));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to discover pages");
    } finally {
      setIsDiscoveringPages(false);
    }
  };

  const toggleSelectedPage = (url: string) => {
    setSelectedPages((prev) =>
      prev.includes(url) ? prev.filter((item) => item !== url) : [...prev, url]
    );
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeletingKnowledge(true);
    setError(null);

    try {
      const res = await fetch(`/api/chatbots/${chatbotId}/knowledge/${deleteTarget.id}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete knowledge source");
      }

      setKnowledgeBases(prev => prev.filter(k => k.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete knowledge source");
    } finally {
      setIsDeletingKnowledge(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Knowledge Base</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Upload documents, add websites, crawl whole sites, or write text to train your chatbot.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Upload Form */}
        <div className="lg:col-span-1 border rounded-xl bg-card overflow-hidden h-fit">
          <div className="p-4 border-b bg-muted/20">
            <h3 className="font-semibold flex items-center gap-2">
              <UploadIcon className="w-4 h-4" />
              Add Knowledge
            </h3>
          </div>
          <form onSubmit={handleUpload} className="p-4 space-y-4">
            {error && (
              <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Source Type</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={() => setUploadType("pdf")}
                  className={`flex items-center justify-center gap-2 py-2 px-3 border rounded-md text-xs font-medium transition-colors ${
                    uploadType === "pdf" ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                  }`}
                >
                  <FileTextIcon className="w-3.5 h-3.5" /> PDF
                </button>
                <button
                  type="button"
                  onClick={() => setUploadType("url")}
                  className={`flex items-center justify-center gap-2 py-2 px-3 border rounded-md text-xs font-medium transition-colors ${
                    uploadType === "url" ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" /> URL
                </button>
                <button
                  type="button"
                  onClick={() => setUploadType("text")}
                  className={`flex items-center justify-center gap-2 py-2 px-3 border rounded-md text-xs font-medium transition-colors ${
                    uploadType === "text" ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                  }`}
                >
                  <DatabaseIcon className="w-3.5 h-3.5" /> Text
                </button>
                <button
                  type="button"
                  onClick={() => setUploadType("web_crawler")}
                  className={`flex items-center justify-center gap-2 py-2 px-3 border rounded-md text-xs font-medium transition-colors ${
                    uploadType === "web_crawler" ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                  }`}
                >
                  <GlobeIcon className="w-3.5 h-3.5" /> Crawler
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">Display Name *</label>
              <input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="E.g. Employee Handbook 2024"
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {uploadType === "pdf" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">PDF File *</label>
                <div className="border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center text-center gap-2 hover:bg-muted/50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <FileTextIcon className="w-5 h-5" />
                  </div>
                  <div className="text-sm">
                    <label htmlFor="file" className="text-primary hover:underline cursor-pointer font-medium">Click to upload</label>
                    <span className="text-muted-foreground"> or drag and drop</span>
                  </div>
                  <p className="text-xs text-muted-foreground">PDFs up to 10MB</p>
                  <input
                    id="file"
                    type="file"
                    accept=".pdf"
                    required
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  {file && (
                    <div className="mt-2 text-xs font-medium bg-primary/10 text-primary py-1 px-3 rounded-full flex items-center gap-1">
                      <FileTextIcon className="w-3 h-3" />
                      {file.name}
                    </div>
                  )}
                </div>
              </div>
            )}

            {uploadType === "url" && (
              <div className="space-y-2">
                <label htmlFor="url" className="text-sm font-medium">Website URL *</label>
                <input
                  id="url"
                  type="url"
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="https://example.com/about"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            )}

            {uploadType === "web_crawler" && (
              <>
                <div className="space-y-2">
                  <label htmlFor="crawler-url" className="text-sm font-medium">Start URL *</label>
                  <input
                    id="crawler-url"
                    type="url"
                    required
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value);
                      setCrawlerPages([]);
                      setSelectedPages([]);
                    }}
                    placeholder="https://example.com"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground">
                    Crawls same-domain pages starting from this URL.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="crawler-max-pages" className="text-sm font-medium">Max Pages</label>
                  <input
                    id="crawler-max-pages"
                    type="number"
                    min={1}
                    max={25}
                    value={maxPages}
                    onChange={(e) => {
                      setMaxPages(Number(e.target.value) || 1);
                      setCrawlerPages([]);
                      setSelectedPages([]);
                    }}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground">
                    Recommended 5-15 pages for fast processing.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDiscoverPages}
                  disabled={isDiscoveringPages}
                  className="w-full inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                >
                  {isDiscoveringPages ? (
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <GlobeIcon className="mr-2 h-4 w-4" />
                  )}
                  {isDiscoveringPages ? "Discovering Pages..." : "Discover Pages"}
                </button>

                {crawlerPages.length > 0 && (
                  <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">Select pages to ingest</p>
                      <span className="text-xs text-muted-foreground">
                        {selectedPages.length}/{crawlerPages.length} selected
                      </span>
                    </div>
                    <div className="max-h-56 overflow-y-auto pr-1">
                      <TooltipProvider>
                        <div className="flex w-full flex-col gap-2">
                          {crawlerPages.map((page) => (
                            <Tooltip key={page.url}>
                              <TooltipTrigger asChild>
                                <label
                                  className="flex w-full items-start gap-3 rounded-md border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted/30"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedPages.includes(page.url)}
                                    onChange={() => toggleSelectedPage(page.url)}
                                    className="mt-1 shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium">{page.title}</p>
                                    <p className="truncate text-xs text-muted-foreground">{page.url}</p>
                                  </div>
                                </label>
                              </TooltipTrigger>
                              <TooltipContent align="start" className="max-w-md break-words">
                                <div className="space-y-1 text-xs">
                                  <p className="font-medium text-foreground">{page.title}</p>
                                  <p className="text-muted-foreground">{page.url}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </TooltipProvider>
                    </div>
                  </div>
                )}
              </>
            )}

            {uploadType === "text" && (
              <div className="space-y-2">
                <label htmlFor="text" className="text-sm font-medium">Raw Text Content *</label>
                <textarea
                  id="text"
                  required
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste any text you want the bot to know..."
                  className="w-full rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isUploading || (uploadType === "web_crawler" && selectedPages.length === 0)}
              className="w-full inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 mt-2"
            >
              {isUploading ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseIcon className="mr-2 h-4 w-4" />}
              {isUploading ? "Processing & Training..." : "Process Knowledge"}
            </button>
          </form>
        </div>

        {/* Knowledge List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Active Sources</h3>
            <span className="text-sm text-muted-foreground px-3 py-1 bg-muted rounded-full">
              {knowledgeBases.length} sources
            </span>
          </div>

          {isLoading ? (
            <div className="h-32 flex items-center justify-center rounded-xl border border-dashed text-muted-foreground">
              <Loader2Icon className="w-5 h-5 animate-spin" />
            </div>
          ) : knowledgeBases.length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center rounded-xl border border-dashed text-muted-foreground text-sm gap-2">
              <DatabaseIcon className="w-8 h-8 opacity-20" />
              <p>No knowledge added yet.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {knowledgeBases.map((kb) => (
                <div key={kb.id} className="flex items-center justify-between p-4 bg-card border rounded-xl hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 shrink-0 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                      {kb.type === "pdf" ? <FileTextIcon className="w-5 h-5" /> :
                       kb.type === "web_crawler" ? <GlobeIcon className="w-5 h-5" /> :
                       kb.type === "url" ? <LinkIcon className="w-5 h-5" /> :
                       <DatabaseIcon className="w-5 h-5" />}
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="font-medium text-sm truncate">{kb.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="uppercase">{kb.type}</span>
                        <span>•</span>
                        {kb.status === "ready" ? (
                          <span className="flex items-center gap-1 text-emerald-600 font-medium">
                            <CheckCircle2Icon className="w-3 h-3" /> Ready
                          </span>
                        ) : kb.status === "error" ? (
                          <span className="flex items-center gap-1 text-destructive font-medium">
                            <XCircleIcon className="w-3 h-3" /> Error processing
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-600 font-medium tracking-tight">
                            <Loader2Icon className="w-3 h-3 animate-spin" /> Processing
                          </span>
                        )}
                        {(kb.type === "url" || kb.type === "web_crawler") && (
                          <span className="truncate max-w-[150px]"> • {kb.fileUrl}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-4">
                    {kb.fileUrl && kb.type === "pdf" && (
                      <a 
                        href={kb.fileUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:bg-muted transition-colors"
                        title="View PDF"
                      >
                        <FileTextIcon className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => setDeleteTarget(kb)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-md text-destructive hover:bg-destructive/10 transition-colors"
                      title="Delete Source"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent showCloseButton={!isDeletingKnowledge}>
          <DialogHeader>
            <DialogTitle>Delete knowledge source?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `This will permanently remove "${deleteTarget.name}" from the chatbot knowledge base.`
                : "This will permanently remove this knowledge source from the chatbot knowledge base."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={isDeletingKnowledge} />}>
              Cancel
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeletingKnowledge}
              onClick={handleDelete}
            >
              {isDeletingKnowledge ? (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <TrashIcon className="mr-2 h-4 w-4" />
              )}
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
