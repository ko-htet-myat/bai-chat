import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getChatbotStarterQuestions } from "@/lib/chatbot-analytics";
import { prisma } from "@/lib/db";

// GET /api/chatbots/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const chatbot = await prisma.chatbot.findUnique({
      where: { id },
      include: {
        knowledgeBases: true,
      },
    });

    if (!chatbot) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    // Verify org membership
    const orgMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: chatbot.organizationId,
        },
      },
    });

    if (!orgMembership) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const starterQuestions = await getChatbotStarterQuestions(chatbot.id);

    return NextResponse.json({
      chatbot: {
        ...chatbot,
        starterQuestions,
      },
    });
  } catch (error) {
    console.error(`[CHATBOTS_GET]`, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PUT /api/chatbots/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const existingChatbot = await prisma.chatbot.findUnique({
      where: { id },
    });

    if (!existingChatbot) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    // Verify org membership
    const orgMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: existingChatbot.organizationId,
        },
      },
    });

    if (!orgMembership) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updatedChatbot = await prisma.chatbot.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        systemPrompt: body.systemPrompt,
        modelId: body.modelId,
        primaryColor: body.primaryColor,
        welcomeMessage: body.welcomeMessage,
        isActive: body.isActive,
      },
    });

    return NextResponse.json({ chatbot: updatedChatbot });
  } catch (error) {
    console.error(`[CHATBOTS_PUT]`, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE /api/chatbots/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existingChatbot = await prisma.chatbot.findUnique({
      where: { id },
    });

    if (!existingChatbot) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    // Verify org membership
    const orgMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: existingChatbot.organizationId,
        },
      },
    });

    if (!orgMembership) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.chatbot.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[CHATBOTS_DELETE]`, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
