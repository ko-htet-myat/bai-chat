import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { crawlWebsite } from "@/lib/web-crawler";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await params;
    const body = (await req.json()) as {
      maxPages?: number;
      url?: string;
    };

    if (!body.url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const result = await crawlWebsite(body.url, {
      maxPages: body.maxPages,
    });

    return NextResponse.json({
      pages: result.pages.map((page) => ({
        title: page.title,
        url: page.url,
      })),
    });
  } catch (error: unknown) {
    console.error("[KNOWLEDGE_CRAWL_PREVIEW]", error);
    const message = error instanceof Error ? error.message : "Failed to discover pages";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
