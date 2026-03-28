import { prisma } from "@/lib/db";

export type PublicChatbotConfig = {
  apiKey: string;
  id: string;
  isActive: boolean;
  modelId: string;
  name: string;
  primaryColor: string | null;
  systemPrompt: string | null;
  welcomeMessage: string | null;
};

function getAllowedOrigins() {
  const raw = process.env.WIDGET_ALLOWED_ORIGINS?.trim();
  if (!raw || raw === "*") return "*";

  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getWidgetCorsHeaders(origin: string | null) {
  const allowedOrigins = getAllowedOrigins();

  if (allowedOrigins === "*") {
    return {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Origin": origin || "*",
      Vary: "Origin",
    };
  }

  if (origin && allowedOrigins.includes(origin)) {
    return {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Origin": origin,
      Vary: "Origin",
    };
  }

  return {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin",
  };
}

export async function getPublicChatbotByApiKey(apiKey: string) {
  return prisma.chatbot.findUnique({
    where: { apiKey },
    select: {
      apiKey: true,
      id: true,
      isActive: true,
      modelId: true,
      name: true,
      organizationId: true,
      primaryColor: true,
      systemPrompt: true,
      welcomeMessage: true,
    },
  });
}
