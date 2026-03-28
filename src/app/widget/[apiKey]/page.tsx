import { notFound } from "next/navigation";
import WidgetFrame from "@/components/widget/widget-frame";
import { getPublicChatbotByApiKey } from "@/lib/widget";

export default async function PublicWidgetPage({
  params,
}: {
  params: Promise<{ apiKey: string }>;
}) {
  const { apiKey } = await params;
  const chatbot = await getPublicChatbotByApiKey(apiKey);

  if (!chatbot) {
    notFound();
  }

  return (
    <WidgetFrame
      apiKey={chatbot.apiKey}
      chatbotName={chatbot.name}
      initialPrimaryColor={chatbot.primaryColor || "#0ea5e9"}
      initialWelcomeMessage={chatbot.welcomeMessage || "Hi! How can I help you today?"}
    />
  );
}
