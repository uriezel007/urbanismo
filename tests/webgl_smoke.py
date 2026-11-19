"""Chromium + SwiftShader checks for PHEI React WebGL, desktop and mobile viewport."""
import base64
import json
import re
import struct
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

        # Blender: embedded-only glTF is visible, without changing simulation metrics.
        vertices=struct.pack('<9f',0,0,0,2,0,0,0,0,2)
        model={
            'asset':{'version':'2.0'},'buffers':[{'byteLength':len(vertices),
                 'uri':'data:application/octet-stream;base64,'+base64.b64encode(vertices).decode()}],
            'bufferViews':[{'buffer':0,'byteOffset':0,'byteLength':len(vertices)}],
            'accessors':[{'bufferView':0,'componentType':5126,'count':3,'type':'VEC3',
                          'min':[0,0,0],'max':[2,0,2]}],
            'meshes':[{'primitives':[{'attributes':{'POSITION':0}}]}],
            'nodes':[{'mesh':0}],'scenes':[{'nodes':[0]}],'scene':0}
        stage_metrics=page.get_by_test_id('completed-agents').inner_text()
        page.get_by_test_id('blender-file').set_input_files({
            'name':'ambiente.gltf','mimeType':'model/gltf+json',
            'buffer':json.dumps(model).encode()})
        expect(page.get_by_test_id('blender-imported')).to_contain_text('ambiente.gltf',timeout=30000)
        assert page.get_by_test_id('completed-agents').inner_text()==stage_metrics
        expect(page.locator('.phei-gl-scenenote')).to_contain_text('BLENDER: CAPA VISUAL')
        # Equivalent GLB (Blender's recommended export) is loaded via the same UI.
        glb_doc={**model,'buffers':[{'byteLength':len(vertices)}]}
        json_chunk=json.dumps(glb_doc,separators=(',',':')).encode()
        json_chunk+=b' '*((-len(json_chunk))%4)
        bin_chunk=vertices+b'\x00'*((-len(vertices))%4)
        glb_size=12+8+len(json_chunk)+8+len(bin_chunk)
        glb=(struct.pack('<III',0x46546c67,2,glb_size)
             +struct.pack('<II',len(json_chunk),0x4e4f534a)+json_chunk
             +struct.pack('<II',len(bin_chunk),0x004e4942)+bin_chunk)
        page.get_by_test_id('blender-file').set_input_files({
            'name':'ambiente.glb','mimeType':'model/gltf-binary','buffer':glb})
        expect(page.get_by_test_id('blender-imported')).to_contain_text('ambiente.glb',timeout=30000)
        assert page.get_by_test_id('completed-agents').inner_text()==stage_metrics
        # A failed second import must leave the valid current model untouched.
        model['buffers']=[{'uri':'https://example.com/external.bin','byteLength':len(vertices)}]
        page.get_by_test_id('blender-file').set_input_files({
            'name':'inseguro.gltf','mimeType':'model/gltf+json',
            'buffer':json.dumps(model).encode()})
        expect(page.get_by_role('status').last).to_contain_text('No se permiten recursos externos',timeout=15000)
        expect(page.get_by_test_id('blender-imported')).to_contain_text('ambiente.glb')
        page.get_by_role('button',name='Retirar modelo').click()
        expect(page.get_by_test_id('blender-imported')).to_have_count(0)

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
