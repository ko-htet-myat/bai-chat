import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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

    const conversationId = req.nextUrl.searchParams.get("conversationId");
    const sessionId = req.nextUrl.searchParams.get("sessionId");

    if (!conversationId && !sessionId) {
      return NextResponse.json(
        { conversation: null },
        { headers: getWidgetCorsHeaders(req.headers.get("origin")) }
      );
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        chatbotId: chatbot.id,
        ...(conversationId ? { id: conversationId } : {}),
        ...(sessionId ? { sessionId } : {}),
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(
      {
        conversation: conversation
          ? {
              id: conversation.id,
              messages: conversation.messages.map((message) => ({
                id: message.id,
                role: message.role,
                text: message.content,
              })),
              sessionId: conversation.sessionId,
              title: conversation.title,
            }
          : null,
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

export async function DELETE(
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

    const sessionId = req.nextUrl.searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { headers: getWidgetCorsHeaders(req.headers.get("origin")), status: 400 }
      );
    }

    const result = await prisma.conversation.deleteMany({
      where: {
        chatbotId: chatbot.id,
        sessionId,
      },
    });

    return NextResponse.json(
      {
        deletedCount: result.count,
        success: true,
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
