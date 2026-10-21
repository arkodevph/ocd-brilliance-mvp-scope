# OCD Brilliance mobile workflow video

A portrait product walkthrough about reducing manual office work. It covers Android and iPhone installation steps, a client service request, route distance and travel-time estimates, staff review, employee acceptance, calendar navigation, and notification permission followed by a booking update.

The interface is designed for the video. Records, route geometry, distance and travel values are illustrative. The video does not connect a live routing service, deliver background push notifications, or demonstrate a successful installation on a physical phone. The closing screen states these conditions.

The rendered video is `out/ocd-mobile-tutorial.mp4`. Captions are burned into the video and supplied separately as `out/ocd-mobile-tutorial.srt`. Narration uses the synthetic en-AU-NatashaNeural voice.

## Render the video

From this directory, run:

```bash
npm install
npm run stills
npm run render
```

Remotion can download its supported Chromium build when needed. To use an existing browser, set `CHROME_PATH` to its executable. Set `VIDEO_CONCURRENCY` to control rendering parallelism; the default is four.

## Edit the story

Edit `storyboard.json`, then run `npm run narration` to generate speech, scene timings and subtitles. This command requires `uv`, internet access to the speech service and `ffprobe`. It checks for incomplete speech clips before accepting them.

`src/scenes.json` contains the derived frame timings and caption blocks. `src/product-scenes.jsx` contains the product screens. `src/index.jsx` contains the phone frame, installation and permission illustrations, chapter titles and timing. All video motion uses the Remotion frame clock.

The only website capture used in the final video is the public landing page underneath the installation illustrations. To recapture it, run the OCD application locally and then run `npm run capture`. `OCD_CAPTURE_URL` defaults to `http://127.0.0.1:8047`.

## Verification

The verification pass renders frame zero, a hold inside every chapter, and the final frame before encoding. The finished MP4 is then checked for dimensions, frame rate, H.264 video, AAC audio, duration and decoding errors. Scene timing and caption validation are recorded in `out/verification.json`.

App source and deployed behavior are unchanged by this video project.
