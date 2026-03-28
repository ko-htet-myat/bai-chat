import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import CopyButton from "@/components/dashboard/copy-button";

function getAppUrl(host: string | null, protocol: string | null) {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  if (!host) {
    return "https://your-domain.com";
  }

  return `${protocol || "https"}://${host}`;
}

export default async function ChatbotIntegrationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const chatbot = await prisma.chatbot.findUnique({
    where: { id },
    select: {
      apiKey: true,
      name: true,
      primaryColor: true,
    },
  });

  if (!chatbot) return null;

  const requestHeaders = await headers();
  const appUrl = getAppUrl(
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host"),
    requestHeaders.get("x-forwarded-proto")
  );
  const embedSnippet = `<script src="${appUrl}/widget.js" data-chatbot-key="${chatbot.apiKey}" defer></script>`;
  const widgetUrl = `${appUrl}/widget/${chatbot.apiKey}`;

  return (
    <div className="min-w-0 space-y-8 overflow-x-hidden p-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Integration</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Embed {chatbot.name} on any website with one script tag.
        </p>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="min-w-0 rounded-2xl border bg-card">
          <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
            <div>
              <h3 className="font-semibold">Embed Snippet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Paste this script before the closing <code>&lt;/body&gt;</code> tag.
              </p>
            </div>
            <CopyButton text={embedSnippet} />
          </div>
          <div className="min-w-0 space-y-4 px-6 py-5">
            <pre className="max-w-full overflow-x-auto rounded-xl border bg-muted/30 p-4 text-sm">
              <code className="block whitespace-pre-wrap break-all leading-7">
                {embedSnippet}
              </code>
            </pre>
            <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
              Optional attributes: <code>data-position=&quot;left&quot;</code> and{" "}
              <code>data-label=&quot;Help&quot;</code>.
            </div>
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border bg-card">
          <div className="border-b px-6 py-4">
            <h3 className="font-semibold">Widget Details</h3>
          </div>
          <div className="min-w-0 space-y-4 px-6 py-5 text-sm">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-muted-foreground">Public Widget URL</p>
                  <p className="mt-1 break-all font-medium">{widgetUrl}</p>
                </div>
                <CopyButton className="shrink-0" text={widgetUrl} />
              </div>
            </div>
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-muted-foreground">Chatbot API Key</p>
                  <p className="mt-1 break-all font-medium">{chatbot.apiKey}</p>
                </div>
                <CopyButton className="shrink-0" text={chatbot.apiKey} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">Theme Color</span>
              <span
                className="inline-flex h-8 w-8 rounded-full border"
                style={{ backgroundColor: chatbot.primaryColor || "#0ea5e9" }}
              />
              <span className="font-medium">{chatbot.primaryColor || "#0ea5e9"}</span>
            </div>
            <div className="rounded-xl border bg-muted/20 p-4 text-muted-foreground">
              Configure external origins with <code>WIDGET_ALLOWED_ORIGINS</code>.
              Use <code>*</code> to allow any host during development.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
