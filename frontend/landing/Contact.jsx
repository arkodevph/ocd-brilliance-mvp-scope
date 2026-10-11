import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ArrowRight, AlertCircle, LoaderCircle } from 'lucide-react';
import { PageHero, Eyebrow, Icon, TextLink } from './components';
import { phone, email, services } from './data';

const purposes = [
  ['support', 'New support enquiry'],
  ['referral', 'Referral / coordination'],
  ['existing', 'Existing participant'],
  ['careers', 'Careers'],
  ['complaint', 'Feedback or complaint'],
  ['general', 'General enquiry'],
];
const purposeHelp = {
  support:
    'Tell us a little about the support you’re looking for. It’s fine if you’re not sure yet.',
  referral:
    'Start a referral conversation. Please do not include participant health information or plan documents here.',
  existing: 'Ask about your existing support. For a time-sensitive change, please call the team.',
  careers: 'Tell us which role interests you. No résumé upload is needed for this demonstration.',
  complaint: 'Your feedback matters. You can raise a concern without it affecting your support.',
  general: 'Ask a question or tell us what you would like to discuss.',
};

export default function Contact() {
  const [params] = useSearchParams();
  const initialPurpose = purposes.some(([key]) => key === params.get('purpose'))
    ? params.get('purpose')
    : 'support';
  const [purpose, setPurpose] = useState(initialPurpose);
  const [values, setValues] = useState({
    name: '',
    method: 'email',
    email: '',
    phone: '',
    suburb: '',
    message: '',
    service: params.get('service') || '',
    organisation: '',
    role: params.get('role') || '',
    consent: false,
  });
  const [errors, setErrors] = useState({});
  const [state, setState] = useState('idle');
  const [scenario, setScenario] = useState('success');
  const summary = useRef(null);
  const timer = useRef(null);
  const status = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    setPurpose(initialPurpose);
  }, [initialPurpose]);
  useEffect(() => {
    if (Object.keys(errors).length) summary.current?.focus();
  }, [errors]);
  useEffect(() => {
    if (state === 'success') status.current?.focus();
  }, [state]);
  const update = (event) => {
    const { name, type, checked, value } = event.target;
    setValues((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name])
      setErrors((previous) => {
        const next = { ...previous };
        delete next[name];
        return next;
      });
  };
  function submit(event) {
    event.preventDefault();
    const next = {};
    if (!values.name.trim()) next.name = 'Please enter your name.';
    if (values.method === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
      next.email = 'Enter an email address, such as name@example.com.';
    if (values.method === 'phone' && values.phone.replace(/\D/g, '').length < 8)
      next.phone = 'Enter a phone number with at least 8 digits.';
    if (!values.message.trim()) next.message = 'Please add a short message about what you need.';
    if (!values.consent) next.consent = 'Please confirm you understand this is a demonstration.';
    setErrors(next);
    if (Object.keys(next).length) return;
    if (!navigator.onLine || scenario === 'offline') {
      setState('offline');
      return;
    }
    setState('pending');
    timer.current = setTimeout(() => setState(scenario === 'error' ? 'error' : 'success'), 800);
  }
  const field = (name, label, type = 'text', optional = false) => (
    <div className="field">
      <label htmlFor={name}>
        {label} <span>{optional ? '(optional)' : '(required)'}</span>
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={values[name]}
        onChange={update}
        autoComplete={
          name === 'name'
            ? 'name'
            : name === 'email'
              ? 'email'
              : name === 'phone'
                ? 'tel'
                : name === 'organisation'
                  ? 'organization'
                  : undefined
        }
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
      />
      {errors[name] && (
        <p className="field-error" id={`${name}-error`}>
          {errors[name]}
        </p>
      )}
    </div>
  );
  return (
    <>
      <PageHero eyebrow="Let’s talk" title="Let’s start with" accent="a conversation.">
        <p>
          A question, a plan, or just a sense that a little support would help. We’re here to
          listen.
        </p>
      </PageHero>
      <section className="section">
        <div className="container contact-grid">
          <div className="contact-form-panel">
            {['support', 'referral'].includes(purpose) && (
              <div className="contact-card">
                <h2>Ready to request support?</h2>
                <p>
                  Use our intake form to check your area, share your needs and send a service video
                  directly to the office.
                </p>
                <Link
                  className="button"
                  to={`/intake${values.service ? '?service=' + encodeURIComponent(values.service) : ''}`}
                >
                  Start support intake <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </div>
            )}
            <Eyebrow>How can we help?</Eyebrow>
            <h2>A little about you.</h2>
            <div className="demo-notice">
              <AlertCircle size={18} aria-hidden="true" />
              <p>
                <strong>Presentation form.</strong> Nothing you enter is sent or saved. Please use
                sample details.
              </p>
            </div>
            <form
              onSubmit={submit}
              noValidate
              aria-label="Demonstration enquiry"
              aria-busy={state === 'pending'}
            >
              {state === 'success' ? (
                <div className="success-panel" ref={status} tabIndex={-1} role="status">
                  <CheckCircle2 size={44} aria-hidden="true" />
                  <h3>Your demo enquiry is complete.</h3>
                  <p>
                    Nothing was sent or saved. On the live website, this would be the point where
                    the team receives your enquiry.
                  </p>
                  <p>
                    For real support, call <a href="tel:0428820059">{phone}</a> or email{' '}
                    <a href={`mailto:${email}`}>{email}</a>.
                  </p>
                  <button type="button" className="button" onClick={() => setState('idle')}>
                    Back to the demonstration <ArrowRight size={18} aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <>
                  <fieldset className="purpose-fieldset">
                    <legend>I’m getting in touch about…</legend>
                    <div className="purpose-options">
                      {purposes.map(([key, label]) => (
                        <label key={key} className={purpose === key ? 'selected' : ''}>
                          <input
                            type="radio"
                            name="purpose"
                            value={key}
                            checked={purpose === key}
                            onChange={() => {
                              setPurpose(key);
                              setState('idle');
                            }}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <p className="purpose-help">{purposeHelp[purpose]}</p>
                  {Object.keys(errors).length > 0 && (
                    <div className="error-summary" ref={summary} tabIndex={-1} role="alert">
                      <h3>Please check these details</h3>
                      <ul>
                        {Object.entries(errors).map(([key, error]) => (
                          <li key={key}>
                            <a
                              href={`#${key}`}
                              onClick={(event) => {
                                event.preventDefault();
                                document.getElementById(key)?.focus();
                              }}
                            >
                              {error}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {field('name', 'Your name')}
                  {purpose === 'referral' &&
                    field('organisation', 'Your organisation', 'text', true)}
                  {purpose === 'careers' && (
                    <div className="field">
                      <label htmlFor="role">
                        Role you’re interested in <span>(optional)</span>
                      </label>
                      <select name="role" id="role" value={values.role} onChange={update}>
                        <option value="">I’d like to discuss opportunities</option>
                        {[
                          'Cleaner',
                          'Support Worker',
                          'Support Coordinator',
                          'Registered Nurse',
                        ].map((role) => (
                          <option key={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="field">
                    <label htmlFor="method">How would you prefer to hear from us?</label>
                    <select name="method" id="method" value={values.method} onChange={update}>
                      <option value="email">By email</option>
                      <option value="phone">By phone</option>
                    </select>
                  </div>
                  {values.method === 'email'
                    ? field('email', 'Email address', 'email')
                    : field('phone', 'Phone number', 'tel')}
                  {['support', 'referral'].includes(purpose) && (
                    <div className="field-row">
                      {field('suburb', 'Your suburb', 'text', true)}
                      <div className="field">
                        <label htmlFor="service">
                          Support you’re considering <span>(optional)</span>
                        </label>
                        <select
                          id="service"
                          name="service"
                          value={values.service}
                          onChange={update}
                        >
                          <option value="">I’m not sure yet</option>
                          {services.map((service) => (
                            <option key={service.slug} value={service.slug}>
                              {service.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                  <div className="field">
                    <label htmlFor="message">
                      What would you like to share? <span>(required)</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={4}
                      value={values.message}
                      onChange={update}
                      aria-invalid={!!errors.message}
                      aria-describedby={`message-help${errors.message ? ' message-error' : ''}`}
                    />
                    <p id="message-help" className="field-help">
                      A short note is enough. Please don’t include diagnoses, plan numbers or
                      sensitive documents.
                    </p>
                    {errors.message && (
                      <p className="field-error" id="message-error">
                        {errors.message}
                      </p>
                    )}
                  </div>
                  <label className="consent" htmlFor="consent">
                    <input
                      id="consent"
                      name="consent"
                      type="checkbox"
                      checked={values.consent}
                      onChange={update}
                      aria-invalid={!!errors.consent}
                      aria-describedby={errors.consent ? 'consent-error' : undefined}
                    />
                    <span>
                      I understand this is a presentation and no enquiry will be sent.{' '}
                      <Link to="/privacy">Read the privacy information.</Link>
                    </span>
                  </label>
                  {errors.consent && (
                    <p id="consent-error" className="field-error">
                      {errors.consent}
                    </p>
                  )}
                  {(state === 'error' || state === 'offline') && (
                    <div className="error-summary" role="alert">
                      <h3>
                        {state === 'offline'
                          ? 'You’re offline in this demonstration.'
                          : 'This demo enquiry could not be completed.'}
                      </h3>
                      <p>
                        Your entries are still here.{' '}
                        {scenario !== 'success'
                          ? 'Switch the presentation state below to Success, then try again.'
                          : 'Reconnect and try again.'}{' '}
                        You can also call {phone}.
                      </p>
                    </div>
                  )}
                  <button
                    className="button form-submit"
                    type="submit"
                    disabled={state === 'pending'}
                  >
                    {state === 'pending' ? (
                      <>
                        <LoaderCircle className="spinner" size={19} aria-hidden="true" />
                        Previewing enquiry…
                      </>
                    ) : (
                      <>
                        Preview enquiry <ArrowRight size={18} aria-hidden="true" />
                      </>
                    )}
                  </button>
                  <p role="status" className="sr-only">
                    {state === 'pending'
                      ? 'Preparing your demonstration enquiry. Nothing is being sent.'
                      : ''}
                  </p>
                </>
              )}
            </form>
            <details className="demo-controls">
              <summary>Presentation controls</summary>
              <label htmlFor="scenario">Preview submission state</label>
              <select
                id="scenario"
                value={scenario}
                onChange={(event) => {
                  setScenario(event.target.value);
                  if (state !== 'pending') setState('idle');
                }}
              >
                <option value="success">Success</option>
                <option value="error">Server error</option>
                <option value="offline">Offline</option>
              </select>
            </details>
          </div>
          <aside className="contact-sidebar">
            <div className="contact-card">
              <Eyebrow>A familiar voice</Eyebrow>
              <h2>Prefer to talk?</h2>
              <a className="large-phone" href="tel:0428820059">
                {phone}
              </a>
              <p>No pressure. No need to have everything figured out.</p>
              <hr />
              <a className="contact-line" href={`mailto:${email}`}>
                <Icon name="mail" size={20} />
                {email}
              </a>
              <p className="contact-line">
                <Icon name="pin" size={20} />
                Perth, Western Australia
              </p>
              <div className="office-hours">
                <h3>Office hours</h3>
                <p>
                  Monday–Wednesday
                  <br />
                  8:00am–12:30pm & 1:00pm–4:00pm
                </p>
                <p>
                  Thursday–Sunday
                  <br />
                  Available — please call
                </p>
              </div>
              <p className="field-help">
                The source website lists a response time of 1–2 working days for real enquiries.
              </p>
            </div>
            <div className="sidebar-note">
              <Icon name="shield" />
              <h3>Your voice matters.</h3>
              <p>
                Questions and concerns are always welcome. You can also contact the NDIS Commission
                directly.
              </p>
              <TextLink to="/complaints">Feedback & complaints</TextLink>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
