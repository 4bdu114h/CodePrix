import { useState, useCallback } from "react";
import { callGroq, ChatMessage } from "@/lib/groqClient";

export type Message = {
    role: "user" | "assistant";
    content: string;
};

type UseAiChatOptions = {
    problemTitle: string;
    problemDescription: string;
    code: string;
    lang: string;
};

export function useAiChat({ problemTitle, problemDescription, code, lang }: UseAiChatOptions) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const buildSystemPrompt = useCallback(() => {
        return `You are "Pit Crew AI", a helpful coding assistant embedded in CodePrix — a racing-themed competitive coding platform.

The user is currently solving this problem:
**Problem:** ${problemTitle}
**Description:** ${problemDescription}

Their current ${lang} code:
\`\`\`${lang}
${code}
\`\`\`

Guidelines:
- Give hints and guide their thinking — do NOT reveal the full solution unless the user explicitly says "give me the full solution" or "show me the answer"
- Keep responses concise and focused (2–4 sentences unless a deeper explanation is needed)
- Occasionally use a racing metaphor to keep things fun 🏎️
- If the user shares an error, help them debug it
- Be encouraging and friendly`;
    }, [problemTitle, problemDescription, code, lang]);

    const sendMessage = useCallback(async (userText: string) => {
        if (!userText.trim()) return;

        const userMessage: Message = { role: "user", content: userText };
        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const groqMessages: ChatMessage[] = [
                { role: "system", content: buildSystemPrompt() },
                ...messages.map((m) => ({
                    role: m.role as "user" | "assistant",
                    content: m.content,
                })),
                { role: "user" as const, content: userText },
            ];

            const responseText = await callGroq(groqMessages);
            setMessages((prev) => [...prev, { role: "assistant", content: responseText }]);
        } catch (err) {
            console.error("AI error:", err);
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "⚠️ Pit Crew is offline right now. Check your API key or try again." },
            ]);
        } finally {
            setIsLoading(false);
        }
    }, [messages, buildSystemPrompt]);

    const clearChat = useCallback(() => {
        setMessages([]);
    }, []);

    return { messages, isLoading, sendMessage, clearChat };
}
