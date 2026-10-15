import { expect, test } from "bun:test";

import { mergeStats } from "./links";

test("visits of the old and new name add up", () => {
  const a = { link: "a", daily: [{ day: "2026-10-14", clicks: 1 }, { day: "2026-10-15", clicks: 2 }], countries: [{ country: "BE", clicks: 3 }], referrers: [] };
  const b = { link: "b", daily: [{ day: "2026-10-14", clicks: 0 }, { day: "2026-10-15", clicks: 5 }], countries: [{ country: "BE", clicks: 1 }, { country: "NL", clicks: 4 }], referrers: [{ name: "instagram.com", clicks: 5 }] };
  const m = mergeStats([a, b]);
  expect(m.daily).toEqual([{ day: "2026-10-14", clicks: 1 }, { day: "2026-10-15", clicks: 7 }]);
  expect(m.countries).toEqual([{ country: "BE", clicks: 4 }, { country: "NL", clicks: 4 }]);
  expect(m.referrers).toEqual([{ name: "instagram.com", clicks: 5 }]);
});
