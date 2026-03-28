"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type CopyButtonProps = {
  className?: string;
  text: string;
};

export default function CopyButton({ className, text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.error("Failed to copy text", error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted",
        className
      )}
    >
      {copied ? <CheckIcon className="size-4 text-emerald-600" /> : <CopyIcon className="size-4" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
