# Thessis Security Policy (SOC 2 / ISO 27001-aligned)

## Scope
This policy applies to:
- `web` (frontend + Node API bridge)
- `api` (Vercel serverless APIs)
- `web/resume-ranking` (Python ranking backend)
- `supabase` functions and database access

## Mandatory Controls
1. Access Control
- Production access follows least privilege.
- MFA is required for all critical systems (GitHub, Vercel, Supabase, cloud infra).
- JIT access is required for production admin actions.

2. Code Security
- Every PR must pass security workflows (SAST, secret scanning, dependency scanning).
- Secrets must never be committed to git.
- Security-focused peer review is mandatory for security-sensitive paths.

3. Data Protection
- PII must not be used in local/staging datasets unless anonymized/synthetic.
- Public APIs must not expose sequential internal IDs.
- Storage and transport encryption are required.

4. Infrastructure
- Immutable deploys only (image/build artifact rollout).
- WAF must run in block mode for high-confidence attacks.
- `/auth` and `/admin` attempts must be logged and forwarded to SIEM.

## Vulnerability Reporting
Report security issues privately to project maintainers and do not open public issues containing exploit details.

## Incident Handling
1. Contain (disable impacted keys/endpoints).
2. Rotate credentials immediately.
3. Eradicate root cause.
4. Recover with validated deploy.
5. Post-incident review within 48 hours.
