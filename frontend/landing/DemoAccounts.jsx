import React, { useState } from 'react';
import { PageHero } from './components';
import '../../workspace/data.js';

export default function DemoAccounts() {
  const [role, setRole] = useState('office');
  const [worker, setWorker] = useState('WRK-01');
  const [client, setClient] = useState('PAR-101');
  const seed = window.OCD_DEMO_SEED;
  const href = `/workspace/?demoWorker=${encodeURIComponent(worker)}&demoClient=${encodeURIComponent(client)}#/${role}/${role === 'office' ? 'overview' : 'home'}`;
  return (
    <>
      <PageHero eyebrow="Prototype access" title="Choose your" accent="workspace.">
        <p>Explore the system with fictional seeded accounts. No login is needed.</p>
      </PageHero>
      <section className="section">
        <div className="container landing-form-layout">
          <div className="contact-form-panel landing-form" id="demo-accounts">
            <label>
              Workspace
              <select value={role} onChange={(event) => setRole(event.target.value)}>
                <option value="office">Office · Mia Roberts</option>
                <option value="worker">Employee</option>
                <option value="client">Client</option>
              </select>
            </label>
            {role === 'worker' && (
              <label>
                Seeded employee
                <select value={worker} onChange={(event) => setWorker(event.target.value)}>
                  {seed.workers.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name} · {person.role}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {role === 'client' && (
              <label>
                Seeded client
                <select value={client} onChange={(event) => setClient(event.target.value)}>
                  {seed.participants.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <a className="button" href={href}>
              Open workspace
            </a>
          </div>
          <aside className="contact-card">
            <h2>Ready to explore</h2>
            <p>
              Switch accounts from Account inside the workspace. Demo changes are saved in this
              browser.
            </p>
            <p>Private intake records and connected services require authorized backend access.</p>
          </aside>
        </div>
      </section>
    </>
  );
}
