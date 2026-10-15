import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import postgres from "postgres";

import { config } from "./config";

/**
 * postgres.js rather than Bun's own SQL client: Bun's cannot parse the Cloud SQL unix-socket URL
 * (`postgres://app:pw@/link_in_bio?host=/cloudsql/<instance>`). Same approach as atlas.
 */
let client: postgres.Sql | null = null;

export function sql(): postgres.Sql {
  if (client) return client;
  const url = config.databaseUrl();
  if (!url) throw new Error("DATABASE_URL is not set on this service.");
  const { url: parsed, host } = splitSocketHost(url);
  try {
    client = postgres(parsed, { ...(host ? { host } : {}), max: 5, idle_timeout: 30, onnotice: () => {} });
  } catch (error) {
    // postgres.js puts the whole URL, password included, in its error message.
    throw new Error(`DATABASE_URL could not be parsed (${error instanceof Error ? error.name : "error"}).`);
  }
  return client;
}

/**
 * Cloud SQL's socket form has an empty host, which postgres.js cannot parse, and it ignores
 * `?host=`. So the socket directory goes in as the `host` option and the URL gets a placeholder.
 */
export function splitSocketHost(url: string): { url: string; host: string | null } {
  const match = url.match(/[?&]host=([^&]+)/);
  const host = match ? decodeURIComponent(match[1]!) : null;
  if (!host?.startsWith("/")) return { url, host: null };
  const cleaned = url.replace(/@\//, "@localhost/").replace(/([?&])host=[^&]+&?/, "$1").replace(/[?&]$/, "");
  return { url: cleaned, host };
}

const MIGRATIONS = path.join(import.meta.dir, "..", "migrations");

/** Apply every migration file not yet applied, in name order, in one transaction. */
export async function migrate(log: (msg: string) => void = () => {}): Promise<string[]> {
  return sql().begin(async (tx) => {
    // Service and job starting at once: the second waits and finds nothing left to do.
    await tx`select pg_advisory_xact_lock(7461002)`;
    await tx`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
    const done = new Set((await tx<{ name: string }[]>`select name from schema_migrations`).map((r) => r.name));
    const applied: string[] = [];
    for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
      if (done.has(file)) continue;
      await tx.unsafe(readFileSync(path.join(MIGRATIONS, file), "utf8"));
      await tx`insert into schema_migrations (name) values (${file})`;
      log(`applied ${file}`);
      applied.push(file);
    }
    return applied;
  });
}
