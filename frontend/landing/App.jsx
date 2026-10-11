import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Header, Footer, PageEffects } from './components';
import Home from './Home';
import Contact from './Contact';
import Intake from './Intake';
import DemoAccounts from './DemoAccounts';
import { ServicesPage, ServicePage, FundingPage, AboutPage, AreasPage, ResourcesPage, ArticlePage, CareersPage, FAQPage, RightsPage, ComplaintsPage, LegalPage, NotFound } from './Pages';

export default function App() {
  return <><PageEffects /><Header /><main id="main" tabIndex={-1}><Routes><Route path="/" element={<Home />} /><Route path="/services" element={<ServicesPage />} /><Route path="/services/:slug" element={<ServicePage />} /><Route path="/funding" element={<FundingPage />} /><Route path="/about" element={<AboutPage />} /><Route path="/areas-we-serve" element={<AreasPage />} /><Route path="/resources" element={<ResourcesPage />} /><Route path="/resources/:slug" element={<ArticlePage />} /><Route path="/careers" element={<CareersPage />} /><Route path="/intake" element={<Intake />} /><Route path="/portal" element={<DemoAccounts />} /><Route path="/login" element={<DemoAccounts />} /><Route path="/contact" element={<Contact />} /><Route path="/faq" element={<FAQPage />} /><Route path="/participant-rights" element={<RightsPage />} /><Route path="/complaints" element={<ComplaintsPage />} /><Route path="/privacy" element={<LegalPage type="privacy" />} /><Route path="/terms" element={<LegalPage type="terms" />} /><Route path="*" element={<NotFound />} /></Routes></main><Footer /></>;
}
