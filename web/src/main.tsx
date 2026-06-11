import React, { FormEvent, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Bot, Send, UserRound } from "lucide-react";
import "./styles.css";

type Citation = {
  source: string;
  excerpt?: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  citations?: Citation[];
};

const apiUrl = import.meta.env.VITE_API_URL as string | undefined;

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "社内文書について質問してください。",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const canSubmit = useMemo(() => {
    return Boolean(apiUrl && input.trim() && !isLoading);
  }, [input, isLoading]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || !apiUrl) return;

    const userText = input.trim();
    setInput("");
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", text: userText },
    ]);
    setIsLoading(true);

    try {
      const response = await fetch(`${apiUrl.replace(/\/$/, "")}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: userText, sessionId }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "回答の生成に失敗しました。");
      }

      if (body.sessionId) {
        setSessionId(body.sessionId);
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: body.answer || "回答が空でした。",
          citations: body.citations || [],
        },
      ]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "回答の生成に失敗しました。";
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "assistant", text: message },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <main className="app-shell">
      <section className="chat-panel" aria-label="Chat">
        <header className="chat-header">
          <div>
            <p className="eyebrow">AWS Bedrock Knowledge Base</p>
            <h1>社内Q&A Chatbot</h1>
          </div>
          <span className={apiUrl ? "status ready" : "status"}>
            {apiUrl ? "接続設定済み" : "API URL未設定"}
          </span>
        </header>

        <div className="messages">
          {messages.map((message) => (
            <article className={`message ${message.role}`} key={message.id}>
              <div className="avatar" aria-hidden="true">
                {message.role === "assistant" ? <Bot size={18} /> : <UserRound size={18} />}
              </div>
              <div className="bubble">
                <p>{message.text}</p>
                {message.citations && message.citations.length > 0 ? (
                  <div className="citations" aria-label="引用元">
                    {message.citations.map((citation) => (
                      <details key={citation.source}>
                        <summary>{citation.source}</summary>
                        {citation.excerpt ? <p>{citation.excerpt}</p> : null}
                      </details>
                    ))}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
          {isLoading ? (
            <article className="message assistant">
              <div className="avatar" aria-hidden="true">
                <Bot size={18} />
              </div>
              <div className="bubble loading">回答を生成中...</div>
            </article>
          ) : null}
        </div>

        <form className="composer" onSubmit={submit}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="例: 経費精算の締切はいつですか？"
            rows={2}
          />
          <button type="submit" disabled={!canSubmit} aria-label="送信">
            <Send size={20} />
          </button>
        </form>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
