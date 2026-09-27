#!/usr/bin/env python3
"""Free encrypted Supabase database + Storage backup. No third-party destination.

Configuration and encryption key must live outside the repository. Dependencies:
Python 3.10+, pg_dump/pg_restore (matching or newer PostgreSQL), OpenSSL.
"""
import argparse
from datetime import datetime, timezone
import getpass
import hashlib
import hmac
import json
import os
from pathlib import Path
import secrets
import shutil
import ssl
import subprocess
import tarfile
import tempfile
from urllib.parse import quote, unquote, urlsplit
from urllib.request import Request, HTTPSHandler, HTTPRedirectHandler, build_opener

os.umask(0o077)
MAGIC = b'THESSIS-BACKUP-v1\n'

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None



def command(args, env=None):
    result = subprocess.run(args, env=env, capture_output=True)
    if result.returncode:
        # Do not print commands, connection strings, query text or credentials.
        raise RuntimeError(f'{Path(args[0]).name} failed; exit {result.returncode}. Check connection/permissions locally.')
    return result.stdout


def hash_file(path):
    digest = hashlib.sha256()
    with open(path, 'rb') as source:
        for block in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def seal(source, destination, keyfile):
    encrypted = destination.with_suffix('.partial')
    try:
        command(['openssl', 'enc', '-aes-256-cbc', '-pbkdf2', '-iter', '200000', '-salt',
                 '-in', str(source), '-out', str(encrypted), '-pass', f'file:{keyfile}'])
        mac_key = hmac.digest(keyfile.read_bytes(), b'Thessis backup authentication v1', 'sha256')
        mac = hmac.new(mac_key, MAGIC, 'sha256')
        with encrypted.open('rb') as src, destination.with_suffix('.writing').open('wb') as out:
            out.write(MAGIC)
            for block in iter(lambda: src.read(1024 * 1024), b''):
                out.write(block)
                mac.update(block)
            out.write(mac.digest())
        destination.with_suffix('.writing').replace(destination)
    finally:
        encrypted.unlink(missing_ok=True)
        destination.with_suffix('.writing').unlink(missing_ok=True)


def unseal(source, destination, keyfile):
    # Authenticate the complete encrypted file BEFORE any decryption/extraction.
    mac_key = hmac.digest(keyfile.read_bytes(), b'Thessis backup authentication v1', 'sha256')
    remaining = source.stat().st_size - len(MAGIC) - 32
    if remaining <= 0:
        raise ValueError('Invalid backup')
    with source.open('rb') as src, tempfile.NamedTemporaryFile(dir=destination.parent) as encrypted:
        if src.read(len(MAGIC)) != MAGIC:
            raise ValueError('Invalid backup header')
        mac = hmac.new(mac_key, MAGIC, 'sha256')
        while remaining:
            block = src.read(min(remaining, 1024 * 1024))
            if not block:
                raise ValueError('Incomplete backup')
            encrypted.write(block)
            mac.update(block)
            remaining -= len(block)
        if not hmac.compare_digest(mac.digest(), src.read(32)):
            raise ValueError('Backup damaged or wrong key; no data decrypted')
        encrypted.flush()
        command(['openssl', 'enc', '-d', '-aes-256-cbc', '-pbkdf2', '-iter', '200000',
                 '-in', encrypted.name, '-out', str(destination), '-pass', f'file:{keyfile}'])


def private_config(path):
    if path.stat().st_mode & 0o077:
        raise ValueError('Configuration must have mode 0600')
    cfg = json.loads(path.read_text())
    keyfile = Path(cfg['key_file']).expanduser().resolve()
    if keyfile.stat().st_mode & 0o077:
        raise ValueError('Encryption key must have mode 0600')
    return cfg, keyfile


def db_environment(url, root_certificate='system'):
    parsed = urlsplit(url)
    if parsed.scheme not in ('postgres','postgresql') or not parsed.hostname or not parsed.password:
        raise ValueError('A complete PostgreSQL connection URL is required')
    env = os.environ.copy()
    env.update(PGHOST=parsed.hostname, PGPORT=str(parsed.port or 5432),
               PGUSER=unquote(parsed.username or 'postgres'), PGDATABASE=parsed.path.lstrip('/') or 'postgres',
               PGPASSWORD=unquote(parsed.password), PGSSLMODE='verify-full', PGSSLROOTCERT=str(root_certificate),
               PGCONNECT_TIMEOUT='20')
    return env


def storage_request(cfg, path, body=None, target=None):
    project = cfg['supabase_url'].rstrip('/')
    parsed = urlsplit(project)
    if parsed.scheme != 'https' or not parsed.hostname.endswith('.supabase.co') or parsed.username:
        raise ValueError('Use the HTTPS URL of your Supabase project')
    headers = {'Authorization':'Bearer '+cfg['service_role_key'], 'apikey':cfg['service_role_key']}
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers['Content-Type'] = 'application/json'
    req = Request(project+'/storage/v1/'+path, data=data, headers=headers)
    context = ssl.create_default_context(cafile=cfg.get('https_ca_file'))
    with build_opener(HTTPSHandler(context=context), NoRedirect()).open(req, timeout=120) as response:
        if target is not None:
            with target.open('wb') as dest:
                shutil.copyfileobj(response, dest, length=1024 * 1024)
            return None
        return json.load(response)


def inventory(cfg, bucket):
    objects = []
    pending = ['']
    while pending:
        prefix = pending.pop()
        offset = 0
        while True:
            page = storage_request(cfg,'object/list/'+quote(bucket,safe=''),
                                   {'prefix':prefix,'offset':offset,'limit':1000,'sortBy':{'column':'name','order':'asc'}})
            for item in page:
                name = prefix + item['name']
                if item.get('id') is None:
                    pending.append(name+'/')
                else:
                    objects.append({'bucket':bucket,'name':name,'updated_at':item.get('updated_at'),
                                    'metadata':item.get('metadata')})
            if len(page)<1000:
                break
            offset += 1000
    return sorted(objects,key=lambda o:o['name'])


def verify_archive(archive, keyfile):
    with tempfile.TemporaryDirectory(prefix='thessis-verify.') as temp:
        unpacked = Path(temp)/'backup.tar'
        unseal(archive,unpacked,keyfile)
        with tarfile.open(unpacked) as bundle:
            manifest = json.load(bundle.extractfile('manifest.json'))
            for name, expected in manifest['sha256'].items():
                with bundle.extractfile(name) as stream:
                    digest = hashlib.sha256()
                    for block in iter(lambda:stream.read(1024*1024),b''):
                        digest.update(block)
                    if digest.hexdigest()!=expected:
                        raise ValueError('Backup content checksum mismatch')
        return manifest


def extract_archive(archive, keyfile, destination):
    manifest = verify_archive(archive, keyfile)
    if destination.exists():
        raise ValueError('Choose a new empty destination; existing files will not be overwritten')
    destination.mkdir(parents=True, mode=0o700)
    with tempfile.TemporaryDirectory(prefix='thessis-extract.') as temp:
        unpacked = Path(temp)/'backup.tar'
        unseal(archive, unpacked, keyfile)
        with tarfile.open(unpacked) as bundle:
            for name in [*manifest['sha256'], 'manifest.json']:
                relative = Path(name)
                if relative.is_absolute() or '..' in relative.parts or not bundle.getmember(name).isfile():
                    raise ValueError('Unsafe archive member')
                target = destination/relative
                target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
                with bundle.extractfile(name) as source, target.open('wb') as out:
                    shutil.copyfileobj(source, out)
    print(f'Authenticated backup extracted to {destination}. Restore only into an isolated project first.')


def backup(cfg,keyfile):
    destination = Path(cfg['output_directory']).expanduser().resolve()
    destination.mkdir(parents=True,exist_ok=True,mode=0o700)
    started = datetime.now(timezone.utc).isoformat()
    with tempfile.TemporaryDirectory(prefix='thessis-backup.') as temp:
        work = Path(temp)
        dump = work/'database.dump'
        # ACLs/policies are retained. The restore guide covers managed Supabase
        # schemas, roles, extensions, Vault keys and external function secrets.
        command(['pg_dump','--format=custom','--no-owner','--file',str(dump)],
                env=db_environment(cfg['database_url'],cfg.get('ssl_root_cert','system')))
        command(['pg_restore','--list',str(dump)])
        (work/'objects').mkdir()
        buckets = storage_request(cfg,'bucket')
        objects = []
        for bucket in buckets:
            before = inventory(cfg,bucket['id'])
            for obj in before:
                relative = 'objects/'+hashlib.sha256((obj['bucket']+'/'+obj['name']).encode()).hexdigest()
                storage_request(cfg,'object/authenticated/'+quote(obj['bucket'],safe='')+'/'+quote(obj['name'],safe='/'),
                                target=work/relative)
                objects.append({**obj,'file':relative})
            if before != inventory(cfg,bucket['id']):
                raise RuntimeError('Storage changed during backup. Retry during a quiet period.')
        hashes = {str(p.relative_to(work)):hash_file(p) for p in work.rglob('*') if p.is_file()}
        manifest = {'started_at':started,'finished_at':datetime.now(timezone.utc).isoformat(),
                    'project':cfg['supabase_url'],'buckets':buckets,'objects':objects,'sha256':hashes,
                    'consistency':'Database transaction snapshot; file inventory checked before/after download. Database and Storage are not one atomic snapshot.'}
        (work/'manifest.json').write_text(json.dumps(manifest,indent=2))
        tarpath = work/'backup.tar'
        with tarfile.open(tarpath,'w') as bundle:
            for name in [*hashes,'manifest.json']:
                bundle.add(work/name,arcname=name,recursive=False)
        output = destination/(datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'.thessis-backup')
        seal(tarpath,output,keyfile)
        verified = verify_archive(output,keyfile)
        print(f'Encrypted backup verified: {output}; {len(verified["objects"])} files. Restore rehearsal remains a separate step.')


def initialize(path):
    if path.exists():
        raise ValueError('Configuration already exists; edit it locally to avoid replacing its encryption key')
    path.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
    keyfile=path.parent/'backup.key'
    if keyfile.exists():
        raise ValueError('A backup key already exists; keep it and configure manually')
    print('Enter existing credentials locally. They are not printed or sent to chat.')
    database=getpass.getpass('Supabase session-pooler PostgreSQL URL including existing password: ')
    db_environment(database)
    project=input('Supabase project HTTPS URL: ').strip()
    service=getpass.getpass('Existing service-role key (for backing up file contents): ')
    output=input('Local/external-drive backup directory: ').strip()
    if not output or not service:
        raise ValueError('Output directory and Storage credential are required')
    keyfile.write_text(secrets.token_urlsafe(48)+'\n')
    path.write_text(json.dumps({'database_url':database,'supabase_url':project,'service_role_key':service,
                               'key_file':str(keyfile),'output_directory':output},indent=2))
    print(f'Configuration saved privately at {path}. Keep an offline copy of backup.key separately from the backups.')


def self_test():
    with tempfile.TemporaryDirectory(prefix='thessis-crypto-test.') as temp:
        root=Path(temp);source=root/'source';key=root/'key';archive=root/'sealed';out=root/'restored'
        source.write_bytes(secrets.token_bytes(2*1024*1024));key.write_text(secrets.token_urlsafe(48))
        seal(source,archive,key);unseal(archive,out,key)
        assert hash_file(source)==hash_file(out)
        altered=bytearray(archive.read_bytes());altered[100]^=1;archive.write_bytes(altered)
        try:
            unseal(archive,out,key)
        except ValueError:
            pass
        else:
            raise AssertionError('Corruption was not detected')
    print('Encryption/decryption and corruption detection passed. No production data used.')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config',type=Path)
    parser.add_argument('--init',action='store_true')
    parser.add_argument('--verify',type=Path)
    parser.add_argument('--extract-to',type=Path,help='With --verify, decrypt into a new private directory for restoration')
    parser.add_argument('--self-test',action='store_true')
    args=parser.parse_args()
    if args.self_test:
        self_test()
    elif not args.config:
        parser.error('--config is required')
    elif args.init:
        initialize(args.config.expanduser().resolve())
    else:
        cfg,key=private_config(args.config.expanduser())
        if args.verify:
            if args.extract_to:
                extract_archive(args.verify,key,args.extract_to)
            else:
                report=verify_archive(args.verify,key)
                print(f'Backup authentication and {len(report["sha256"])} checksums verified; this is not a restore rehearsal.')
        else:
            backup(cfg,key)
