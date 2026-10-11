import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHero } from './components';
import { workflow, uploadVideo } from './workflow-api';

const services = ['Domestic assistance', 'Support work', 'Cleaning', 'Transport', 'Support coordination', 'Nursing'];
const slugs = ['domestic-assistance', 'support-work', 'cleaning', 'transport', 'support-coordination', 'nursing'];
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
  const key = useRef(crypto.randomUUID());
  const uploads = useRef(new Map());
  const selected = services[slugs.indexOf(params.get('service'))] || services[0];
  useEffect(() => {
    const items = files.map(file => ({ file, url: URL.createObjectURL(file) }));
    setPreviews(items);
    return () => items.forEach(item => URL.revokeObjectURL(item.url));
  }, [files]);
  async function checkArea(event) {
    event.preventDefault();
    if (pending) return;
    setPending(true); setError(''); setArea(null);
    try { setArea({ ...await workflow('area', { query: { postcode } }), postcode }); }
    catch (reason) { setError(reason.message); }
    finally { setPending(false); }
  }
  function addFiles(event) {
    try {
      const next = [...files];
      for (const file of event.target.files) {
        if (!types.includes(file.type) || file.size < 12 || file.size > 100 * 1024 * 1024) throw new Error('Choose MP4, MOV or WebM videos up to 100 MB each.');
        if (!next.some(item => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)) next.push(file);
      }
      if (next.length > 5) throw new Error('Attach up to five videos.');
      setFiles(next); key.current = crypto.randomUUID(); setError('');
    } catch (reason) { setError(reason.message); }
    event.target.value = '';
  }
  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    if (area?.status !== 'covered' || area.postcode !== postcode) { setError('Check a covered postcode first.'); return; }
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    setPending(true); setError('');
    try {
      const serviceVideos = [];
      for (const file of files) serviceVideos.push(await uploadVideo(file, postcode, uploads.current, value => setProgress(`Uploading ${file.name}: ${value}%`)));
      setProgress('Sending your request…');
      const result = await workflow('intake', { body: { ...fields, postcode, consent: fields.consent === 'on', serviceVideos, idempotencyKey: key.current } });
      setReceipt(result); setFiles([]); uploads.current.clear();
    } catch (reason) { setError(reason.message); }
    finally { setPending(false); setProgress(''); }
  }
  return <>
    <PageHero eyebrow="Request support" title="Let’s arrange the" accent="right support."><p>Check your postcode and tell us about your needs. The office will review your request before confirming services or pricing.</p></PageHero>
    <section className="section"><div className="container landing-form-layout">
      <div className="contact-form-panel landing-form">
        {error && <p className="form-error" role="alert">{error}</p>}
        {receipt ? <div role="status"><h2>Request received</h2><p>{receipt.message}</p><p>Your reference: <strong>{receipt.id}</strong></p></div> : <>
          <h2>1. Check your service area</h2>
          <form data-form="landing-area" onSubmit={checkArea}><fieldset disabled={pending}>
            <label>Service postcode<input name="postcode" inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{4}" maxLength={4} value={postcode} required onChange={event => { setPostcode(event.target.value); setArea(null); key.current = crypto.randomUUID(); }} /></label>
            <button className="button" type="submit">Check postcode</button>
          </fieldset></form>
          {area && <p role="status">{area.message}</p>}
          {area?.status === 'covered' && <form data-form="landing-intake" onSubmit={submit} onChange={() => { key.current = crypto.randomUUID(); }} aria-busy={pending}>
            <fieldset disabled={pending}><h2>2. Tell us what you need</h2>
              <div className="landing-fields"><label>Full name<input name="name" autoComplete="name" maxLength={120} required /></label><label>Email<input name="email" type="email" autoComplete="email" maxLength={200} required /></label><label>Phone<input name="phone" type="tel" autoComplete="tel" maxLength={40} required /></label><label>Suburb<input name="suburb" autoComplete="address-level2" maxLength={120} required /></label></div>
              <label>Requested service<select name="service" defaultValue={selected}>{services.map(service => <option key={service}>{service}</option>)}</select></label>
              <label>Needs, rooms or tasks<textarea name="notes" rows={5} maxLength={2000} placeholder="Tell us about the support you need" /></label>
              <label>Service videos (optional)<input type="file" multiple accept="video/mp4,video/quicktime,video/webm,.mov" onChange={addFiles} aria-describedby="video-help" /></label>
              <p id="video-help">Up to five videos, 100 MB each. Include only people who agree to appear.</p>
              <div className="landing-video-list">{previews.map(({ file, url }, index) => <div key={url}><video controls preload="metadata" src={url} aria-label={file.name} /><p>{file.name}</p><button type="button" onClick={() => { uploads.current.delete(file); setFiles(files.filter((_, i) => i !== index)); key.current = crypto.randomUUID(); }}>Remove video</button></div>)}</div>
              <label className="landing-consent"><input name="consent" type="checkbox" required /><span>I agree to share this request and videos with OCD Brilliance for assessment and follow-up.</span></label>
              <button className="button" type="submit">{pending ? 'Sending request…' : 'Send support request'}</button>
            </fieldset>
            <p role="status" aria-live="polite">{progress}</p>
          </form>}
        </>}
      </div>
      <aside className="contact-card"><h2>What happens next?</h2><p>Management assesses your needs, rooms and tasks, then contacts you about availability and pricing. Submitting this form does not confirm a booking.</p><p>Videos are private and available to authorised office staff.</p></aside>
    </div></section>
  </>;
}
