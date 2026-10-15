import { describe, expect, test } from "bun:test";

const origin = "https://apps.travelbase.eu";
const listeners = new Set<(e: unknown) => void>();
Object.assign(globalThis, {
  window: {
    location: { origin },
    addEventListener: (_: string, fn: (e: unknown) => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: (e: unknown) => void) => listeners.delete(fn),
  },
});
const { waitForInstagramPopup } = await import("./instagramPopup");

const fakePopup = () => ({ closed: false, location: { href: "" }, focus() {}, close() { this.closed = true; } }) as unknown as Window;
const report = (source: Window, data: object) => [...listeners].forEach((fn) => fn({ origin, source, data }));

describe("waitForInstagramPopup", () => {
  test("a retry that reuses the open pop-up replaces the first wait, so one login reports once", async () => {
    const popup = fakePopup();
    const first = waitForInstagramPopup(popup, "https://instagram.test/1");
    const second = waitForInstagramPopup(popup, "https://instagram.test/2");
    expect(await first).toEqual({ status: "cancelled" });
    expect(popup.closed).toBe(false);
    expect(popup.location.href).toBe("https://instagram.test/2");
    report(popup, { type: "instagram-connect", status: "ok", key: "k1" });
    expect(await second).toEqual({ status: "ok", key: "k1" });
    expect(listeners.size).toBe(0);
  });

  test("ignores messages from other windows", async () => {
    const popup = fakePopup();
    const wait = waitForInstagramPopup(popup, "https://instagram.test/");
    report(fakePopup(), { type: "instagram-connect", status: "ok", key: "other" });
    report(popup, { type: "instagram-connect", status: "error", reason: "nope" });
    expect(await wait).toEqual({ status: "error", reason: "nope" });
  });
});
