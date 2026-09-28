import { useEffect } from "react";
import { uiText } from "@/lib/uiText";

/** Landing page after Instagram login: reports to the opener pop-up parent, or falls back to a redirect. */
const InstagramCallback = () => {
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const mode = q.get("mode") === "new" ? "new" : "page";
    const status = q.get("status") === "ok" ? "ok" : "error";
    const reason = q.get("reason") ?? "";
    const key = q.get("key") ?? "";
    let ret = q.get("return") ?? "/";
    if (!ret.startsWith("/") || ret.startsWith("//")) ret = "/";
    if (window.opener) {
      try {
        window.opener.postMessage({ type: "instagram-connect", status, reason, ...(key ? { key } : {}) }, window.location.origin);
      } catch { /* ignore */ }
      setTimeout(() => window.close(), 250);
      return;
    }
    const target = new URL(ret, window.location.origin);
    if (mode === "new") target.searchParams.set("new_page", status === "ok" && key ? key : "error");
    else target.searchParams.set("instagram", status === "ok" ? "connected" : "error");
    if (reason) target.searchParams.set("reason", reason);
    window.location.replace(target.toString());
  }, []);
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <p className="text-sm text-muted-foreground">{uiText.instagramCallbackBusy}</p>
    </main>
  );
};

export default InstagramCallback;
