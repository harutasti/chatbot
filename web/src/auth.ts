export type AuthSession = {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
  email?: string;
};

type AuthConfig = {
  clientId: string;
  domain: string;
  redirectUri: string;
  logoutUri: string;
};

type TokenResponse = {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  expires_in: number;
};

const SESSION_KEY = "chatbot.auth.session";
const STATE_KEY = "chatbot.auth.state";
const VERIFIER_KEY = "chatbot.auth.verifier";

const defaultRedirectUri = `${window.location.origin}/`;

const config: AuthConfig = {
  clientId: (import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined) ?? "",
  domain: ((import.meta.env.VITE_COGNITO_DOMAIN as string | undefined) ?? "").replace(/\/$/, ""),
  redirectUri:
    (import.meta.env.VITE_COGNITO_REDIRECT_URI as string | undefined) ??
    defaultRedirectUri,
  logoutUri:
    (import.meta.env.VITE_COGNITO_LOGOUT_URI as string | undefined) ??
    defaultRedirectUri,
};

let initialization: Promise<AuthSession | null> | undefined;

export function isAuthConfigured(): boolean {
  return Boolean(config.clientId && config.domain);
}

export function readAuthSession(): AuthSession | null {
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (!stored) return null;

  try {
    const session = JSON.parse(stored) as Partial<AuthSession>;
    if (
      typeof session.accessToken !== "string" ||
      typeof session.idToken !== "string" ||
      typeof session.refreshToken !== "string" ||
      typeof session.expiresAt !== "number"
    ) {
      clearAuthSession();
      return null;
    }
    return session as AuthSession;
  } catch {
    clearAuthSession();
    return null;
  }
}

export function clearAuthSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
}

export function initializeAuth(): Promise<AuthSession | null> {
  initialization ??= completeAuthorizationCodeFlow();
  return initialization;
}

export async function beginLogin(): Promise<void> {
  assertConfigured();

  const verifier = randomBase64Url(64);
  const state = randomBase64Url(32);
  const challenge = await sha256Base64Url(verifier);

  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);

  const parameters = new URLSearchParams({
    client_id: config.clientId,
    code_challenge: challenge,
    code_challenge_method: "S256",
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
  });

  window.location.assign(`${config.domain}/oauth2/authorize?${parameters}`);
}

export function logout(): void {
  clearAuthSession();
  if (!isAuthConfigured()) return;

  const parameters = new URLSearchParams({
    client_id: config.clientId,
    logout_uri: config.logoutUri,
  });
  window.location.assign(`${config.domain}/logout?${parameters}`);
}

export async function getValidAccessToken(): Promise<string> {
  const session = readAuthSession();
  if (!session) {
    throw new Error("ログインが必要です。");
  }

  if (session.expiresAt > Date.now() + 30_000) {
    return session.accessToken;
  }

  try {
    const refreshed = await requestTokens(
      new URLSearchParams({
        client_id: config.clientId,
        grant_type: "refresh_token",
        refresh_token: session.refreshToken,
      }),
    );
    const nextSession = createSession(refreshed, session.refreshToken);
    saveSession(nextSession);
    return nextSession.accessToken;
  } catch {
    clearAuthSession();
    throw new Error("セッションの有効期限が切れました。もう一度ログインしてください。");
  }
}

async function completeAuthorizationCodeFlow(): Promise<AuthSession | null> {
  if (!isAuthConfigured()) return null;

  const parameters = new URLSearchParams(window.location.search);
  const oauthError = parameters.get("error");
  if (oauthError) {
    const description = parameters.get("error_description") ?? oauthError;
    clearAuthSession();
    cleanOAuthParameters();
    throw new Error(`ログインに失敗しました: ${description}`);
  }

  const code = parameters.get("code");
  if (!code) return readAuthSession();

  const returnedState = parameters.get("state");
  const expectedState = sessionStorage.getItem(STATE_KEY);
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);

  if (!returnedState || !expectedState || returnedState !== expectedState || !verifier) {
    cleanOAuthParameters();
    throw new Error("ログイン応答を検証できませんでした。もう一度ログインしてください。");
  }

  try {
    const tokens = await requestTokens(
      new URLSearchParams({
        client_id: config.clientId,
        code,
        code_verifier: verifier,
        grant_type: "authorization_code",
        redirect_uri: config.redirectUri,
      }),
    );
    if (!tokens.refresh_token) {
      throw new Error("Cognitoから更新トークンが返されませんでした。");
    }
    const session = createSession(tokens, tokens.refresh_token);
    saveSession(session);
    return session;
  } finally {
    cleanOAuthParameters();
  }
}

async function requestTokens(parameters: URLSearchParams): Promise<TokenResponse> {
  assertConfigured();
  const response = await fetch(`${config.domain}/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: parameters,
  });
  const body = (await response.json().catch(() => ({}))) as Partial<TokenResponse> & {
    error?: string;
    error_description?: string;
  };

  if (
    !response.ok ||
    typeof body.access_token !== "string" ||
    typeof body.id_token !== "string" ||
    typeof body.expires_in !== "number"
  ) {
    throw new Error(body.error_description ?? body.error ?? "トークンを取得できませんでした。");
  }

  return body as TokenResponse;
}

function createSession(tokens: TokenResponse, refreshToken: string): AuthSession {
  return {
    accessToken: tokens.access_token,
    idToken: tokens.id_token,
    refreshToken,
    expiresAt: Date.now() + tokens.expires_in * 1_000,
    email: readEmail(tokens.id_token),
  };
}

function saveSession(session: AuthSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function readEmail(idToken: string): string | undefined {
  try {
    const payload = idToken.split(".")[1];
    if (!payload) return undefined;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = JSON.parse(atob(padded)) as { email?: unknown };
    return typeof decoded.email === "string" ? decoded.email : undefined;
  } catch {
    return undefined;
  }
}

function randomBase64Url(byteLength: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return toBase64Url(bytes);
}

async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toBase64Url(new Uint8Array(digest));
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function cleanOAuthParameters(): void {
  const url = new URL(window.location.href);
  ["code", "error", "error_description", "state"].forEach((key) => {
    url.searchParams.delete(key);
  });
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}

function assertConfigured(): void {
  if (!isAuthConfigured()) {
    throw new Error("Cognitoのフロントエンド設定が不足しています。");
  }
}
