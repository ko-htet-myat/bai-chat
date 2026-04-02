import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
} from "ai";
import { openRouter } from "@/lib/ai";
import { searchKnowledge } from "@/lib/rag";
import {
  buildChatbotSystemPrompt,
  ChatbotUIMessage,
  generateSuggestedQuestions,
} from "@/lib/chatbot-response";

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
    const messages = (body.messages ?? []) as ChatbotUIMessage[];

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
    const model = openRouter(chatbot.modelId || "meta-llama/llama-3.3-70b-instruct:free");
    const conversationContext = messages
      .slice(-6)
      .map((message) => {
        const text = message.parts
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("");

        return `${message.role === "assistant" ? "Assistant" : "User"}: ${text}`;
      })
      .join("\n");

    const stream = createUIMessageStream<ChatbotUIMessage>({
      originalMessages: messages,
      execute: async ({ writer }) => {
        const result = streamText({
          model,
          system: buildChatbotSystemPrompt(chatbot, contextText),
          messages: await convertToModelMessages(messages),
          onFinish: async ({ text }) => {
            const questions = await generateSuggestedQuestions({
              model,
              chatbot,
              conversationContext,
              userQuestion: query,
              assistantAnswer: text,
            });

            writer.write({
              type: "data-suggestedQuestions",
              data: { questions },
            });
          },
        });

        writer.merge(result.toUIMessageStream());
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error: unknown) {
    console.error("[CHAT_ERROR]", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
