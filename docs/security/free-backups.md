# Free backups on the Mac

This uses local PostgreSQL tools, Python and OpenSSL. It requires no paid Supabase
plan or backup service. Choose a local disk or external drive; the tool does not
upload backups to another provider. Running it on a sleeping/offline Mac will not
produce a backup. A second offline copy protects against losing the Mac itself.

## One-time setup

Install PostgreSQL client tools 17 or newer (already available on this Mac).
Keep the configuration and encryption key outside Git and outside shared folders.

```sh
python3 scripts/backup.py --init --config "$HOME/Library/Application Support/ThessisBackups/config.json"
```

The prompts accept the **existing** Supabase session-pooler PostgreSQL URL
(including password), project URL and service-role key. Type them locally, never
in chat or a GitHub issue. The database password is not reset by this tool.
The Storage key downloads all file contents; it must remain private. Configuration
and the generated key have mode 0600. The passphrase never appears in process
arguments; PostgreSQL receives credentials through its child-process environment.
TLS certificate and hostname verification remain enabled. If required by the
project, set `ssl_root_cert` in the private configuration to the CA certificate
from Supabase Database Settings. On this Mac, `https_ca_file` points to
`/etc/ssl/cert.pem` for the system HTTPS trust bundle. Use the session pooler
on port 5432, not transaction pooling on 6543, for dumps.

Keep a separate secure offline copy of `backup.key`. Losing it loses access to the
backups. Never commit this key, the configuration, plaintext exports or encrypted
production archives to Git.

## Run and verify

```sh
python3 scripts/backup.py --config "$HOME/Library/Application Support/ThessisBackups/config.json"
python3 scripts/backup.py --config "$HOME/Library/Application Support/ThessisBackups/config.json" --verify /path/to/backup.thessis-backup
```

Each run creates:

- A PostgreSQL custom-format dump retaining functions, policies and ACLs.
- The actual files from every Storage bucket, with their bucket/name mapping.
- A manifest and SHA-256 checksums, creation times and bucket configuration.
- An encrypted archive with authentication checked before decryption.

The temporary plaintext directory is removed after the run. The tool does not
silently delete older backups. Manage retention only after keeping a known-good
restore point. Encryption is AES-256-CBC with PBKDF2 (200,000 rounds), with a
separately derived HMAC-SHA-256 over the encrypted file and format header.

A database dump uses a transaction snapshot. Storage is a separate service, so
this is not one atomic snapshot of both systems. The tool compares the file
inventory before and after downloading and aborts if it changes. Prefer a quiet
maintenance period for a recovery point requiring close database/file alignment.

## Rehearse restoration

1. Create an isolated disposable Supabase project, or a local Supabase stack
   with matching extensions and roles. Never test restoration over production.
2. Verify and decrypt the archive into a new private directory:

   ```sh
   python3 scripts/backup.py --config /private/path/config.json \
     --verify /path/to/backup.thessis-backup --extract-to /private/tmp/thessis-restore
   ```

3. Review `pg_restore --list database.dump`. Restore app schemas/functions/data
   with `pg_restore --exit-on-error --no-owner` into the isolated destination.
   Follow Supabase's official migration instructions for Auth and Storage schemas;
   platform-owned objects and roles must be reconciled rather than overwritten
   blindly. Preserve/reapply the reviewed ACLs and RLS policies.
4. Recreate buckets with the manifest's privacy/type/size settings. Upload each
   `objects/<hash>` file to its original bucket and object name from the manifest,
   using the destination project's Storage API. Verify downloaded hashes.
   Database metadata alone does not restore Storage bytes.
5. Reapply Edge Function deployment/configuration and secrets from the secure
   source of truth. Vault's encrypted values depend on the project's encryption
   configuration; a logical dump alone is not a portable copy of its encryption
   key. Do not assume moving encrypted Vault rows restores usable secrets.
6. Compare table counts, constraints, policies and representative file hashes.
   Run security regressions, account login, application review and private file
   access checks. Record the achieved recovery time and backup age.
7. Only after the rehearsal succeeds should this be described as a verified
   recovery system. A readable dump or checksum pass alone is not a restore test.

## Current activation state

Activated on 27 September 2026 without a paid plan upgrade. An encrypted
production backup was created and authenticated, including the database dump
and all 47 Storage objects. Its application/Auth/Storage/migration/webhook
schemas were restored into a temporary local PostgreSQL instance: all 30 public
application tables matched the source (441 rows), with 129 Auth users, 47 Storage
records and 64 pre-upgrade public policies restored. The temporary plaintext
restore was removed after verification.

Managed platform extensions, hosted Auth login, Edge Function secrets and live
Storage re-upload have not been rehearsed. The archive contains the Storage file
bytes, mappings and checksums needed for that separate rehearsal. This is not a
claim of full platform disaster-recovery sign-off.

The private configuration lives outside Git at
`~/Library/Application Support/ThessisBackups/config.json`. Encrypted archives
are saved under `~/Thessis Backups`. The database uses the CA certificate from
Supabase Database Settings with `verify-full`; HTTPS uses the Mac trust bundle.
The encryption key must be kept separately and must never be committed.

References: [Supabase backups](https://supabase.com/docs/guides/platform/backups),
[backup and restore guide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore),
[verified TLS connections](https://supabase.com/docs/guides/database/connecting-to-postgres).
