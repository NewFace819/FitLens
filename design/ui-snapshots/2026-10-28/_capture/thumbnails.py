from PIL import Image, ImageDraw, ImageStat
from pathlib import Path
import json, math
root=Path(__file__).resolve().parent.parent
m=json.loads((root/'manifest.json').read_text(encoding='utf-8'))
(root/'thumbs').mkdir(exist_ok=True)
(root/'contact-sheets').mkdir(exist_ok=True)
live_ids={e['id'] for e in m['images']}
for file in (root/'thumbs').glob('*.jpg'):
    if file.stem not in live_ids: file.unlink()
checks=[]
for e in m['images']:
    im=Image.open(root/e['file']).convert('RGB')
    small=im.copy(); small.thumbnail((195,466)); small.save(root/'thumbs'/f"{e['id']}.jpg",quality=83)
    stat=ImageStat.Stat(im)
    checks.append({'id':e['id'],'width':im.width,'height':im.height,'meanStdDev':sum(stat.stddev)/3,'file':e['file']})
for group in m['groups']:
    entries=[e for e in m['images'] if e['group']==group]
    for start in range(0,len(entries),24):
        chunk=entries[start:start+24];cols=6;cellw=205;cellh=480
        sheet=Image.new('RGB',(cols*cellw,math.ceil(len(chunk)/cols)*cellh),(232,235,225));draw=ImageDraw.Draw(sheet)
        for i,e in enumerate(chunk):
            x=(i%cols)*cellw;y=(i//cols)*cellh
            im=Image.open(root/'thumbs'/f"{e['id']}.jpg")
            sheet.paste(im,(x+(cellw-im.width)//2,y+24))
            draw.text((x+8,y+5),e['id']+' '+Path(e['file']).stem.split('__',1)[1][:23],fill=(25,52,37))
        sheet.save(root/'contact-sheets'/f'{group}-{start//24+1:02d}.jpg',quality=85)
(root/'_capture'/'image-qa.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
print(json.dumps({'images':len(checks),'blankCandidates':[x for x in checks if x['meanStdDev']<8],'sheets':len(list((root/'contact-sheets').glob('*.jpg')))}))
