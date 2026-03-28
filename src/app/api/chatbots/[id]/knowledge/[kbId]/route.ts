import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// DELETE /api/chatbots/[id]/knowledge/[kbId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; kbId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, kbId } = await params;

    const kb = await prisma.knowledgeBase.findUnique({
      where: { id: kbId },
      include: { chatbot: true },
    });

    if (!kb || kb.chatbotId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Verify org membership
    const member = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: kb.chatbot.organizationId,
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Delete from Supabase Storage if it's a file
    if (kb.type === "pdf" && kb.fileUrl) {
      // fileUrl is a public URL, we need the path.
      // E.g. https://.../storage/v1/object/public/knowledge_bases/chatxyz/123-file.pdf
      try {
        const urlParts = kb.fileUrl.split("/knowledge_bases/");
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from("knowledge_bases").remove([filePath]);
        }
      } catch (e) {
        console.error("Failed to delete file from storage", e);
      }
    }

    // 2. Delete KnowledgeChunk vector rows
    // They are natively cascade deleted usually if we set it up, but Prisma Unsupported "vector(1536)" means
    // Prisma *does* know about KnowledgeChunk. Wait, my schema has `KnowledgeChunk` and it has a relation to `KnowledgeBase`. Let's check schema!
    // I wrote: `knowledgeBaseId String` but didn't write `@relation` manually maybe?
    await prisma.$executeRaw`DELETE FROM "knowledge_chunk" WHERE "knowledgeBaseId" = ${kb.id}`;

    // 3. Delete KB
    await prisma.knowledgeBase.delete({
      where: { id: kb.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[KNOWLEDGE_DELETE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
