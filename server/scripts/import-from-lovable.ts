/**
 * One-off: copies the pages (imported from Later), their blocks and the templates from Lovable Cloud
 * into Cloud SQL, and every image they use from Lovable's page-images bucket into IMAGE_BUCKET,
 * under the same name. URLs in the data are rewritten to the new bucket.
 *
 * Runs inside the production image, so it has the database socket and the bucket rights:
 *   gcloud run jobs execute link-in-bio-daily --region europe-west1 --args run,scripts/import-from-lovable.ts --wait
 * Safe to run again: rows are upserted by id (templates by key), images overwritten.
 * Not copied: Instagram connections and synced posts. Accounts connect again in production.
 */
import { migrate, sql } from "../lib/db";
import { objectUrl, putObject } from "../lib/storage";

const SUPABASE_URL = process.env.LOVABLE_SUPABASE_URL || "https://pqgcdnytqcrlgzyrouqi.supabase.co";
// The publishable key from the repo's .env: the tables and the bucket are readable by anyone.
const KEY = process.env.LOVABLE_SUPABASE_KEY || "sb_publishable_u3S8tbpKML4PV6eI1ADClA_8z47rrlS";
const STORAGE_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/page-images/`;

async function rows<T>(table: string, order: string): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&order=${order}`, { headers: { apikey: KEY } });
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T[];
}

/** Every Lovable image URL in a value, found anywhere in nested JSON. */
function collect(value: unknown, found: Set<string>) {
  if (typeof value === "string") {
    if (value.startsWith(STORAGE_PREFIX)) found.add(value.split("?")[0]!);
  } else if (Array.isArray(value)) value.forEach((v) => collect(v, found));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => collect(v, found));
}

/** The same value with Lovable image URLs pointing at the new bucket (query strings kept). */
function rewrite<T>(value: T): T {
  if (typeof value === "string") {
    return (value.startsWith(STORAGE_PREFIX) ? objectUrl(decodeURIComponent(value.slice(STORAGE_PREFIX.length).split("?")[0]!)) + (value.includes("?") ? `?${value.split("?")[1]}` : "") : value) as T;
  }
  if (Array.isArray(value)) return value.map(rewrite) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rewrite(v)])) as T;
  return value;
}

type Row = Record<string, any>;

await migrate((msg) => console.log(msg));
const [pages, blocks, templates] = await Promise.all([
  rows<Row>("pages", "created_at"),
  rows<Row>("blocks", "page_id,position"),
  rows<Row>("page_templates", "key"),
]);
console.log(`Lovable Cloud: ${pages.length} pages, ${blocks.length} blocks, ${templates.length} templates`);

const images = new Set<string>([`${STORAGE_PREFIX}travelbase%2FTB_Horizontal_Green.png`]);
collect([pages, blocks, templates], images);
let copied = 0;
const failed: string[] = [];
for (const url of images) {
  const name = decodeURIComponent(url.slice(STORAGE_PREFIX.length));
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) }).catch((e) => ({ ok: false, status: String(e) }) as const);
  if (!res.ok) {
    failed.push(`${name} (${res.status})`);
    continue;
  }
  await putObject(name, await res.arrayBuffer(), res.headers.get("content-type") ?? "application/octet-stream");
  copied++;
}
console.log(`Images: ${copied} copied${failed.length ? `, ${failed.length} missing in Lovable: ${failed.join(", ")}` : ""}`);

const PAGE_COLUMNS = [
  "id", "address", "instagram_handle", "display_name", "background_type", "background_color", "background_image_url", "text_color",
  "font", "block_color", "block_text_color", "block_shape", "block_style", "block_shadow", "button_accent_color", "footer_logo_url",
  "market", "show_travelbase_logo", "created_at", "updated_at",
];
const pick = (row: Row, columns: string[]) => Object.fromEntries(columns.filter((c) => c in row).map((c) => [c, row[c]]));

await sql().begin(async (tx) => {
  // Keep Lovable's timestamps, so "last edited" stays true.
  await tx`alter table pages disable trigger pages_updated_at`;
  await tx`alter table blocks disable trigger blocks_updated_at`;
  for (const t of templates) {
    await tx`insert into page_templates (key, name, design, blocks)
      values (${t.key}, ${t.name}, ${tx.json(rewrite(t.design))}, ${tx.json(rewrite(t.blocks))})
      on conflict (key) do update set name = excluded.name, design = excluded.design, blocks = excluded.blocks`;
  }
  for (const p of pages) {
    const row = rewrite(pick(p, PAGE_COLUMNS));
    const update = Object.keys(row).filter((c) => c !== "id");
    await tx`insert into pages ${tx(row as never)} on conflict (id) do update set ${tx(pick(row, update) as never)}`;
  }
  for (const b of blocks) {
    await tx`insert into blocks (id, page_id, type, position, is_visible, content, created_at, updated_at)
      values (${b.id}, ${b.page_id}, ${b.type}, ${b.position}, ${b.is_visible}, ${tx.json(rewrite(b.content))}, ${b.created_at}, ${b.updated_at})
      on conflict (id) do update set type = excluded.type, position = excluded.position, is_visible = excluded.is_visible, content = excluded.content`;
  }
  await tx`alter table pages enable trigger pages_updated_at`;
  await tx`alter table blocks enable trigger blocks_updated_at`;
});
console.log("Database: done");
await sql().end();
process.exit(0);
