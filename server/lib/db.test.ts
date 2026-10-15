import { expect, test } from "bun:test";

import { splitSocketHost } from "./db";

test("Cloud SQL socket URL becomes a placeholder host plus the socket directory", () => {
  expect(splitSocketHost("postgres://app:pw@/link_in_bio?host=/cloudsql/travelbase-apps:europe-west1:atlas-db")).toEqual({
    url: "postgres://app:pw@localhost/link_in_bio",
    host: "/cloudsql/travelbase-apps:europe-west1:atlas-db",
  });
  expect(splitSocketHost("postgres://u:p@localhost:5432/db")).toEqual({ url: "postgres://u:p@localhost:5432/db", host: null });
});
