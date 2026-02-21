import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Trash2, Bot } from "lucide-react";
import { useAiChat } from "@/hooks/useAiChat";

type Props = {
    problemTitle: string;
    problemDescription: string;
    code: string;
    lang: string;
};

export default function AiChatPanel({ problemTitle, problemDescription, code, lang }: Props) {
    const [input, setInput] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);
    const { messages, isLoading, sendMessage, clearChat } = useAiChat({
        problemTitle,
        problemDescription,
        code,
        lang,
    });

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        const text = input;
        setInput("");
        await sendMessage(text);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full border-t-2 border-foreground bg-card overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b-2 border-foreground bg-secondary shrink-0">
                <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-foreground" />
                    <span className="font-display text-xs font-black uppercase tracking-wider text-foreground">
                        🏎️ Pit Crew AI
                    </span>
                </div>
                <button
                    onClick={clearChat}
                    title="Clear chat"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 && (
                    <div className="text-center py-6">
                        <p className="font-body text-xs text-muted-foreground">
                            Ask Pit Crew AI for hints, help debugging, or explanations.<br />
                            <span className="opacity-60">It sees your current code and problem!</span>
                        </p>
                    </div>
                )}
                <AnimatePresence initial={false}>
                    {messages.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[85%] border-2 border-foreground px-3 py-2 font-body text-xs leading-relaxed whitespace-pre-wrap ${msg.role === "user"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-background text-foreground"
                                    }`}
                                style={{ boxShadow: "2px 2px 0px var(--foreground)" }}
                            >
                                {msg.content}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isLoading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                        <div
                            className="border-2 border-foreground bg-background px-3 py-2 flex items-center gap-1"
                            style={{ boxShadow: "2px 2px 0px var(--foreground)" }}
                        >
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    className="h-1.5 w-1.5 bg-foreground rounded-full"
                                    animate={{ opacity: [0.3, 1, 0.3] }}
                                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 border-t-2 border-foreground px-3 py-2 bg-background shrink-0">
                <textarea
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    placeholder="Ask for a hint... (Enter to send)"
                    className="flex-1 resize-none bg-transparent font-body text-xs text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
                />
                <button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="neo-btn-primary p-2 disabled:opacity-40 shrink-0"
                >
                    <Send className="h-3 w-3" />
                </button>
            </div>
        </div>
    );
}
