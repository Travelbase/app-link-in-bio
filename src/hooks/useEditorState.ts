import { useCallback, useEffect, useRef, useState } from "react";
import type { BlockData, PageData } from "@/lib/linkinbio/types";
import type { EditorPage } from "@/lib/linkinbio/backend";
import { discardDraft, fetchPageByAddress, publishPage, saveDraft } from "@/lib/linkinbio/api";
import { emptyHistory, record, redo as redoStep, undo as undoStep, type History } from "@/lib/linkinbio/history";
import { uiText } from "@/lib/uiText";

export type SaveStatus = "idle" | "saving" | "saved" | "error";
const AUTOSAVE_MS = 1000;

type Snapshot = { page: PageData; blocks: BlockData[] };

interface Options {
  onSaved?: (page: PageData) => void;
  onPublished?: (page: PageData) => void;
}

export interface EditOptions {
  /** False makes this edit its own undo step, even right after a similar one (e.g. an import). */
  coalesce?: boolean;
}

const errorText = (e: unknown) => {
  const err = e as { code?: string; message?: string };
  return err.code === "23505" || err.code === "address_taken" ? uiText.editor.address.taken : err.message ?? null;
};

/**
 * Holds the editor's working copy of a page, autosaves it as the draft ~1s after the last change,
 * publishes the draft on request, and keeps undo/redo history in memory.
 */
export function useEditorState(initial: EditorPage, opts: Options = {}) {
  const [page, setPage] = useState<PageData>(initial.page);
  const [blocks, setBlocksState] = useState<BlockData[]>(initial.blocks);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(initial.hasDraft);
  const [publishedAt, setPublishedAt] = useState<string | undefined>(initial.page.published_at);
  const [liveAddress, setLiveAddress] = useState(initial.liveAddress);
  const [busy, setBusy] = useState<"publishing" | "discarding" | null>(null);
  const [historyState, setHistoryState] = useState<History<Snapshot>>(emptyHistory);

  const latest = useRef<Snapshot>({ page, blocks });
  latest.current = { page, blocks };
  const history = useRef(historyState);
  const version = useRef(0);
  const savedVersion = useRef(0);
  const saving = useRef<Promise<boolean> | null>(null);
  const timer = useRef<number>();
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const setHistory = useCallback((h: History<Snapshot>) => {
    history.current = h;
    setHistoryState(h);
  }, []);

  const save = useCallback((): Promise<boolean> => {
    window.clearTimeout(timer.current);
    if (saving.current) return saving.current;
    const run = async () => {
      setStatus("saving");
      const v = version.current;
      const { page: p, blocks: bs } = latest.current;
      try {
        await saveDraft(p, bs);
        savedVersion.current = v;
        setHasDraft(true);
        setErrorMessage(null);
        optsRef.current.onSaved?.(p);
      } catch (e) {
        setErrorMessage(errorText(e));
        setStatus("error");
        return false;
      } finally {
        saving.current = null;
      }
      if (version.current !== savedVersion.current) timer.current = window.setTimeout(save, AUTOSAVE_MS);
      else setStatus("saved");
      return true;
    };
    saving.current = run();
    return saving.current;
  }, []);

  /** Waits for every pending change to reach the draft. False when a save failed. */
  const flush = useCallback(async () => {
    while (saving.current) await saving.current;
    if (version.current !== savedVersion.current && !(await save())) return false;
    return version.current === savedVersion.current;
  }, [save]);

  const markDirty = useCallback(() => {
    version.current += 1;
    setHasDraft(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(save, AUTOSAVE_MS);
  }, [save]);

  const remember = useCallback((key: string, edit?: EditOptions) => {
    setHistory(record(history.current, latest.current, edit?.coalesce === false ? null : key, Date.now()));
  }, [setHistory]);

  const updatePage = useCallback((patch: Partial<PageData>, edit?: EditOptions) => {
    remember(`page:${Object.keys(patch).sort().join(",")}`, edit);
    setPage((p) => ({ ...p, ...patch }));
    markDirty();
  }, [markDirty, remember]);

  const setBlocks = useCallback((fn: (prev: BlockData[]) => BlockData[], edit?: EditOptions) => {
    remember("blocks", edit);
    setBlocksState(fn);
    markDirty();
  }, [markDirty, remember]);

  const restore = useCallback((s: Snapshot) => {
    latest.current = s;
    setPage(s.page);
    setBlocksState(s.blocks);
    markDirty();
  }, [markDirty]);

  const undo = useCallback(() => {
    const step = undoStep(history.current, latest.current);
    if (!step) return;
    setHistory(step.history);
    restore(step.state);
  }, [restore, setHistory]);

  const redo = useCallback(() => {
    const step = redoStep(history.current, latest.current);
    if (!step) return;
    setHistory(step.history);
    restore(step.state);
  }, [restore, setHistory]);

  /** Saves what is pending, then makes the draft live. Throws with a readable message. */
  const publish = useCallback(async () => {
    setBusy("publishing");
    try {
      if (!(await flush())) throw new Error(uiText.editor.saveError);
      const at = await publishPage(latest.current.page.id!);
      setPublishedAt(at);
      setLiveAddress(latest.current.page.address);
      if (version.current === savedVersion.current) setHasDraft(false);
      optsRef.current.onPublished?.(latest.current.page);
    } catch (e) {
      throw new Error(errorText(e) ?? uiText.editor.publishError);
    } finally {
      setBusy(null);
    }
  }, [flush]);

  /** Throws the draft away and loads the live page. Undo brings the draft back. */
  const discard = useCallback(async () => {
    setBusy("discarding");
    try {
      await flush();
      await discardDraft(latest.current.page.id!);
      const live = await fetchPageByAddress(liveAddress);
      if (!live) throw new Error(uiText.editor.loadError);
      setHistory(record(history.current, latest.current, null, Date.now()));
      latest.current = { page: live.page, blocks: live.blocks };
      setPage(live.page);
      setBlocksState(live.blocks);
      version.current += 1;
      savedVersion.current = version.current;
      setHasDraft(false);
      setStatus("idle");
    } finally {
      setBusy(null);
    }
  }, [flush, liveAddress, setHistory]);

  // Flush pending changes when leaving this page; warn before closing the tab.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (version.current !== savedVersion.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (version.current !== savedVersion.current) void save();
      window.clearTimeout(timer.current);
    };
  }, [save]);

  return {
    page, blocks, updatePage, setBlocks, status, errorMessage, retry: save,
    hasDraft, publishedAt, liveAddress, busy, publish, discard,
    undo, redo, canUndo: historyState.past.length > 0, canRedo: historyState.future.length > 0,
  };
}
