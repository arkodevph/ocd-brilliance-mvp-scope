import asyncio, json, math, subprocess, textwrap
from pathlib import Path
import edge_tts
ROOT=Path(__file__).resolve().parent
scenes=json.loads((ROOT/'storyboard.json').read_text())
(ROOT/'public/audio').mkdir(exist_ok=True)
async def main():
 sem=asyncio.Semaphore(3)
 async def produce(s):
  async with sem:
   path=ROOT/'public/audio'/f"{s['id']}.mp3"
   textpath=path.with_suffix('.txt')
   for attempt in range(3):
    if not path.exists() or not textpath.exists() or textpath.read_text()!=s['voice']:
     await edge_tts.Communicate(s['voice'],'en-AU-NatashaNeural',rate='+8%').save(str(path))
    duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(path)]))
    if duration>=len(s['voice'].split())/5:
     textpath.write_text(s['voice'])
     break
    path.unlink()
   else: raise RuntimeError('Incomplete narration: '+s['id'])
   s['audioDuration']=duration
   s['frames']=math.ceil((duration+0.65)*30)
   # Each readable caption is timed to its portion of this spoken scene.
   words=s['voice'].split();groups=[];current=[]
   for word in words:
    if current and len(' '.join(current+[word]))>68:groups.append(current);current=[]
    current.append(word)
   if current:groups.append(current)
   elapsed=0;s['captions']=[]
   for group in groups:
    length=len(group)/len(words)*duration
    s['captions'].append({'start':round(elapsed,3),'end':round(elapsed+length,3),'text':'\n'.join(textwrap.wrap(' '.join(group),width=38))})
    elapsed+=length
   print(s['id'],round(duration,2),'seconds',flush=True)
 await asyncio.gather(*(produce(s) for s in scenes))
 start=0;cues=[]
 def stamp(sec):
  ms=round(sec*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
  return f'{h:02}:{m:02}:{s:02},{ms:03}'
 for s in scenes:
  s['from']=start
  for c in s['captions']:cues.append(f"{len(cues)+1}\n{stamp(start/30+c['start'])} --> {stamp(start/30+c['end'])}\n{c['text']}\n")
  start+=s['frames']
 (ROOT/'src/scenes.json').write_text(json.dumps(scenes,indent=2))
 (ROOT/'out/ocd-mobile-tutorial.srt').write_text('\n'.join(cues))
 print('TOTAL',start,'frames',start/30,'seconds',flush=True)
asyncio.run(main())
