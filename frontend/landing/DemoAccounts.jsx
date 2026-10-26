import React, { useState } from 'react';
import { PageHero } from './components';
import '../../workspace/data.js';

export default function DemoAccounts() {
  const [role, setRole] = useState('office');
  const [worker, setWorker] = useState('WRK-01');
  const [client, setClient] = useState('PAR-101');
  const seed = window.OCD_DEMO_SEED;
  const href = `/workspace/?demoWorker=${encodeURIComponent(worker)}&demoClient=${encodeURIComponent(client)}#/${role}/${role === 'office' ? 'start' : 'home'}`;
  return (
    <>
      <PageHero eyebrow="Interactive demo" title="Take a look" accent="around.">
        <p>
          New here? Start with the office demo. A short guided example will show you what to do.
        </p>
      </PageHero>
      <section className="section">
        <div className="container landing-form-layout">
          <div className="contact-form-panel landing-form" id="demo-accounts">
            <label>
              Workspace
              <select value={role} onChange={(event) => setRole(event.target.value)}>
                <option value="office">Office · recommended first</option>
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
              {role === 'office' ? 'Start office demo' : 'Open workspace'}
            </a>
          </div>
          <aside className="contact-card">
            <h2>{role === 'office' ? 'A clear place to start' : 'Try a different perspective'}</h2>
            <p>
              {role === 'office'
                ? 'Follow one fictional request, step by step. Then explore intake, scheduling and finance when you are ready.'
                : 'The employee and client workspaces use separate fictional examples. Switch roles from Account inside the workspace.'}
            </p>
            <p>No login is needed for these examples. Demo changes are saved in this browser.</p>
          </aside>
        </div>
      </section>
    </>
  );
}
