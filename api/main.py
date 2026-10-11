import hashlib
import hmac
import json
import os
import secrets
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from starlette.middleware.trustedhost import TrustedHostMiddleware

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from .db import DB
from .models import Credentials, CreateProject, UpdateProject


def password_hash(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), 600_000).hex()
    return salt + ':' + digest


def verify_password(password, encoded):
    return hmac.compare_digest(password_hash(password, encoded.split(':')[0]), encoded)


def create_user(db, username, password):
    Credentials(username=username, password=password)
    with db.connect() as q:
        q.execute('INSERT INTO users(id,username,password) VALUES (?,?,?)', (str(uuid.uuid4()), username, password_hash(password)))


def now():
    return datetime.now(timezone.utc).isoformat()


def create_app(database_url=None, origin=None, production=None):
    production = os.getenv('PHEI_ENV') == 'production' if production is None else production
    url = database_url or os.getenv('DATABASE_URL', 'sqlite:////tmp/phei-dev.sqlite3')
    origin = origin or os.getenv('APP_ORIGIN', 'http://127.0.0.1:8000')
    db = DB(url)
    if production and (not db.postgres or not origin.startswith('https://')):
        raise RuntimeError('Producción exige PostgreSQL y APP_ORIGIN HTTPS')
    dummy_hash = password_hash('invalid-password-for-timing')

    @asynccontextmanager
    async def lifespan(_):
        db.migrate()
        yield

    app = FastAPI(title='PHEI Digital Twin API', version='1.0.0-preview', lifespan=lifespan, docs_url=None if production else '/docs', redoc_url=None)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=[urlparse(origin).hostname])
    app.state.db = db

    @app.middleware('http')
    async def security(request: Request, call_next):
        if request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
            if request.headers.get('origin') != origin:
                return Response('Origen no permitido', status_code=403)
            # Bound before JSON parsing, including chunked bodies.
            size = 0
            parts = []
            async for chunk in request.stream():
                size += len(chunk)
                if size > 12_000_000:
                    return Response('Cuerpo demasiado grande', status_code=413)
                parts.append(chunk)
            request._body = b''.join(parts)
        response = await call_next(request)
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'no-referrer'
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
        # Inline scripts support the self-contained delivery; eval stays forbidden.
        script = "'self' 'unsafe-inline'"  # Packaged offline viewer and legacy use inline scripts.
        response.headers['Content-Security-Policy'] = f"default-src 'self'; script-src {script}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'"
        if request.url.path.startswith('/api'):
            response.headers['Cache-Control'] = 'no-store'
        if production:
            response.headers['Strict-Transport-Security'] = 'max-age=31536000'
        return response

    def auth(request: Request):
        token = hashlib.sha256(request.cookies.get('phei_session', '').encode()).hexdigest()
        with db.connect() as q:
            row = q.execute('SELECT * FROM sessions WHERE token=? AND expires>?', (token, time.time())).fetchone()
        if not row:
            raise HTTPException(401, 'Sesión requerida')
        row = dict(row)
        if request.method not in ('GET', 'HEAD', 'OPTIONS') and not hmac.compare_digest(request.headers.get('x-csrf-token', ''), row['csrf']):
            raise HTTPException(403, 'Token CSRF requerido')
        return row

    def audit(q, actor, project, action):
        q.execute('INSERT INTO audit(id,actor,project_id,action,created) VALUES (?,?,?,?,?)', (str(uuid.uuid4()), actor, project, action, now()))

    def owned(q, project_id, user):
        row = q.execute('SELECT * FROM projects WHERE id=? AND owner=?', (project_id, user['user_id'])).fetchone()
        if not row:
            raise HTTPException(404, 'Proyecto no encontrado')
        return dict(row)

    @app.get('/api/health')
    def health():
        with db.connect() as q:
            q.execute('SELECT 1').fetchone()
        return {'status': 'ok', 'version': '1.0.0-preview', 'database': 'postgresql' if db.postgres else 'sqlite-development', 'frontend': 'offline-typescript-canvas' if (Path(__file__).parents[1]/'dist/index.html').exists() else 'legacy', 'scientific_validation': False}

    @app.post('/api/login')
    def login(body: Credentials, response: Response):
        username = body.username.lower()
        ts = time.time()
        # Atomic upsert counts concurrent failed attempts too. Successful logins clear it.
        with db.connect() as q:
            q.execute('INSERT INTO login_attempts(username,attempts,until_time) VALUES (?,0,?) ON CONFLICT(username) DO NOTHING', (username, ts+900))
            q.execute('UPDATE login_attempts SET attempts=0,until_time=? WHERE username=? AND until_time<=?', (ts+900, username, ts))
            row = q.execute('UPDATE login_attempts SET attempts=attempts+1 WHERE username=? RETURNING attempts', (username,)).fetchone()
            attempts = row['attempts']
        if attempts > 10:
            raise HTTPException(429, 'Demasiados intentos; espera 15 minutos')
        with db.connect() as q:
            user = q.execute('SELECT * FROM users WHERE username=?', (username,)).fetchone()
        valid = verify_password(body.password, user['password'] if user else dummy_hash)
        if not user or not valid:
            raise HTTPException(401, 'Credenciales inválidas')
        token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        with db.connect() as q:
            q.execute('INSERT INTO sessions(token,user_id,csrf,expires) VALUES (?,?,?,?)', (hashlib.sha256(token.encode()).hexdigest(), user['id'], csrf, ts+28800))
            q.execute('UPDATE login_attempts SET attempts=0 WHERE username=?', (username,))
            audit(q, user['id'], None, 'login')
        response.set_cookie('phei_session', token, httponly=True, secure=production, samesite='strict', max_age=28800, path='/')
        return {'csrf': csrf}

    @app.get('/api/session')
    def session(user=Depends(auth)):
        return {'csrf': user['csrf'], 'user_id': user['user_id']}

    @app.post('/api/logout', status_code=204)
    def logout(response: Response, user=Depends(auth)):
        with db.connect() as q:
            q.execute('DELETE FROM sessions WHERE token=?', (user['token'],))
            audit(q, user['user_id'], None, 'logout')
        response.delete_cookie('phei_session', path='/')

    @app.get('/api/projects')
    def projects(user=Depends(auth)):
        with db.connect() as q:
            return [dict(r) for r in q.execute('SELECT id,name,revision,updated FROM projects WHERE owner=? ORDER BY updated DESC', (user['user_id'],)).fetchall()]

    @app.post('/api/projects', status_code=201)
    def create(body: CreateProject, user=Depends(auth)):
        project_id, stamp = str(uuid.uuid4()), now()
        document = body.document.model_dump_json()
        with db.connect() as q:
            q.execute('INSERT INTO projects(id,owner,name,revision,document,updated) VALUES (?,?,?,1,?,?)', (project_id, user['user_id'], body.name, document, stamp))
            q.execute('INSERT INTO revisions(project_id,revision,document,created) VALUES (?,1,?,?)', (project_id, document, stamp))
            audit(q, user['user_id'], project_id, 'project.create')
        return {'id': project_id, 'revision': 1}

    @app.get('/api/projects/{project_id}')
    def get_project(project_id: str, user=Depends(auth)):
        with db.connect() as q:
            row = owned(q, project_id, user)
        row['document'] = json.loads(row['document'])
        return row

    @app.put('/api/projects/{project_id}')
    def update(project_id: str, body: UpdateProject, user=Depends(auth)):
        stamp, document = now(), body.document.model_dump_json()
        with db.connect() as q:
            owned(q, project_id, user)
            row = q.execute('UPDATE projects SET name=?,document=?,revision=revision+1,updated=? WHERE id=? AND owner=? AND revision=? RETURNING revision', (body.name, document, stamp, project_id, user['user_id'], body.revision)).fetchone()
            if not row:
                raise HTTPException(409, 'Proyecto modificado; vuelve a cargar antes de guardar')
            revision = row['revision']
            q.execute('INSERT INTO revisions(project_id,revision,document,created) VALUES (?,?,?,?)', (project_id, revision, document, stamp))
            audit(q, user['user_id'], project_id, 'project.update')
        return {'id': project_id, 'revision': revision}

    @app.get('/api/projects/{project_id}/history')
    def history(project_id: str, user=Depends(auth)):
        with db.connect() as q:
            owned(q, project_id, user)
            return [dict(r) for r in q.execute('SELECT revision,document,created FROM revisions WHERE project_id=? ORDER BY revision', (project_id,)).fetchall()]

    @app.get('/api/audit')
    def events(user=Depends(auth)):
        with db.connect() as q:
            return [dict(r) for r in q.execute('SELECT * FROM audit WHERE actor=? ORDER BY created DESC LIMIT 200', (user['user_id'],)).fetchall()]

    @app.get('/api/sources')
    def sources():
        return [
            {'id': 'preser-nic', 'title': 'PRESER-NIC', 'status': 'methodological_unverified', 'limit': 'Documento original no disponible en el repositorio; sin validación psicométrica comprobada.'},
            {'id': 'ciudad-regula', 'title': 'La Ciudad que Regula', 'status': 'methodological_unverified', 'limit': 'Marco metodológico propio; afirmaciones causales no verificadas.'},
            {'id': 'brusilovsky', 'title': 'Accesibilidad cognitiva — Berta Brusilovsky', 'status': 'bibliographic_reference', 'limit': 'Referencia conceptual; no se ha verificado la obra completa ni validado la rúbrica PHEI.'}
        ]

    @app.post('/api/rag/query')
    def rag(user=Depends(auth)):
        raise HTTPException(503, 'RAG inactivo: se requiere corpus verificado, citas por página y evaluación de recuperación')

    root = Path(__file__).resolve().parents[1]
    app.mount('/phei', StaticFiles(directory=root/'phei', html=True), name='legacy')
    # El visor React/WebGL complementario usa la misma API y el mismo origen.
    if (root/'dist-webgl').is_dir():
        app.mount('/webgl', StaticFiles(directory=root/'dist-webgl', html=True), name='webgl')
    if (root/'dist').exists():
        app.mount('/', StaticFiles(directory=root/'dist', html=True), name='web')
    else:
        @app.get('/')
        def home():
            return RedirectResponse('/phei/')
    return app

app = create_app()
