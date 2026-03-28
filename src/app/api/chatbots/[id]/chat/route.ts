import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { convertToModelMessages, streamText, UIMessage } from "ai";
import { openRouter } from "@/lib/ai";
import { searchKnowledge } from "@/lib/rag";

export const maxDuration = 30;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: chatbotId } = await params;
    const body = await req.json();
    const messages = (body.messages ?? []) as UIMessage[];

    if (messages.length === 0) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    // 1. Fetch chatbot info
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
    });

    if (!chatbot) return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    if (!chatbot.isActive) {
      return NextResponse.json(
        { error: "This chatbot is inactive. Enable it in settings to continue chatting." },
        { status: 403 }
      );
    }

    // 2. Perform RAG (Retrieval Augmented Generation) 
    const lastUserMessage = messages[messages.length - 1];
    let query = "";

    if (lastUserMessage?.parts) {
      query = lastUserMessage.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("");
    }

    if (!query.trim()) {
      return NextResponse.json({ error: "Empty query" }, { status: 400 });
    }

    const contextResults = await searchKnowledge(chatbotId, query);
    const contextText = contextResults.map((c) => c.content).join("\n\n---\n\n");
    const hasKnowledgeContext = contextText.trim().length > 0;

    // 3. Build system prompt
    const systemSections = [
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
    ].filter(Boolean);

    // 5. Stream response using OpenRouter
    const result = streamText({
      model: openRouter(chatbot.modelId || "meta-llama/llama-3.3-70b-instruct:free"),
      system: systemSections.join("\n\n"),
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    console.error("[CHAT_ERROR]", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
