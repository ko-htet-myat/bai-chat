import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/chatbots - List all chatbots for the active organization
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Default to the first organization if none is explicitly active
    // In a fully multi-tenant app, the active org is parsed from cookies/scopes
    const orgs = await prisma.organizationMember.findMany({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    if (orgs.length === 0) {
      return NextResponse.json({ chatbots: [] });
    }

    const orgIds = orgs.map((o) => o.organizationId);

    const chatbots = await prisma.chatbot.findMany({
      where: { organizationId: { in: orgIds } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ chatbots });
  } catch (error) {
    console.error("[CHATBOTS_GET]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/chatbots - Create a new chatbot
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, systemPrompt, modelId, primaryColor, welcomeMessage } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Assign to the user's first organization for now
    const orgMember = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
    });

    if (!orgMember) {
      return NextResponse.json(
        { error: "You must belong to an organization" },
        { status: 400 }
      );
    }

    const chatbot = await prisma.chatbot.create({
      data: {
        name,
        description,
        systemPrompt,
        modelId: modelId || "meta-llama/llama-3.3-70b-instruct:free",
        primaryColor,
        welcomeMessage,
        organizationId: orgMember.organizationId,
      },
    });

    return NextResponse.json({ chatbot }, { status: 201 });
  } catch (error) {
    console.error("[CHATBOTS_POST]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
