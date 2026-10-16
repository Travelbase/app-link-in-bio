import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { uiText } from "@/lib/uiText";

const ALLOWED_DOMAIN = "@travelbase.eu";
const isStaff = (s: Session | null) => !!s?.user.email?.toLowerCase().endsWith(ALLOWED_DOMAIN);
const t = uiText.signIn;

/** Editor requires a @travelbase.eu Google account on Lovable Cloud. Production has the gateway login instead. */
export function AuthGate({ children }: { children: ReactNode }) {
  if (import.meta.env.VITE_DATA_BACKEND === "http") return <>{children}</>;
  return <CloudAuthGate>{children}</CloudAuthGate>;
}

function CloudAuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [error, setError] = useState("");

  useEffect(() => {
    const accept = (s: Session | null) => {
      if (s && !isStaff(s)) {
        setError(t.wrongDomain);
        supabase.auth.signOut();
        setSession(null);
        return;
      }
      setSession(s);
    };
    const { data } = supabase.auth.onAuthStateChange((_e, s) => accept(s));
    supabase.auth.getSession().then(({ data }) => accept(data.session));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div className="editor-theme min-h-screen grid place-items-center text-muted-foreground">{uiText.loading}</div>;
  if (session) return <>{children}</>;

  const signIn = async () => {
    setError("");
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.href, extraParams: { hd: "travelbase.eu", prompt: "select_account" } });
    if (res.error) setError(t.failed);
  };

  return (
    <main className="min-h-screen grid place-items-center bg-background p-6">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 text-center space-y-4">
        <h1 className="text-xl font-semibold text-foreground">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.body}</p>
        <Button className="w-full" onClick={signIn}>{t.google}</Button>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    </main>
  );
}
