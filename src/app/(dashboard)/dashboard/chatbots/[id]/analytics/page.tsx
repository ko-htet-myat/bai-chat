import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  BarChart3Icon,
  LightbulbIcon,
  MessageSquareTextIcon,
  SparklesIcon,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { getChatbotTrendingTopics } from "@/lib/chatbot-analytics";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Trending Topics - BAI Chat",
};

export default async function ChatbotAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return null;
  }

  const { id } = await params;

  const chatbot = await prisma.chatbot.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      organizationId: true,
      primaryColor: true,
    },
  });

  if (!chatbot) {
    notFound();
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId: chatbot.organizationId,
      },
    },
  });

  if (!membership) {
    notFound();
  }

  const analytics = await getChatbotTrendingTopics(chatbot.id);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <BarChart3Icon className="size-3.5" />
            Merchant Analytics
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Top Trending Topics</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              See what customers keep asking {chatbot.name} so you can tighten
              your FAQ, improve your policies, and update your site copy with
              confidence.
            </p>
          </div>
        </div>

        <div
          className="rounded-2xl border px-4 py-3 text-sm"
          style={{
            backgroundColor: `${chatbot.primaryColor ?? "#0ea5e9"}12`,
            borderColor: `${chatbot.primaryColor ?? "#0ea5e9"}30`,
          }}
        >
          <p className="font-medium">Dataset</p>
          <p className="text-muted-foreground">
            Last {analytics.conversationCount} conversations
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="border-b">
            <CardDescription>Conversations analyzed</CardDescription>
            <CardTitle className="text-3xl">{analytics.conversationCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Recent stored conversations for this chatbot.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardDescription>User questions scanned</CardDescription>
            <CardTitle className="text-3xl">{analytics.questionCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Every user message in those conversations contributes signal.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardDescription>Biggest customer theme</CardDescription>
            <CardTitle className="text-3xl">
              {analytics.dominantTopic?.percentage ?? 0}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {analytics.dominantTopic
                ? `${analytics.dominantTopic.label} shows up most often.`
                : "Not enough repeated questions yet."}
            </p>
          </CardContent>
        </Card>
      </div>

      {analytics.topics.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
            <div className="rounded-full bg-muted p-3">
              <SparklesIcon className="size-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">No strong trends yet</p>
              <p className="max-w-lg text-sm text-muted-foreground">
                Once this bot has a few repeated customer questions, we&apos;ll
                surface the top themes here. Right now the data is still too
                sparse to produce trustworthy topics.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>What customers care about most</CardTitle>
              <CardDescription>
                Ranked by how many distinct conversations mention each topic.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {analytics.topics.map((topic, index) => (
                <div
                  key={topic.phrase}
                  className="rounded-2xl border bg-muted/10 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <p className="text-base font-semibold">{topic.label}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Mentioned in {topic.conversations} of {analytics.conversationCount}{" "}
                        conversations.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{topic.percentage}%</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        share
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${topic.percentage}%`,
                        backgroundColor: chatbot.primaryColor ?? "#0ea5e9",
                      }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Examples from real chats</CardTitle>
              <CardDescription>
                Use these to refine your site copy, docs, and policy language.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {analytics.topics.map((topic) => (
                <div key={`${topic.phrase}-examples`} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <LightbulbIcon className="size-4 text-muted-foreground" />
                    <p className="font-medium">{topic.label}</p>
                  </div>
                  <div className="space-y-2">
                    {topic.sampleQuestions.map((question) => (
                      <div
                        key={`${topic.phrase}-${question}`}
                        className="rounded-2xl border bg-background p-3 text-sm text-muted-foreground"
                      >
                        <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          <MessageSquareTextIcon className="size-3.5" />
                          Customer question
                        </div>
                        <p className="text-foreground">{question}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
