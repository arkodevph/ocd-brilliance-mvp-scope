import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Phone, Leaf, Heart, ShieldCheck, Users } from 'lucide-react';
import { services, phone, articles } from './data';
import ServiceAreaMap from './ServiceAreaMap';
import { Asset, Button, TextLink, Eyebrow, Icon, Arrow, SectionHeading, ServiceGrid, StartSteps, FundingCards, FAQList, ResourceCards, FinalCTA } from './components';

function ServiceFinder() {
  const [need, setNeed] = useState('');
  const choices = [
    ['home', 'Help around my home', ['cleaning', 'domestic-assistance']],
    ['life', 'Support with everyday life', ['support-work']],
    ['community', 'Getting out & about', ['transport', 'support-work']],
    ['plan', 'Understanding my plan', ['support-coordination']],
    ['nursing', 'Nursing at home', ['nursing']],
  ];
  const matches = choices.find(choice => choice[0] === need)?.[2] || [];
  return <section className="finder-section" aria-labelledby="finder-heading"><div className="container finder-inner"><div><Eyebrow>A good place to start</Eyebrow><h2 id="finder-heading">What would make<br />your day <em>easier?</em></h2><p>You don’t need to know the service name.<br />Start with what matters to you.</p></div><div className="finder-controls"><div className="need-options" aria-label="Find support by your needs">{choices.map(([id, label]) => <button key={id} onClick={() => setNeed(need === id ? '' : id)} aria-pressed={need === id}>{label}<ArrowRight size={17} aria-hidden="true" /></button>)}</div><div className="finder-results" aria-live="polite">{matches.length > 0 ? <div><span className="small-label">A place to explore</span>{services.filter(service => matches.includes(service.slug)).map(service => <TextLink key={service.slug} to={`/services/${service.slug}`}>{service.title}</TextLink>)}</div> : <p>Not quite sure? <Link to="/contact">Let’s work it out together <ArrowRight size={15} aria-hidden="true" /></Link></p>}</div></div></div></section>;
}

const heroServices = [
  ['cleaning', 'Cleaning Services', 'sparkles'],
  ['domestic-assistance', 'Domestic Assistance', 'home'],
  ['support-work', 'Support Work', 'users'],
  ['support-coordination', 'Support Coordination', 'compass'],
  ['nursing', 'Nursing Services', 'heart'],
  ['transport', 'Transport Services', 'car'],
];

function HeroServicesCard() {
  const move = event => {
    if (event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - .5;
    const y = (event.clientY - bounds.top) / bounds.height - .5;
    event.currentTarget.style.setProperty('--card-x', `${3 - y * 6}deg`);
    event.currentTarget.style.setProperty('--card-y', `${-7 + x * 10}deg`);
  };
  const reset = event => {
    event.currentTarget.style.removeProperty('--card-x');
    event.currentTarget.style.removeProperty('--card-y');
  };

  return <div className="hero-card-stage" onPointerMove={move} onPointerLeave={reset}>
    <nav className="hero-services-card" aria-label="Explore our services">
      {heroServices.map(([slug, title, icon]) => <Link className="hero-service-row" key={slug} to={`/services/${slug}`}>
        <span className="hero-service-icon"><Icon name={icon} size={23} /></span>
        <span>{title}</span>
        <ArrowRight className="hero-service-arrow" size={16} aria-hidden="true" />
      </Link>)}
    </nav>
  </div>;
}

export default function Home() {
  return <>
    <section className="home-hero" aria-labelledby="home-heading"><div className="container hero-content"><div className="hero-copy"><Eyebrow>Registered NDIS provider · Perth</Eyebrow><h1 id="home-heading">Support for a life<br />that feels like <em>you.</em></h1><p>Thoughtful care at home and in your community.<br className="desktop-break" /> Familiar faces, a little more independence, and<br className="desktop-break" /> support shaped around your everyday.</p><div className="hero-actions"><Button>Talk with our team</Button><Link className="hero-secondary" to="/services">Explore our services <ArrowRight size={17} aria-hidden="true" /></Link></div><a className="hero-call" href="tel:0428820059"><Phone size={15} aria-hidden="true" /> A real conversation. Call {phone}</a></div><div className="hero-visual"><div className="hero-visual-top"><span>Support, your way</span><span>Perth · WA</span></div><HeroServicesCard /><p className="hero-visual-bottom">Choose a service to see how we can help <ArrowRight size={16} aria-hidden="true" /></p></div></div></section>
    <div className="trust-bar"><div className="container trust-inner">{[[ShieldCheck, 'NDIS registered & audited'], [Heart, 'Locally & family owned'], [Leaf, 'Chemical-free cleaning'], [Users, 'Carefully matched workers']].map(([Component, text]) => <div key={text}><Component size={21} strokeWidth={1.5} aria-hidden="true" /><span>{text}</span></div>)}</div></div>
    <ServiceFinder />
    <section className="section services-section"><div className="container"><SectionHeading eyebrow="Our services" title="A little support." accent="More possibility." link={['/services', 'Explore all services']}>Six connected services. One team that takes the time to know you.</SectionHeading><ServiceGrid /></div></section>
    <section className="why-section"><div className="container why-grid"><div className="why-image"><Asset name="hero" alt="Illustrative home scene showing a participant making choices with their support worker." /><div className="why-note"><Heart size={28} strokeWidth={1.4} aria-hidden="true" /><span>It’s your home.<br /><strong>We’re here on your terms.</strong></span></div></div><div className="why-copy"><Eyebrow>The OCD Brilliance difference</Eyebrow><h2>Good care feels<br /><em>personal.</em> Because it is.</h2><p>Your routine. Your preferences. The way you like your tea. We believe it’s the details that turn a service into a relationship.</p><div className="why-points">{[['Familiar faces, thoughtfully matched', 'We get to know you and aim to keep your workers consistent, with clear communication when things change.'], ['Care that respects your space', 'From a colour-coded cleaning system to listening before acting, the little things are part of the care.'], ['Clarity at every step', 'Agreed support, itemised billing and an open conversation about what works for you.']].map(([title, description]) => <div key={title}><Check size={16} aria-hidden="true" /><div><h3>{title}</h3><p>{description}</p></div></div>)}</div><TextLink to="/about">Get to know our team</TextLink></div></div></section>
    <StartSteps />
    <section className="section funding-section"><div className="container"><SectionHeading eyebrow="Your funding, made clearer" title="Find your way to" accent="the right support." link={['/funding', 'Explore funding options']}>We’ll help you understand the next step, wherever you’re starting.</SectionHeading><FundingCards /></div></section>
    <section className="section local-section"><div className="container local-grid"><div><Eyebrow>Close to home</Eyebrow><h2>North of the river.<br /><em>Right by your side.</em></h2><p>We’re a Perth team, supporting people in the communities we call home. From Joondalup and Wanneroo to Stirling and Ellenbrook, local connection matters.</p><div className="suburb-chips">{['Joondalup', 'Wanneroo', 'Stirling', 'Ellenbrook', 'Osborne Park', 'And surrounding suburbs'].map(place => <span key={place}>{place}</span>)}</div><TextLink to="/areas-we-serve">Check your area</TextLink></div><ServiceAreaMap /></div></section>
    <section className="reassurance"><div className="container assurance-grid"><div><ShieldCheck size={32} strokeWidth={1.4} aria-hidden="true" /><h2>Your trust matters.</h2><p>So does knowing where you stand.</p></div>{[['/participant-rights', 'Your choice & your rights', 'Support that respects your decisions, privacy and dignity.'], ['/about#standards', 'Screened & supported people', 'Workers backed by screening, training and a local team.'], ['/complaints', 'A voice, always', 'Raise a question or concern without it affecting your support.']].map(([href, title, text]) => <Link key={href} to={href}><h3>{title}<Arrow diagonal /></h3><p>{text}</p></Link>)}</div></section>
    <section className="section"><div className="container"><SectionHeading eyebrow="The everyday journal" title="Helpful reads." accent="A little clarity." link={['/resources', 'Browse all resources']}>Thoughts and guidance from the OCD Brilliance source archive.</SectionHeading><ResourceCards list={articles.slice(0, 3)} /></div></section>
    <section className="section faq-section"><div className="container faq-grid"><div><Eyebrow>A few things you might wonder</Eyebrow><h2>Good questions.<br /><em>Clear answers.</em></h2><p>Starting something new comes with questions. We’re happy to talk yours through.</p><TextLink to="/faq">See all questions</TextLink></div><FAQList limit={6} /></div></section>
    <FinalCTA />
  </>;
}
