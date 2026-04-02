import { generateText, Output, UIMessage } from "ai";
import { z } from "zod";

type ChatbotPromptConfig = {
  name: string;
  systemPrompt: string | null;
};

type SuggestedQuestionsModel = Parameters<typeof generateText>[0]["model"];

const suggestedQuestionsSchema = z.object({
  questions: z.array(z.string().trim().min(1).max(120)).length(3),
});

const DEFAULT_STARTER_QUESTIONS = [
  "What can you help me with?",
  "How does this work?",
  "Can you help me get started?",
];

const STARTER_QUESTION_TEMPLATES: Array<{
  matches: string[];
  question: string;
}> = [
  { matches: ["refund"], question: "What's your refund policy?" },
  { matches: ["return"], question: "How do returns work?" },
  { matches: ["shipping", "delivery"], question: "How long does shipping take?" },
  { matches: ["pricing", "payment"], question: "How much does this cost?" },
  { matches: ["subscription"], question: "How do subscriptions work?" },
  { matches: ["tracking", "order"], question: "How can I track my order?" },
  { matches: ["exchange"], question: "Can I exchange an item?" },
  { matches: ["support"], question: "How can I contact support?" },
  { matches: ["warranty"], question: "What does the warranty cover?" },
  { matches: ["invoice"], question: "Can I get an invoice or receipt?" },
];

const KEYWORD_BLACKLIST = new Set([
  "according",
  "about",
  "after",
  "also",
  "assist",
  "assistance",
  "certainly",
  "because",
  "contacting",
  "details",
  "example",
  "explain",
  "hello",
  "helpful",
  "here",
  "information",
  "kind",
  "logical",
  "likely",
  "looking",
  "next",
  "please",
  "provide",
  "provided",
  "question",
  "questions",
  "regarding",
  "response",
  "review",
  "should",
  "software",
  "sure",
  "their",
  "there",
  "these",
  "thing",
  "those",
  "understand",
  "user",
  "what",
  "when",
  "where",
  "which",
  "work",
  "would",
]);

export type SuggestedQuestionsPayload = z.infer<typeof suggestedQuestionsSchema>;

export type ChatbotUIMessage = UIMessage<
  never,
  {
    suggestedQuestions: SuggestedQuestionsPayload;
  }
>;

export function buildChatbotSystemPrompt(
  chatbot: ChatbotPromptConfig,
  contextText: string
) {
  const hasKnowledgeContext = contextText.trim().length > 0;

  return [
    `You are an AI assistant for "${chatbot.name}".`,
    chatbot.systemPrompt?.trim(),
    "After answering, identify the 3 most helpful next questions the user is likely to ask. The application will request those separately as structured JSON, so keep your visible answer natural and do not print raw JSON.",
    hasKnowledgeContext
      ? [
          "Use the knowledge base context below as your primary source of truth.",
          "If the answer is not supported by the provided context, say you do not know based on the knowledge base instead of inventing facts.",
          "If the provided context includes image URLs and the user asks for images, photos, logos, product pictures, screenshots, or visuals, include the most relevant image using markdown image syntax like `![short alt text](https://example.com/image.jpg)` and also include the direct link.",
          "If the context contains a `Related images:` section, treat those URLs as available images. Do not say an image is unavailable when a relevant image URL is present in the context.",
          "",
          "[KNOWLEDGE BASE CONTEXT]",
          contextText,
          "[END KNOWLEDGE BASE CONTEXT]",
        ].join("\n")
      : "No relevant knowledge base context was found for this question. Be transparent about that and avoid claiming the knowledge base contains information it does not.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function extractQuotedQuestions(text: string) {
  return [...text.matchAll(/"([^"\n?]{4,}?\?)"/g)].map((match) => match[1].trim());
}

function normalizeWhitespace(value: string) {
  return value
    .replace(/\s+/g, " ")
    .trim();
}

function cleanAnswerWhitespace(value: string) {
  return value
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeSuggestedQuestions(
  questions: string[],
  fallbackQuestions: string[],
  relevanceKeywords: string[]
) {
  const cleaned = questions
    .map((question) => normalizeWhitespace(question))
    .filter(Boolean)
    .filter((question, index, all) => all.findIndex((item) => item.toLowerCase() === question.toLowerCase()) === index)
    .filter((question) => isRelevantFollowUpQuestion(question, relevanceKeywords))
    .slice(0, 3);

  if (cleaned.length === 3) {
    return cleaned;
  }

  return [
    ...cleaned,
    ...fallbackQuestions.filter(
      (question) =>
        !cleaned.some((existing) => existing.toLowerCase() === question.toLowerCase())
    ),
  ].slice(0, 3);
}

function parseQuestionArrayFromText(text: string) {
  const fencedBlockMatch = text.match(/```(?:json|javascript|js|txt)?\s*([\s\S]*?)```/i);
  const candidateBlocks = [fencedBlockMatch?.[1], text].filter(
    (value): value is string => Boolean(value)
  );

  for (const block of candidateBlocks) {
    const arrayMatch = block.match(/\[[\s\S]*\]/);

    if (!arrayMatch) {
      continue;
    }

    try {
      const parsed = JSON.parse(arrayMatch[0]);

      if (Array.isArray(parsed)) {
        const questions = parsed.filter(
          (item): item is string =>
            typeof item === "string" && item.trim().endsWith("?")
        );

        if (questions.length >= 3) {
          return questions.slice(0, 3);
        }
      }
    } catch {
      // Ignore invalid JSON-like arrays.
    }
  }

  return [];
}

export function extractEmbeddedSuggestedQuestions(text: string) {
  const parsedArrayQuestions = parseQuestionArrayFromText(text);

  if (parsedArrayQuestions.length >= 3) {
    return parsedArrayQuestions.slice(0, 3);
  }

  const quotedQuestions = extractQuotedQuestions(text)
    .filter((question, index, all) => all.findIndex((item) => item.toLowerCase() === question.toLowerCase()) === index)
    .slice(0, 3);

  return quotedQuestions;
}

export function stripSuggestedQuestionsFromAnswer(text: string) {
  const patterns = [
    /\n{0,2}the (?:three|3|next|most helpful next|next logical) .*?questions.*$/is,
    /\n{0,2}suggested questions?:.*$/is,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.index !== undefined) {
      return cleanAnswerWhitespace(text.slice(0, match.index));
    }
  }

  return cleanAnswerWhitespace(text);
}

function getFallbackQuestions() {
  return [
    "Can you show me the key details?",
    "What should I look at next?",
    "Do you have a quick example?",
  ];
}

export function getDefaultStarterQuestions() {
  return DEFAULT_STARTER_QUESTIONS;
}

export function buildStarterQuestionsFromTopicLabels(labels: string[]) {
  const questions = labels
    .map((label) => label.toLowerCase())
    .map((label) =>
      STARTER_QUESTION_TEMPLATES.find((template) =>
        template.matches.some((match) => label.includes(match))
      )?.question
    )
    .filter((question): question is string => Boolean(question))
    .filter(
      (question, index, all) =>
        all.findIndex((item) => item.toLowerCase() === question.toLowerCase()) === index
    )
    .slice(0, 3);

  if (questions.length === 3) {
    return questions;
  }

  return [
    ...questions,
    ...DEFAULT_STARTER_QUESTIONS.filter(
      (question) =>
        !questions.some((existing) => existing.toLowerCase() === question.toLowerCase())
    ),
  ].slice(0, 3);
}

function extractKeywords(value: string) {
  return normalizeWhitespace(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
  )
    .split(" ")
    .filter((token) => token.length >= 4)
    .filter(
      (token, index, all) =>
        all.indexOf(token) === index &&
        !KEYWORD_BLACKLIST.has(token)
    );
}

function extractFocusPhrase(text: string) {
  const keywords = extractKeywords(text);

  if (keywords.length >= 2) {
    return `${keywords[0]} ${keywords[1]}`;
  }

  return keywords[0] ?? "";
}

function getRelevanceKeywords(
  userQuestion: string,
  assistantAnswer: string,
  conversationContext?: string
) {
  const answerKeywords = extractKeywords(assistantAnswer);
  const userKeywords = extractKeywords(userQuestion);
  const contextKeywords = extractKeywords(conversationContext ?? "");

  return [...answerKeywords, ...contextKeywords, ...userKeywords].slice(0, 10);
}

function isRelevantFollowUpQuestion(question: string, relevanceKeywords: string[]) {
  const normalizedQuestion = question.toLowerCase();

  if (relevanceKeywords.length === 0) {
    return true;
  }

  return relevanceKeywords.some((keyword) => normalizedQuestion.includes(keyword));
}

function splitIntoSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => normalizeWhitespace(sentence))
    .filter((sentence) => sentence.length >= 12);
}

function extractCandidatePhrases(text: string) {
  const normalizedText = normalizeWhitespace(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
  );

  const words = normalizedText
    .split(" ")
    .filter((word) => word.length >= 4 && !KEYWORD_BLACKLIST.has(word));

  const phrases: string[] = [];

  for (let index = 0; index < words.length; index += 1) {
    const single = words[index];
    const pair = words.slice(index, index + 2).join(" ").trim();

    if (single) {
      phrases.push(single);
    }

    if (pair.split(" ").length === 2) {
      phrases.push(pair);
    }
  }

  return phrases.filter(
    (phrase, index, all) =>
      all.indexOf(phrase) === index && phrase.length >= 4
  );
}

function toQuestionLabel(phrase: string) {
  return phrase.replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildDynamicQuestionsFromPhrases(phrases: string[]) {
  const [primary, secondary, tertiary] = phrases;
  const questions: string[] = [];

  if (primary) {
    questions.push(`What should I know about ${primary}?`);
    questions.push(`Are there any exceptions for ${primary}?`);
  }

  if (secondary) {
    questions.push(`How does ${secondary} work exactly?`);
  }

  if (tertiary) {
    questions.push(`Can you clarify ${tertiary}?`);
  }

  return questions.map((question) => normalizeWhitespace(question));
}

function buildDynamicQuestionsFromAnswerSentences(sentences: string[]) {
  return sentences.slice(0, 3).map((sentence) => {
    const keywords = extractCandidatePhrases(sentence);
    const phrase = keywords[0] ?? extractFocusPhrase(sentence);

    if (phrase) {
      return `Can you clarify ${phrase}?`;
    }

    return `Can you clarify: ${toQuestionLabel(sentence.slice(0, 40))}?`;
  });
}

function buildHeuristicFallbackQuestions({
  userQuestion,
  assistantAnswer,
  conversationContext,
}: {
  userQuestion: string;
  assistantAnswer: string;
  conversationContext?: string;
}) {
  const normalizedIntentText =
    `${userQuestion} ${assistantAnswer} ${conversationContext ?? ""}`.toLowerCase();

  if (
    normalizedIntentText.includes("contact") ||
    normalizedIntentText.includes("support") ||
    normalizedIntentText.includes("reach") ||
    normalizedIntentText.includes("email") ||
    normalizedIntentText.includes("phone")
  ) {
    return [
      "What is the best way to contact support?",
      "Do you have an email address or phone number?",
      "When is the support team available?",
    ];
  }

  const assistantPhrases = extractCandidatePhrases(assistantAnswer);
  const contextPhrases = extractCandidatePhrases(conversationContext ?? "");
  const userPhrases = extractCandidatePhrases(userQuestion);
  const answerSentences = splitIntoSentences(assistantAnswer);

  const dynamicQuestions = [
    ...buildDynamicQuestionsFromPhrases(assistantPhrases),
    ...buildDynamicQuestionsFromPhrases(contextPhrases),
    ...buildDynamicQuestionsFromAnswerSentences(answerSentences),
    ...buildDynamicQuestionsFromPhrases(userPhrases),
  ]
    .filter((question, index, all) => all.indexOf(question) === index)
    .slice(0, 3);

  if (dynamicQuestions.length === 3) {
    return dynamicQuestions;
  }

  const answerFocusPhrase = extractFocusPhrase(assistantAnswer);

  if (answerFocusPhrase) {
    return buildDynamicQuestionsFromPhrases([answerFocusPhrase]).slice(0, 3);
  }

  const userFocusPhrase = extractFocusPhrase(userQuestion);

  if (userFocusPhrase) {
    return buildDynamicQuestionsFromPhrases([userFocusPhrase]).slice(0, 3);
  }

  return getFallbackQuestions();
}

export async function generateSuggestedQuestions({
  model,
  chatbot,
  userQuestion,
  assistantAnswer,
  conversationContext,
}: {
  model: SuggestedQuestionsModel;
  chatbot: ChatbotPromptConfig;
  userQuestion: string;
  assistantAnswer: string;
  conversationContext?: string;
}) {
  const fallbackQuestions = buildHeuristicFallbackQuestions({
    assistantAnswer,
    conversationContext,
    userQuestion,
  });
  const explicitQuestionsFromAnswer = extractEmbeddedSuggestedQuestions(assistantAnswer);
  const relevanceKeywords = getRelevanceKeywords(
    userQuestion,
    assistantAnswer,
    conversationContext
  );

  if (explicitQuestionsFromAnswer.length === 3) {
    return normalizeSuggestedQuestions(
      explicitQuestionsFromAnswer,
      fallbackQuestions,
      relevanceKeywords
    );
  }

  try {
    const { output } = await generateText({
      model,
      output: Output.object({
        name: "suggestedQuestions",
        description: "Three concise follow-up questions for quick-reply buttons.",
        schema: suggestedQuestionsSchema,
      }),
      system:
        "Return exactly 3 concise follow-up questions in JSON. Each question must be directly grounded in the assistant answer, reference the specific policy, product, step, or detail just mentioned, stay under 80 characters when possible, and work well as a quick-reply button. Avoid generic questions that could fit any answer.",
      prompt: [
        `Chatbot name: ${chatbot.name}`,
        chatbot.systemPrompt?.trim() ? `Chatbot instructions: ${chatbot.systemPrompt.trim()}` : null,
        conversationContext?.trim()
          ? `Recent chat context:\n${conversationContext.trim()}`
          : null,
        `User question: ${userQuestion}`,
        `Assistant answer: ${assistantAnswer}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    });

    return normalizeSuggestedQuestions(
      output.questions,
      fallbackQuestions,
      relevanceKeywords
    );
  } catch {
    return fallbackQuestions;
  }
}

export function getSuggestedQuestionsFromParts(parts: ChatbotUIMessage["parts"]) {
  const suggestionsPart = parts.find(
    (part): part is Extract<ChatbotUIMessage["parts"][number], { type: "data-suggestedQuestions" }> =>
      part.type === "data-suggestedQuestions"
  );

  return suggestionsPart?.data.questions ?? [];
}
