"""Integration against a fresh PostgreSQL database, never a user database."""
import os
import unittest
import uuid
from api.db import DB
from api.main import create_user

@unittest.skipUnless(os.getenv('PHEI_TEST_POSTGRES_URL'), 'Requiere PostgreSQL de pruebas efímero')
class PostgresTests(unittest.TestCase):
    def test_migrations_constraints_and_atomic_revisions(self):
        db=DB(os.environ['PHEI_TEST_POSTGRES_URL']);db.migrate();db.migrate()
        user='test-'+uuid.uuid4().hex[:15];create_user(db,user,'postgres-test-password-123')
        with db.connect() as q:
            owner=q.execute('SELECT id FROM users WHERE username=?',(user,)).fetchone()['id']
            project=str(uuid.uuid4())
            q.execute('INSERT INTO projects(id,owner,name,revision,document,updated) VALUES (?,?,?,1,?,?)',(project,owner,'Prueba','{}','2026-10-11'))
            self.assertEqual(q.execute('UPDATE projects SET revision=revision+1 WHERE id=? AND revision=1 RETURNING revision',(project,)).fetchone()['revision'],2)
            self.assertIsNone(q.execute('UPDATE projects SET revision=revision+1 WHERE id=? AND revision=1 RETURNING revision',(project,)).fetchone())
        try:
            with db.connect() as q:
                q.execute('UPDATE projects SET name=? WHERE id=?',('No conservar',project))
                raise RuntimeError('rollback')
        except RuntimeError:pass
        with db.connect() as q:self.assertEqual(q.execute('SELECT name FROM projects WHERE id=?',(project,)).fetchone()['name'],'Prueba')
