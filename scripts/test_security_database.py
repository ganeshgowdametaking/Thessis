"""Run security migrations and behavior tests in a disposable local PostgreSQL."""
import getpass
import importlib.util
import json
import tarfile
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]

def run(args, **kwargs):
    result = subprocess.run(args, capture_output=True, text=True, **kwargs)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result

with tempfile.TemporaryDirectory(prefix='thessis-security.', dir='/private/tmp' if Path('/private/tmp').exists() else None) as temp:
    work = Path(temp)
    data, sock = work/'data', work/'socket'
    sock.mkdir(mode=0o700)
    run([shutil.which('initdb'), '-D', str(data), '--no-locale', '--encoding=UTF8', '--auth=trust'])
    running = False
    try:
        run([shutil.which('pg_ctl'), '-D', str(data), '-l', str(work/'postgres.log'), '-o',
             f"-k {sock} -p 55439 -c listen_addresses=''", '-w', 'start'])
        running = True
        base = [shutil.which('psql'), '-X', '-h', str(sock), '-p', '55439', '-U', getpass.getuser(),
                '-d', 'postgres', '-v', 'ON_ERROR_STOP=1']
        paths = [ROOT/'supabase/tests/fixtures/production_permissions.sql']
        paths += sorted((ROOT/'supabase/migrations').glob('20260926*.sql'))
        paths += [ROOT/'supabase/tests/security_regression.sql']
        for path in paths:
            result = run(base + ['-f', str(path)])
            print(path.name + ': passed')
            for line in result.stderr.splitlines():
                if 'PASS:' in line:
                    print(line.split('NOTICE:')[-1].strip())
        # Exercise an actual pg_dump -> encrypt -> verify -> decrypt -> pg_restore
        # round trip using the synthetic database, not just a readable archive.
        spec = importlib.util.spec_from_file_location('thessis_backup', ROOT/'scripts/backup.py')
        backup_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(backup_module)
        dump = work/'database.dump'
        run([shutil.which('pg_dump'), '-h', str(sock), '-p', '55439', '-U', getpass.getuser(),
             '-d', 'postgres', '-Fc', '--no-owner', '-f', str(dump)])
        manifest = {'sha256': {'database.dump': backup_module.hash_file(dump)}}
        (work/'manifest.json').write_text(json.dumps(manifest))
        bundle = work/'database.tar'
        with tarfile.open(bundle, 'w') as tar:
            tar.add(dump, arcname='database.dump')
            tar.add(work/'manifest.json', arcname='manifest.json')
        key = work/'backup.key'
        key.write_text('synthetic-only-backup-test-passphrase-0123456789')
        sealed = work/'database.thessis-backup'
        backup_module.seal(bundle, sealed, key)
        restored = work/'restore'
        backup_module.extract_archive(sealed, key, restored)
        run(base+['-c','CREATE DATABASE thessis_restore_test'])
        run([shutil.which('pg_restore'), '-h', str(sock), '-p', '55439', '-U', getpass.getuser(),
             '-d', 'thessis_restore_test', '--exit-on-error', '--no-owner', str(restored/'database.dump')])
        comparison = "SELECT json_build_object('applications',(SELECT count(*) FROM applications),'messages',(SELECT count(*) FROM messages),'policies',(SELECT count(*) FROM pg_policies WHERE schemaname='public'),'private_chat',(SELECT NOT public FROM storage.buckets WHERE id='message-attachments'))"
        original = run(base+['-Atc',comparison]).stdout.strip()
        recovered = run([*base,'-d','thessis_restore_test','-Atc',comparison]).stdout.strip()
        if original != recovered:
            raise RuntimeError('Restored database does not match the synthetic source')
        print('PASS: encrypted database backup restored; rows, policies and bucket privacy match')
    finally:
        if running:
            run([shutil.which('pg_ctl'), '-D', str(data), '-m', 'fast', '-w', 'stop'])
