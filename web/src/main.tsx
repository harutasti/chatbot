import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Bot, LogIn, LogOut, Send, UserRound } from "lucide-react";
import {
  type AuthSession,
  beginLogin,
  clearAuthSession,
  getValidAccessToken,
  initializeAuth,
  isAuthConfigured,
  logout,
  readAuthSession,
} from "./auth";
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
  const [authSession, setAuthSession] = useState<AuthSession | null>(() =>
    readAuthSession(),
  );
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const authConfigured = isAuthConfigured();

  useEffect(() => {
    let active = true;
    initializeAuth()
      .then((session) => {
        if (active) setAuthSession(session);
      })
      .catch((error) => {
        if (active) {
          setAuthError(
            error instanceof Error ? error.message : "ログイン処理に失敗しました。",
          );
        }
      })
      .finally(() => {
        if (active) setIsAuthLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const canSubmit = useMemo(() => {
    return Boolean(apiUrl && authSession && input.trim() && !isLoading && !isAuthLoading);
  }, [authSession, input, isAuthLoading, isLoading]);

  async function handleLogin() {
    setAuthError(null);
    try {
      await beginLogin();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "ログインを開始できませんでした。");
    }
  }

  function handleLogout() {
    setAuthSession(null);
    setSessionId(undefined);
    void logout();
  }

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
      const accessToken = await getValidAccessToken();
      const response = await fetch(`${apiUrl.replace(/\/$/, "")}/chat`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: userText, sessionId }),
      });

      const body = await response.json().catch(() => ({}));
      if (response.status === 401) {
        clearAuthSession();
        setAuthSession(null);
        throw new Error("セッションが無効です。もう一度ログインしてください。");
      }
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
      if (!readAuthSession()) {
        setAuthSession(null);
      }
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
          <div className="header-actions">
            <span className={authSession ? "status ready" : "status"}>
              {!apiUrl || !authConfigured
                ? "設定不足"
                : isAuthLoading
                  ? "認証確認中"
                  : authSession
                    ? "ログイン済み"
                    : "ログインが必要"}
            </span>
            {authSession ? (
              <button className="auth-button" type="button" onClick={handleLogout}>
                <LogOut size={17} />
                <span>{authSession.email ?? "ログアウト"}</span>
              </button>
            ) : (
              <button
                className="auth-button primary"
                type="button"
                onClick={handleLogin}
                disabled={!authConfigured || isAuthLoading}
              >
                <LogIn size={17} />
                ログイン
              </button>
            )}
          </div>
        </header>

        <div className="messages">
          {authError ? <div className="auth-notice error">{authError}</div> : null}
          {!isAuthLoading && authConfigured && !authSession && !authError ? (
            <div className="auth-notice">チャットを利用するにはログインしてください。</div>
          ) : null}
          {(!apiUrl || !authConfigured) && !isAuthLoading ? (
            <div className="auth-notice error">
              API URLまたはCognitoの環境変数が設定されていません。
            </div>
          ) : null}
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
            placeholder={
              authSession
                ? "例: 経費精算の締切はいつですか？"
                : "ログインすると質問できます"
            }
            rows={2}
            disabled={!authSession || isAuthLoading}
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
