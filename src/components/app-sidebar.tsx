"use client";

import * as React from "react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  BotIcon,
  LayoutDashboardIcon,
  MessageSquareIcon,
  Settings2Icon,
  BookOpenIcon,
  BarChart3Icon,
} from "lucide-react";

const navItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: <LayoutDashboardIcon />,
  },
  {
    title: "Chatbots",
    url: "/dashboard/chatbots",
    icon: <BotIcon />,
    isActive: true,
    items: [
      { title: "All Chatbots", url: "/dashboard/chatbots" },
      { title: "Create New", url: "/dashboard/chatbots/new" },
    ],
  },
  {
    title: "Conversations",
    url: "/dashboard/conversations",
    icon: <MessageSquareIcon />,
  },
  {
    title: "Knowledge Base",
    url: "/dashboard/knowledge",
    icon: <BookOpenIcon />,
  },
  {
    title: "Analytics",
    url: "/dashboard/analytics",
    icon: <BarChart3Icon />,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: <Settings2Icon />,
  },
];

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<a href="/dashboard" />}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <BotIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">BAI Chat</span>
                <span className="truncate text-xs text-muted-foreground">
                  AI Chatbot Platform
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: user.name,
            email: user.email,
            avatar: user.image || "",
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
