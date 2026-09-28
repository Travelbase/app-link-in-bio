/** Fire-and-forget visit/click counting for public pages. Nothing personal is sent. */
const ENDPOINT = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/analytics-track`;
const EDITOR_FLAG = "tb-editor-device";

/** Called by the editor: visits from a browser that uses the editor are never counted. */
export function markEditorDevice() {
  try { localStorage.setItem(EDITOR_FLAG, "1"); } catch { /* storage blocked */ }
}

function isEditorDevice() {
  try { return localStorage.getItem(EDITOR_FLAG) === "1"; } catch { return false; }
}

export type TrackEvent = { pageId: string; type: "view" | "button_click" | "post_click"; blockId?: string | null; blockType?: string | null; label?: string | null; destination?: string | null };

export function track(ev: TrackEvent) {
  if (isEditorDevice()) return;
  const body = JSON.stringify(ev);
  try {
    // text/plain keeps sendBeacon free of a CORS preflight.
    if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "text/plain" }))) return;
  } catch { /* fall through */ }
  fetch(ENDPOINT, { method: "POST", body, keepalive: true, headers: { "Content-Type": "text/plain" } }).catch(() => {});
}

/** Destination without the utm_* tags. */
export function stripUtm(href: string) {
  try {
    const u = new URL(href);
    [...u.searchParams.keys()].filter((k) => k.toLowerCase().startsWith("utm_")).forEach((k) => u.searchParams.delete(k));
    return u.toString();
  } catch { return href; }
}

/** Delegated click handler for the public page root. Links carry data-track-label; wrappers carry data-block-id/type. */
export function handleTrackedClick(pageId: string, e: React.MouseEvent) {
  const a = (e.target as HTMLElement).closest?.("a[data-track-label]") as HTMLAnchorElement | null;
  if (!a || !a.href) return;
  const wrap = a.closest("[data-block-type]") as HTMLElement | null;
  const blockType = wrap?.dataset.blockType ?? null;
  track({
    pageId,
    type: blockType === "instagram_grid" ? "post_click" : "button_click",
    blockId: wrap?.dataset.blockId || null,
    blockType,
    label: a.dataset.trackLabel?.slice(0, 200) ?? null,
    destination: stripUtm(a.href).slice(0, 1000),
  });
}
