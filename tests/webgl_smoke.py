"""Chromium + SwiftShader checks for PHEI React WebGL, desktop and mobile viewport."""
import json
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
        page=browser.new_page(viewport={'width':1440,'height':950},device_scale_factor=1)
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto('http://127.0.0.1:8766/')
        expect(page.locator('canvas')).to_be_visible(timeout=30000)
        assert page.evaluate("() => !!document.querySelector('canvas').getContext('webgl2')")
        expect(page.get_by_role('heading',name='El espacio a escala humana.')).to_be_visible()
        page.get_by_role('button',name='Iniciar',exact=True).click()
        page.wait_for_timeout(1350)
        page.get_by_role('button',name='Pausar',exact=True).click()
        assert page.get_by_text(re.compile(r'^[1-9][0-9]*\.[0-9] s$')).count()==1
        page.get_by_role('button',name='Planta',exact=True).click()
        page.get_by_role('button',name='Perspectiva',exact=True).click()
        page.get_by_role('button',name='Recepción',exact=True).click()
        expect(page.get_by_role('heading',name='Recepción',exact=True)).to_be_visible()
        page.get_by_label('Número de personas').fill('34')
        page.get_by_role('button',name='Aplicar y reiniciar').click()
        expect(page.get_by_test_id('completed-agents')).to_have_text('0')
        expect(page.get_by_text('De 34 personas')).to_be_visible()

        (root/'artifacts').mkdir(exist_ok=True)
        page.screenshot(path=str(root/'artifacts/phei-webgl-desktop.png'),full_page=True)
        for width,height in [(390,844),(320,720)]:
            page.set_viewport_size({'width':width,'height':height})
            page.wait_for_timeout(400)
            assert page.evaluate("() => document.documentElement.scrollWidth <= innerWidth+2"), f'horizontal overflow at {width}px'
            assert page.evaluate("() => { const r=document.querySelector('[data-testid=webgl-stage]').getBoundingClientRect(); return r.width>200 && r.right<=innerWidth+2; }"), f'webgl clipped at {width}px'
            page.get_by_role('button',name='Planta',exact=True).click()
            page.get_by_role('button',name='Perspectiva',exact=True).click()
            page.get_by_role('button',name='Sala de espera',exact=True).click()
            expect(page.get_by_role('heading',name='Sala de espera',exact=True)).to_be_visible()
            page.screenshot(path=str(root/f'artifacts/phei-webgl-mobile-{width}.png'),full_page=True)

        # The same-origin handoff transfers scene + parameters, not sensitive observations.
        scene={'unit':'m','provenance':'hypothetical','entry':'hall','rooms':[
            {'id':'hall','name':'Circulación','x':0,'z':0,'width':18,'depth':3,'capacity':30},
            {'id':'reception','name':'Recepción','x':0,'z':-5,'width':6,'depth':5,'capacity':8}],
            'doors':[{'id':'d1','a':'hall','b':'reception','at':[3,0],'width':1.2}],
            'furniture':[]}
        parameters={'population':17,'seed':42,'speed':1.2,'arrivalInterval':1.5,
                    'dwell':12,'orientationDelay':1,'environmentalMultiplier':1}
        handoff={'schema':'phei-webgl-scene-1','savedAt':int(time.time()*1000),
                 'projectName':'Escena de prueba segura','scene':scene,'parameters':parameters}
        page.evaluate("(h) => sessionStorage.setItem('PHEI_WEBGL_SCENE_V1', JSON.stringify(h))",handoff)
        page.reload()
        expect(page.get_by_text('Escena de prueba segura')).to_be_visible()
        expect(page.get_by_text('De 17 personas')).to_be_visible()
        page.get_by_role('button',name='Recepción',exact=True).click()
        expect(page.get_by_role('heading',name='Recepción',exact=True)).to_be_visible()
        assert page.evaluate("() => document.documentElement.scrollWidth <= innerWidth+2")
        assert not errors,errors
        browser.close()
        print('WebGL QA: Three.js, camera, simulated people, room selection, 390/320 mobile, and same-origin handoff OK')
finally:
    server.terminate()
    server.wait(timeout=10)
