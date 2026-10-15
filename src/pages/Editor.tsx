import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { BarChart3, Check, Copy, ExternalLink, Eye, LayoutList, Loader2, Palette, PencilLine, Plus, Settings, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageRenderer } from "@/components/PageRenderer";
import { PageSwitcher } from "@/components/editor/PageSwitcher";
import { BlocksTab } from "@/components/editor/BlocksTab";
import { DesignTab } from "@/components/editor/DesignTab";
import { SettingsTab } from "@/components/editor/SettingsTab";
import { NewPageDialog } from "@/components/editor/NewPageDialog";
import { getFeed } from "@/lib/linkinbio/instagram";
import { backend } from "@/lib/linkinbio/backend";
import { editPath, publicPageUrl } from "@/lib/linkinbio/urls";
import { fetchPageByAddress, fetchPageSummaries, type PageSummary } from "@/lib/linkinbio/api";
import type { BlockData, PageData } from "@/lib/linkinbio/types";
import { useEditorState, type SaveStatus } from "@/hooks/useEditorState";
import { uiText } from "@/lib/uiText";
import { cn } from "@/lib/utils";
import { AnalyticsTab } from "@/components/editor/AnalyticsTab";
import { ShortLinkBar } from "@/components/editor/ShortLinkBar";

const t = uiText.editor;

/** Switches the app to the internal-tool look (zinc + teal) while the editor is open. */
function useEditorTheme() {
  useEffect(() => {
    document.documentElement.classList.add("editor-theme");
    const prev = document.title;
    document.title = "Link in bio editor | Travelbase";
    return () => { document.documentElement.classList.remove("editor-theme"); document.title = prev; };
  }, []);
}

export default function Editor() {
  useEditorTheme();
  const { address } = useParams();
  const [newOpen, setNewOpen] = useState(false);
  // Returning from an Instagram login started in the "New page" dialog.
  const [pending, setPending] = useState<{ key: string | null; error: string | null } | null>(() => {
    const q = new URLSearchParams(window.location.search);
    const v = q.get("new_page");
    if (!v) return null;
    window.history.replaceState(window.history.state, "", window.location.pathname);
    return v === "error" ? { key: null, error: q.get("reason") ?? "" } : { key: v, error: null };
  });
  useEffect(() => { if (pending) setNewOpen(true); }, [pending]);
  const pagesQ = useQuery({ queryKey: ["editor-pages"], queryFn: fetchPageSummaries, refetchOnWindowFocus: false });
  const target = address;
  const pageQ = useQuery({
    queryKey: ["editor-page", target],
    queryFn: () => target ? fetchPageByAddress(target) : Promise.resolve(null),
    enabled: !!target,
    gcTime: 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const dialog = <NewPageDialog open={newOpen} onOpenChange={(o) => { setNewOpen(o); if (!o) setPending(null); }} pendingKey={pending?.key} connectError={pending?.error} />;

  if (pagesQ.isError || pageQ.isError) {
    const expired = [pagesQ.error, pageQ.error].some((e) => e?.message === uiText.sessionExpired);
    return (
      <Centered>
        <AlertCircle className="mx-auto h-6 w-6 text-destructive" />
        {expired ? <p>{uiText.sessionExpired}</p> : <p>{t.loadError}</p>}
        <Button onClick={() => { if (expired) window.location.reload(); else { void pagesQ.refetch(); void pageQ.refetch(); } }}>{expired ? uiText.reload : uiText.retry}</Button>
      </Centered>
    );
  }

  if (pagesQ.isSuccess && !address) {
    return (
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
        <header className="relative z-10 flex items-center gap-3 border-b px-3 py-2 sm:px-4">
          <PageSwitcher pages={pagesQ.data} onNewPage={() => setNewOpen(true)} />
        </header>
        <main className="relative flex min-h-0 flex-1 items-center justify-center bg-muted/50 px-4 py-6">
          <svg aria-hidden="true" viewBox="0 0 1000 1000" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible text-primary">
            <defs><marker id="channel-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M 1 1 L 8 5 L 1 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></marker></defs>
            <path d="M 470 300 C 420 170, 150 200, 115 -8" fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" markerEnd="url(#channel-arrow)" />
          </svg>
          <PhoneFrame>
            <div className="flex h-full flex-col items-center justify-center gap-4 bg-background px-6 text-center">
              <LayoutList className="h-8 w-8 text-primary" aria-hidden="true" />
              <p className="text-xl font-semibold">{t.selectChannel}</p>
            </div>
          </PhoneFrame>
        </main>
        {dialog}
      </div>
    );
  }

  if (pageQ.isSuccess && pageQ.data === null) {
    return (
      <Centered>
        <p className="font-medium">{t.pageMissing}</p>
        <Button asChild><Link to="/">{t.backToEditor}</Link></Button>
      </Centered>
    );
  }

  if (!pageQ.data || !pagesQ.data) return <EditorSkeleton />;

  return (
    <>
      <Workspace key={pageQ.data.page.id} initial={pageQ.data} pages={pagesQ.data} onNewPage={() => setNewOpen(true)} />
      {dialog}
    </>
  );
}

function Workspace({ initial, pages, onNewPage }: {
  initial: { page: PageData; blocks: BlockData[] }; pages: PageSummary[]; onNewPage: () => void;
}) {
  const qc = useQueryClient();
  const [savedAddress, setSavedAddress] = useState(initial.page.address);
  const [mobileView, setMobileView] = useState<"panel" | "preview">("panel");

  const onSaved = useCallback((p: PageData) => {
    setSavedAddress(p.address);
    if (window.location.pathname !== editPath(p.address)) window.history.replaceState(window.history.state, "", editPath(p.address));
    void qc.invalidateQueries({ queryKey: ["editor-pages"] });
  }, [qc]);

  const ed = useEditorState(initial, { onSaved });
  const feed = useQuery({ queryKey: ["instagram-feed", initial.page.id], queryFn: () => getFeed(initial.page.id ?? "") });
  const profile = ed.blocks.find((b) => b.type === "profile");
  const avatar = profile?.type === "profile" ? profile.content.avatar_url : null;
  // The bit.ly link is what goes in the Instagram bio; it follows the address (production only).
  const shortKey = ["short-link", initial.page.id, savedAddress];
  const short = useQuery({ queryKey: shortKey, queryFn: () => backend.shortLink(initial.page.id!), refetchOnWindowFocus: false });
  const publicUrl = short.data ?? publicPageUrl(savedAddress);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <header className="flex items-center justify-between gap-3 border-b px-3 py-2 sm:px-4">
        <PageSwitcher current={{ ...ed.page, avatar_url: avatar }} pages={pages} onNewPage={onNewPage} />
        <SaveIndicator status={ed.status} message={ed.errorMessage} onRetry={ed.retry} />
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2 sm:px-4">
        <ShortLinkBar url={publicUrl} pageId={initial.page.id} queryKey={shortKey} />
        <span className="flex-1" />
        <Button variant="secondary" size="sm" className="lg:hidden" onClick={() => setMobileView((v) => (v === "panel" ? "preview" : "panel"))}>
          {mobileView === "panel" ? <><Eye className="h-3.5 w-3.5" />{t.showPreview}</> : <><PencilLine className="h-3.5 w-3.5" />{t.showPanel}</>}
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,600px)]">
        <div className={cn("min-h-0 overflow-y-auto bg-muted/50 lg:block", mobileView === "preview" ? "block" : "hidden")}>
          <div className="flex flex-col items-center gap-3 px-4 py-6">
            <PhoneFrame>
              <PageRenderer page={ed.page} blocks={ed.blocks} fullScreen={false} preview syncedPosts={feed.data} />
            </PhoneFrame>
            <LastUpdated at={ed.lastSaved} />
          </div>
        </div>

        <div className={cn("min-h-0 flex-col border-l lg:flex", mobileView === "panel" ? "flex" : "hidden")}>
          <Tabs defaultValue="blocks" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="h-auto w-full justify-start gap-0 overflow-x-auto rounded-none border-b bg-transparent p-0">
              {([
                ["blocks", LayoutList, t.tabs.blocks],
                ["design", Palette, t.tabs.design],
                ["analytics", BarChart3, t.tabs.analytics],
                ["settings", Settings, t.tabs.settings],
              ] as const).map(([v, Icon, label]) => (
                <TabsTrigger key={v} value={v}
                  className="flex-1 gap-1.5 rounded-none border-b-2 border-transparent py-3 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none">
                  <Icon className="h-4 w-4" />{label}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <TabsContent value="blocks" className="mt-0"><BlocksTab blocks={ed.blocks} setBlocks={ed.setBlocks} pageId={ed.page.id} /></TabsContent>
              <TabsContent value="design" className="mt-0"><DesignTab page={ed.page} update={ed.updatePage} /></TabsContent>
              <TabsContent value="analytics" className="mt-0"><AnalyticsTab pageId={ed.page.id} shortUrl={short.data ?? null} /></TabsContent>
              <TabsContent value="settings" className="mt-0"><SettingsTab page={ed.page} savedAddress={savedAddress} update={ed.updatePage} blocks={ed.blocks} setBlocks={ed.setBlocks} /></TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-[660px] max-h-[calc(100dvh-220px)] min-h-[320px] w-[330px] max-w-full shrink-0 overflow-hidden rounded-[2.5rem] border-[10px] border-foreground bg-foreground shadow-xl">
      <div className="h-full w-full overflow-y-auto overflow-x-hidden rounded-[1.8rem] bg-background" style={{ scrollbarWidth: "none" }}>
        {children}
      </div>
    </div>
  );
}

function LastUpdated({ at }: { at?: string }) {
  const [, tick] = useState(0);
  useEffect(() => { const id = window.setInterval(() => tick((n) => n + 1), 30000); return () => window.clearInterval(id); }, []);
  if (!at) return null;
  return <p className="text-xs text-muted-foreground">{t.lastUpdated(formatDistanceToNow(new Date(at), { addSuffix: true }))}</p>;
}

function SaveIndicator({ status, message, onRetry }: { status: SaveStatus; message: string | null; onRetry: () => void }) {
  if (status === "idle") return null;
  return (
    <div className="flex shrink-0 items-center gap-1.5 text-xs" role="status" aria-live="polite">
      {status === "saving" && <><Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /><span className="text-muted-foreground">{t.saving}</span></>}
      {status === "saved" && <><Check className="h-3.5 w-3.5 text-primary" /><span className="text-muted-foreground">{t.saved}</span></>}
      {status === "error" && (
        <>
          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
          <span className="text-destructive" title={message ?? undefined}>{t.saveError}{message === t.address.taken ? ` — ${message}` : ""}</span>
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={onRetry}>{t.retry}</Button>
        </>
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-sm text-center"><CardContent className="space-y-4 p-8">{children}</CardContent></Card>
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="flex h-[100dvh] flex-col" aria-busy="true" aria-label={uiText.loading}>
      <div className="flex items-center gap-3 border-b p-3"><Skeleton className="h-11 w-60 rounded-full" /></div>
      <div className="border-b p-3"><Skeleton className="h-9 w-full max-w-xl" /></div>
      <div className="grid flex-1 lg:grid-cols-[1fr_600px]">
        <div className="hidden items-start justify-center bg-muted/50 py-6 lg:flex"><Skeleton className="h-[640px] w-[330px] rounded-[2.5rem]" /></div>
        <div className="space-y-3 border-l p-4">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      </div>
    </div>
  );
}
