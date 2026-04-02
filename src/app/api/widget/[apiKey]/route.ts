import { NextRequest, NextResponse } from "next/server";
import { getChatbotStarterQuestions } from "@/lib/chatbot-analytics";
import { getPublicChatbotByApiKey, getWidgetCorsHeaders } from "@/lib/widget";

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    headers: getWidgetCorsHeaders(req.headers.get("origin")),
    status: 204,
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ apiKey: string }> }
) {
  try {
    const { apiKey } = await params;
    const chatbot = await getPublicChatbotByApiKey(apiKey);

    if (!chatbot) {
      return NextResponse.json(
        { error: "Chatbot not found" },
        { headers: getWidgetCorsHeaders(req.headers.get("origin")), status: 404 }
      );
    }

    const starterQuestions = await getChatbotStarterQuestions(chatbot.id);

    return NextResponse.json(
      {
        chatbot: {
          apiKey: chatbot.apiKey,
          id: chatbot.id,
          isActive: chatbot.isActive,
          name: chatbot.name,
          primaryColor: chatbot.primaryColor,
          starterQuestions,
          welcomeMessage: chatbot.welcomeMessage,
        },
      },
      {
        headers: getWidgetCorsHeaders(req.headers.get("origin")),
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: message },
      { headers: getWidgetCorsHeaders(req.headers.get("origin")), status: 500 }
    );
  }
}
