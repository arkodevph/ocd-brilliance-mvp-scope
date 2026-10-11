import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Phone, MapPin, Heart, Leaf, ShieldCheck, Users, Sparkles, House, Car, Compass, Menu, X, Check, Plus, Mail, Clock, MoveUpRight, ExternalLink } from 'lucide-react';
import { services, mainNav, phone, email, steps, faqs, articles, routeMeta, legacyRoutes } from './data';

const icons = { sparkles: Sparkles, home: House, users: Users, car: Car, compass: Compass, heart: Heart, shield: ShieldCheck, leaf: Leaf, pin: MapPin, phone: Phone, mail: Mail, clock: Clock };
export function Icon({ name, ...props }) { const Component = icons[name] || Heart; return <Component size={24} strokeWidth={1.6} aria-hidden="true" {...props} />; }
export function Arrow({ diagonal = false }) { return diagonal ? <ArrowUpRight size={19} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />; }
export function Button({ to = '/contact', children, secondary = false, className = '', ...props }) { return <Link className={`button ${secondary ? 'button-secondary' : ''} ${className}`} to={to} {...props}>{children}<Arrow /></Link>; }
export function TextLink({ to, children, ...props }) { return <Link className="text-link" to={to} {...props}>{children}<Arrow /></Link>; }
export function Eyebrow({ children, light = false }) { return <p className={`eyebrow ${light ? 'eyebrow-light' : ''}`}><span aria-hidden="true" />{children}</p>; }

export function Asset({ name, alt = '', className = '', eager = false, sizes = '(max-width: 700px) 100vw, 60vw' }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className={`asset-fallback ${className}`} role={alt ? 'img' : undefined} aria-label={alt || undefined}><Leaf size={40} aria-hidden="true" /></div>;
  return <img className={className} src={`/assets/landing/${name}-1200.webp`} srcSet={[640, 1200, 1920].map(width => `/assets/landing/${name}-${width}.webp ${width}w`).join(', ')} sizes={sizes} width={1920} height={name === 'hero' ? 960 : name === 'texture' ? 1080 : 800} alt={alt} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : undefined} onError={() => setFailed(true)} />;
}

export function PageEffects() {
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  const first = useRef(true);
  useEffect(() => {
    if (hash.startsWith('#pg-') && legacyRoutes[hash.slice(4)]) { navigate(legacyRoutes[hash.slice(4)], { replace: true }); return; }
    const [title, description] = routeMeta[pathname] || routeMeta['/404'];
    document.title = `${title} | OCD Brilliance`;
    const setMeta = (selector, attribute, value) => {
      const node = document.querySelector(selector);
      if (node) node.setAttribute(attribute, value);
    };
    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:url"]', 'content', location.origin + pathname);
    setMeta('link[rel="canonical"]', 'href', location.origin + pathname);
    const schema = document.getElementById('route-schema');
    if (schema) schema.textContent = JSON.stringify(schemaFor(pathname));
    if (!first.current) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.getElementById('main')?.focus({ preventScroll: true });
    }
    first.current = false;
  }, [pathname, hash, navigate]);
  return null;
}

export function schemaFor(pathname) {
  const base = { '@context': 'https://schema.org', '@type': 'WebPage', name: (routeMeta[pathname] || routeMeta['/404'])[0], description: (routeMeta[pathname] || routeMeta['/404'])[1], isPartOf: { '@type': 'WebSite', name: 'OCD Brilliance — local design presentation' } };
  if (pathname.startsWith('/services/')) return { ...base, mainEntity: { '@type': 'Service', name: base.name, areaServed: 'Perth northern suburbs', provider: { '@type': 'Organization', name: 'OCD Brilliance', telephone: phone } } };
  if (pathname === '/faq') return { ...base, '@type': 'FAQPage', mainEntity: faqs.map(([question, answer]) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })) };
  return base;
}

export function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const trigger = useRef(null);
  const menu = useRef(null);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector('a')?.focus();
    const escape = event => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open]);
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <div className="utility"><div className="container utility-inner"><Link to="/portal">Open demo</Link><span><MapPin size={13} aria-hidden="true" /> A little support. A brighter everyday. <span className="utility-location">Perth, Western Australia</span></span><a href="tel:0428820059"><Phone size={13} aria-hidden="true" />{phone}</a></div></div>
    <header className="site-header"><div className="container header-inner">
      <Link to="/" className="brand" aria-label="OCD Brilliance home"><img src="/assets/landing/logo.png" alt="OCD Brilliance" width="157" height="78" /></Link>
      <nav className="desktop-nav" aria-label="Main navigation">{mainNav.map(([path, title]) => <NavLink key={path} to={path} end={path === '/'}>{title}</NavLink>)}</nav>
      <Button to="/intake" className="header-cta">Request support</Button>
      <button className="menu-trigger" ref={trigger} aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>{open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</button>
    </div>
    <nav className="mobile-nav" id="mobile-nav" ref={menu} aria-label="Mobile navigation" hidden={!open}>{mainNav.map(([path, title]) => <NavLink key={path} to={path} end={path === '/'}>{title}<Arrow /></NavLink>)}<Link to="/portal">Open demo<Arrow /></Link><a href="tel:0428820059">Call {phone}<Phone size={18} aria-hidden="true" /></a></nav>
    </header>
  </>;
}

export function Footer() {
  return <footer className="site-footer"><div className="container">
    <div className="footer-top"><div className="footer-brand"><Link to="/" aria-label="OCD Brilliance home"><img src="/assets/landing/logo.png" width="157" height="78" alt="OCD Brilliance" /></Link><p>Thoughtful support.<br />Familiar faces. A brighter everyday.</p><span className="footer-registration"><ShieldCheck size={16} aria-hidden="true" /> NDIS registered provider</span></div>
      <div><h2>Our services</h2>{services.map(service => <Link key={service.slug} to={`/services/${service.slug}`}>{service.title}</Link>)}</div>
      <div><h2>Find your way</h2>{[['/about', 'Our story'], ['/funding', 'Funding your support'], ['/areas-we-serve', 'Areas we serve'], ['/resources', 'Insights & advice'], ['/careers', 'Join our team'], ['/faq', 'Your questions']].map(([href, title]) => <Link key={href} to={href}>{title}</Link>)}</div>
      <div className="footer-contact"><h2>Let’s talk</h2><a className="footer-phone" href="tel:0428820059">{phone}<Arrow diagonal /></a><a href={`mailto:${email}`}>{email}</a><p>Perth, Western Australia<br />Mon–Wed: 8am–12:30pm, 1–4pm<br />Thu–Sun: please call</p><div className="socials"><a href="https://www.facebook.com/ocdbrilliance/" target="_blank" rel="noreferrer">Facebook <ExternalLink size={12} aria-hidden="true" /></a><a href="https://www.instagram.com/ocd_brilliance" target="_blank" rel="noreferrer">Instagram <ExternalLink size={12} aria-hidden="true" /></a><a href="https://www.linkedin.com/company/ocd-brilliance/" target="_blank" rel="noreferrer">LinkedIn <ExternalLink size={12} aria-hidden="true" /></a></div></div>
    </div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} OCD Brilliance · ABN 34 467 263 922</span><nav aria-label="Participant and legal information"><Link to="/participant-rights">Your rights</Link><Link to="/complaints">Feedback & complaints</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></nav></div>
    <p className="presentation-note">Design presentation · Enquiries on this demo are not sent. Generated people imagery is illustrative.</p>
  </div></footer>;
}

export function PageHero({ eyebrow, title, children, accent, breadcrumb }) {
  return <section className="page-hero"><div className="container">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link to="/">Home</Link><span aria-hidden="true">/</span>{breadcrumb && <><Link to={breadcrumb[0]}>{breadcrumb[1]}</Link><span aria-hidden="true">/</span></>}<span aria-current="page">{eyebrow}</span></nav>
    <Eyebrow>{eyebrow}</Eyebrow><h1>{title}{accent && <em> {accent}</em>}</h1>{children && <div className="page-lead">{children}</div>}
  </div><div className="hero-flower" aria-hidden="true"><Leaf /></div></section>;
}

export function SectionHeading({ eyebrow, title, accent, children, link, center = false }) {
  return <div className={`section-heading ${center ? 'centered' : ''}`}><div><Eyebrow>{eyebrow}</Eyebrow><h2>{title}{accent && <em> {accent}</em>}</h2>{children && <p>{children}</p>}</div>{link && <TextLink to={link[0]}>{link[1]}</TextLink>}</div>;
}

export function ServiceGrid({ list = services }) {
  return <div className="service-grid">{list.map((service, index) => <article className={`service-card service-${service.slug}`} key={service.slug}><div className="service-card-top"><span className="service-icon"><Icon name={service.icon} size={29} /></span><span className="card-number">0{index + 1}</span></div><span className="small-label">{service.label}</span><h3><Link to={`/services/${service.slug}`}>{service.title}</Link></h3><p>{service.description}</p><ul className="service-inclusions">{service.includes.slice(0, 3).map(item => <li key={item}><Check size={13} aria-hidden="true" />{item}</li>)}</ul><div className="service-card-bottom"><span>NDIS support · Plan dependent</span><Link to={`/services/${service.slug}`} aria-label={`Explore ${service.title.toLowerCase()}`} className="circle-link"><Arrow diagonal /></Link></div></article>)}</div>;
}

export function StartSteps() {
  return <section className="section steps-section"><div className="container"><SectionHeading eyebrow="Your next chapter" title="Getting started can be" accent="simple." center>We’ll work through it together, one conversation at a time.</SectionHeading><ol className="steps">{steps.map(([title, text], index) => <li key={title}><span className="step-number">0{index + 1}</span><h3>{title}</h3><p>{text}</p></li>)}</ol></div></section>;
}

export function FundingCards() {
  return <div className="funding-grid"><article className="fund-card active-fund"><div className="fund-top"><h3>NDIS</h3><span className="status"><Check size={12} aria-hidden="true" /> Active</span></div><p>Registered provider for self-managed, plan-managed and agency-managed participants.</p><Link to="/funding#ndis" className="text-link">Understand your options <Arrow /></Link></article>{[['DVA', 'Support for Australian veterans'], ['Aged care', 'Cleaning & domestic assistance']].map(([title, description]) => <article className="fund-card" key={title}><div className="fund-top"><h3>{title}</h3><span className="status coming">Coming soon</span></div><p>{description}. This funding pathway is expanding; services are not yet available.</p><TextLink to={`/contact?purpose=general`}>Ask for an update</TextLink></article>)}</div>;
}

export function FAQList({ items = faqs, limit }) {
  return <div className="faq-list">{items.slice(0, limit || items.length).map(([question, answer]) => <details key={question}><summary>{question}<Plus size={19} aria-hidden="true" /></summary><div className="faq-answer"><p>{answer}</p></div></details>)}</div>;
}

export function FinalCTA() {
  return <section className="final-cta"><div className="container cta-inner"><div><Eyebrow light>A conversation, not a commitment</Eyebrow><h2>Good support starts<br />with <em>getting to know you.</em></h2><p>Tell us what would help. We’ll take it from there, together.</p></div><div className="cta-actions"><Button>Talk with our team</Button><a className="phone-link" href="tel:0428820059"><Phone size={17} aria-hidden="true" /> Or call {phone}</a></div></div></section>;
}

export function ResourceCards({ list = articles.slice(0, 3) }) {
  return <div className="resource-grid">{list.map((article, index) => <article className="resource-card" key={article.slug}><Link className={`resource-art resource-art-${index % 3}`} to={`/resources/${article.slug}`} aria-label={`Read ${article.title}`}><span className="resource-glyph" aria-hidden="true">{index % 3 === 0 ? <Compass /> : index % 3 === 1 ? <Leaf /> : <House />}</span><span>THE EVERYDAY JOURNAL</span><Arrow diagonal /></Link><div className="resource-meta"><span>{article.category}</span><span>{article.readingMinutes} min read</span></div><h3><Link to={`/resources/${article.slug}`}>{article.title}</Link></h3><p>{article.excerpt.slice(0, 145)}…</p><TextLink to={`/resources/${article.slug}`}>Read the article</TextLink></article>)}</div>;
}
