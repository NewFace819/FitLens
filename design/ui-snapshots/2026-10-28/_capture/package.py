from PIL import Image, PngImagePlugin
from pathlib import Path
import json, hashlib, zipfile
root=Path(__file__).resolve().parent.parent
mp=root/'manifest.json'
m=json.loads(mp.read_text(encoding='utf-8'))
for e in m['images']:
    f=root/e['file']
    with Image.open(f) as src: im=src.copy()
    meta=PngImagePlugin.PngInfo()
    meta.add_itxt('Title',e['title'])
    meta.add_itxt('Keywords','; '.join(e['tags']))
    meta.add_itxt('Source',e['route'])
    meta.add_itxt('Verification',e['verification'])
    meta.add_itxt('CapturedAt',e['capturedAt'])
    im.save(f,pnginfo=meta)
    e['sha256']=hashlib.sha256(f.read_bytes()).hexdigest()
    e['tagsEmbeddedInPNG']=True
    f.with_suffix('.json').write_text(json.dumps(e,ensure_ascii=False,indent=2),encoding='utf-8')
mp.write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding='utf-8')
readme=root/'README.md'
text=readme.read_text(encoding='utf-8')
line='\nTag cũng được nhúng trong metadata PNG (`Keywords`), kèm Title, Source và CapturedAt. Ảnh không có nhãn đè lên giao diện.\n'
if 'Tag cũng được nhúng' not in text: readme.write_text(text+line,encoding='utf-8')
qa={'images':len(m['images']),'uniqueIDs':len({e['id'] for e in m['images']})==len(m['images']),'metadataTags':True,'hashes':True}
assert qa['uniqueIDs']
for e in m['images']:
    f=root/e['file']
    with Image.open(f) as im:
        assert 'use-last-time' in im.info.get('Keywords','') if 'use-last-time' in e['tags'] else im.info.get('Keywords')
    assert hashlib.sha256(f.read_bytes()).hexdigest()==e['sha256']
(root/'_capture'/'package-qa.json').write_text(json.dumps(qa,indent=2),encoding='utf-8')
archive=root.parent/(root.name+'.zip')
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for f in sorted(root.rglob('*')):
        if f.is_file(): z.write(f,Path(root.name)/f.relative_to(root))
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert sum(x.endswith('.png') and '/_capture/' not in x for x in z.namelist())==len(m['images'])
print(json.dumps({'archive':str(archive),'sizeMB':round(archive.stat().st_size/1024/1024,1),'images':len(m['images']),'zipIntegrity':'PASS','pngMetadata':'PASS'}))
