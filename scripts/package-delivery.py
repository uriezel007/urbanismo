"""Package only tracked source and verified build artifacts."""
import argparse, hashlib, json, os, shutil, subprocess
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument('--artifacts',type=Path,required=True)
p.add_argument('--output',type=Path,required=True)
a=p.parse_args()
root=Path(__file__).resolve().parents[1]
a.output.mkdir(parents=True,exist_ok=False)
for name in filter(None,subprocess.check_output(['git','ls-files','-z'],cwd=root).decode().split('\0')):
    src=root/name
    if src.is_symlink(): raise RuntimeError('Symlink in source')
    target=a.output/name
    target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(src,target)
for artifact,folder in [('phei-delivery-and-qa','dist'),('phei-delivery-and-qa','artifacts'),('phei-webgl-preview','dist-webgl'),('phei-webgl-preview','artifacts')]:
    shutil.copytree(a.artifacts/artifact/folder,a.output/folder,dirs_exist_ok=True)
original=(a.output/'archive/phei-0.5-original.html').read_bytes()
assert hashlib.sha1(b'blob '+str(len(original)).encode()+b'\0'+original).hexdigest()=='d6d22a2116777229375b39e4f8fb686253bd8314'
for name in ['dist/index.html','dist/phei/index.html','dist-webgl/index.html','LEEME.txt','api/main.py']:
    assert (a.output/name).is_file(),name
metadata={'commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'run':os.environ.get('GITHUB_RUN_ID'),'status':'1.0 preview','human_height_metres':1.75}
(a.output/'ENTREGA.json').write_text(json.dumps(metadata,indent=2)+'\n')
paths=sorted(x for x in a.output.rglob('*') if x.is_file())
(a.output/'SHA256SUMS.txt').write_text(''.join(hashlib.sha256(x.read_bytes()).hexdigest()+'  '+str(x.relative_to(a.output))+'\n' for x in paths))
print('Delivery checked:',len(paths),'files; original 0.5 preserved.')
