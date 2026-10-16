import { expect, test } from "bun:test";
import { matchRoutes } from "react-router-dom";

import { routerBasename } from "./urls";

const routes = [{ path: "/" }, { path: "/edit/:address" }, { path: "/:address" }];
const matched = (base: string, url: string) => matchRoutes(routes, url, routerBasename(base))?.[0].route.path;

test("production opens the editor with or without the trailing slash", () => {
  expect(matched("/a/link-in-bio/", "/a/link-in-bio")).toBe("/");
  expect(matched("/a/link-in-bio/", "/a/link-in-bio/")).toBe("/");
  expect(matched("/a/link-in-bio/", "/a/link-in-bio/edit/surf")).toBe("/edit/:address");
});

test("the Lovable preview at the root keeps its routes", () => {
  expect(matched("/", "/")).toBe("/");
  expect(matched("/", "/surf")).toBe("/:address");
});
