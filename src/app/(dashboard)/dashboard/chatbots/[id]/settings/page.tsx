import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import ChatbotSettingsForm from "@/components/dashboard/chatbot-settings-form";

export const metadata = {
  title: "Chatbot Settings — BAI Chat",
};

export default async function ChatbotSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return null;
  }

  const { id } = await params;

  const chatbot = await prisma.chatbot.findUnique({
    where: { id },
  });

  if (!chatbot) {
    notFound();
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your chatbot's core functionality and AI personality.
        </p>
      </div>

      <ChatbotSettingsForm chatbot={chatbot} />
    </div>
  );
}
