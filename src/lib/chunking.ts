export function chunkText(text: string, maxChunkSize: number = 1000, overlap: number = 200): string[] {
  // Very simplistic chunking strategy: split by paragraphs, then combine up to maxChunkSize
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  
  let currentChunk = "";

  for (const p of paragraphs) {
    const cleaned = p.trim();
    if (!cleaned) continue;

    if (currentChunk.length + cleaned.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      // Start new chunk with overlap (taking last `overlap` characters from previous chunk)
      // This is a naive overlap, but it works for a simple V1
      currentChunk = currentChunk.slice(-overlap) + " " + cleaned;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + cleaned;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // If we ended up with chunks that are still ridiculously large (no paragraph breaks),
  // we could split them by character, but for now this is okay.
  return chunks;
}
