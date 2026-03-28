import Link from "next/link";
import { headers } from "next/headers";
import { MessageSquareIcon, UserIcon } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function ConversationsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return null;
  }

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    select: { organizationId: true },
  });

  const organizationIds = memberships.map((membership) => membership.organizationId);

  const conversations = await prisma.conversation.findMany({
    where: {
      chatbot: {
        organizationId: {
          in: organizationIds,
        },
      },
    },
    include: {
      _count: {
        select: { messages: true },
      },
      chatbot: {
        select: {
          id: true,
          name: true,
          primaryColor: true,
        },
      },
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Conversations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review stored chat sessions from your dashboard and embedded widgets.
        </p>
      </div>

      {conversations.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed text-muted-foreground">
          <MessageSquareIcon className="mb-3 size-8 opacity-30" />
          <p>No conversations yet.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {conversations.map((conversation) => (
            <Link
              key={conversation.id}
              href={`/dashboard/conversations/${conversation.id}`}
              className="rounded-2xl border bg-card p-5 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-2">
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex size-10 items-center justify-center rounded-2xl text-white"
                      style={{ backgroundColor: conversation.chatbot.primaryColor || "#0ea5e9" }}
                    >
                      <MessageSquareIcon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {conversation.title || "Untitled conversation"}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {conversation.chatbot.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span>{conversation._count.messages} messages</span>
                    <span>Updated {conversation.updatedAt.toLocaleString()}</span>
                    <span className="inline-flex items-center gap-1">
                      <UserIcon className="size-3.5" />
                      {conversation.user?.email ||
                        conversation.user?.name ||
                        conversation.sessionId ||
                        "Anonymous session"}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
