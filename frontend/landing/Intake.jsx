import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHero } from './components';
import { workflow, uploadVideo } from './workflow-api';
import rooms from '../../lib/intake-rooms.json';

const services = [
  'Domestic assistance',
  'Support work',
  'Cleaning',
  'Transport',
  'Support coordination',
  'Nursing',
];
const slugs = [
  'domestic-assistance',
  'support-work',
  'cleaning',
  'transport',
  'support-coordination',
  'nursing',
];
const types = ['video/mp4', 'video/quicktime', 'video/webm'];

export default function Intake() {
  const [params] = useSearchParams();
  const [postcode, setPostcode] = useState('');
  const [area, setArea] = useState(null);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [cameraRoom, setCameraRoom] = useState(null);
  const [cameraPhase, setCameraPhase] = useState('idle');
  const [cameraError, setCameraError] = useState('');
  const [seconds, setSeconds] = useState(0);
  const liveVideo = useRef(null);
  const camera = useRef({ request: 0, stream: null, recorder: null, timer: null });

  const key = useRef(crypto.randomUUID());
  const uploads = useRef(new Map());
  const selected = services[slugs.indexOf(params.get('service'))] || services[0];
  useEffect(() => {
    const items = files.map(({ file, room }) => ({
      file,
      room,
      url: URL.createObjectURL(file),
    }));

    setPreviews(items);
    return () => items.forEach((item) => URL.revokeObjectURL(item.url));
  }, [files]);

  function releaseCamera() {
    camera.current.request++;
    clearInterval(camera.current.timer);
    const recorder = camera.current.recorder;
    camera.current.recorder = null;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    camera.current.stream?.getTracks().forEach((track) => track.stop());
    camera.current.stream = null;
  }

  useEffect(() => () => releaseCamera(), []);

  useEffect(() => {
    if (liveVideo.current && camera.current.stream) {
      liveVideo.current.srcObject = camera.current.stream;
      liveVideo.current.play().catch(() => {});
    }
  }, [cameraPhase]);

  useEffect(() => {
    if (area?.status !== 'covered') {
      releaseCamera();
      setCameraPhase('idle');
      setCameraRoom(null);
    }
  }, [area?.status]);
  async function checkArea(event) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    setArea(null);
    try {
      setArea({
        ...(await workflow('area', { query: { postcode } })),
        postcode,
      });
    } catch (reason) {
      setError(reason.message);
    } finally {
      setPending(false);
    }
  }

  function addVideos(incoming, room) {
    const next = [...files];
    for (const file of incoming) {
      if (!types.includes(file.type) || file.size < 12 || file.size > 100 * 1024 * 1024)
        throw new Error('Choose MP4, MOV or WebM videos up to 100 MB each.');
      if (
        !next.some(
          (item) =>
            item.file === file ||
            (item.file.name === file.name &&
              item.file.size === file.size &&
              item.file.lastModified === file.lastModified),
        )
      )
        next.push({ file, room });
    }

    if (next.length > 5) throw new Error('Attach up to five videos across all rooms.');
    setFiles(next);
    key.current = crypto.randomUUID();
    setError('');
  }

  function addFiles(event, room) {
    try {
      addVideos(event.target.files, room);
    } catch (reason) {
      setError(reason.message);
    }

    event.target.value = '';
  }

  async function openCamera(room) {
    if (cameraPhase !== 'idle' || files.length >= 5) return;
    setCameraRoom(room);
    setCameraPhase('opening');
    setCameraError('');
    const request = ++camera.current.request;

    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw new Error(
          'In-app recording needs HTTPS and a supported browser. You can choose an existing video below.',
        );

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });

      if (camera.current.request !== request) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      camera.current.stream = stream;
      setCameraPhase('ready');
      setSeconds(0);
    } catch (reason) {
      if (camera.current.request !== request) return;
      releaseCamera();
      setCameraPhase('idle');
      setCameraError(
        reason.name === 'NotAllowedError'
          ? 'Allow camera and microphone access in your browser settings, then try again. You can also choose an existing video.'
          : reason.message || 'The camera could not open. Try again or choose an existing video.',
      );
    }
  }

  function finishRecording() {
    const recorder = camera.current.recorder;
    if (recorder?.state === 'recording') {
      clearInterval(camera.current.timer);
      setCameraPhase('saving');
      recorder.stop();
    }
  }

  function startRecording() {
    try {
      const mime = ['video/mp4', 'video/webm;codecs=vp8,opus', 'video/webm'].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      if (!mime)
        throw new Error(
          'This browser cannot record a supported video. Choose an existing video instead.',
        );
      const recorder = new MediaRecorder(camera.current.stream, {
        mimeType: mime,
        videoBitsPerSecond: 2000000,
      });

      const request = camera.current.request;
      const chunks = [];
      let size = 0;
      let elapsed = 0;
      let failed = false;
      camera.current.recorder = recorder;

      recorder.ondataavailable = (event) => {
        if (camera.current.request !== request || !event.data.size) return;
        size += event.data.size;
        if (size > 100 * 1024 * 1024) {
          failed = true;
          setCameraError('This recording exceeded 100 MB. Record a shorter room video.');
          finishRecording();
        } else chunks.push(event.data);
      };

      recorder.onerror = () => {
        if (camera.current.request !== request) return;
        releaseCamera();
        setCameraPhase('idle');
        setCameraError('Recording stopped unexpectedly. Please record this room again.');
      };

      recorder.onstop = () => {
        if (camera.current.request !== request) return;
        clearInterval(camera.current.timer);
        camera.current.recorder = null;
        camera.current.stream?.getTracks().forEach((track) => track.stop());
        camera.current.stream = null;
        setCameraPhase('idle');
        if (failed) return;

        try {
          const type = (recorder.mimeType || mime).split(';')[0];
          const number = files.filter((item) => item.room === cameraRoom).length + 1;
          const file = new File(
            chunks,
            `${rooms[cameraRoom]} ${number}.${type === 'video/mp4' ? 'mp4' : 'webm'}`,
            { type },
          );
          addVideos([file], cameraRoom);
          setCameraError('');
        } catch (reason) {
          setCameraError(reason.message);
        }
      };

      recorder.start(1000);
      setCameraPhase('recording');
      camera.current.timer = setInterval(() => {
        setSeconds(++elapsed);
        if (elapsed >= 120) finishRecording();
      }, 1000);
    } catch (reason) {
      releaseCamera();
      setCameraPhase('idle');
      setCameraError(
        reason.message || 'Recording could not start. Choose an existing video instead.',
      );
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    if (cameraPhase !== 'idle') {
      setError('Finish or cancel your room recording before sending the request.');
      return;
    }

    if (area?.status !== 'covered' || area.postcode !== postcode) {
      setError('Check a covered postcode first.');
      return;
    }

    const fields = Object.fromEntries(new FormData(event.currentTarget));
    setPending(true);
    setError('');
    try {
      const serviceVideos = [];
      for (const { file, room } of files)
        serviceVideos.push(
          await uploadVideo(
            file,
            postcode,
            uploads.current,
            (value) => setProgress(`Uploading ${rooms[room]}: ${value}%`),
            room,
          ),
        );
      setProgress('Sending your request…');
      const result = await workflow('intake', {
        body: {
          ...fields,
          postcode,
          consent: fields.consent === 'on',
          serviceVideos,
          idempotencyKey: key.current,
        },
      });

      setReceipt(result);
      setFiles([]);
      uploads.current.clear();
    } catch (reason) {
      setError(reason.message);
    } finally {
      setPending(false);
      setProgress('');
    }
  }

  return (
    <>
      <PageHero eyebrow="Request support" title="Let’s arrange the" accent="right support.">
        <p>
          Check your postcode and tell us about your needs. The office will review your request
          before confirming services or pricing.
        </p>
      </PageHero>
      <section className="section">
        <div className="container landing-form-layout">
          <div className="contact-form-panel landing-form">
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {receipt ? (
              <div role="status">
                <h2>Request received</h2>
                <p>{receipt.message}</p>
                <p>
                  Your reference: <strong>{receipt.id}</strong>
                </p>
              </div>
            ) : (
              <>
                <h2>1. Check your service area</h2>
                <form data-form="landing-area" onSubmit={checkArea}>
                  <fieldset disabled={pending}>
                    <label>
                      Service postcode
                      <input
                        name="postcode"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        pattern="[0-9]{4}"
                        maxLength={4}
                        value={postcode}
                        required
                        onChange={(event) => {
                          setPostcode(event.target.value);
                          setArea(null);
                          key.current = crypto.randomUUID();
                        }}
                      />
                    </label>
                    <button className="button" type="submit">
                      Check postcode
                    </button>
                  </fieldset>
                </form>
                {area && <p role="status">{area.message}</p>}
                {area?.status === 'covered' && (
                  <form
                    data-form="landing-intake"
                    onSubmit={submit}
                    onChange={() => {
                      key.current = crypto.randomUUID();
                    }}
                    aria-busy={pending}
                  >
                    <fieldset disabled={pending}>
                      <h2>2. Tell us what you need</h2>
                      <div className="landing-fields">
                        <label>
                          Full name
                          <input name="name" autoComplete="name" maxLength={120} required />
                        </label>
                        <label>
                          Email
                          <input
                            name="email"
                            type="email"
                            autoComplete="email"
                            maxLength={200}
                            required
                          />
                        </label>
                        <label>
                          Phone
                          <input
                            name="phone"
                            type="tel"
                            autoComplete="tel"
                            maxLength={40}
                            required
                          />
                        </label>
                        <label>
                          Suburb
                          <input
                            name="suburb"
                            autoComplete="address-level2"
                            maxLength={120}
                            required
                          />
                        </label>
                      </div>
                      <label>
                        Requested service
                        <select name="service" defaultValue={selected}>
                          {services.map((service) => (
                            <option key={service}>{service}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Needs, rooms or tasks
                        <textarea
                          name="notes"
                          rows={5}
                          maxLength={2000}
                          placeholder="Tell us about the support you need"
                        />
                      </label>
                      <section className="room-videos" aria-labelledby="room-videos-heading">
                        <h3 id="room-videos-heading">Room-by-room videos (optional)</h3>
                        <p id="video-help">
                          Record inside the app or choose an existing video for each room. Up to
                          five videos in total, 100 MB each. Recordings stop after two minutes.
                          Include only people who agree to appear.
                        </p>
                        <p className="room-video-count" role="status">
                          {files.length} of 5 videos added
                        </p>
                        {Object.entries(rooms).map(([room, label]) => (
                          <section
                            className="room-video-card"
                            key={room}
                            aria-labelledby={`room-${room}`}
                          >
                            <h4 id={`room-${room}`}>{label}</h4>
                            <div className="room-video-actions">
                              <button
                                type="button"
                                className="button"
                                disabled={cameraPhase !== 'idle' || files.length >= 5}
                                onClick={() => openCamera(room)}
                              >
                                Record {label.toLowerCase()}
                              </button>
                              <label className="room-video-picker">
                                Choose a video for {label.toLowerCase()}
                                <input
                                  type="file"
                                  multiple
                                  accept="video/mp4,video/quicktime,video/webm,.mov"
                                  disabled={cameraPhase !== 'idle' || files.length >= 5}
                                  onChange={(event) => addFiles(event, room)}
                                  aria-describedby="video-help"
                                />
                              </label>
                            </div>
                            {cameraRoom === room && cameraPhase !== 'idle' && (
                              <div className="room-camera">
                                <video
                                  ref={liveVideo}
                                  autoPlay
                                  muted
                                  playsInline
                                  aria-label={`Live camera for ${label.toLowerCase()}`}
                                />
                                <p role="status">
                                  {cameraPhase === 'opening'
                                    ? 'Opening camera…'
                                    : cameraPhase === 'recording'
                                      ? `Recording · ${seconds}s / 120s`
                                      : cameraPhase === 'saving'
                                        ? 'Preparing your video…'
                                        : 'Camera ready. Start when you are ready.'}
                                </p>
                                <div className="room-video-actions">
                                  {cameraPhase === 'ready' && (
                                    <button
                                      type="button"
                                      className="button"
                                      onClick={startRecording}
                                    >
                                      Start recording
                                    </button>
                                  )}
                                  {cameraPhase === 'recording' && (
                                    <button
                                      type="button"
                                      className="button"
                                      onClick={finishRecording}
                                    >
                                      Stop and keep video
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      releaseCamera();
                                      setCameraPhase('idle');
                                      setCameraRoom(null);
                                      setCameraError('');
                                    }}
                                  >
                                    Cancel recording
                                  </button>
                                </div>
                              </div>
                            )}
                            {cameraRoom === room && cameraError && (
                              <p className="form-error" role="alert">
                                {cameraError}
                              </p>
                            )}
                            <div className="landing-video-list">
                              {previews
                                .filter((item) => item.room === room)
                                .map(({ file, url }) => (
                                  <div key={url}>
                                    <video
                                      controls
                                      playsInline
                                      preload="metadata"
                                      src={url}
                                      aria-label={`${label}: ${file.name}`}
                                    />
                                    <p>{file.name}</p>
                                    <button
                                      type="button"
                                      className="button button-secondary"
                                      disabled={cameraPhase !== 'idle'}
                                      onClick={() => {
                                        uploads.current.delete(file);
                                        setFiles(files.filter((item) => item.file !== file));
                                        key.current = crypto.randomUUID();
                                      }}
                                    >
                                      Remove {label.toLowerCase()} video
                                    </button>
                                  </div>
                                ))}
                            </div>
                          </section>
                        ))}
                      </section>
                      <label className="landing-consent">
                        <input name="consent" type="checkbox" required />
                        <span>
                          I agree to share this request and videos with OCD Brilliance for
                          assessment and follow-up.
                        </span>
                      </label>
                      <button className="button" type="submit" disabled={cameraPhase !== 'idle'}>
                        {pending ? 'Sending request…' : 'Send support request'}
                      </button>
                    </fieldset>
                    <p role="status" aria-live="polite">
                      {progress}
                    </p>
                  </form>
                )}
              </>
            )}
          </div>
          <aside className="contact-card">
            <h2>What happens next?</h2>
            <p>
              Management assesses your needs, rooms and tasks, then contacts you about availability
              and pricing. Submitting this form does not confirm a booking.
            </p>
            <p>Videos are private and available to authorised office staff.</p>
          </aside>
        </div>
      </section>
    </>
  );
}
