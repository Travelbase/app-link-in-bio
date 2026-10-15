/**
 * Undo/redo for the editor, in browser memory only. Edits of the same kind in quick succession
 * (typing in one field) become one step.
 */
export interface History<T> {
  past: T[];
  future: T[];
  lastKey: string | null;
  lastAt: number;
}

export const COALESCE_MS = 1000;
const LIMIT = 200;

export const emptyHistory = <T>(): History<T> => ({ past: [], future: [], lastKey: null, lastAt: 0 });

/** Records `before` (the state ahead of an edit) as an undo step. A null key never merges. */
export function record<T>(h: History<T>, before: T, key: string | null, now: number): History<T> {
  const merge = key !== null && key === h.lastKey && now - h.lastAt < COALESCE_MS && h.past.length > 0;
  return {
    past: merge ? h.past : [...h.past, before].slice(-LIMIT),
    future: [],
    lastKey: key,
    lastAt: now,
  };
}

export function undo<T>(h: History<T>, current: T): { history: History<T>; state: T } | null {
  if (!h.past.length) return null;
  return {
    history: { past: h.past.slice(0, -1), future: [current, ...h.future], lastKey: null, lastAt: 0 },
    state: h.past[h.past.length - 1],
  };
}

export function redo<T>(h: History<T>, current: T): { history: History<T>; state: T } | null {
  if (!h.future.length) return null;
  return {
    history: { past: [...h.past, current], future: h.future.slice(1), lastKey: null, lastAt: 0 },
    state: h.future[0],
  };
}
