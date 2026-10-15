import { expect, test } from "bun:test";

import { COALESCE_MS, emptyHistory, record, redo, undo } from "./history";

test("undo and redo walk back and forth", () => {
  let h = emptyHistory<string>();
  h = record(h, "a", "x", 0);
  h = record(h, "b", "y", 10);
  const u1 = undo(h, "c")!;
  expect(u1.state).toBe("b");
  const u2 = undo(u1.history, "b")!;
  expect(u2.state).toBe("a");
  expect(undo(u2.history, "a")).toBeNull();
  const r1 = redo(u2.history, "a")!;
  expect(r1.state).toBe("b");
  expect(redo(r1.history, "b")!.state).toBe("c");
});

test("typing in one field is one step; a pause or another field starts a new one", () => {
  let h = emptyHistory<string>();
  h = record(h, "", "title", 0);
  h = record(h, "H", "title", 200);
  h = record(h, "Hi", "title", 400);
  expect(h.past).toEqual([""]);
  h = record(h, "Hi!", "title", 400 + COALESCE_MS);
  h = record(h, "Hi!!", "label", 400 + COALESCE_MS + 10);
  expect(h.past).toEqual(["", "Hi!", "Hi!!"]);
});

test("a null key never merges, and a new edit clears redo", () => {
  let h = emptyHistory<string>();
  h = record(h, "a", null, 0);
  h = record(h, "b", null, 1);
  expect(h.past).toEqual(["a", "b"]);
  const u = undo(h, "c")!;
  expect(record(u.history, "b", "x", 2).future).toEqual([]);
});
