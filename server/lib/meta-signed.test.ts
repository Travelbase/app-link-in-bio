import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";

import { verifySignedRequest } from "./meta-signed";

const sign = (payload: object, secret: string) => {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${createHmac("sha256", secret).update(body).digest("base64url")}.${body}`;
};

describe("verifySignedRequest", () => {
  test("accepts Meta's signature and returns the user id as a string", () => {
    expect(verifySignedRequest(sign({ user_id: 17841400000000000, algorithm: "HMAC-SHA256" }, "s3cret"), "s3cret")?.user_id).toBe("17841400000000000");
  });
  test("refuses another secret, a tampered payload and garbage", () => {
    const signed = sign({ user_id: "1" }, "s3cret");
    expect(verifySignedRequest(signed, "other")).toBeNull();
    expect(verifySignedRequest(signed.replace(/\.(.)/, ".A"), "s3cret")).toBeNull();
    expect(verifySignedRequest("abc.def", "s3cret")).toBeNull();
    expect(verifySignedRequest("", "s3cret")).toBeNull();
  });
});
