import { prisma } from "@/lib/db";
import {
  buildStarterQuestionsFromTopicLabels,
  getDefaultStarterQuestions,
} from "@/lib/chatbot-response";

const STOP_WORDS = new Set([
  "a",
  "about",
  "all",
  "am",
  "an",
  "and",
  "any",
  "are",
  "as",
  "at",
  "be",
  "because",
  "been",
  "but",
  "by",
  "can",
  "could",
  "do",
  "does",
  "for",
  "from",
  "get",
  "got",
  "had",
  "has",
  "have",
  "help",
  "hello",
  "hey",
  "hi",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "just",
  "me",
  "my",
  "need",
  "of",
  "on",
  "or",
  "our",
  "please",
  "so",
  "some",
  "tell",
  "thanks",
  "that",
  "the",
  "their",
  "them",
  "there",
  "these",
  "they",
  "this",
  "to",
  "was",
  "we",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "will",
  "with",
  "would",
  "you",
  "your",
]);

const CANONICAL_TOPIC_LABELS: Record<string, string> = {
  cancel: "Cancellation",
  cancellation: "Cancellation",
  deliveries: "Delivery",
  delivery: "Delivery",
  exchange: "Exchanges",
  exchanges: "Exchanges",
  invoice: "Invoices",
  invoices: "Invoices",
  order: "Orders",
  orders: "Orders",
  payment: "Payments",
  payments: "Payments",
  price: "Pricing",
  pricing: "Pricing",
  refund: "Refunds",
  refunds: "Refunds",
  return: "Returns",
  returns: "Returns",
  shipment: "Shipping",
  shipments: "Shipping",
  shipping: "Shipping",
  subscription: "Subscriptions",
  subscriptions: "Subscriptions",
  support: "Support",
  tracking: "Order Tracking",
  warranty: "Warranty",
};

type TopicAccumulator = {
  phrase: string;
  conversations: Set<string>;
  samples: Set<string>;
};

export type TrendingTopic = {
  label: string;
  phrase: string;
  conversations: number;
  percentage: number;
  sampleQuestions: string[];
};

export type ChatbotTrendingTopics = {
  conversationCount: number;
  questionCount: number;
  dominantTopic: TrendingTopic | null;
  topics: TrendingTopic[];
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeWord(word: string) {
  if (word.length > 4 && word.endsWith("ies")) {
    return `${word.slice(0, -3)}y`;
  }

  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) {
    return word.slice(0, -1);
  }

  return word;
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(" ")
    .map(normalizeWord)
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function toTitleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function toTopicLabel(phrase: string) {
  const directLabel = CANONICAL_TOPIC_LABELS[phrase];

  if (directLabel) {
    return directLabel;
  }

  const aliasedWords = phrase
    .split(" ")
    .map((word) => CANONICAL_TOPIC_LABELS[word] ?? word)
    .join(" ");

  return toTitleCase(aliasedWords);
}

function phraseScore(phrase: string, count: number) {
  const lengthBonus = phrase.split(" ").length - 1;
  return count * 10 + lengthBonus;
}

function buildConversationPhrases(questions: string[]) {
  const phrases = new Set<string>();

  for (const question of questions) {
    const tokens = tokenize(question);

    for (let size = 1; size <= 3; size += 1) {
      for (let index = 0; index <= tokens.length - size; index += 1) {
        const phrase = tokens.slice(index, index + size).join(" ");
        if (phrase.length >= 3) {
          phrases.add(phrase);
        }
      }
    }
  }

  return phrases;
}

function phraseMatchesQuestion(phrase: string, question: string) {
  const normalizedQuestion = normalizeText(question);
  return phrase.split(" ").every((word) => normalizedQuestion.includes(word));
}

export async function getChatbotTrendingTopics(
  chatbotId: string
): Promise<ChatbotTrendingTopics> {
  const recentConversations = await prisma.conversation.findMany({
    where: { chatbotId },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      messages: {
        where: { role: "user" },
        orderBy: { createdAt: "asc" },
        select: {
          content: true,
        },
      },
    },
  });

  const populatedConversations = recentConversations
    .map((conversation) => ({
      id: conversation.id,
      questions: conversation.messages
        .map((message) => message.content.trim())
        .filter(Boolean),
    }))
    .filter((conversation) => conversation.questions.length > 0);

  const topicMap = new Map<string, TopicAccumulator>();

  for (const conversation of populatedConversations) {
    const phrases = buildConversationPhrases(conversation.questions);

    for (const phrase of phrases) {
      const entry = topicMap.get(phrase) ?? {
        phrase,
        conversations: new Set<string>(),
        samples: new Set<string>(),
      };

      entry.conversations.add(conversation.id);

      for (const question of conversation.questions) {
        if (entry.samples.size >= 3) {
          break;
        }

        if (phraseMatchesQuestion(phrase, question)) {
          entry.samples.add(question);
        }
      }

      topicMap.set(phrase, entry);
    }
  }

  const conversationCount = populatedConversations.length;
  const questionCount = populatedConversations.reduce(
    (total, conversation) => total + conversation.questions.length,
    0
  );

  if (conversationCount === 0) {
    return {
      conversationCount: 0,
      questionCount: 0,
      dominantTopic: null,
      topics: [],
    };
  }

  const rankedTopics = [...topicMap.values()]
    .filter((topic) => topic.conversations.size >= 2)
    .sort((left, right) => {
      const scoreDifference =
        phraseScore(right.phrase, right.conversations.size) -
        phraseScore(left.phrase, left.conversations.size);

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      return right.conversations.size - left.conversations.size;
    });

  const topics: TrendingTopic[] = [];

  for (const topic of rankedTopics) {
    const overlapsExistingTopic = topics.some((existing) => {
      const existingContainsCandidate = existing.phrase.includes(topic.phrase);
      const candidateContainsExisting = topic.phrase.includes(existing.phrase);

      return existingContainsCandidate || candidateContainsExisting;
    });

    if (overlapsExistingTopic) {
      continue;
    }

    topics.push({
      label: toTopicLabel(topic.phrase),
      phrase: topic.phrase,
      conversations: topic.conversations.size,
      percentage: Math.round((topic.conversations.size / conversationCount) * 100),
      sampleQuestions: [...topic.samples],
    });

    if (topics.length === 5) {
      break;
    }
  }

  return {
    conversationCount,
    questionCount,
    dominantTopic: topics[0] ?? null,
    topics,
  };
}

export async function getChatbotStarterQuestions(chatbotId: string) {
  const analytics = await getChatbotTrendingTopics(chatbotId);

  if (analytics.topics.length === 0) {
    return getDefaultStarterQuestions();
  }

  return buildStarterQuestionsFromTopicLabels(
    analytics.topics.map((topic) => topic.label)
  );
}
