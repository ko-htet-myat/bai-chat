import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createClient } from "@supabase/supabase-js";
import { embedMany } from "ai";
import { google } from "@ai-sdk/google";
import { chunkText } from "@/lib/chunking";
import { extractTextFromPDF } from "@/lib/pdf-parser";
import { crawlWebsite } from "@/lib/web-crawler";

// Configure Supabase Client for Storage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// GET /api/chatbots/[id]/knowledge
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const knowledgeBases = await prisma.knowledgeBase.findMany({
      where: { chatbotId: id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ knowledgeBases });
  } catch {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// POST /api/chatbots/[id]/knowledge
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const formData = await req.formData();
    const type = formData.get("type") as string;
    const name = formData.get("name") as string;
    const maxPagesValue = Number(formData.get("maxPages") || 10);
    const selectedPagesRaw = formData.get("selectedPages");
    
    let rawText = "";
    let fileUrl = "";
    let storedContent: string | null = null;

    if (type === "text") {
      rawText = formData.get("content") as string;
      storedContent = rawText;
    } else if (type === "pdf") {
      const file = formData.get("file") as File;
      if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

      // Upload to Supabase Storage
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      
      const { error } = await supabase.storage
        .from("knowledge_bases")
        .upload(`${id}/${fileName}`, fileBuffer, {
          contentType: file.type || "application/pdf",
          upsert: false,
        });

      if (error) {
        console.error("Supabase Upload Error:", error);
        return NextResponse.json({ error: "Failed to upload file to storage." }, { status: 500 });
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("knowledge_bases")
        .getPublicUrl(`${id}/${fileName}`);
      fileUrl = publicUrlData.publicUrl;

      // Extract text from PDF using pdfreader (Stable, No Workers)
      try {
        rawText = await extractTextFromPDF(fileBuffer);
      } catch (parseErr) {
        console.error("PDF Parsing Error:", parseErr);
        return NextResponse.json({ error: "Failed to parse PDF text content" }, { status: 500 });
      }

    } else if (type === "url") {
      const url = formData.get("content") as string;
      try {
        const crawlResult = await crawlWebsite(url, { maxPages: 1 });
        const page = crawlResult.pages[0];

        if (!page) {
          return NextResponse.json({ error: "No text could be extracted from this URL" }, { status: 400 });
        }

        rawText = `Page: ${page.title}\nURL: ${page.url}\n\n${page.text}`;
        fileUrl = url;
        storedContent = url;
      } catch {
        return NextResponse.json({ error: "Failed to scrape URL" }, { status: 500 });
      }
    } else if (type === "web_crawler") {
      const url = formData.get("content") as string;
      const maxPages = Number.isFinite(maxPagesValue) ? maxPagesValue : 10;
      const selectedPages = typeof selectedPagesRaw === "string"
        ? (JSON.parse(selectedPagesRaw) as string[])
        : [];

      try {
        const crawlResult = await crawlWebsite(url, { maxPages });
        const filteredPages =
          selectedPages.length > 0
            ? crawlResult.pages.filter((page) => selectedPages.includes(page.url))
            : crawlResult.pages;

        rawText = filteredPages
          .map((page) => `Page: ${page.title}\nURL: ${page.url}\n\n${page.text}`)
          .join("\n\n---\n\n");
        fileUrl = url;
        storedContent = JSON.stringify({
          maxPages: Math.max(1, Math.min(maxPages, 25)),
          pages: filteredPages.map((page) => page.url),
          startUrl: url,
        });
      } catch (e) {
        console.error("Crawler Error:", e);
        return NextResponse.json({ error: "Failed to crawl website" }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    if (!rawText || !rawText.trim()) {
      return NextResponse.json({ error: "No text could be extracted" }, { status: 400 });
    }

    // 1. Create KnowledgeBase record
    const kb = await prisma.knowledgeBase.create({
      data: {
        name,
        type,
        content: storedContent,
        fileUrl: type !== "text" ? fileUrl : null,
        status: "processing",
        chatbotId: id,
      },
    });

    // 2. Process chunks and embeddings
    const chunks = chunkText(rawText);
    
    if (chunks.length > 0) {
      try {
        // Use Google Gemini-Embedding-001 (3072 Dimensions)
        const { embeddings } = await embedMany({
          model: google.textEmbeddingModel("gemini-embedding-001"),
          values: chunks,
        });

        for (let i = 0; i < chunks.length; i++) {
          const content = chunks[i];
          const embeddingArray = embeddings[i];
          const vectorStr = `[${embeddingArray.join(",")}]`;

          // Using PostgreSQL cast to ::vector
          await prisma.$executeRaw`
            INSERT INTO "knowledge_chunk" ("id", "content", "embedding", "knowledgeBaseId", "createdAt")
            VALUES (gen_random_uuid()::text, ${content}, ${vectorStr}::vector, ${kb.id}, NOW())
          `;
        }
        
        await prisma.knowledgeBase.update({
          where: { id: kb.id },
          data: { status: "ready" },
        });

      } catch (embedError: unknown) {
        console.error("Embedding Error:", embedError);
        await prisma.knowledgeBase.update({
          where: { id: kb.id },
          data: { status: "error" },
        });
        const message =
          embedError instanceof Error ? embedError.message : "Unknown embedding error";
        return NextResponse.json({ error: `Failed to generate embeddings: ${message}` }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, kb });
  } catch (error: unknown) {
    console.error("[KNOWLEDGE_POST]", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
