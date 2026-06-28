"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, Bot, User } from "lucide-react";
import type { View } from "@/lib/types";

interface AIAssistantProps {
  open: boolean;
  onClose: () => void;
  context: { view: View; station: string | null };
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const suggestedPrompts = [
  "What's causing high pollution in Anand Vihar?",
  "Forecast AQI for the next 3 days",
  "Where should inspectors be deployed today?",
  "Is it safe for kids to play outside?",
];

const welcomeMessage: Message = {
  role: "assistant",
  content:
    "Hi! I'm the AERIS AI Agent. I can explain pollution sources, interpret forecasts, recommend enforcement actions, and generate health advisories. Ask me anything about Delhi's air quality.",
};

export default function AIAssistant({
  open,
  onClose,
  context,
}: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, thinking]);

  const handleSend = (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;

    setMessages((m) => [...m, { role: "user", content }]);
    setInput("");
    setThinking(true);

    // Placeholder — will connect to /agents backend once implemented
    setTimeout(() => {
      setThinking(false);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "🚧 The AI Agent isn't connected yet. Once the backend agents (source attribution, enforcement, advisory) are wired up, I'll answer this using live model predictions and SHAP analysis. For now, explore the dashboard panels to see the data.",
        },
      ]);
    }, 1200);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Panel */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[420px] flex flex-col glass border-l shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-[73px] border-b shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-xl"
              style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }}
            >
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold leading-tight flex items-center gap-2">
                AERIS AI Agent
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/15 text-amber-500 uppercase tracking-wide">
                  Beta
                </span>
              </h3>
              <p className="text-[11px] text-muted">
                Context: {context.view}
                {context.station ? ` · ${context.station}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors hover:bg-[var(--bg-subtle)]"
          >
            <X size={18} className="text-secondary" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 animate-slide-up ${
                msg.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                  msg.role === "assistant" ? "text-white" : "surface-subtle"
                }`}
                style={
                  msg.role === "assistant"
                    ? { background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }
                    : undefined
                }
              >
                {msg.role === "assistant" ? (
                  <Bot size={16} />
                ) : (
                  <User size={16} className="text-secondary" />
                )}
              </div>
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "text-white rounded-tr-sm"
                    : "surface-subtle rounded-tl-sm"
                }`}
                style={
                  msg.role === "user"
                    ? { background: "linear-gradient(135deg, #0891b2, #0e7490)" }
                    : undefined
                }
              >
                {msg.content}
              </div>
            </div>
          ))}

          {thinking && (
            <div className="flex gap-3 animate-fade-in">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 text-white"
                style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }}
              >
                <Bot size={16} />
              </div>
              <div className="surface-subtle px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}
        </div>

        {/* Suggested prompts */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Try asking
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => handleSend(p)}
                  className="text-left text-xs px-3 py-2 rounded-xl surface-subtle transition-colors hover:border-strong text-secondary"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t shrink-0">
          <div className="flex items-end gap-2 surface-subtle p-2 pl-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder="Ask AERIS AI…"
              className="flex-1 bg-transparent text-sm outline-none resize-none max-h-24 py-1.5 placeholder:text-muted"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="flex items-center justify-center w-9 h-9 rounded-xl text-white shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105"
              style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }}
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-[10px] text-muted text-center mt-2">
            AI responses are placeholders until agents are connected
          </p>
        </div>
      </aside>
    </>
  );
}
