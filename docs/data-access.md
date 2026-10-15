# Data access

| Data                                   | Where (production)                     | Credential                         |
|----------------------------------------|----------------------------------------|------------------------------------|
| Pages, blocks, templates, short links  | Cloud SQL `atlas-db`, database `link_in_bio` | `link-in-bio-database-url`   |
| Instagram tokens, synced posts         | same database, server only             | same                               |
| Images (uploads, Instagram copies)     | GCS `travelbase-link-in-bio-images`, public read | service account `link-in-bio` (objectAdmin on the bucket) |
| Instagram profile and posts            | Instagram Graph API, read              | per-account token from the login; app secret `link-in-bio-instagram-app-secret` |
| Short links and their clicks           | Bitly API, read-write                  | `link-in-bio-bitly-token`          |

Personal data: Instagram usernames and tokens of our own brand accounts. Nothing about visitors
is stored; Bitly counts the clicks.

Staging (Lovable Cloud) has the same tables in Supabase project `pqgcdnytqcrlgzyrouqi`, open to
the publishable key (prototype rules, see AGENTS.md), and holds test data only.
