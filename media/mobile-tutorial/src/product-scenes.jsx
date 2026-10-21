import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
const clip = (x) => Math.max(0, Math.min(1, x));
export function Icon({ name, size = 30 }) {
  const paths = {
    home: 'M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
    calendar: 'M4 6h16v15H4z M4 10h16 M8 3v5 M16 3v5 M8 14h2 M14 14h2 M8 18h2',
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
    check: 'M5 12l4 4L20 5',
    route: 'M6 3v12a5 5 0 0 0 10 0V9 M3 6l3-3 3 3 M13 12l3-3 3 3',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v6l4 2',
    user: 'M16 7a4 4 0 1 0-8 0 4 4 0 0 0 8 0 M4 21v-3a8 6 0 0 1 16 0v3',
    arrow: 'M4 12h16 M14 6l6 6-6 6',
    pin: 'M19 9c0 5-7 12-7 12S5 14 5 9a7 7 0 0 1 14 0 M14 9a2 2 0 1 0-4 0 2 2 0 0 0 4 0',
    doc: 'M6 3h8l4 4v14H6z M14 3v5h5 M9 12h6 M9 16h6',
    plus: 'M12 4v16 M4 12h16',
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name] || paths.home} />
    </svg>
  );
}
function Pill({ children, muted = false }) {
  return <span className={'p-pill' + (muted ? ' muted' : '')}>{children}</span>;
}
function Button({ children, secondary = false }) {
  return (
    <div className={'p-button' + (secondary ? ' secondary' : '')}>
      {children}
      <Icon name="arrow" size={25} />
    </div>
  );
}
function Header({ role = 'Client' }) {
  return (
    <div className="p-header">
      <Img src={staticFile('logo.png')} />
      <div>
        <span className="p-header-bell">
          <Icon name="bell" />
        </span>
        <span className="p-avatar small">
          {role === 'Employee' ? 'EC' : role === 'Office' ? 'MR' : 'OH'}
        </span>
      </div>
    </div>
  );
}
function Nav({ active = 'Home', employee = false }) {
  const items = employee
    ? [
        ['Home', 'home'],
        ['Visits', 'doc'],
        ['Calendar', 'calendar'],
        ['Account', 'user'],
      ]
    : [
        ['Home', 'home'],
        ['Bookings', 'calendar'],
        ['Updates', 'bell'],
        ['Account', 'user'],
      ];
  return (
    <div className="p-nav">
      {items.map(([label, icon]) => (
        <div key={label} className={active === label ? 'selected' : ''}>
          <Icon name={icon} size={29} />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
function Heading({ eyebrow, title, sub }) {
  return (
    <div className="p-heading">
      <small>{eyebrow}</small>
      <h2>{title}</h2>
      {sub && <p>{sub}</p>}
    </div>
  );
}
function Info({ icon, label, value }) {
  return (
    <div className="p-info">
      <span>
        <Icon name={icon} />
      </span>
      <div>
        <small>{label}</small>
        <b>{value}</b>
      </div>
    </div>
  );
}
function RouteMap({ progress = 1, compact = false }) {
  const points = '105,290 105,230 180,230 180,185 285,185 285,118 400,118 400,74 482,74';
  return (
    <div className={'p-map' + (compact ? ' compact' : '')}>
      <svg viewBox="0 0 590 370">
        <rect width="590" height="370" fill="#e8eee5" />
        <path
          d="M0 60h590 M0 130h590 M0 205h590 M0 278h590 M0 340h590 M50 0v370 M130 0v370 M225 0v370 M320 0v370 M415 0v370 M505 0v370"
          stroke="#f9faf6"
          strokeWidth="18"
        />
        <path d="M0 60h590 M0 205h590 M130 0v370 M415 0v370" stroke="#d5dfd0" strokeWidth="2" />
        <path d="M450 370q-45-110 60-190t70-180" stroke="#b9dcd8" strokeWidth="34" fill="none" />
        <rect x="240" y="255" width="65" height="55" rx="10" fill="#c9ddbd" />
        <rect x="40" y="95" width="55" height="75" rx="9" fill="#d0e1c4" />
        <polyline
          points={points}
          pathLength="1"
          fill="none"
          stroke="white"
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={points}
          pathLength="1"
          fill="none"
          stroke="#14683e"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1"
          strokeDashoffset={1 - progress}
        />
        <circle cx="105" cy="290" r="15" fill="#fff" stroke="#14683e" strokeWidth="7" />
        <circle cx="482" cy="74" r="16" fill="#14683e" stroke="#fff" strokeWidth="7" />
        <rect x="53" y="315" width="110" height="33" rx="10" fill="white" />
        <text x="108" y="338" textAnchor="middle" fill="#365b47" fontSize="19" fontFamily="DM">
          Office
        </text>
        <rect x="390" y="20" width="155" height="32" rx="10" fill="white" />
        <text x="468" y="43" textAnchor="middle" fill="#365b47" fontSize="19" fontFamily="DM">
          Client home
        </text>
      </svg>
      <span className="p-map-label">
        <Icon name="route" size={20} /> Route estimate
      </span>
    </div>
  );
}
function VisitCard({ status = 'Confirmed', employee = false }) {
  return (
    <div className="p-card">
      <div className="p-card-top">
        <span className="p-service-icon">
          <Icon name="home" size={32} />
        </span>
        <Pill>{status}</Pill>
      </div>
      <h3>Domestic assistance</h3>
      <p className="p-muted">Tuesday, 27 October</p>
      <div className="p-divider" />
      <Info icon="clock" label="VISIT TIME" value="9:00 – 11:00 am" />
      <Info
        icon="user"
        label={employee ? 'CLIENT' : 'YOUR SUPPORT WORKER'}
        value={employee ? 'Olivia Hart' : 'Elena Cruz'}
      />
      {employee && (
        <Info icon="pin" label="SERVICE LOCATION" value="Client home · northern suburbs" />
      )}
    </div>
  );
}
function Overview() {
  const f = useCurrentFrame();
  const rows = [
    ['route', 'Distance & travel time', 'Estimate prepared'],
    ['calendar', 'Visit details', 'Ready to review'],
    ['bell', 'Booking updates', 'Sent automatically'],
  ];
  return (
    <>
      <Header />
      <Heading
        eyebrow="OFFICE OVERVIEW"
        title="A little more organised."
        sub="Your team’s work, connected."
      />
      <div className="p-overview-metrics">
        <div>
          <b>12</b>
          <span>visits today</span>
        </div>
        <div>
          <b>3</b>
          <span>need review</span>
        </div>
      </div>
      <div className="p-section-label">AUTOMATION AT WORK</div>
      {rows.map(([ic, title, status], i) => (
        <div
          className="p-automation-row"
          key={title}
          style={{
            opacity: clip((f - 12 - i * 18) / 14),
            transform: `translateX(${(1 - clip((f - 12 - i * 18) / 14)) * 18}px)`,
          }}
        >
          <span className="p-service-icon">
            <Icon name={ic} />
          </span>
          <div>
            <b>{title}</b>
            <small>{status}</small>
          </div>
          <Icon name="check" size={25} />
        </div>
      ))}
      <div className="p-soft-note">
        Routine tasks move forward.
        <br />
        People review the decisions.
      </div>
      <Nav />
    </>
  );
}
function ClientRequest() {
  const f = useCurrentFrame();
  const sent = f > 100;
  return (
    <>
      <Header />
      <Heading
        eyebrow="CLIENT WORKSPACE"
        title={sent ? 'Request received.' : 'How can we help?'}
        sub={sent ? 'Your office team has the details.' : 'Choose the support that fits your day.'}
      />
      <div className="p-card">
        <Pill>{sent ? 'With your office team' : 'NEW REQUEST'}</Pill>
        <h3>Domestic assistance</h3>
        <p className="p-muted">Support around your home</p>
        <div className="p-field">
          <small>PREFERRED DATE</small>
          <b>
            Tuesday, 27 October <Icon name="calendar" size={24} />
          </b>
        </div>
        <div className="p-field">
          <small>PREFERRED TIME</small>
          <b>
            9:00 – 11:00 am <Icon name="clock" size={24} />
          </b>
        </div>
        <div className="p-field">
          <small>LOCATION</small>
          <b>
            My saved service address <Icon name="pin" size={24} />
          </b>
        </div>
        <Button>{sent ? 'Request sent ✓' : 'Send request'}</Button>
      </div>
      <p className="p-under-note">Your office confirms the worker and visit time.</p>
      <Nav active="Bookings" />
    </>
  );
}
function Distance() {
  const f = useCurrentFrame();
  const p = clip((f - 18) / 65);
  const ready = f > 90;
  return (
    <>
      <Header role="Office" />
      <Heading
        eyebrow="VISIT PLANNING"
        title={ready ? 'Your route, worked out.' : 'Preparing the journey…'}
        sub="Office → Olivia’s service address"
      />
      <RouteMap progress={p} />
      <div className="p-route-stats">
        <div>
          <span>DISTANCE</span>
          <b>
            {ready ? '8.4' : '—'} <em>km</em>
          </b>
        </div>
        <div>
          <span>TRAVEL TIME</span>
          <b>
            {ready ? '18' : '—'} <em>min</em>
          </b>
        </div>
      </div>
      <div className="p-result">
        <Icon name={ready ? 'check' : 'route'} size={26} />
        <span>
          {ready ? 'Estimate ready for office review' : 'Calculating distance and travel time'}
        </span>
      </div>
      <div className="p-card p-compact">
        <Info icon="calendar" label="NEXT VISIT" value="Olivia Hart · 9:00 am" />
      </div>
      <Nav active="Bookings" />
    </>
  );
}
function Match() {
  const f = useCurrentFrame();
  return (
    <>
      <Header role="Office" />
      <Heading
        eyebrow="WORKER REVIEW"
        title="A suitable match."
        sub="Review the recommendation. Stay in control."
      />
      <div className="p-card">
        <div className="p-worker-head">
          <span className="p-avatar">EC</span>
          <div>
            <h3>Elena Cruz</h3>
            <p className="p-muted">Support worker</p>
          </div>
          <Pill>Recommended</Pill>
        </div>
        <div className="p-divider" />
        {[
          'Domestic assistance approved',
          'Available at the requested time',
          'Travel estimate included',
        ].map((x) => (
          <div className="p-check-row" key={x}>
            <Icon name="check" size={24} />
            {x}
          </div>
        ))}
        <div className="p-mini-stats">
          <span>8.4 km travel</span>
          <span>18 min estimate</span>
        </div>
        <Button>{f > 108 ? 'Offer sent ✓' : 'Approve visit offer'}</Button>
      </div>
      <div className="p-soft-note">
        The worker accepts first.
        <br />
        The office confirms the assignment.
      </div>
      <Nav active="Bookings" />
    </>
  );
}
function EmployeeVisit() {
  const f = useCurrentFrame();
  return (
    <>
      <Header role="Employee" />
      <Heading
        eyebrow="EMPLOYEE WORKSPACE"
        title={f > 110 ? 'You’re ready for the visit.' : 'Your next visit.'}
        sub="Everything you need, before you arrive."
      />
      <VisitCard status={f > 110 ? 'Offer accepted' : 'Visit offer'} employee />
      <div className="p-route-mini">
        <Icon name="route" />
        <div>
          <b>8.4 km · 18 min</b>
          <small>Estimated travel from office</small>
        </div>
      </div>
      <Button>{f > 110 ? 'Accepted ✓' : 'Accept visit offer'}</Button>
      <Nav active="Visits" employee />
    </>
  );
}
function EmployeeCalendar() {
  return (
    <>
      <Header role="Employee" />
      <Heading
        eyebrow="EMPLOYEE CALENDAR"
        title="Your week, in view."
        sub="26 October – 1 November"
      />
      <div className="p-week">
        {[
          ['M', '26'],
          ['T', '27'],
          ['W', '28'],
          ['T', '29'],
          ['F', '30'],
        ].map(([d, n]) => (
          <div key={n} className={n === '27' ? 'active' : ''}>
            <small>{d}</small>
            <b>{n}</b>
            <i />
          </div>
        ))}
      </div>
      <div className="p-section-label">TUESDAY · 2 VISITS</div>
      <div className="p-calendar-row">
        <span>
          09:00
          <br />
          <small>11:00</small>
        </span>
        <div>
          <Pill>Confirmed</Pill>
          <h3>Olivia Hart</h3>
          <p>Domestic assistance</p>
          <small>
            <Icon name="route" size={18} /> 18 min estimated travel
          </small>
        </div>
      </div>
      <div className="p-calendar-row">
        <span>
          13:00
          <br />
          <small>15:00</small>
        </span>
        <div>
          <Pill muted>Scheduled</Pill>
          <h3>James Wilson</h3>
          <p>Support work</p>
        </div>
      </div>
      <Button secondary>Update availability</Button>
      <Nav active="Calendar" employee />
    </>
  );
}
function ClientStatus({ notify = false }) {
  const f = useCurrentFrame();
  const show = notify && f > 28 && f < 164;
  return (
    <>
      <Header />
      <Heading
        eyebrow="CLIENT WORKSPACE"
        title={notify && f >= 164 ? 'Your booking details.' : 'Your visit is confirmed.'}
        sub="Good morning, Olivia."
      />
      <VisitCard />
      <div className="p-worker-note">
        <span className="p-avatar">EC</span>
        <div>
          <b>Elena is your support worker.</b>
          <small>View worker profile →</small>
        </div>
      </div>
      <Button>View booking details</Button>
      <Nav active="Bookings" />
      {show && (
        <div
          className="p-push-banner"
          style={{
            opacity: clip((f - 28) / 12),
            transform: `translateY(${(1 - clip((f - 28) / 18)) * -60}px)`,
          }}
        >
          <div className="p-push-head">
            <span>
              <Icon name="bell" size={22} /> OCD BRILLIANCE
            </span>
            <small>now</small>
          </div>
          <b>Your booking is confirmed</b>
          <p>
            Elena will visit on Tue, 27 Oct
            <br />
            9:00 – 11:00 am.
          </p>
          <strong>Tap to view booking →</strong>
        </div>
      )}
    </>
  );
}
function Payoff() {
  const f = useCurrentFrame();
  return (
    <>
      <Header role="Office" />
      <Heading
        eyebrow="ONE CONNECTED WORKFLOW"
        title="More time for care."
        sub="Clear information. Fewer manual handoffs."
      />
      {[
        ['route', 'Route estimates', 'Distance and travel time together'],
        ['calendar', 'Visit offers', 'The right details for your team'],
        ['bell', 'Booking updates', 'Clients stay informed'],
      ].map(([icon, title, text], i) => (
        <div className="p-payoff-row" key={title} style={{ opacity: clip((f - i * 20) / 15) }}>
          <span className="p-service-icon">
            <Icon name={icon} />
          </span>
          <div>
            <b>{title}</b>
            <p>{text}</p>
          </div>
          <Icon name="check" size={25} />
        </div>
      ))}
      <div className="p-soft-note">
        Routine steps move forward.
        <br />
        People stay in control.
      </div>
      <Button>OCD Brilliance</Button>
      <div className="p-concept-note">
        Product concept · illustrative records and screens.
        <br />
        Live routing and background notifications require connected services. Installation depends
        on browser and device support.
      </div>
    </>
  );
}
export function ProductScreen({ view }) {
  return (
    <div className="product-screen">
      {view === 'overview' ? (
        <Overview />
      ) : view === 'clientRequest' ? (
        <ClientRequest />
      ) : view === 'distance' ? (
        <Distance />
      ) : view === 'match' ? (
        <Match />
      ) : view === 'employeeVisit' ? (
        <EmployeeVisit />
      ) : view === 'employeeCalendar' ? (
        <EmployeeCalendar />
      ) : view === 'payoff' ? (
        <Payoff />
      ) : (
        <ClientStatus notify={view === 'notification'} />
      )}
    </div>
  );
}
