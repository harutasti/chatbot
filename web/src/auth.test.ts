import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SESSION_KEY = "chatbot.auth.session";
const appOrigin = "https://app.example.com";
const cognitoDomain = "https://example.auth.ap-northeast-1.amazoncognito.com";

type StorageMock = ReturnType<typeof createStorage>;

let storage: StorageMock;
let assign: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VITE_COGNITO_CLIENT_ID", "client-123");
  vi.stubEnv("VITE_COGNITO_DOMAIN", cognitoDomain);

  storage = createStorage();
  assign = vi.fn();
  vi.stubGlobal("sessionStorage", storage);
  vi.stubGlobal("window", {
    location: {
      origin: appOrigin,
      href: `${appOrigin}/`,
      search: "",
      assign,
    },
    history: { replaceState: vi.fn() },
    setTimeout,
    clearTimeout,
  });
  vi.stubGlobal("document", { title: "Chatbot" });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("logout", () => {
  it("revokes the refresh token before redirecting to Cognito logout", async () => {
    storage.setItem(
      SESSION_KEY,
      JSON.stringify({
        accessToken: "access-token",
        idToken: "id-token",
        refreshToken: "refresh-token",
        expiresAt: Date.now() + 60_000,
      }),
    );
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const { logout } = await import("./auth");

    await logout();

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe(`${cognitoDomain}/oauth2/revoke`);
    expect(request.method).toBe("POST");
    expect(request.body.get("client_id")).toBe("client-123");
    expect(request.body.get("token")).toBe("refresh-token");
    expect(storage.getItem(SESSION_KEY)).toBeNull();
    expect(assign).toHaveBeenCalledWith(
      `${cognitoDomain}/logout?client_id=client-123&logout_uri=${encodeURIComponent(`${appOrigin}/`)}`,
    );
  });

  it("still completes local and managed-login logout when revocation fails", async () => {
    storage.setItem(
      SESSION_KEY,
      JSON.stringify({
        accessToken: "access-token",
        idToken: "id-token",
        refreshToken: "refresh-token",
        expiresAt: Date.now() + 60_000,
      }),
    );
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    const { logout } = await import("./auth");

    await expect(logout()).resolves.toBeUndefined();

    expect(storage.getItem(SESSION_KEY)).toBeNull();
    expect(assign).toHaveBeenCalledOnce();
  });
});

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
  };
}
