# Runbook

Production: `https://apps.travelbase.eu/a/link-in-bio/` (editor, staff login) and
`https://apps.travelbase.eu/a/link-in-bio/public/<address>` (public pages, no login).
Staging: the Lovable preview, `https://app-link-in-bio.lovable.app`, on Lovable Cloud.

## Branches

| Branch    | Who writes            | Where it runs                                     |
|-----------|-----------------------|---------------------------------------------------|
| `lovable` | Lovable's GitHub sync | Lovable Cloud (Supabase `pqgcdnytqcrlgzyrouqi`), test data, no Instagram |
| `main`    | a developer, by PR    | Cloud Run `link-in-bio` + Cloud SQL, Instagram, Bitly |

Lovable's project settings point its GitHub sync at `lovable`. Never at `main`.

## Releasing Lovable work

1. PR `lovable` → `main`.
2. Check the diff for things production does not have yet:
   - a new file in `supabase/migrations`: write the same change, additive, in `server/migrations/000N_*.sql`;
   - a change in `supabase/functions`: port it to `server/`;
   - a component reading Supabase itself instead of `backend`: move it into `src/lib/linkinbio/backend/` (both implementations).
3. Merge. The workflow tests, builds and deploys the service and the job. Migrations run when either starts.
4. Merge `main` back into `lovable`, so Lovable keeps the ported code.

## First setup (done 15 Oct 2026)

1. `server/scripts/setup-gcp.sh`: service account `link-in-bio`, database `link_in_bio` (user
   `link_in_bio`) on the existing instance `atlas-db`, public bucket `travelbase-link-in-bio-images`, secret slots.
2. The two secrets below, by hand.
3. GitHub: repository secrets `WIF_PROVIDER` and `DEPLOY_SERVICE_ACCOUNT` (values in
   travelbase-apps `templates/lovable-app/README.md`), and access for this repository to the package
   `@travelbase/app-api-kit` (GitHub → Travelbase → Packages → app-api-kit → Package settings →
   Manage Actions access → Add repository, Read).
4. `registry/link-in-bio.yaml` in travelbase-apps merged, so the gateway routes `/a/link-in-bio/`.
5. Push to `main`, then `server/scripts/setup-scheduler.sh`.
6. Copy the data once: `gcloud run jobs execute link-in-bio-daily --region europe-west1 --args run,scripts/import-from-lovable.ts --wait`.

## Secrets (Secret Manager, travelbase-apps)

| Secret                             | What                                                                 |
|------------------------------------|----------------------------------------------------------------------|
| `link-in-bio-database-url`         | `postgres://link_in_bio:…@/link_in_bio?host=/cloudsql/travelbase-apps:europe-west1:atlas-db` |
| `link-in-bio-instagram-app-secret` | App secret of Instagram app Travelbase-IG (1664356071864494), Meta app Travelbase |
| `link-in-bio-bitly-token`          | Bitly access token (bitly.com → Settings → API)                      |

`INSTAGRAM_APP_ID`, `IMAGE_BUCKET` and `PUBLIC_URL` are plain env vars in `.github/workflows/deploy.yml`.

## Meta app

Instagram → API setup with Instagram login, in the Meta app "Travelbase":

| Setting            | URL                                                                         |
|--------------------|-----------------------------------------------------------------------------|
| OAuth redirect     | `https://apps.travelbase.eu/a/link-in-bio/public/api/instagram/callback`     |
| Deauthorize        | `https://apps.travelbase.eu/a/link-in-bio/public/api/instagram/deauthorize`  |
| Data deletion      | `https://apps.travelbase.eu/a/link-in-bio/public/api/instagram/data-deletion`|

Scope: `instagram_business_basic`. Until App Review, only accounts invited as Instagram testers
(and accepted in the Instagram app) can connect.

## Logs

Cloud Logging, `resource.labels.service_name="link-in-bio"` (service) or
`resource.labels.job_name="link-in-bio-daily"` (sync). Events: `instagram.connected`,
`instagram.connect_failed`, `data.sync.failed`, `external_api.failed` (Bitly, Cloud Storage).

## When it breaks

- **Public page asks for a login**: the path is not under `/a/link-in-bio/public/`. Public pages,
  their assets (`/public/assets/…`) and `/public/api/…` must all be there.
- **"The Instagram app has not been set up yet"**: `link-in-bio-instagram-app-secret` has no version.
- **"Instagram refused the connection" / invalid verification code**: the secret does not belong to
  Instagram app 1664356071864494, or the redirect URL in Meta differs from the one above.
- **An account cannot connect**: it is not an accepted Instagram tester while the app has no App Review.
- **No bit.ly link in the editor**: `link-in-bio-bitly-token` is empty, or Bitly refused (see
  `external_api.failed`). `bit.ly/<address>` taken elsewhere on Bitly: the page keeps Bitly's random link.
- **Grid stopped updating**: look at the job's last execution. A token older than 60 days without a
  sync has expired; connect the account again in the editor.
- **"Your login has expired"** in the editor: the gateway session ran out; reload.
