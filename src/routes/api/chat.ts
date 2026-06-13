import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `You are NutriGuide, a warm and knowledgeable nutrition assistant for the Smart Food Redistribution & Nutrition Awareness Platform.

Your role:
- Educate users about balanced nutrition, micronutrients, and healthy eating habits
- Suggest affordable, accessible meals (especially Indian/South Asian context — use ₹ when discussing cost)
- Promote reducing food waste and sharing surplus food
- Be encouraging, practical, and culturally sensitive

Always:
- Use clear markdown formatting with headings, lists, and bold for key terms
- Give concrete examples and serving sizes
- Note when to consult a healthcare professional for medical conditions
- Keep responses focused and actionable`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages?: UIMessage[] };
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
