#!/usr/bin/env bash
# One-time Google Cloud setup for the POC (Workload Identity Federation, no keys).
# Safe to re-run: every step skips what already exists. API enablement is done
# one API at a time with backoff to avoid RESOURCE_EXHAUSTED / RATE_LIMIT_EXCEEDED.
#
# Usage (Cloud Shell):  bash gcp_setup.sh <EXISTING_PROJECT_ID>
set -euo pipefail

PROJECT_ID="${1:?Usage: bash gcp_setup.sh <EXISTING_PROJECT_ID>}"
REPO_ID="1401273102"          # jondoblados/poc (immutable numeric id)
OWNER_ID="1370746"            # jondoblados
POOL="github"
PROVIDER="poc-repo"
SA_NAME="poc-drive-publisher"
SA="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud config set project "$PROJECT_ID" >/dev/null
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
echo "Project: $PROJECT_ID ($PROJECT_NUMBER)"

# --- 1. APIs: only enable what's missing, one at a time, with backoff -----------------
ENABLED=$(gcloud services list --enabled --format='value(config.name)')
for api in iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com drive.googleapis.com; do
  if grep -qx "$api" <<<"$ENABLED"; then echo "✓ $api already enabled"; continue; fi
  for attempt in 1 2 3 4 5; do
    if gcloud services enable "$api" --quiet 2>/tmp/enable.err; then echo "✓ enabled $api"; break; fi
    if grep -qE 'RATE_LIMIT_EXCEEDED|RESOURCE_EXHAUSTED|429' /tmp/enable.err && [ "$attempt" -lt 5 ]; then
      wait=$((attempt * 60)); echo "… rate limited on $api, waiting ${wait}s (attempt $attempt/5)"; sleep "$wait"
    else
      cat /tmp/enable.err; echo "✗ could not enable $api. Enable it in the console: https://console.cloud.google.com/apis/library/$api?project=$PROJECT_ID"; exit 1
    fi
  done
  sleep 20   # spread out mutate requests
done

# --- 2. Service account (no project roles) ---------------------------------------------
if gcloud iam service-accounts describe "$SA" >/dev/null 2>&1; then
  echo "✓ service account exists"
else
  gcloud iam service-accounts create "$SA_NAME" --display-name="POC Drive publisher (GitHub Actions jondoblados/poc)"
fi

# --- 3. Workload Identity Pool + GitHub OIDC provider ----------------------------------
if gcloud iam workload-identity-pools describe "$POOL" --location=global >/dev/null 2>&1; then
  echo "✓ pool exists"
else
  gcloud iam workload-identity-pools create "$POOL" --location=global --display-name="GitHub Actions"
fi

if gcloud iam workload-identity-pools providers describe "$PROVIDER" --location=global --workload-identity-pool="$POOL" >/dev/null 2>&1; then
  echo "✓ provider exists"
else
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" \
    --location=global --workload-identity-pool="$POOL" --display-name="jondoblados/poc" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_id=assertion.repository_id,attribute.repository_owner_id=assertion.repository_owner_id,attribute.ref=assertion.ref" \
    --attribute-condition="assertion.repository_owner_id=='${OWNER_ID}' && assertion.repository_id=='${REPO_ID}' && assertion.ref=='refs/heads/main'"
fi

# --- 4. Let only this repo impersonate the service account -----------------------------
gcloud iam service-accounts add-iam-policy-binding "$SA" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/attribute.repository_id/${REPO_ID}" \
  --condition=None --quiet >/dev/null
echo "✓ workloadIdentityUser binding in place"

echo
echo "================ Send these two values back ================"
echo "GCP_WIF_PROVIDER=projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/providers/${PROVIDER}"
echo "GCP_SERVICE_ACCOUNT=${SA}"
echo "============================================================"
