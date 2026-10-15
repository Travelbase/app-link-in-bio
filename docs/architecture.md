# Architecture

One React SPA (Vite, react-router) that runs in two places:

```
Lovable preview / staging                      Production (GCP, travelbase-apps)
──────────────────────────                     ─────────────────────────────────
browser ── supabase.ts ──▶ Lovable Cloud        browser ── http.ts ──▶ apps-gateway ──▶ Cloud Run link-in-bio
           tables, page-images,                                         (Logto, /public/)   server/server.ts (Bun, app-api-kit)
           edge functions (Instagram)                                                        ├─ Cloud SQL atlas-db / link_in_bio
                                                                                             ├─ GCS travelbase-link-in-bio-images
                                                                                             ├─ Instagram Graph API
                                                                                             └─ Bitly API
                                                Cloud Scheduler 05:00 UTC ──▶ Cloud Run Job link-in-bio-daily
```

- `src/lib/linkinbio/backend/types.ts` is the one data interface. `VITE_DATA_BACKEND=http` (set
  in the Dockerfile) picks `http.ts`; anything else picks `supabase.ts`. The production bundle
  does not contain the Supabase client.
- `VITE_APP_BASE=/a/link-in-bio/` sets the router base. Assets are built under
  `/a/link-in-bio/public/`, so public pages load without a login.
- `server/` has its own `package.json`: the kit comes from GitHub Packages, which Lovable cannot
  install, so the root `package.json` does not know about it.

## Routes in production

| Path under `/a/link-in-bio/`           | Login | What                                         |
|----------------------------------------|-------|----------------------------------------------|
| `` , `edit/<address>`                  | staff | the editor (SPA)                             |
| `api/*`                                | staff | editor API, docs at `api/docs`               |
| `api/images`                           | staff | image upload (body is the file)              |
| `public/<address>`                     | none  | public page (SPA)                            |
| `public/assets/*`                      | none  | the SPA's JS and CSS                         |
| `public/api/page`, `public/api/feed`   | none  | what a public page reads, docs at `public/api/docs` |
| `public/api/instagram/callback`        | none  | Instagram's OAuth redirect                   |
| `public/api/instagram/deauthorize`, `…/data-deletion` | none | Meta's signed callbacks  |

## Bitly

The editor asks `api/short-link` when a page opens; the server creates
`bit.ly/<address>` (or `bit.ly/tb-<address>`, or Bitly's random link) for
`…/public/<address>` and keeps it in `page_short_links`. A renamed page gets a new link; the old
one keeps pointing at the old address. The Analytics tab reads clicks, countries and referrers
from Bitly through `api/link-stats`.
