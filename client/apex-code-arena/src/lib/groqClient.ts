const API_KEY = import.meta.env.VITE_GROQ_API_KEY as string;
const API_URL = "https://api.groq.com/openai/v1/chat/completions";

if (!API_KEY) {
    console.warn("VITE_GROQ_API_KEY is not set. AI features will not work.");
}

export type ChatMessage = {
    role: "system" | "user" | "assistant";
    content: string;
};

export async function callGroq(messages: ChatMessage[]): Promise<string> {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages,
            temperature: 0.7,
            max_tokens: 1024,
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("Groq API error:", response.status, errorBody);
        throw new Error(`Groq API error ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? "No response from AI.";
}
