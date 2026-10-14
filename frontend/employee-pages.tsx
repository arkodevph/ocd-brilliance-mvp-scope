import type { ReactNode } from 'react';
import { PageHeading, Panel, Field, PageList, Status, dateLabel } from './portal-pages';
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  ShieldCheck,
  Users,
} from './solar-icons';
export type EmployeePageModel = {
  page: 'personal' | 'home' | 'leave';
  today: string;
  worker: {
    id: string;
    name: string;
    role: string;
    services: string[];
    skills: string[];
    approved: boolean;
  };
  profile: {
    email: string;
    phone: string;
    team: string;
    manager: string;
    balances: { type: string; available: number; entitlement: number }[];
  };
  notices: {
    id: string;
    title: string;
    detail: string;
    category: string;
    href: string;
    read: boolean;
  }[];
  requests: {
    id: string;
    type: string;
    from: string;
    to: string;
    days: number;
    note: string;
    status: string;
  }[];
  selected: { tab: string; category: string };
  calendar: {
    month: string;
    date: string;
    events: { date: string; to?: string; title: string; href?: string }[];
  };
};

function LeaveBalances({ profile }: { profile: EmployeePageModel['profile'] }) {
  return (
    <div className="portal-balances">
      {profile.balances.map((balance) => (
        <div key={balance.type}>
          <span>{balance.type}</span>
          <strong>
            {balance.available}
            <small> days</small>
          </strong>
          <span>{balance.entitlement} sample days per year</span>
        </div>
      ))}
    </div>
  );
}

function LeaveRequests({ requests }: { requests: EmployeePageModel['requests'] }) {
  if (!requests.length)
    return (
      <div className="portal-empty">
        <CalendarDays size={24} />
        <h3>No leave requests</h3>
        <p>Saved requests and your coordinator’s response will appear here.</p>
      </div>
    );
  return (
    <div className="portal-request-list">
      <PageList
        label="Leave request pages"
        items={requests.map((request) => (
          <article key={request.id}>
            <div className="portal-row-heading">
              <h3>{request.type}</h3>
              <Status value={request.status} />
            </div>
            <p>
              {dateLabel(request.from)}–{dateLabel(request.to)}
            </p>
            <small>
              {request.days} weekday{request.days === 1 ? '' : 's'}
              {request.note ? ` · ${request.note}` : ''}
            </small>
            {request.status === 'Pending' && (
              <button
                type="button"
                className="portal-text-button"
                data-action="employee-withdraw"
                data-id={request.id}
              >
                Withdraw request
              </button>
            )}
          </article>
        ))}
      />
    </div>
  );
}

function EmployeeHomeCalendar({ model }: { model: EmployeePageModel }) {
  const { month, date, events } = model.calendar;
  const first = new Date(`${month}-01T12:00:00Z`);
  const offset = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const selectedEvents = events.filter((event) =>
    date ? event.date <= date && (event.to || event.date) >= date : event.date.startsWith(month),
  );
  return (
    <div className="portal-home-calendar">
      <div className="portal-calendar-heading">
        <button
          type="button"
          data-action="employee-month"
          data-value="-1"
          aria-label="Previous month"
        >
          ‹
        </button>
        <strong>
          {new Intl.DateTimeFormat('en-AU', {
            timeZone: 'UTC',
            month: 'long',
            year: 'numeric',
          }).format(first)}
        </strong>
        <button type="button" data-action="employee-month" data-value="1" aria-label="Next month">
          ›
        </button>
      </div>
      <div className="portal-calendar-grid">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <span key={day}>{day.slice(0, 1)}</span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`space-${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const value = `${month}-${String(i + 1).padStart(2, '0')}`;
          const scheduled = events.filter(
            (event) => event.date <= value && (event.to || event.date) >= value,
          );
          return (
            <button
              key={value}
              type="button"
              data-action="employee-date"
              data-value={value}
              aria-pressed={date === value}
              aria-current={value === model.today ? 'date' : undefined}
              aria-label={`${dateLabel(value)}${scheduled.length ? `, ${scheduled.map((event) => event.title).join(', ')}` : ''}`}
            >
              {i + 1}
              {!!scheduled.length && <i aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <div className="portal-calendar-summary">
        {selectedEvents.length ? (
          <a href={`#/${selectedEvents[0].href || 'worker/calendar'}`}>
            <CalendarDays size={15} />
            <span>{selectedEvents[0].title}</span>
            <ChevronRight size={14} />
          </a>
        ) : (
          <span>{date ? 'No events on this date' : 'No events this month'}</span>
        )}
        <button type="button" data-action="employee-date" data-value="">
          Reset
        </button>
      </div>
    </div>
  );
}

export function EmployeePage({ model }: { model: EmployeePageModel }) {
  const { worker, profile, page } = model;
  if (page === 'leave')
    return (
      <div className="portal-page">
        <PageHeading
          model={{
            title: 'My time off',
            eyebrow: 'Employee portal',
            subtitle: 'Check your sample balances and send a request to your coordinator.',
          }}
        />
        <LeaveBalances profile={profile} />
        <p className="portal-caption">
          Illustrative balances only. Requests need office approval; actual entitlements stay in the
          payroll system.
        </p>
        <div className="portal-two-column">
          <Panel
            title="Apply for leave"
            note="Your coordinator checks the roster before approving."
          >
            <form data-form="employee-leave" className="portal-form">
              <label>
                Leave type
                <select name="type" data-native-select defaultValue="Annual leave">
                  <option>Annual leave</option>
                  <option>Personal leave</option>
                  <option>Study leave</option>
                </select>
              </label>
              <div className="portal-form-row">
                <label>
                  From
                  <input name="from" type="date" min={model.today} required />
                </label>
                <label>
                  To
                  <input name="to" type="date" min={model.today} required />
                </label>
              </div>
              <label>
                Note (optional)
                <textarea
                  name="note"
                  maxLength={500}
                  placeholder="A short note for your coordinator. Medical details are not needed."
                />
              </label>
              <p className="form-note">
                Weekdays are counted for this demo. Your coordinator checks the roster and actual
                entitlement. A request does not change assigned visits.
              </p>
              <div className="form-actions">
                <button className="btn primary" type="submit">
                  Save demo request
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </Panel>
          <Panel title="My leave requests" note="Follow the status of your saved requests.">
            <LeaveRequests requests={model.requests} />
          </Panel>
        </div>
      </div>
    );
  return page === 'personal' ? <PersonalPage model={model} /> : <HomePage model={model} />;
}

function Card({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="social-card">
      <header className="social-card-heading">
        <h2>{title}</h2>
        {action}
      </header>
      <div className="social-card-body">{children}</div>
    </section>
  );
}

function OfficeAvatar() {
  return (
    <span className="social-office-avatar" aria-hidden="true">
      <Users size={21} />
    </span>
  );
}

function HomePage({ model }: { model: EmployeePageModel }) {
  const unread = model.notices.filter((notice) => !notice.read).length;
  const notices = model.notices.filter(
    (notice) => model.selected.category === 'All' || notice.category === model.selected.category,
  );
  const shortcuts = [
    { title: 'My visits', detail: 'Your assigned work', href: 'today', Icon: CalendarDays },
    { title: 'Availability', detail: 'Plan your week', href: 'availability', Icon: Clock3 },
    { title: 'Documents', detail: 'Hours & records', href: 'review', Icon: FileText },
  ];
  return (
    <div className="portal-page employee-social-page social-home">
      <PageHeading
        model={{
          title: `Welcome back, ${model.worker.name.split(' ')[0]}`,
          subtitle: 'A little more organised. Ready for your day.',
        }}
      >
        <a className="btn primary" href="#/worker/today">
          View my visits
          <ArrowRight size={18} />
        </a>
      </PageHeading>
      <div className="social-home-grid">
        <div className="social-feed">
          <section className="social-card social-shortcuts" aria-label="Employee shortcuts">
            <div className="social-shortcuts-intro">
              <OfficeAvatar />
              <div>
                <strong>Your work, in one place</strong>
                <span>What would you like to check?</span>
              </div>
            </div>
            <div className="social-shortcut-links">
              {shortcuts.map(({ title, detail, href, Icon }) => (
                <a key={href} href={`#/worker/${href}`}>
                  <Icon size={22} />
                  <strong>{title}</strong>
                  <span>{detail}</span>
                </a>
              ))}
            </div>
          </section>
          <div className="social-feed-heading">
            <h2>
              Your updates <span>{unread} unread</span>
            </h2>
            <span>From your office</span>
          </div>
          <div className="social-feed-controls">
            <div className="social-view-switch" role="group" aria-label="Notifications view">
              {[
                ['updates', 'My updates'],
                ['requests', 'My requests'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  data-action="employee-tab"
                  data-value={value}
                  aria-pressed={model.selected.tab === value}
                >
                  {label}
                </button>
              ))}
            </div>
            {model.selected.tab === 'updates' && (
              <div className="social-filter-switch" role="group" aria-label="Update category">
                {['All', 'Roster', 'Attendance', 'Time off'].map((category) => (
                  <button
                    key={category}
                    type="button"
                    data-action="employee-category"
                    data-value={category}
                    aria-pressed={model.selected.category === category}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>
          {model.selected.tab === 'requests' ? (
            <Card title="My leave requests">
              <LeaveRequests requests={model.requests} />
            </Card>
          ) : (
            <div className="social-update-list">
              {notices.length ? (
                <PageList
                  key={model.selected.category}
                  label="Office update pages"
                  pageSize={1}
                  items={notices.map((notice) => (
                    <article className="social-card social-update" key={notice.id}>
                      <header>
                        <OfficeAvatar />
                        <div>
                          <strong>OCD Brilliance</strong>
                          <span>{notice.category} · Office update</span>
                        </div>
                        <span className="social-read-state">
                          {notice.read ? (
                            <>
                              <Check size={14} />
                              Read
                            </>
                          ) : (
                            <>
                              <i />
                              Unread
                            </>
                          )}
                        </span>
                      </header>
                      <div className="social-update-body">
                        <h3>{notice.title}</h3>
                        <p>{notice.detail}</p>
                      </div>
                      <footer>
                        <a href={`#/${notice.href}`}>
                          View {notice.category.toLowerCase()}
                          <ArrowRight size={17} />
                        </a>
                        {!notice.read && (
                          <button type="button" data-action="employee-read" data-id={notice.id}>
                            <Check size={17} />
                            Mark read
                          </button>
                        )}
                      </footer>
                    </article>
                  ))}
                />
              ) : (
                <Card title="You’re all caught up">
                  <p>No updates in this category. Choose All to see the rest.</p>
                </Card>
              )}
            </div>
          )}
        </div>
        <aside className="social-right-rail">
          <Card
            title="My calendar"
            action={
              <a href="#/worker/calendar" aria-label="Open full calendar">
                <ArrowRight size={19} />
              </a>
            }
          >
            <EmployeeHomeCalendar model={model} />
          </Card>
          <Card title="Time off" action={<CalendarDays size={20} />}>
            <div className="social-leave-balances">
              {model.profile.balances.map((balance) => (
                <div key={balance.type}>
                  <span>{balance.type}</span>
                  <strong>
                    {balance.available}
                    <small> days</small>
                  </strong>
                </div>
              ))}
            </div>
            <a className="social-card-link" href="#/worker/leave">
              Apply for leave
              <ArrowRight size={17} />
            </a>
          </Card>
          <section className="social-office-help">
            <OfficeAvatar />
            <h2>A hand when you need it</h2>
            <p>Your coordinator can help with your roster or employee details.</p>
            <button type="button" data-action="employee-help">
              Contact the office
              <ArrowRight size={17} />
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}

function PersonalPage({ model }: { model: EmployeePageModel }) {
  const { worker, profile } = model;
  const skillLabel = (skill: string) =>
    skill.replace(/-/g, ' ').replace(/^./, (letter) => letter.toUpperCase());
  return (
    <div className="portal-page employee-social-page social-personal">
      <header className="social-profile-card social-card">
        <div className="social-profile-cover">
          <span>OCD BRILLIANCE · EMPLOYEE PROFILE</span>
          <span>{profile.team}</span>
        </div>
        <div className="social-profile-identity">
          <div className="social-profile-avatar" aria-hidden="true">
            {worker.name
              .split(' ')
              .map((part) => part[0])
              .slice(0, 2)
              .join('')}
          </div>
          <div>
            <h1>{worker.name}</h1>
            <p>{worker.role}</p>
            <span>
              {profile.team} · {worker.id}
            </span>
          </div>
          <a className="btn" href="#/worker/availability">
            <CalendarDays size={18} />
            Update availability
          </a>
        </div>
        <nav className="social-profile-sections" aria-label="Profile sections">
          <button
            type="button"
            onClick={() =>
              document.getElementById('profile-details')?.scrollIntoView({ block: 'start' })
            }
          >
            About me
          </button>
          <button
            type="button"
            onClick={() =>
              document.getElementById('profile-skills')?.scrollIntoView({ block: 'start' })
            }
          >
            Skills & services
          </button>
          <a href="#/worker/review">
            Documents
            <ArrowRight size={15} />
          </a>
        </nav>
      </header>
      <div className="social-personal-grid">
        <div className="social-feed">
          <section id="profile-details" className="social-card">
            <header className="social-card-heading">
              <div>
                <h2>My personal details</h2>
                <p>Your contact information, all together.</p>
              </div>
              <Users size={21} />
            </header>
            <div className="social-card-body">
              <dl className="social-fields">
                <Field label="Full name" value={worker.name} />
                <Field label="Employee reference" value={worker.id} />
                <Field
                  label="Email"
                  value={<a href={`mailto:${profile.email}`}>{profile.email}</a>}
                />
                <Field
                  label="Phone"
                  value={<a href={`tel:${profile.phone.replace(/\s/g, '')}`}>{profile.phone}</a>}
                />
              </dl>
            </div>
          </section>
          <section id="profile-skills" className="social-card">
            <header className="social-card-heading">
              <h2>Employment & skills</h2>
              <Status value={worker.approved ? 'Approved' : 'Pending'} />
            </header>
            <div className="social-card-body">
              <dl className="social-fields">
                <Field label="Role" value={worker.role} />
                <Field label="Team" value={profile.team} />
                <Field label="Reporting manager" value={profile.manager} />
              </dl>
              <div className="social-profile-group">
                <h3>Recorded skills</h3>
                <div className="social-tags">
                  {worker.skills.length ? (
                    worker.skills.map((skill) => <span key={skill}>{skillLabel(skill)}</span>)
                  ) : (
                    <p>No skills recorded.</p>
                  )}
                </div>
              </div>
              <div className="social-profile-group">
                <h3>Approved services</h3>
                <div className="social-tags">
                  {worker.services.length ? (
                    worker.services.map((service) => (
                      <span key={service}>
                        <Check size={15} />
                        {service}
                      </span>
                    ))
                  ) : (
                    <p>No approved services recorded.</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
        <aside className="social-right-rail">
          <Card title="Your coordinator">
            <div className="social-coordinator">
              <OfficeAvatar />
              <div>
                <strong>{profile.manager}</strong>
                <span>Office coordinator</span>
              </div>
            </div>
            <p>
              Need to change your details? Your coordinator can update your contact information and
              qualifications.
            </p>
            <button className="btn social-full-button" type="button" data-action="employee-help">
              Contact the office
              <ArrowRight size={17} />
            </button>
          </Card>
          <Card title="Your documents" action={<FileText size={20} />}>
            <p>Find your hours and employee records in one place.</p>
            <a className="social-card-link" href="#/worker/review">
              Hours & documents
              <ArrowRight size={17} />
            </a>
          </Card>
          <div className="social-demo-note">
            <ShieldCheck size={19} />
            <p>
              Fictional demo records. Employment approval and original documents stay with the
              office.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
