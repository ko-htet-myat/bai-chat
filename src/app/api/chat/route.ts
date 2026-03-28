import { openRouter } from "@/lib/ai";
import { streamText, UIMessage, convertToModelMessages } from "ai";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openRouter("nvidia/nemotron-3-super-120b-a12b:free"),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
