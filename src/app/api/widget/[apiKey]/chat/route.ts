import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { openRouter } from "@/lib/ai";
import { prisma } from "@/lib/db";
import { searchKnowledge } from "@/lib/rag";
import { getPublicChatbotByApiKey, getWidgetCorsHeaders } from "@/lib/widget";
import {
  buildChatbotSystemPrompt,
  generateSuggestedQuestions,
} from "@/lib/chatbot-response";

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    headers: getWidgetCorsHeaders(req.headers.get("origin")),
    status: 204,
  });
}

export async function POST(
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

    if (!chatbot.isActive) {
      return NextResponse.json(
        { error: "This chatbot is inactive." },
        { headers: getWidgetCorsHeaders(req.headers.get("origin")), status: 403 }
      );
    }

    const body = (await req.json()) as {
      conversationId?: string;
      message?: string;
      sessionId?: string;
    };

    const message = body.message?.trim();
    const sessionId = body.sessionId?.trim();

    if (!message || !sessionId) {
      return NextResponse.json(
        { error: "Both message and sessionId are required." },
        { headers: getWidgetCorsHeaders(req.headers.get("origin")), status: 400 }
      );
    }

    const existingConversation = body.conversationId
      ? await prisma.conversation.findFirst({
          where: {
            chatbotId: chatbot.id,
            id: body.conversationId,
            sessionId,
          },
        })
      : await prisma.conversation.findFirst({
          where: {
            chatbotId: chatbot.id,
            sessionId,
          },
          orderBy: { updatedAt: "desc" },
        });

    const conversation = existingConversation ?? await prisma.conversation.create({
      data: {
        chatbotId: chatbot.id,
        sessionId,
        title: message.slice(0, 80),
      },
    });

    await prisma.message.create({
      data: {
        content: message,
        conversationId: conversation.id,
        role: "user",
      },
    });

    const recentMessages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 12,
    });

    const contextResults = await searchKnowledge(chatbot.id, message);
    const contextText = contextResults.map((entry) => entry.content).join("\n\n---\n\n");
    const prompt = buildChatbotSystemPrompt(chatbot, contextText);
    const historyText = recentMessages
      .map((entry) => `${entry.role === "assistant" ? "Assistant" : "User"}: ${entry.content}`)
      .join("\n");
    const model = openRouter(chatbot.modelId || "meta-llama/llama-3.3-70b-instruct:free");

    const result = await generateText({
      model,
      prompt: `${historyText}\nAssistant:`,
      system: prompt,
    });
    const suggestedQuestions = await generateSuggestedQuestions({
      model,
      chatbot,
      conversationContext: historyText,
      userQuestion: message,
      assistantAnswer: result.text,
    });

    const assistantMessage = await prisma.message.create({
      data: {
        content: result.text,
        conversationId: conversation.id,
        role: "assistant",
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        title: conversation.title || message.slice(0, 80),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        conversationId: conversation.id,
        message: {
          id: assistantMessage.id,
          role: "assistant",
          text: assistantMessage.content,
          suggestedQuestions,
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
