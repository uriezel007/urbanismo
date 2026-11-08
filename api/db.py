"""Portable DB-API store. PostgreSQL in deployment; SQLite only for local tests.
All query values are parameters; the adapter never interpolates user values.
"""
import sqlite3
from contextlib import contextmanager

SCHEMA = [
 'CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)',
 'CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), csrf TEXT NOT NULL, expires DOUBLE PRECISION NOT NULL)',
 'CREATE TABLE IF NOT EXISTS login_attempts (username TEXT PRIMARY KEY, attempts INTEGER NOT NULL, until_time DOUBLE PRECISION NOT NULL)',
 'CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES users(id), name TEXT NOT NULL, revision INTEGER NOT NULL, document TEXT NOT NULL, updated TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS revisions (project_id TEXT NOT NULL REFERENCES projects(id), revision INTEGER NOT NULL, document TEXT NOT NULL, created TEXT NOT NULL, PRIMARY KEY(project_id, revision))',
 'CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, actor TEXT NOT NULL REFERENCES users(id), project_id TEXT REFERENCES projects(id), action TEXT NOT NULL, created TEXT NOT NULL)',
 'CREATE INDEX IF NOT EXISTS projects_owner_idx ON projects(owner)',
 'CREATE INDEX IF NOT EXISTS audit_actor_idx ON audit(actor)',
]

class DB:
    def __init__(self, url):
        self.url = url
        self.postgres = url.startswith(('postgresql://', 'postgres://'))
        if not self.postgres and not url.startswith('sqlite:///'):
            raise ValueError('DATABASE_URL debe usar PostgreSQL o sqlite:///')

    @contextmanager
    def connect(self):
        if self.postgres:
            import psycopg
            from psycopg.rows import dict_row
            conn = psycopg.connect(self.url, row_factory=dict_row)
        else:
            conn = sqlite3.connect(self.url.removeprefix('sqlite:///'), timeout=10)
            conn.row_factory = sqlite3.Row
            conn.execute('PRAGMA foreign_keys=ON')
        class Queries:
            def execute(_, sql, values=()):
                return conn.execute(sql.replace('?', '%s') if self.postgres else sql, values)
        try:
            yield Queries()
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def migrate(self):
        with self.connect() as db:
            # Serialise bootstraps across PostgreSQL workers.
            if self.postgres:
                db.execute('SELECT pg_advisory_xact_lock(710041)')
            for sql in SCHEMA:
                db.execute(sql)
            db.execute('INSERT INTO schema_version(version) VALUES (1) ON CONFLICT(version) DO NOTHING')
