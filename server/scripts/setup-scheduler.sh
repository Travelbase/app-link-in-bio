#!/usr/bin/env bash
#
# PART 2 - run AFTER the first successful deploy (the service and job must exist).
# Lets the gateway reach the service and starts the daily Instagram sync at 05:00 UTC. Idempotent.
set -euo pipefail

PROJECT=travelbase-apps
REGION=europe-west1
JOB=link-in-bio-daily
SA=link-in-bio@${PROJECT}.iam.gserviceaccount.com

# The gateway is the only caller of the service.
gcloud run services add-iam-policy-binding link-in-bio --project "$PROJECT" --region "$REGION" \
  --member "serviceAccount:apps-gateway@${PROJECT}.iam.gserviceaccount.com" --role roles/run.invoker >/dev/null

# Cloud Scheduler starts the job as the app's own service account.
gcloud run jobs add-iam-policy-binding "$JOB" --project "$PROJECT" --region "$REGION" \
  --member "serviceAccount:$SA" --role roles/run.invoker >/dev/null

URI="https://run.googleapis.com/v2/projects/${PROJECT}/locations/${REGION}/jobs/${JOB}:run"
gcloud scheduler jobs create http "$JOB" --project "$PROJECT" --location "$REGION" \
  --schedule "0 5 * * *" --time-zone "Etc/UTC" --uri "$URI" --http-method POST \
  --oauth-service-account-email "$SA" 2>/dev/null ||
gcloud scheduler jobs update http "$JOB" --project "$PROJECT" --location "$REGION" \
  --schedule "0 5 * * *" --time-zone "Etc/UTC" --uri "$URI" --http-method POST \
  --oauth-service-account-email "$SA" >/dev/null
echo "Scheduled $JOB at 05:00 UTC. Run it now: gcloud run jobs execute $JOB --project $PROJECT --region $REGION"
