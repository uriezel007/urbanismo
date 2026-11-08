import tempfile
import unittest
from pathlib import Path
import httpx
import os
from unittest.mock import patch

async def inline_worker(fn, *args, **kwargs):
    return fn(*args)

from api.main import create_app, create_user

ORIGIN = 'http://testserver'
class ApiTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.app = create_app('sqlite:///'+str(Path(self.temp.name)/'test.db'), ORIGIN, False)
        self.worker_patch = patch('anyio.to_thread.run_sync', inline_worker) if os.getenv('PHEI_SANDBOX_INLINE_TESTS') == '1' else None
        if self.worker_patch: self.worker_patch.start()
        self.lifespan = self.app.router.lifespan_context(self.app)
        await self.lifespan.__aenter__()
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app), base_url=ORIGIN)
        create_user(self.app.state.db, 'alice', 'a-long-password-123')
        create_user(self.app.state.db, 'bob', 'another-password-123')
        self.client.headers['origin'] = ORIGIN
    async def asyncTearDown(self):
        await self.client.aclose()
        await self.lifespan.__aexit__(None, None, None)
        if self.worker_patch: self.worker_patch.stop()
        self.temp.cleanup()
    async def login(self, name='alice', password='a-long-password-123'):
        res=(await self.client.post('/api/login',json={'username':name,'password':password}))
        self.assertEqual(res.status_code,200,res.text)
        self.client.headers['x-csrf-token']=res.json()['csrf']
    async def create(self):
        r=(await self.client.post('/api/projects',json={'name':'Hospital','document':{'evidence':[]}}))
        self.assertEqual(r.status_code,201,r.text)
        return r.json()['id']
    async def test_auth_csrf_and_revocation(self):
        self.assertEqual((await self.client.get('/api/projects')).status_code,401)
        await self.login()
        self.client.headers.pop('x-csrf-token')
        self.assertEqual((await self.client.post('/api/projects',json={'name':'X'})).status_code,403)
        self.client.headers['x-csrf-token']=(await self.client.get('/api/session')).json()['csrf']
        self.assertEqual((await self.client.post('/api/logout')).status_code,204)
        self.assertEqual((await self.client.get('/api/projects')).status_code,401)
    async def test_origin_and_limits(self):
        self.assertEqual((await self.client.post('/api/login',headers={'origin':'https://evil.test'},json={})).status_code,403)
        self.assertEqual((await self.client.post('/api/login',content='x'*12_000_001)).status_code,413)
    async def test_history_and_conflicts(self):
        await self.login();pid=await self.create()
        payload={'name':'Nuevo','revision':1,'document':{'notes':'Cambio'}}
        self.assertEqual((await self.client.put('/api/projects/'+pid,json=payload)).status_code,200)
        self.assertEqual((await self.client.put('/api/projects/'+pid,json=payload)).status_code,409)
        history=(await self.client.get('/api/projects/'+pid+'/history')).json()
        self.assertEqual([h['revision'] for h in history],[1,2])
        self.assertEqual(len((await self.client.get('/api/audit')).json()),3)
    async def test_project_isolation(self):
        await self.login();pid=await self.create();await self.login('bob','another-password-123')
        self.assertEqual((await self.client.get('/api/projects')).json(),[])
        self.assertEqual((await self.client.get('/api/projects/'+pid)).status_code,404)
        self.assertEqual((await self.client.get('/api/projects/'+pid+'/history')).status_code,404)
        self.assertEqual((await self.client.put('/api/projects/'+pid,json={'name':'Attack','revision':1})).status_code,404)
    async def test_provenance_validation(self):
        await self.login()
        e={'id':'1','kind':'simulated','label':'Ocupación','value':4.0,'unit':'personas','source':'run','recorded_at':'2026-10-10T12:00:00Z','limitations':'Hipótesis'}
        self.assertEqual((await self.client.post('/api/projects',json={'name':'X','document':{'evidence':[e]}})).status_code,422)
        e['run_id']='run-1'
        self.assertEqual((await self.client.post('/api/projects',json={'name':'X','document':{'evidence':[e]}})).status_code,201)
        e['kind']='measured'
        self.assertEqual((await self.client.post('/api/projects',json={'name':'X','document':{'evidence':[e]}})).status_code,422)
    async def test_production_fail_closed_and_rag(self):
        with self.assertRaises(RuntimeError):create_app('sqlite:////tmp/unused.db',ORIGIN,True)
        await self.login();self.assertEqual((await self.client.post('/api/rag/query')).status_code,503)
        self.assertEqual((await self.client.get('/api/health')).json()['status'],'ok')
    async def test_login_throttling(self):
        for _ in range(10):
            r=(await self.client.post('/api/login',json={'username':'nobody','password':'bad-password-123'}))
            self.assertEqual(r.status_code,401)
        self.assertEqual((await self.client.post('/api/login',json={'username':'nobody','password':'bad-password-123'})).status_code,429)
if __name__=='__main__': unittest.main()
