# POC: Google Docs → Hugo → GitHub Pages

Proof of concept for the MBSAAS website plan. Content is written in Google Docs; GitHub Actions turns approved Docs into a Hugo site and publishes it to **https://jon.doblados.net/poc/**.

This is a separate project repository. Because the user site (`jondoblados.github.io`) uses the custom domain `jon.doblados.net`, GitHub Pages serves this repo at `/poc/` automatically. The Jekyll site is not touched.

## How it works

```
Google Drive (jon@doblados.net)
└── MBSAAS Website POC
    ├── MBSAAS POC Web - DRAFTS        everyone writes here
    │   ├── 00 Help & Templates        Post Template, How to Publish
    │   ├── 01 Drafts
    │   ├── 02 Ready for Review
    │   └── 99 Archive
    └── MBSAAS POC Web - LIVE          what is here = what is on the site
        ├── Posts                      → /poc/posts/<slug>/
        ├── Pages                      → /poc/<slug>/   (added to the menu)
        └── Images

GitHub Actions (.github/workflows/publish.yml)
  every 15 min 08:00-24:00 SGT, daily 00:05 SGT, or "Run workflow"
  1. google-github-actions/auth   Workload Identity Federation → short-lived Drive token (no keys)
  2. scripts/drive_to_hugo.py     export each LIVE Doc as Markdown, read the Field|Value table,
                                  extract images, write content/ page bundles, validate
  3. commit content/ + data/      audit trail and rollback in Git history
  4. hugo --minify                WebP images, Open Graph tags for Facebook/LinkedIn, RSS feed
  5. actions/deploy-pages         publish
  6. notify job                   comments on each Doc: "Published: <url>" or "Could not publish: …"
```

If the Google variables are not set (or Google is unavailable), the workflow still builds and deploys from the content already committed to the repo.

## One-time setup: Workload Identity Federation (Google Cloud)

Easiest: in [Cloud Shell](https://shell.cloud.google.com) run `curl -sSLO https://raw.githubusercontent.com/jondoblados/poc/main/scripts/gcp_setup.sh && bash gcp_setup.sh <EXISTING_PROJECT_ID>` (idempotent, rate-limit safe). The manual equivalent is below. Replace `PROJECT_ID`.

```bash
PROJECT_ID="your-project-id"
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
SA="poc-drive-publisher@${PROJECT_ID}.iam.gserviceaccount.com"

# APIs
gcloud services enable iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com drive.googleapis.com --project "$PROJECT_ID"

# Service account: the identity that Drive sees. It gets NO project roles.
gcloud iam service-accounts create poc-drive-publisher \
  --display-name="POC Drive publisher (GitHub Actions jondoblados/poc)" --project "$PROJECT_ID"

# Workload Identity Pool + GitHub OIDC provider, locked to this repo (by immutable IDs) and the main branch
gcloud iam workload-identity-pools create github \
  --location=global --display-name="GitHub Actions" --project "$PROJECT_ID"

gcloud iam workload-identity-pools providers create-oidc poc-repo \
  --location=global --workload-identity-pool=github --display-name="jondoblados/poc" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_id=assertion.repository_id,attribute.repository_owner_id=assertion.repository_owner_id,attribute.ref=assertion.ref" \
  --attribute-condition="assertion.repository_owner_id=='1370746' && assertion.repository_id=='1401273102' && assertion.ref=='refs/heads/main'" \
  --project "$PROJECT_ID"

# Allow only this repo to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding "$SA" --project "$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/attribute.repository_id/1401273102"

# Values for GitHub
echo "GCP_WIF_PROVIDER=projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/providers/poc-repo"
echo "GCP_SERVICE_ACCOUNT=${SA}"
```

Then:

1. **GitHub repo variables** (Settings → Secrets and variables → Actions → Variables): `GCP_WIF_PROVIDER`, `GCP_SERVICE_ACCOUNT` (from the output above). `LIVE_FOLDER_ID` is already set. These are identifiers, not secrets.
2. **Share only the LIVE folder** with the service account email as **Commenter** (read + comment, cannot edit). Do not share DRAFTS.
   - Google Workspace may block sharing with addresses outside `doblados.net`. If so, allow external sharing for your account/OU in Admin console → Apps → Google Workspace → Drive and Docs → Sharing settings (or add `iam.gserviceaccount.com` to trusted domains, if your edition supports allowlists).
3. Actions → **Publish from Google Drive** → **Run workflow**.

## Test script (end-to-end)

| # | Action in Google Drive | Expected result |
|---|---|---|
| 1 | Nothing (initial state) | `/poc/` shows "Manchester Day of Action 2026" and the About page |
| 2 | Move `2026-10-30 Alumni Networking Night` from `01 Drafts` to `LIVE/Posts` | Within 15 min (or Run workflow) it appears; bot comments "Published: …" on the Doc |
| 3 | Edit the summary of a LIVE Doc | Page updates; new comment with the link |
| 4 | Clear the "Short summary" cell of a LIVE Doc | Bot comments "Could not publish…"; the last good version stays online |
| 5 | Copy the Post Template, set Publish date to tomorrow, move to LIVE | Bot comments "Scheduled…"; post appears after 00:05 SGT |
| 6 | Move a Doc out of LIVE to `99 Archive` | Page disappears at the next run |

## Local development

```bash
# Hugo extended 0.167.0
hugo server                                   # preview committed content
# Sync from Drive locally (uses the gws CLI or an access token)
DRIVE_BACKEND=gws LIVE_FOLDER_ID=... python3 scripts/drive_to_hugo.py build
GOOGLE_ACCESS_TOKEN=$(gcloud auth print-access-token) LIVE_FOLDER_ID=... python3 scripts/drive_to_hugo.py build
```

## Security notes

- No long-lived Google credentials anywhere: the token is minted per run via OIDC and lives 5-10 minutes.
- The provider only trusts this repository (by numeric ID) on `main`; forks and PRs can't get a token.
- The service account only sees what is shared with it (LIVE folder, Commenter).
- Raw HTML from Docs is never rendered (`markup.goldmark.renderer.unsafe = false`); only PNG/JPG/GIF/WebP images up to 15 MB are accepted.
- All Actions are pinned to commit SHAs.
- `content/` is generated: edit Docs, not Markdown files. Design changes (layouts, CSS) are normal commits.
