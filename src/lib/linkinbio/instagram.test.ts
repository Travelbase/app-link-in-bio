import { expect, mock, test } from "bun:test";

mock.module("./backend", () => ({ backend: {} }));
const { friendlyConnectError } = await import("./instagram");
const { uiText } = await import("@/lib/uiText");

test("an account without a tester role on a Development app gets the tester explanation", () => {
  const reason = "Unsupported request - method type: get";
  expect(friendlyConnectError(reason)).toEqual({ message: uiText.instagramNotTester, detail: reason });
  expect(friendlyConnectError("Onvoldoende ontwikkelaarsrol").message).toBe(uiText.instagramNotTester);
});

test("an unknown refusal is shown as Instagram worded it", () => {
  expect(friendlyConnectError("Rate limit reached")).toEqual({ message: "Rate limit reached" });
});
