import {
  BotIcon,
  LayoutDashboardIcon,
  PlusCircleIcon,
  MessageSquareIcon,
  BarChart3Icon,
} from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-6">
        <SidebarTrigger className="-ml-1" />
        <div className="w-px h-4 bg-border mx-2" />
        <LayoutDashboardIcon className="w-5 h-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Dashboard</h1>
      </header>

      {/* Content */}
      <div className="flex-1 p-6 space-y-6">
        {/* Welcome section */}
        <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-card to-card p-8">
          <h2 className="text-2xl font-bold tracking-tight mb-2">
            Welcome to BAI Chat 👋
          </h2>
          <p className="text-muted-foreground max-w-lg">
            Build, train, and deploy AI chatbots for your business. Start by
            creating your first chatbot below.
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-card p-6 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BotIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Chatbots</span>
            </div>
            <p className="text-3xl font-bold">0</p>
            <p className="text-xs text-muted-foreground">No chatbots yet</p>
          </div>

          <div className="rounded-xl border bg-card p-6 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageSquareIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Conversations</span>
            </div>
            <p className="text-3xl font-bold">0</p>
            <p className="text-xs text-muted-foreground">Across all bots</p>
          </div>

          <div className="rounded-xl border bg-card p-6 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BarChart3Icon className="w-4 h-4" />
              <span className="text-sm font-medium">Messages</span>
            </div>
            <p className="text-3xl font-bold">0</p>
            <p className="text-xs text-muted-foreground">Total messages</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href="/dashboard/chatbots/new"
              className="flex items-center gap-4 rounded-xl border bg-muted/30 p-4 hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <PlusCircleIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Create Chatbot</p>
                <p className="text-sm text-muted-foreground">
                  Set up a new AI chatbot
                </p>
              </div>
            </a>

            <a
              href="/dashboard/chatbots"
              className="flex items-center gap-4 rounded-xl border bg-muted/30 p-4 hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <BotIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">View Chatbots</p>
                <p className="text-sm text-muted-foreground">
                  Manage your existing bots
                </p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
