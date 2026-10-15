/**
 * Cloud Run Job link-in-bio-daily, started by Cloud Scheduler at 05:00 UTC: syncs every
 * connected Instagram account (new posts, profile photo, token refresh). Replaces pg_cron.
 */
import { config } from "../lib/config";
import { migrate, sql } from "../lib/db";
import { message, syncPage } from "../lib/instagram";

const log = (severity: string, event: string, fields: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ severity, app: config.appId, event, ...fields }));

await migrate();
const connections = await sql()<{ page_id: string; username: string }[]>`select page_id, username from instagram_connections`;
let failed = 0;
for (const c of connections) {
  try {
    await syncPage(c.page_id);
    log("INFO", "data.sync.completed", { page_id: c.page_id, username: c.username });
  } catch (e) {
    failed++;
    log("ERROR", "data.sync.failed", { page_id: c.page_id, username: c.username, error: message(e) });
  }
}
log(failed ? "WARNING" : "INFO", "job.completed", { synced: connections.length - failed, failed });
await sql().end();
// A failed account is retried tomorrow and shows in the editor; the job itself succeeded.
process.exit(0);
