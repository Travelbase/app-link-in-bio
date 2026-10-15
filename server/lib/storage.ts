import { config } from "./config";

/**
 * Images live in a public Cloud Storage bucket (IMAGE_BUCKET), same object names as Lovable's
 * page-images bucket. Plain JSON API with the service account's token from the metadata server,
 * so no SDK. Locally GCS_ACCESS_TOKEN stands in (`gcloud auth print-access-token`).
 */
let cached: { token: string; until: number } | null = null;

async function accessToken(): Promise<string> {
  if (process.env.GCS_ACCESS_TOKEN) return process.env.GCS_ACCESS_TOKEN;
  if (cached && cached.until > Date.now()) return cached.token;
  const res = await fetch("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token", {
    headers: { "Metadata-Flavor": "Google" },
  });
  if (!res.ok) throw new Error(`No storage token from the metadata server (${res.status}).`);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: body.access_token, until: Date.now() + (body.expires_in - 60) * 1000 };
  return body.access_token;
}

const bucket = () => {
  const b = config.imageBucket();
  if (!b) throw new Error("IMAGE_BUCKET is not set on this service.");
  return b;
};

export const imageBaseUrl = () => `https://storage.googleapis.com/${bucket()}`;

export const objectUrl = (name: string) => `${imageBaseUrl()}/${name.split("/").map(encodeURIComponent).join("/")}`;

/** The object name behind one of our image URLs, or null for any other URL. */
export function objectName(url: string): string | null {
  const prefix = `${imageBaseUrl()}/`;
  if (!url.startsWith(prefix)) return null;
  return decodeURIComponent(url.slice(prefix.length).split("?")[0]!);
}

/** Stores bytes under `name` (overwriting) and returns the public URL. */
export async function putObject(name: string, body: ArrayBuffer, contentType: string): Promise<string> {
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${bucket()}/o?uploadType=media&name=${encodeURIComponent(name)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": contentType },
    body,
  });
  if (!res.ok) throw new Error(`Image could not be stored (${res.status}).`);
  return objectUrl(name);
}

export async function deleteObject(name: string): Promise<void> {
  const res = await fetch(`https://storage.googleapis.com/storage/v1/b/${bucket()}/o/${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${await accessToken()}` },
  });
  if (!res.ok && res.status !== 404) throw new Error(`Image could not be deleted (${res.status}).`);
}
