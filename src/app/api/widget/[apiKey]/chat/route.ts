import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { openRouter } from "@/lib/ai";
import { prisma } from "@/lib/db";
import { searchKnowledge } from "@/lib/rag";
import { getPublicChatbotByApiKey, getWidgetCorsHeaders } from "@/lib/widget";

function buildSystemPrompt(chatbot: {
  name: string;
  systemPrompt: string | null;
}, contextText: string) {
  const hasKnowledgeContext = contextText.trim().length > 0;

  return [
    `You are an AI assistant for "${chatbot.name}".`,
    chatbot.systemPrompt?.trim(),
    hasKnowledgeContext
      ? [
          "Use the knowledge base context below as your primary source of truth.",
          "If the answer is not supported by the provided context, say you do not know based on the knowledge base instead of inventing facts.",
          "If the provided context includes image URLs and the user asks for images, photos, logos, product pictures, screenshots, or visuals, include the most relevant image using markdown image syntax like `![short alt text](https://example.com/image.jpg)` and also include the direct link.",
          "If the context contains a `Related images:` section, treat those URLs as available images. Do not say an image is unavailable when a relevant image URL is present in the context.",
          "",
          "[KNOWLEDGE BASE CONTEXT]",
          contextText,
          "[END KNOWLEDGE BASE CONTEXT]",
        ].join("\n")
      : "No relevant knowledge base context was found for this question. Be transparent about that and avoid claiming the knowledge base contains information it does not.",
  ].filter(Boolean).join("\n\n");
}

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
    const prompt = buildSystemPrompt(chatbot, contextText);
    const historyText = recentMessages
      .map((entry) => `${entry.role === "assistant" ? "Assistant" : "User"}: ${entry.content}`)
      .join("\n");

    const result = await generateText({
      model: openRouter(chatbot.modelId || "meta-llama/llama-3.3-70b-instruct:free"),
      prompt: `${historyText}\nAssistant:`,
      system: prompt,
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
