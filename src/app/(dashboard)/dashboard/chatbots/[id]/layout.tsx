import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import Link from "next/link";
import { BotIcon, ChevronLeftIcon, GlobeIcon, DatabaseIcon, Settings2Icon, MessageSquareIcon } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default async function ChatbotLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return null; // Let middleware handle redirect
  }

  const { id } = await params;

  const chatbot = await prisma.chatbot.findUnique({
    where: { id },
  });

  if (!chatbot) {
    notFound();
  }

  // Quick membership check
  const member = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId: chatbot.organizationId,
      },
    },
  });

  if (!member) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Detail Header */}
      <header className="flex h-14 shrink-0 items-center border-b px-6 bg-muted/20">
        <div className="flex items-center gap-4 text-sm font-medium">
          <SidebarTrigger className="-ml-1" />
          <div className="w-px h-4 bg-border" />
          <Link
            href="/dashboard/chatbots"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Back to Chatbots
          </Link>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2 text-foreground">
            <div 
              className="w-5 h-5 rounded flex items-center justify-center text-white"
              style={{ backgroundColor: chatbot.primaryColor || "#0ea5e9" }}
            >
              <BotIcon className="w-3 h-3" />
            </div>
            {chatbot.name}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sub-navigation Sidebar */}
        <div className="w-56 border-r bg-muted/10 p-4 shrink-0 flex flex-col gap-1">
          <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-2">
            Configure {chatbot.name}
          </h3>
          <Link
            href={`/dashboard/chatbots/${id}`}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground hover:font-semibold"
          >
            <Settings2Icon className="w-4 h-4" />
            Settings
          </Link>
          
          <Link
            href={`/dashboard/chatbots/${id}/knowledge`}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground hover:font-semibold"
          >
            <DatabaseIcon className="w-4 h-4" />
            Knowledge Base
          </Link>
          
          <Link
            href={`/dashboard/chatbots/${id}/preview`}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground hover:font-semibold"
          >
            <MessageSquareIcon className="w-4 h-4" />
            Test Chat
          </Link>

          <Link
            href={`/dashboard/chatbots/${id}/integration`}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground hover:font-semibold"
          >
            <GlobeIcon className="w-4 h-4" />
            Integration
          </Link>
        </div>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
