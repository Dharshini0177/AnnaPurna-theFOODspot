import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import { Sparkles, Send } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({ meta: [{ title: "AI Nutrition Guide — Annapurna" }] }),
  component: Assistant,
});

const SUGGESTIONS = [
  "What is a balanced diet?",
  "Suggest a nutritious meal under ₹100",
  "How much protein should I consume daily?",
  "What foods are rich in iron?",
];

function Assistant() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (e) => console.error(e),
  });
  const busy = status === "submitted" || status === "streaming";

  async function submit(e?: React.FormEvent, override?: string) {
    e?.preventDefault();
    const text = (override ?? input).trim();
    if (!text || busy) return;
    setInput("");
    await sendMessage({ text });
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="size-12 rounded-full bg-gold-gradient grid place-items-center text-gold-foreground"><Sparkles className="size-6" /></div>
        <div>
          <h1 className="font-display text-3xl font-semibold">NutriGuide</h1>
          <p className="text-sm text-muted-foreground">Your AI nutrition assistant — powered by Lovable AI</p>
        </div>
      </div>

      <Card className="p-4 md:p-6 shadow-soft min-h-[400px] flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
            <p className="text-muted-foreground mb-6">Ask anything about nutrition, healthy eating, or meal planning.</p>
            <div className="grid sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => submit(undefined, s)}
                  className="text-left text-sm p-3 rounded-lg border bg-secondary/40 hover:bg-accent transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => {
          const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
          return (
            <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"
              }`}>
                <div className="prose prose-sm max-w-none prose-headings:font-display prose-headings:mt-2 prose-headings:mb-1 prose-p:my-1">
                  <ReactMarkdown>{text}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          );
        })}
        {busy && <div className="text-xs text-muted-foreground animate-pulse">NutriGuide is thinking…</div>}
      </Card>

      <form onSubmit={submit} className="mt-4 flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about nutrition…" disabled={busy} />
        <Button type="submit" disabled={busy || !input.trim()} className="bg-primary text-primary-foreground">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
