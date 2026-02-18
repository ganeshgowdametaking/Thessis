# Enterprise Security Baseline

This repository enforces baseline controls via:
- `.github/workflows/security-gates.yml`
- `.github/dependabot.yml`
- `.github/PULL_REQUEST_TEMPLATE/security.md`
- `SECURITY.md`

## Required Runtime Environment Variables

### Web / Node bridge
- `NODE_ENV=production`
- `DEBUG_LOGS=0`
- `SECURITY_LOG_WEBHOOK_URL=<siem-ingest-endpoint>`
- `CORS_ALLOW_ORIGINS=https://tanktide.com,https://www.tanktide.com`
- `S3_SERVER_SIDE_ENCRYPTION=AES256` or `aws:kms`
- `S3_KMS_KEY_ID=<kms-key-id>` when `aws:kms`

### Resume ranking
- `APP_ENV=production`
- `DATABASE_URL=<managed-postgres-with-ssl>`
- `CORS_ALLOW_ORIGINS=https://tanktide.com,https://www.tanktide.com`
- `CORS_ALLOW_ORIGIN_REGEX=^https://.*\\.vercel\\.app$`
- `SECURITY_LOG_WEBHOOK_URL=<siem-ingest-endpoint>`

## Operational Requirements (outside code)
- Enforce branch protection requiring PR + checks + review.
- Enforce org-wide MFA and remove SMS MFA.
- Enable WAF in block mode.
- Route security logs to immutable SIEM storage with real-time alerts.
