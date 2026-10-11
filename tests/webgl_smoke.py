"""Verify the compiled React/R3F viewer with Chromium software WebGL."""
import re
import subprocess
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
root=Path(__file__).resolve().parents[1]
server=subprocess.Popen(['python','-m','http.server','8766','--bind','127.0.0.1','--directory',str(root/'dist-webgl')],stdout=subprocess.DEVNULL)
try:
    time.sleep(1)
    with sync_playwright() as p:
        browser=p.chromium.launch(args=['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
        page=browser.new_page(viewport={'width':1440,'height':1000})
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto('http://127.0.0.1:8766/');expect(page.locator('canvas')).to_be_visible()
        assert page.evaluate("() => !!document.querySelector('canvas').getContext('webgl2')")
        page.get_by_role('button',name='Iniciar',exact=True).click();page.wait_for_timeout(1300)
        page.get_by_role('button',name='Pausar',exact=True).click()
        assert page.get_by_text(re.compile(r'^[1-9][0-9]*\.[0-9] s$')).count()==1
        page.get_by_role('button',name='Planta',exact=True).click();page.get_by_role('button',name='Perspectiva',exact=True).click()
        page.get_by_role('button',name='Recepción',exact=True).click()
        expect(page.get_by_role('heading',name='Recepción',exact=True)).to_be_visible()
        (root/'artifacts').mkdir(exist_ok=True)
        page.screenshot(path=str(root/'artifacts/phei-react-webgl.png'),full_page=True)
        assert not errors,errors
        browser.close();print('React/R3F browser QA: contexto WebGL, simulación, cámaras y selección OK')
finally:
    server.terminate();server.wait(timeout=10)
