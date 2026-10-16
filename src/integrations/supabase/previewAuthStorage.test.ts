import { beforeEach, expect, test } from "bun:test";

// A framed Lovable preview: every auth read goes to the editor over postMessage.
const editor = "https://lovable.dev";
const store = new Map<string, string>();
const listeners = new Set<(e: unknown) => void>();
let reply: (msg: { type: string; requestId: string; value?: string }) => string | null | undefined;
const sent: { type: string; value?: string }[] = [];

Object.assign(globalThis, {
  location: { hostname: "id-preview--8f0e4c1a-3b2d-4e5f-9a6b-7c8d9e0f1a2b.lovable.app", ancestorOrigins: [editor] },
  document: { referrer: "" },
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
});
Object.assign(globalThis, {
  window: {
    addEventListener: (_: string, fn: (e: unknown) => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: (e: unknown) => void) => listeners.delete(fn),
    parent: {
      postMessage: (msg: { type: string; requestId: string; value?: string }) => {
        sent.push({ type: msg.type, value: msg.value });
        const value = reply(msg);
        if (value === undefined) return;
        queueMicrotask(() => [...listeners].forEach((fn) =>
          fn({ origin: editor, data: { type: "lovable-preview-auth:result", requestId: msg.requestId, ok: true, value } })));
      },
    },
  },
});
const { brokeredPreviewStorage } = await import("./previewAuthStorage");
const KEY = "sb-auth-token";

beforeEach(() => { store.clear(); sent.length = 0; });

test("a new tab without a local session takes the editor's and keeps it", async () => {
  reply = () => "editor-session";
  const storage = brokeredPreviewStorage() as Storage;
  expect(await storage.getItem(KEY)).toBe("editor-session");
  expect(store.get(KEY)).toBe("editor-session");
});

test("a logout in the editor signs this tab out too", async () => {
  store.set(KEY, "old-session");
  reply = () => "";
  const storage = brokeredPreviewStorage() as Storage;
  expect(await storage.getItem(KEY)).toBeNull();
  expect(store.has(KEY)).toBe(false);
  expect(sent[0]).toEqual({ type: "lovable-preview-auth:get", value: "old-session" });
});

test("an editor that never saw a session keeps the local one", async () => {
  store.set(KEY, "local-session");
  reply = () => null;
  const storage = brokeredPreviewStorage() as Storage;
  expect(await storage.getItem(KEY)).toBe("local-session");
  expect(store.get(KEY)).toBe("local-session");
});
