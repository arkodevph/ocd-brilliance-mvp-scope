"""Normalize playback and verify the actual encoded tutorial."""
import json
import subprocess
import sys
from pathlib import Path
root = Path(__file__).resolve().parent
video = root / 'out/ocd-mobile-tutorial.mp4'
if '--verify-only' not in sys.argv:
    ready = video.with_name('ocd-mobile-tutorial-ready.mp4')
    subprocess.run([
        'ffmpeg', '-y', '-i', str(video), '-vf',
        'scale=in_range=pc:out_range=tv,format=yuv420p',
        '-color_range', 'tv', '-colorspace', 'bt709',
        '-color_primaries', 'bt709', '-color_trc', 'bt709',
        '-af', 'volume=4dB', '-c:v', 'libx264', '-preset', 'fast',
        '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
        '-b:a', '192k', '-movflags', '+faststart', str(ready),
    ], check=True)
    ready.replace(video)
probe = json.loads(subprocess.check_output([
    'ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(video),
]))
v = next(s for s in probe['streams'] if s['codec_type'] == 'video')
a = next(s for s in probe['streams'] if s['codec_type'] == 'audio')
scenes = json.loads((root / 'src/scenes.json').read_text())
frames = sum(s['frames'] for s in scenes)
assert (v['width'], v['height']) == (1080, 1920)
assert v['codec_name'] == 'h264' and a['codec_name'] == 'aac'
assert v['pix_fmt'] == 'yuv420p' and v['r_frame_rate'] == '30/1'
assert int(v['nb_frames']) == frames
assert abs(float(probe['format']['duration']) - frames / 30) < 0.1
subprocess.run(['ffmpeg', '-v', 'error', '-i', str(video), '-f', 'null', '-'], check=True)
report = {
    'encodedFile': 'PASS', 'decode': 'PASS', 'width': v['width'], 'height': v['height'],
    'fps': 30, 'pixelFormat': v['pix_fmt'], 'videoCodec': v['codec_name'],
    'audioCodec': a['codec_name'], 'frames': frames, 'sceneCount': len(scenes),
    'durationSeconds': float(probe['format']['duration']),
    'scope': 'Designed product concept with illustrative records, route distances and travel times. Live routing and background push are not connected by this video.',
}
(root / 'out/verification.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
