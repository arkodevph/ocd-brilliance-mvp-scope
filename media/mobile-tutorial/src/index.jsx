import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Composition,
  Img,
  Sequence,
  registerRoot,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { z } from 'zod';
import scenes from './scenes.json';
import { ProductScreen, Icon } from './product-scenes.jsx';
import './style.css';
const clamp = (v) => Math.max(0, Math.min(1, v));
function Tap({ x, y, at = 30 }) {
  const f = useCurrentFrame() - at;
  if (f < 0 || f > 25) return null;
  const p = f / 25;
  return (
    <div
      className="tap"
      style={{
        left: x,
        top: y,
        opacity: 1 - p,
        transform: `translate(-50%,-50%) scale(${0.7 + p * 1.3})`,
      }}
    >
      <i />
    </div>
  );
}
function StatusBar() {
  return (
    <div className="statusbar">
      <span>9:41</span>
      <div className="camera" />
      <span>▮▮▮ ▰</span>
    </div>
  );
}
function InstallScreen({ ios }) {
  const t = useCurrentFrame() / 30;
  const stage = t < 2 ? 0 : t < 4.5 ? 1 : 2;
  return (
    <>
      <Img className="app-screen" src={staticFile('screens/public.png')} />
      <div className="address-bar">
        ♧ &nbsp; ocd-redesign.vercel.app <span>⋮</span>
      </div>
      {stage > 0 && (
        <>
          <div className="screen-dim" />
          <div className="os-menu">
            <b>{ios ? 'Share this page' : 'Browser menu'}</b>
            <div className="menu-line">{ios ? 'Copy link' : 'New tab'}</div>
            <div className="menu-line">{ios ? 'Add Bookmark' : 'History'}</div>
            <div className="menu-line selected">⊞ &nbsp; Add to Home Screen</div>
          </div>
        </>
      )}
      {stage === 2 && (
        <div className="install-card">
          <Img src={staticFile('logo.png')} />
          <h3>{ios ? 'Add to Home Screen' : 'Install app'}</h3>
          <p>OCD Brilliance</p>
          <small>ocd-redesign.vercel.app</small>
          <div className="permission-buttons">
            <span>Cancel</span>
            <strong>{ios ? 'Add' : 'Install'}</strong>
          </div>
          <p className="installation-note">
            Open the new icon
            <br />
            when it appears.
          </p>
        </div>
      )}
      <Tap x="90%" y="8%" at={40} />
      <Tap x="55%" y="76%" at={106} />
    </>
  );
}
function Permission() {
  const f = useCurrentFrame();
  const accepted = f > 125;
  return (
    <>
      <ProductScreen view="clientStatus" />
      {f < 170 && (
        <>
          <div className="screen-dim" />
          <div className="permission-card">
            <span className="permission-icon">
              <Icon name="bell" size={36} />
            </span>
            <h3>{accepted ? 'Notifications allowed' : 'Allow notifications?'}</h3>
            <p>
              {accepted
                ? 'You’ll receive booking confirmations and useful visit updates.'
                : 'OCD Brilliance would like to send you booking and visit updates.'}
            </p>
            <div className="permission-buttons">
              <span>Don’t allow</span>
              <strong>{accepted ? 'Allowed ✓' : 'Allow'}</strong>
            </div>
          </div>
          <Tap x="76%" y="58%" at={112} />
        </>
      )}
    </>
  );
}
function Phone({ scene }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter =
    scene.id === 'intro'
      ? 1
      : spring({ frame: f, fps, config: { damping: 24, stiffness: 110, mass: 0.8 } });
  return (
    <div
      className="phone"
      style={{
        transform: `translateY(${(1 - enter) * 28}px)`,
        opacity: scene.id === 'intro' ? 1 : clamp(f / 9),
      }}
    >
      <div className="phone-screen">
        <StatusBar />
        <div className="screen-content">
          {scene.kind === 'android' || scene.kind === 'ios' ? (
            <InstallScreen ios={scene.kind === 'ios'} />
          ) : scene.kind === 'permission' ? (
            <Permission />
          ) : (
            <ProductScreen view={scene.view} />
          )}{' '}
          {scene.id === 'client-request' && <Tap x="49%" y="76%" at={88} />}{' '}
          {scene.id === 'match' && <Tap x="49%" y="70%" at={96} />}{' '}
          {scene.id === 'employee-visit' && <Tap x="49%" y="84%" at={98} />}{' '}
          {scene.id === 'popup' && <Tap x="49%" y="20%" at={145} />}
        </div>
        <div className="home-indicator" />
      </div>
    </div>
  );
}
function Scene({ scene, index }) {
  const f = useCurrentFrame();
  const caption = scene.captions.find((c) => f / 30 >= c.start && f / 30 < c.end);
  const p = scene.id === 'intro' ? 1 : 1 - Math.pow(1 - clamp(f / 18), 3);
  return (
    <AbsoluteFill>
      <div className="chapter" style={{ opacity: p, transform: `translateY(${(1 - p) * 15}px)` }}>
        <span>{String(index + 1).padStart(2, '0')}</span>
        {scene.chapter}
      </div>
      <h1 style={{ opacity: p, transform: `translateY(${(1 - p) * 20}px)` }}>{scene.title}</h1>
      <p className="hint">{scene.hint}</p>
      <Phone scene={scene} />
      <div className="footnote">
        {scene.id === 'distance'
          ? 'ROUTE ESTIMATES · STAFF REVIEW · CLEAR NEXT STEPS'
          : scene.kind === 'permission'
            ? 'BOOKING UPDATES, WITH YOUR PERMISSION'
            : 'A LITTLE SUPPORT. A BRIGHTER EVERYDAY.'}
      </div>
      {caption && <div className="caption">{caption.text}</div>}
      <Audio src={staticFile(`audio/${scene.id}.mp3`)} />
    </AbsoluteFill>
  );
}
function Tutorial({ brand }) {
  const f = useCurrentFrame();
  const total = scenes.reduce((n, s) => n + s.frames, 0);
  return (
    <AbsoluteFill className="video">
      <div className="orb orb-one" />
      <div className="orb orb-two" />
      <div className="grain" />
      <header>
        <Img src={staticFile('logo.png')} />
        <span>CONNECTED CARE</span>
      </header>
      {scenes.map((s, i) => (
        <Sequence key={s.id} from={s.from} durationInFrames={s.frames}>
          <Scene scene={s} index={i} />
        </Sequence>
      ))}
      <div className="progress">
        <i style={{ width: `${(f / (total - 1)) * 100}%` }} />
      </div>
      <div className="video-footer">
        <span>{brand}</span>
        <span>CLIENT · OFFICE · EMPLOYEE</span>
      </div>
    </AbsoluteFill>
  );
}
function Root() {
  return (
    <Composition
      id="OCDMobileTutorial"
      component={Tutorial}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={scenes.reduce((n, s) => n + s.frames, 0)}
      schema={z.object({ brand: z.string() })}
      defaultProps={{ brand: 'OCD BRILLIANCE' }}
      calculateMetadata={() => ({ durationInFrames: scenes.reduce((n, s) => n + s.frames, 0) })}
    />
  );
}
registerRoot(Root);
