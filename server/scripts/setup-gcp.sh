#!/usr/bin/env bash
#
# PART 1 - run ONCE, before the first deploy. Creates link-in-bio's identity, database, image
# bucket and secret slots in travelbase-apps. Idempotent. Needs an owner of the project.
#
# The database lives on the existing instance atlas-db, with its own database and user: the app is
# used by one team and a few Instagram visitors, so an instance of its own (~EUR 10/month) is not
# worth it. Move it with pg_dump/pg_restore if it ever outgrows that.
set -euo pipefail

PROJECT=travelbase-apps
REGION=europe-west1
APP=link-in-bio
SA=${APP}@${PROJECT}.iam.gserviceaccount.com
INSTANCE=atlas-db
BUCKET=travelbase-link-in-bio-images
REPO=Travelbase/app-link-in-bio

echo "== Service account =="
gcloud iam service-accounts create "$APP" --project "$PROJECT" --display-name "$APP (Cloud Run runtime)" 2>&1 | grep -v "already exists" || true
for _ in 1 2 3 4 5 6; do gcloud iam service-accounts describe "$SA" --project "$PROJECT" >/dev/null 2>&1 && break; sleep 5; done
gcloud projects add-iam-policy-binding "$PROJECT" --member "serviceAccount:$SA" --role roles/cloudsql.client --condition=None >/dev/null
# GitHub Actions in this repo may deploy as the shared deployer.
gcloud iam service-accounts add-iam-policy-binding "gh-deploy@${PROJECT}.iam.gserviceaccount.com" --project "$PROJECT" \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/245645829352/locations/global/workloadIdentityPools/github/attribute.repository/${REPO}" >/dev/null

echo "== Database link_in_bio on $INSTANCE =="
gcloud sql databases create link_in_bio --instance "$INSTANCE" --project "$PROJECT" 2>/dev/null || echo "  database exists"
PASSWORD=$(openssl rand -hex 24)
if gcloud sql users create link_in_bio --instance "$INSTANCE" --project "$PROJECT" --password "$PASSWORD" 2>/dev/null; then
  printf 'postgres://link_in_bio:%s@/link_in_bio?host=/cloudsql/%s:%s:%s' "$PASSWORD" "$PROJECT" "$REGION" "$INSTANCE" |
    gcloud secrets create link-in-bio-database-url --project "$PROJECT" --data-file=- --labels "app=$APP" 2>/dev/null ||
    echo "  link-in-bio-database-url exists: add a new version by hand if the password changed"
else
  echo "  user exists"
fi

echo "== Image bucket (public read, like Lovable's page-images) =="
gcloud storage buckets create "gs://$BUCKET" --project "$PROJECT" --location "$REGION" \
  --uniform-bucket-level-access --default-storage-class STANDARD 2>/dev/null || echo "  bucket exists"
gcloud storage buckets update "gs://$BUCKET" --update-labels "app=$APP" >/dev/null
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" --member allUsers --role roles/storage.objectViewer >/dev/null
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" --member "serviceAccount:$SA" --role roles/storage.objectAdmin >/dev/null

echo "== Secret slots (Simon adds a version to the two empty ones) =="
for secret in link-in-bio-instagram-app-secret link-in-bio-bitly-token; do
  gcloud secrets create "$secret" --project "$PROJECT" --replication-policy automatic --labels "app=$APP" 2>/dev/null || echo "  $secret exists"
done
for secret in link-in-bio-database-url link-in-bio-instagram-app-secret link-in-bio-bitly-token; do
  gcloud secrets add-iam-policy-binding "$secret" --project "$PROJECT" \
    --member "serviceAccount:$SA" --role roles/secretmanager.secretAccessor >/dev/null
done

cat <<MSG

Left to do by hand:
  echo -n '<Instagram app secret>' | gcloud secrets versions add link-in-bio-instagram-app-secret --project $PROJECT --data-file=-
  echo -n '<Bitly access token>'   | gcloud secrets versions add link-in-bio-bitly-token --project $PROJECT --data-file=-
  (Instagram: Meta app Travelbase → Instagram → API setup with Instagram login → app secret of Travelbase-IG.
   Bitly: bitly.com → Settings → API → Generate token.)
Then push to main, and run scripts/setup-scheduler.sh after the first deploy.
MSG
