import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, FileText, Plus, Users } from './solar-icons';
import { PageHeading } from './portal-pages';
export type OfficeOverviewModel = {
  period: string; scheduledHours: string; completedHours: string; reviewed: number; records: number;
  metrics: { value: number; label: string; href: string; delta: number }[];
  categories: { label: string; tone: string; count: number }[];
  daily: { date: string; label: string; title: string; counts: number[]; hours: string }[];
  priorities: { title: string; detail: string; href: string; action: string }[];
  workers: { id: string; name: string; count: number; hours: string }[];
  recent: { id: string; worker: string; participant: string; date: string; clockIn: string; clockOut: string }[];
};
export function OfficeOverviewPage({ model }: { model: OfficeOverviewModel }) {
  const peak = Math.max(4, Math.ceil(Math.max(...model.daily.map(day => day.counts.reduce((a, b) => a + b, 0))) / 4) * 4);
  const maxLoad = Math.max(1, ...model.workers.map(worker => worker.count));
  return <div className="portal-page portal-office-overview analytics-home">
    <PageHeading model={{ title: 'Office overview', subtitle: 'Service coverage, visit records and the work that needs your attention.', eyebrow: 'Office workspace' }}><a className="btn" href="#/office/schedule"><CalendarDays size={16} />Schedule</a><a className="btn primary" href="#/office/intake/new"><Plus size={16} />New intake</a></PageHeading>
    <div className="portal-overview-metrics">{model.metrics.map((metric, index) => {
      const Icon = [CalendarDays, ClipboardList, Users, FileText][index];
      return <a className="analytics-stat" key={metric.label} href={`#/${metric.href}`}><div><span>{metric.label}</span><Icon size={18} /></div><strong>{metric.value}</strong><small>{metric.delta ? `${metric.delta > 0 ? '+' : ''}${metric.delta}` : 'No change'} vs prior sample week<ArrowRight size={14} /></small></a>;
    })}</div>
    <div className="portal-office-grid"><div className="portal-stack">
      <section className="portal-panel analytics-weekly"><header><div><h2>Weekly visits</h2><p>{model.period} · sample data · Perth time</p></div><nav className="portal-week-control" aria-label="Overview period"><button type="button" data-action="overview-week" data-value="previous" aria-label="Previous overview week"><ChevronLeft size={17} /></button><button type="button" data-action="overview-week" data-value="sample">Sample week</button><button type="button" data-action="overview-week" data-value="next" aria-label="Next overview week"><ChevronRight size={17} /></button></nav></header>
        <div className="portal-panel-body"><div className="analytics-legend">{model.categories.map(category => <span key={category.label}><i className={`chart-${category.tone}`} />{category.label}</span>)}</div><div className="analytics-chart-area"><svg className="weekly-chart" width="640" height="260" viewBox="0 0 640 260" role="img" aria-label="Weekly visits by status">{Array.from({ length: 5 }, (_, index) => <g key={index}><line className="chart-gridline" x1="42" x2="624" y1={210 - index * 42.5} y2={210 - index * 42.5} /><text x="25" y={214 - index * 42.5} fontSize="11" fill="currentColor">{peak * index / 4}</text></g>)}{model.daily.map((day, index) => {
          let y = 210;
          const total = day.counts.reduce((a, b) => a + b, 0);
          return <a key={day.date} href="#/office/schedule" data-action="overview-day" data-date={day.date} aria-label={`${day.title}: ${total} bookings`} data-chart-title={day.title} data-chart-count={total} data-chart-hours={day.hours} data-chart-breakdown={JSON.stringify(day.counts.map((value, i) => ({ label: model.categories[i].label, value })))}><title>{day.title}: {total} bookings</title><rect className="chart-hit" x={50 + index * 80} y="16" width="60" height="224" fill="transparent" />{day.counts.map((value, i) => {
            const height = value / peak * 170;
            y -= height;
            return value ? <rect key={i} className={`chart-${model.categories[i].tone} chart-bar-fill`} x={69 + index * 80} y={y} width="22" height={height} rx="2" /> : null;
          })}<text x={80 + index * 80} y="244" textAnchor="middle" fontSize="11" fill="currentColor">{day.label}</text></a>;
        })}</svg><div id="overview-chart-tooltip" className="analytics-chart-tooltip" role="status" hidden /></div><div className="portal-overview-footer"><span><strong>{model.scheduledHours}</strong> scheduled</span><span><strong>{model.completedHours}</strong> completed</span><a href="#/office/schedule">Open team schedule<ArrowRight size={14} /></a></div></div>
      </section>
      <section className="portal-panel"><header><div><h2>Team workload</h2><p>Assigned visits across the selected week.</p></div><a className="portal-link" href="#/office/staff">View team<ArrowRight size={14} /></a></header><div className="portal-panel-body portal-worker-loads">{model.workers.length ? model.workers.map(worker => <a key={worker.id || 'unassigned'} href={worker.id ? `#/office/staff/${worker.id}` : '#/office/schedule'}><div><strong>{worker.name}</strong><span>{worker.count} visits · {worker.hours}</span></div><span className="portal-load-track"><i style={{ width: `${worker.count / maxLoad * 100}%` }} /></span></a>) : <p className="portal-copy">No employees recorded.</p>}</div></section>
    </div><aside className="portal-stack">
      <section className="portal-panel"><header><div><h2>Needs your attention</h2><p>{model.priorities.length} item{model.priorities.length === 1 ? '' : 's'} to follow up.</p></div><a className="portal-link" href="#/office/work">Work queue<ArrowRight size={14} /></a></header><div className="portal-panel-body portal-priorities">{model.priorities.length ? model.priorities.slice(0, 5).map((priority, index) => <a key={`${priority.href}-${index}`} href={`#/${priority.href}`}><div><strong>{priority.title}</strong><small>{priority.detail}</small><span>{priority.action}</span></div><ChevronRight size={17} /></a>) : <div className="portal-empty compact"><h3>No outstanding items</h3><p>Your current work queue is clear.</p></div>}</div></section>
      <section className="portal-panel"><header><div><h2>Visit records</h2><p>{model.reviewed} of {model.records} reviewed.</p></div><a className="portal-link" href="#/office/visits">View records<ArrowRight size={14} /></a></header><div className="portal-panel-body portal-recent-visits">{model.recent.length ? model.recent.map(visit => <a key={visit.id} href={`#/office/visits/${visit.id}`}><strong>{visit.worker}</strong><span>{visit.participant} · {visit.date}</span><small>In {visit.clockIn} · Out {visit.clockOut}</small></a>) : <p className="portal-copy">No visit times recorded.</p>}</div></section>
    </aside></div>
  </div>;
}
