"""Real Chromium QA. Run in CI or on a host permitting local sockets."""
import json
import os
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from api.main import create_user
from api.db import DB

ROOT=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory() as temp:
    database='sqlite:///'+str(Path(temp)/'browser.sqlite3')
    db=DB(database);db.migrate();create_user(db,'browser-user','browser-test-password-123')
    env={**os.environ,'DATABASE_URL':database,'APP_ORIGIN':'http://127.0.0.1:8765','PHEI_ENV':'development'}
    server=subprocess.Popen(['python','-m','uvicorn','api.main:app','--host','127.0.0.1','--port','8765'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL)
    try:
        for _ in range(100):
            try:
                urllib.request.urlopen('http://127.0.0.1:8765/api/health',timeout=1);break
            except Exception:time.sleep(.1)
        else:raise RuntimeError('Servidor no disponible')
        with sync_playwright() as p:
            browser=p.chromium.launch(args=['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
            page=browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
            errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto('http://127.0.0.1:8765/');page.wait_for_selector('#roomButtons button')
            assert page.locator('#roomButtons button').count()==7
            page.locator('#play').click();page.wait_for_timeout(1300);page.locator('#play').click()
            assert int(page.locator('#activePeople').inner_text())>0
            page.get_by_role('button',name='Recepción',exact=True).click()
            assert page.locator('#roomName').inner_text()=='Recepción'
            page.locator('[data-camera=plan]').click();page.locator('[data-camera=perspective]').click()
            page.locator('#saveProject').click()
            with page.expect_download() as download:page.locator('#exportProject').click()
            exported=json.loads(Path(download.value.path()).read_text())
            assert exported['schema']=='phei-twin-1'
            assert exported['scene']['unit']=='m'
            page.locator('[data-tab=evidence]').click()
            for name,value in {'label':'Nivel sonoro','value':'42','unit':'dB(A)','source':'Instrumento de prueba','limitations':'Dato sintético de prueba'}.items():page.locator(f'#evidenceForm [name={name}]').fill(value)
            page.locator('#evidenceForm button').click();assert 'Medido' in page.locator('#evidenceTable').inner_text()
            page.locator('[data-tab=calibration]').click()
            screenshot=page.screenshot()
            page.locator('#planFile').set_input_files({'name':'test-plan.png','mimeType':'image/png','buffer':screenshot})
            expect(page.locator("#planCanvas")).to_have_attribute("width", "1440")
            for name,value in {'ax':'100','ay':'100','bx':'600','by':'100','referenceMeters':'5'}.items():page.locator('#'+name).fill(value)
            page.locator('#calibrateBtn').click();assert '0.01000' in page.locator('#calibrationStatus').inner_text()
            page.locator('[data-tab=projects]').click()
            page.locator('#loginForm [name=username]').fill('browser-user');page.locator('#loginForm [name=password]').fill('browser-test-password-123');page.locator('#loginForm button').click()
            expect(page.locator("#syncProject")).to_be_enabled()
            page.locator('#syncProject').click();expect(page.locator("#toast")).to_contain_text("sincronizado")
            page.locator('#loadRemote').click();page.wait_for_selector('#remoteProjects button')
            page.locator('#logout').click();expect(page.locator("#syncProject")).to_be_disabled()
            page.locator('[data-tab=spatial]').click()
            out=ROOT/'artifacts';out.mkdir(exist_ok=True);page.screenshot(path=str(out/'phei-desktop.png'),full_page=True)
            page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(out/'phei-mobile.png'),full_page=True)
            assert page.evaluate('() => document.documentElement.scrollWidth <= innerWidth+1')
            # Handoff a React/WebGL en el mismo origen: guarda revisión, pasa escena hipotética y vuelve.
            expect(page.locator('#openWebgl')).to_be_visible()
            page.locator('#openWebgl').click()
            expect(page).to_have_url('http://127.0.0.1:8765/webgl/')
            expect(page.get_by_role('heading',name='El espacio a escala humana.')).to_be_visible()
            expect(page.get_by_text('De 24 personas')).to_be_visible()
            page.get_by_role('link',name='Volver al estudio y evaluaciones').click()
            expect(page).to_have_url('http://127.0.0.1:8765/')
            page.goto('http://127.0.0.1:8765/phei/');expect(page.locator('#model3dMount canvas')).to_have_count(1)
            assert page.locator('#kZones').inner_text()=='7'
            assert page.locator('#kStress').inner_text()=='—'
            assert not errors, errors
            browser.close()
            print('Browser QA: modelo, simulación, exportación, evidencia, calibración, cuenta, servidor, móvil y clásico OK')
    finally:
        server.terminate();server.wait(timeout=10)
