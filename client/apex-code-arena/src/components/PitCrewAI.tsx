import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, X, Zap, Trash2 } from "lucide-react";
import { useAiChat } from "@/hooks/useAiChat";

type Props = {
  problemTitle: string;
  problemDescription: string;
  code: string;
  lang: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const PitCrewAI = ({ problemTitle, problemDescription, code, lang, isOpen, onOpenChange }: Props) => {
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

  const handleClear = () => {
    clearChat();
  };

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed bottom-6 right-6 w-96 h-[500px] bg-card border-2 border-foreground rounded-lg shadow-brutal flex flex-col overflow-hidden z-40"
        >
          {/* Header */}
          <div className="bg-secondary text-foreground p-4 flex items-center justify-between border-b-2 border-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-foreground rounded-full animate-pulse" />
              <h3 className="font-display font-bold">🏎️ Pit Crew AI</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClear}
                className="hover:bg-foreground/10 p-1 transition-colors"
                title="Clear chat"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => onOpenChange(false)}
                className="hover:bg-foreground/10 p-1 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <p className="font-body text-xs text-muted-foreground">
                  Ask Pit Crew AI for hints, help debugging, or explanations.<br />
                  <span className="opacity-60">It sees your current code and problem!</span>
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] border-2 border-foreground px-3 py-2 font-body text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-foreground"
                  }`}
                  style={{ boxShadow: "2px 2px 0px var(--foreground)" }}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}

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
          <div className="flex items-center gap-2 border-t-2 border-foreground px-3 py-2 bg-background">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Ask for a hint..."
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
        </motion.div>
      )}
    </>
  );
};

export default PitCrewAI;
