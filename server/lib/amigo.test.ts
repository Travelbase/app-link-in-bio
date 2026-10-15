import { expect, test } from "bun:test";

import { toBrand } from "./amigo";

test("a brand without a primary colour is left out", () => {
  expect(toBrand({ attributes: { code: "X", name: { nl: "X" }, settingValues: { brandThemePrimaryColor: null } } })).toBeNull();
});

test("palette keys come from settingValues, lowercased, invalid ones null", () => {
  const brand = toBrand({
    attributes: {
      code: "OUT",
      name: { en: "Outpost North EN", nl: "Outpost North" },
      settingValues: { brandThemePrimaryColor: "#F5ECA2", brandThemeButtonColor: "#dfd9d7", brandThemeTextColor: "red" },
    },
  });
  expect(brand?.name).toBe("Outpost North");
  expect(brand?.palette.primary).toBe("#f5eca2");
  expect(brand?.palette.button).toBe("#dfd9d7");
  expect(brand?.palette.text).toBeNull();
});
