"""CI-only, disposable Compose deployment. No user data is accessed."""
import json
import os
import secrets
import subprocess
import tempfile
import time
import urllib.request
import uuid
if os.getenv('GITHUB_ACTIONS')!='true':
    raise SystemExit('Solo para runner CI efímero; no ejecutar sobre datos existentes')
project='phei-ci-'+uuid.uuid4().hex[:10]
with tempfile.NamedTemporaryFile(mode='w',prefix='phei-ci-',suffix='.env') as envfile:
    admin,app=secrets.token_hex(32),secrets.token_hex(32)
    envfile.write(f'POSTGRES_ADMIN_PASSWORD={admin}\nPHEI_DB_PASSWORD={app}\nDATABASE_URL=postgresql://phei_app:{app}@db:5432/phei\nAPP_ORIGIN=https://phei.test\n');envfile.flush()
    base=['docker','compose','--env-file',envfile.name,'-p',project]
    def command(*args):subprocess.run(base+list(args),check=True)
    def health():
        for _ in range(120):
            try:
                req=urllib.request.Request('http://127.0.0.1:8000/api/health',headers={'Host':'phei.test'})
                result=json.load(urllib.request.urlopen(req,timeout=2))
                if result['status']=='ok' and result['database']=='postgresql':return
            except Exception:time.sleep(.5)
        raise RuntimeError('Health de Compose no respondió')
    try:
        command('up','--build','-d');health()
        command('exec','-T','api','python','-c',"import os; from api.db import DB; from api.main import create_user; create_user(DB(os.environ['DATABASE_URL']),'ci-persistence','ci-test-password-only-123')")
        command('restart','db','api');health()
        command('exec','-T','api','python','-c',"import os; from api.db import DB; db=DB(os.environ['DATABASE_URL']); ctx=db.connect(); q=ctx.__enter__(); assert q.execute('SELECT username FROM users WHERE username=?',('ci-persistence',)).fetchone()['username']=='ci-persistence'; ctx.__exit__(None,None,None); print('Persistent PostgreSQL record verified after restart')")
        print('Compose smoke OK: non-root API, PostgreSQL, migrations, health and persistence')
    finally:
        # The unique project/volume above was created solely for this test.
        subprocess.run(base+['down','-v'],check=False)
