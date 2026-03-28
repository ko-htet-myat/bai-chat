import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BotIcon, PlusIcon, SettingsIcon, CodeIcon } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";

export const metadata = {
  title: "Chatbots — BAI Chat",
};

export default async function ChatbotsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/sign-in");
  }

  // Get user orgs
  const orgs = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    select: { organizationId: true },
  });

  const orgIds = orgs.map((o) => o.organizationId);

  // Get chatbots
  const chatbots = await prisma.chatbot.findMany({
    where: { organizationId: { in: orgIds } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { conversations: true },
      },
    },
  });

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-6">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <div className="w-px h-4 bg-border mx-1" />
          <BotIcon className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Chatbots</h1>
        </div>
        <Link
          href="/dashboard/chatbots/new"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 gap-2"
        >
          <PlusIcon className="w-4 h-4" />
          Create Chatbot
        </Link>
      </header>

      {/* Content */}
      <div className="flex-1 p-6">
        {chatbots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <BotIcon className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold">No chatbots yet</h2>
              <p className="text-muted-foreground max-w-sm">
                Get started by creating your first AI chatbot. You can connect it to your own knowledge base and embed it on your website.
              </p>
            </div>
            <Link
              href="/dashboard/chatbots/new"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-8 py-2 gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              Create your first chatbot
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {chatbots.map((bot) => (
              <div
                key={bot.id}
                className="group relative flex flex-col justify-between rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md"
              >
                <div className="space-y-3 pb-6 border-b">
                  <div className="flex items-center justify-between">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: bot.primaryColor || "#0ea5e9" }}
                    >
                      <BotIcon className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        {bot.isActive && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        )}
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${bot.isActive ? "bg-emerald-500" : "bg-neutral-300"}`}></span>
                      </span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg line-clamp-1">{bot.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {bot.description || "No description provided."}
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{bot._count.conversations}</span> chats
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/dashboard/chatbots/${bot.id}/integration`}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      title="Embed Code"
                    >
                      <CodeIcon className="w-4 h-4" />
                    </Link>
                    <Link
                      href={`/dashboard/chatbots/${bot.id}/settings`}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      title="Settings"
                    >
                      <SettingsIcon className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
                
                <Link href={`/dashboard/chatbots/${bot.id}`} className="absolute inset-0 z-0">
                  <span className="sr-only">View {bot.name}</span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
