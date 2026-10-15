# app-link-in-bio

Can you create a link in bio for our trips. We are currently using later.com as you can see in this link 

https://linkin.bio/travelbase-nl/?fbclid=PAZXh0bgNhZW0CMTEAc3J0YwZhcHBfaWQMMjU2MjgxMDQwNTU4AAGnikGwEl8vhicq6k9unVRaVHn0wK_fPngvU9_fkWitXXXL7nCfyCJGa7ce610_aem_uBlZn9mp6pvy5_cXnRqa9Q&utm_medium=social&utm_content=link_in_bio&utm_source=ig

https://linkin.bio/travelbasenomadsnl/?fbclid=PAZXh0bgNhZW0CMTEAc3J0YwZhcHBfaWQMMjU2MjgxMDQwNTU4AAGnsv4xOvDW1nXcJd8evBIDHt9y9hFdYNRnStyB6eoesAv5hKX9N7HB4MxO2eY_aem_CYdyPxygMF6Nx4AjVn6jKA&utm_medium=social&utm_content=link_in_bio&utm_source=ig

But we would like to build it ourselves to save costs. You can keep all the same features as on later.com. You can also check linktree as example.

## Where it runs

| | Branch | URL |
|---|---|---|
| Staging (Lovable Cloud) | `lovable` | https://app-link-in-bio.lovable.app |
| Production (GCP) | `main` | https://apps.travelbase.eu/a/link-in-bio/ |

Marketing edits in Lovable; a developer merges `lovable` into `main` to go live. How, and what to
port along the way: [docs/runbook.md](docs/runbook.md). How it fits together:
[docs/architecture.md](docs/architecture.md). Rules for code: [AGENTS.md](AGENTS.md).

Production backend locally (Postgres on :55432, kit linked from travelbase-apps):

```sh
VITE_APP_BASE=/a/link-in-bio/ VITE_DATA_BACKEND=http npm run build
cp dist/a/link-in-bio/public/index.html dist/a/link-in-bio/ && cp -R dist server/
cd server && DATABASE_URL=postgres://postgres:pw@localhost:55432/link_in_bio bun run server.ts
```

Send `X-Forwarded-Email: you@travelbase.eu` to reach the editor and `/api` without the gateway.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://app-link-in-bio.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1ac32895-ee15-4dba-bafb-925b49045861).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
