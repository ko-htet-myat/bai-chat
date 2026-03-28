import { embed } from "ai";
import { google } from "@ai-sdk/google";
import { prisma } from "./db";

type KnowledgeSearchResult = {
  content: string;
  similarity: number | null;
};

export async function searchKnowledge(chatbotId: string, query: string, limit = 5) {
  const { embedding } = await embed({
    // Query embeddings must use the same model family as stored document embeddings.
    model: google.textEmbeddingModel("gemini-embedding-001"),
    value: query,
  });

  const vectorStr = `[${embedding.join(",")}]`;

  const results = await prisma.$queryRaw<KnowledgeSearchResult[]>`
    SELECT 
      content,
      1 - (embedding <=> ${vectorStr}::vector) as similarity
    FROM "knowledge_chunk"
    WHERE "knowledgeBaseId" IN (
      SELECT id
      FROM "knowledge_base"
      WHERE "chatbotId" = ${chatbotId}
        AND status = 'ready'
    )
    ORDER BY similarity DESC
    LIMIT ${limit}
  `;

  return results.filter(
    (result) => typeof result.similarity === "number" && result.similarity > 0.15
  );
}
