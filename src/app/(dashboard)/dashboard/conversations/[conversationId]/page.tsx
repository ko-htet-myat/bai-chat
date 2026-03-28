import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ChevronLeftIcon } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MessageResponse } from "@/components/ai-elements/message";
import { cn } from "@/lib/utils";

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return null;
  }

  const { conversationId } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      chatbot: true,
      messages: {
        orderBy: { createdAt: "asc" },
      },
      user: true,
    },
  });

  if (!conversation) {
    notFound();
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        organizationId: conversation.chatbot.organizationId,
        userId: session.user.id,
      },
    },
  });

  if (!membership) {
    notFound();
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/dashboard/conversations"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeftIcon className="size-4" />
            Back to conversations
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {conversation.title || "Untitled conversation"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {conversation.chatbot.name} •{" "}
              {conversation.user?.email ||
                conversation.user?.name ||
                conversation.sessionId ||
                "Anonymous session"}
            </p>
          </div>
        </div>

        <div className="text-right text-sm text-muted-foreground">
          <p>Created {conversation.createdAt.toLocaleString()}</p>
          <p>Updated {conversation.updatedAt.toLocaleString()}</p>
        </div>
      </div>

      <div className="space-y-4 rounded-3xl border bg-muted/10 p-4 sm:p-6">
        {conversation.messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-3xl rounded-[1.6rem] px-4 py-3 text-sm shadow-sm",
                message.role === "user"
                  ? "text-white"
                  : "border border-border/60 bg-background"
              )}
              style={
                message.role === "user"
                  ? { backgroundColor: conversation.chatbot.primaryColor || "#0ea5e9" }
                  : undefined
              }
            >
              <MessageResponse>{message.content}</MessageResponse>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
