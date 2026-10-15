import { expect, test } from "bun:test";

import { fromDataUrl, isUnsplashImage } from "./picker";

test("a base64 data URL comes back as bytes and type", () => {
  const { bytes, contentType } = fromDataUrl("data:image/jpeg;base64,AAEC");
  expect(contentType).toBe("image/jpeg");
  expect([...bytes]).toEqual([0, 1, 2]);
});

test("only images.unsplash.com over https is fetched", () => {
  expect(isUnsplashImage("https://images.unsplash.com/photo-1?w=1080")).toBe(true);
  expect(isUnsplashImage("http://images.unsplash.com/photo-1")).toBe(false);
  expect(isUnsplashImage("https://images.unsplash.com.evil.io/x")).toBe(false);
  expect(isUnsplashImage("http://metadata.google.internal/")).toBe(false);
});
