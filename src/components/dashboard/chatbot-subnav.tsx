"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3Icon,
  DatabaseIcon,
  GlobeIcon,
  MessageSquareIcon,
  Settings2Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ChatbotSubnavProps = {
  chatbotId: string;
};

const navItems = [
  {
    href: (chatbotId: string) => `/dashboard/chatbots/${chatbotId}/settings`,
    icon: Settings2Icon,
    label: "Settings",
    match: (pathname: string, chatbotId: string) =>
      pathname === `/dashboard/chatbots/${chatbotId}` ||
      pathname === `/dashboard/chatbots/${chatbotId}/settings`,
  },
  {
    href: (chatbotId: string) => `/dashboard/chatbots/${chatbotId}/knowledge`,
    icon: DatabaseIcon,
    label: "Knowledge Base",
    match: (pathname: string, chatbotId: string) =>
      pathname === `/dashboard/chatbots/${chatbotId}/knowledge`,
  },
  {
    href: (chatbotId: string) => `/dashboard/chatbots/${chatbotId}/analytics`,
    icon: BarChart3Icon,
    label: "Analytics",
    match: (pathname: string, chatbotId: string) =>
      pathname === `/dashboard/chatbots/${chatbotId}/analytics`,
  },
  {
    href: (chatbotId: string) => `/dashboard/chatbots/${chatbotId}/preview`,
    icon: MessageSquareIcon,
    label: "Test Chat",
    match: (pathname: string, chatbotId: string) =>
      pathname === `/dashboard/chatbots/${chatbotId}/preview`,
  },
  {
    href: (chatbotId: string) => `/dashboard/chatbots/${chatbotId}/integration`,
    icon: GlobeIcon,
    label: "Integration",
    match: (pathname: string, chatbotId: string) =>
      pathname === `/dashboard/chatbots/${chatbotId}/integration`,
  },
];

export default function ChatbotSubnav({ chatbotId }: ChatbotSubnavProps) {
  const pathname = usePathname();

  return (
    <>
      {navItems.map((item) => {
        const isActive = item.match(pathname, chatbotId);
        const Icon = item.icon;

        return (
          <Link
            key={item.label}
            href={item.href(chatbotId)}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground hover:font-semibold"
            )}
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
