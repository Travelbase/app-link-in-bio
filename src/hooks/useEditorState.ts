import { useCallback, useEffect, useRef, useState } from "react";
import type { BlockData, PageData } from "@/lib/linkinbio/types";
import { savePageAndBlocks } from "@/lib/linkinbio/api";
import { uiText } from "@/lib/uiText";

export type SaveStatus = "idle" | "saving" | "saved" | "error";
const AUTOSAVE_MS = 1000;

interface Options {
  onSaved?: (page: PageData) => void;
}

/** Holds the editor's working copy of a page and autosaves ~1s after the last change. */
export function useEditorState(initial: { page: PageData; blocks: BlockData[] }, opts: Options = {}) {
  const [page, setPage] = useState<PageData>(initial.page);
  const [blocks, setBlocksState] = useState<BlockData[]>(initial.blocks);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | undefined>(initial.page.updated_at);

  const latest = useRef({ page, blocks });
  latest.current = { page, blocks };
  const savedIds = useRef(new Set(initial.blocks.map((b) => b.id!)));
  const version = useRef(0);
  const savedVersion = useRef(0);
  const saving = useRef(false);
  const timer = useRef<number>();
  const onSavedRef = useRef(opts.onSaved);
  onSavedRef.current = opts.onSaved;

  const save = useCallback(async (): Promise<void> => {
    window.clearTimeout(timer.current);
    if (saving.current) return;
    saving.current = true;
    setStatus("saving");
    const v = version.current;
    const { page: p, blocks: bs } = latest.current;
    const ids = new Set(bs.map((b) => b.id!));
    const removed = [...savedIds.current].filter((id) => !ids.has(id));
    let ok = false;
    try {
      const updated = await savePageAndBlocks(p, bs, removed);
      savedIds.current = ids;
      savedVersion.current = v;
      setLastSaved(updated);
      setErrorMessage(null);
      ok = true;
      onSavedRef.current?.(p);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setErrorMessage(err.code === "23505" || err.code === "address_taken" ? uiText.editor.address.taken : err.message ?? null);
      setStatus("error");
    } finally {
      saving.current = false;
    }
    if (ok) {
      if (version.current !== savedVersion.current) timer.current = window.setTimeout(save, AUTOSAVE_MS);
      else setStatus("saved");
    }
  }, []);

  const markDirty = useCallback(() => {
    version.current += 1;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(save, AUTOSAVE_MS);
  }, [save]);

  const updatePage = useCallback((patch: Partial<PageData>) => {
    setPage((p) => ({ ...p, ...patch }));
    markDirty();
  }, [markDirty]);

  const setBlocks = useCallback((fn: (prev: BlockData[]) => BlockData[]) => {
    setBlocksState(fn);
    markDirty();
  }, [markDirty]);

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

  return { page, blocks, updatePage, setBlocks, status, errorMessage, lastSaved, retry: save };
}
