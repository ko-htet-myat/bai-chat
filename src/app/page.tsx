import Link from "next/link";
import { BotIcon, ArrowRightIcon, SparklesIcon, ShieldIcon, CodeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
            <BotIcon className="w-4 h-4" />
          </div>
          <span className="font-bold text-lg">BAI Chat</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sign-in">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1">
        <section className="relative overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-3xl" />

          <div className="relative container mx-auto px-6 py-24 md:py-32 text-center space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
              <SparklesIcon className="w-3.5 h-3.5" />
              AI-Powered Customer Support
            </div>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto leading-[1.1]">
              Build intelligent chatbots{" "}
              <span className="text-primary">in minutes</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Create, train, and embed AI chatbots on any website. Feed them your
              knowledge base and let them handle customer conversations 24/7.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link href="/sign-up">
                <Button size="lg" className="h-12 px-8 text-base">
                  Start Building
                  <ArrowRightIcon className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t bg-muted/20">
          <div className="container mx-auto px-6 py-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                Everything you need
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                A complete platform for building and deploying AI chatbots
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="rounded-2xl border bg-card p-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <SparklesIcon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">AI-Powered</h3>
                <p className="text-sm text-muted-foreground">
                  Choose from multiple AI models via OpenRouter. Your chatbot
                  learns from your knowledge base.
                </p>
              </div>

              <div className="rounded-2xl border bg-card p-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CodeIcon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Easy Embed</h3>
                <p className="text-sm text-muted-foreground">
                  Add your chatbot to any website with a single script tag.
                  Fully customizable appearance.
                </p>
              </div>

              <div className="rounded-2xl border bg-card p-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ShieldIcon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Multi-Tenant</h3>
                <p className="text-sm text-muted-foreground">
                  Create organizations, manage teams, and deploy unlimited
                  chatbots per workspace.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t px-6 py-8">
        <div className="container mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <BotIcon className="w-4 h-4" />
            <span>BAI Chat</span>
          </div>
          <p>© {new Date().getFullYear()} BAI Chat. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
