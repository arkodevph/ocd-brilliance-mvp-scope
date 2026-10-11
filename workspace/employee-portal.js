(function (root, factory) {
  const portal = factory();
  if (typeof module === 'object' && module.exports) module.exports = portal;
  else root.OCD_EMPLOYEE = portal;
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const leaveTypes = ['Annual leave', 'Personal leave', 'Study leave'];
  const views = new Map();
  const navigation = [['home', 'Home'], ['personal', 'Personal'], ['today', 'My visits'], ['map', 'Visit map'], ['calendar', 'Calendar'], ['leave', 'Time off'], ['review', 'Hours & documents']];
  function ensure(state) {
    state.employeePortal ||= { profiles: {}, notifications: [], requests: [], events: [] };
    const data = state.employeePortal;
    for (const worker of state.workers) {
      if (data.profiles[worker.id]) continue;
      data.profiles[worker.id] = {
        email: `${worker.name.toLowerCase().replaceAll(' ', '.')}@example.test`, phone: '0400 000 300',
        manager: 'Mia Roberts', team: worker.role?.includes('nurse') ? 'Clinical care' : worker.role === 'Cleaner' ? 'Home services' : 'Community support',
        balances: [{ type: 'Annual leave', available: 12, entitlement: 20 }, { type: 'Personal leave', available: 7, entitlement: 10 }, { type: 'Study leave', available: 3, entitlement: 5 }]
      };
      data.notifications.push(
        { id: `EMP-${worker.id}-roster`, workerId: worker.id, category: 'Roster', title: 'Your October roster is ready', detail: 'Check your assigned visits, service times and location before heading out.', href: 'worker/today', read: false },
        { id: `EMP-${worker.id}-leave`, workerId: worker.id, category: 'Time off', title: 'Annual leave approved — sample', detail: '19–20 October · Your sample annual leave request has been approved.', href: 'worker/leave', read: false },
        { id: `EMP-${worker.id}-hours`, workerId: worker.id, category: 'Attendance', title: 'Review your recorded hours', detail: 'Check clock times and notes before the office completes its review.', href: 'worker/review', read: false }
      );
      data.requests.push(
        { id: `LV-${worker.id}-1`, workerId: worker.id, type: 'Annual leave', from: '2026-10-19', to: '2026-10-20', days: 2, note: 'Family time — fictional example', status: 'Approved' },
        { id: `LV-${worker.id}-2`, workerId: worker.id, type: 'Study leave', from: '2026-10-14', to: '2026-10-14', days: 1, note: 'Professional development — fictional example', status: 'Pending' }
      );
      data.events.push(
        { workerId: worker.id, date: '2026-10-06', time: '14:00', title: 'Team check-in', detail: 'Office · service updates', kind: 'meeting' },
        { workerId: worker.id, date: '2026-10-15', time: '09:00', title: 'Safety refresher', detail: 'Training room · manual handling', kind: 'training' }
      );
    }
    return data;
  }
  function view(workerId) {
    if (!views.has(workerId)) views.set(workerId, { month: '2026-10', date: '', category: 'All', tab: 'updates' });
    return views.get(workerId);
  }
  function validDate(date) { return /^\d{4}-\d{2}-\d{2}$/.test(date || '') && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date; }
  function requestLeave(state, workerId, input, today) {
    const data = ensure(state);
    if (!state.workers.some(worker => worker.id === workerId)) throw new Error('Choose a demo employee.');
    if (!leaveTypes.includes(input.type) || !validDate(input.from) || !validDate(input.to) || input.from < today || input.to < input.from) throw new Error('Choose a leave type and valid dates from today onwards.');
    const length = (Date.parse(input.to) - Date.parse(input.from)) / 86400000 + 1;
    if (length > 31) throw new Error('For this demo, request up to 31 calendar days at a time.');
    if (data.requests.some(request => request.workerId === workerId && ['Pending', 'Approved'].includes(request.status) && input.from <= request.to && input.to >= request.from)) throw new Error('These dates overlap one of your pending or approved requests.');
    const note = String(input.note || '').trim();
    if (note.length > 500) throw new Error('Keep the note to 500 characters.');
    let days = 0;
    for (let index = 0; index < length; index++) if (![0, 6].includes(new Date(Date.parse(input.from) + index * 86400000).getUTCDay())) days++;
    if (!days) throw new Error('Select at least one weekday for this demo request.');
    const request = { id: `LV-${workerId}-${data.requests.length + 1}`, workerId, type: input.type, from: input.from, to: input.to, days, note, status: 'Pending' };
    data.requests.push(request);
    data.notifications.unshift({ id: `EMP-${request.id}`, workerId, category: 'Time off', title: 'Leave request saved', detail: `${input.type} · ${input.from} to ${input.to} · awaiting office review.`, href: 'worker/leave', read: false });
    return request;
  }
  function withdrawLeave(state, workerId, requestId) {
    const request = ensure(state).requests.find(request => request.id === requestId && request.workerId === workerId);
    if (!request || request.status !== 'Pending') throw new Error('Only your own pending requests can be withdrawn.');
    request.status = 'Withdrawn';
  }
  function markRead(state, workerId, notificationId) {
    const notification = ensure(state).notifications.find(notification => notification.id === notificationId && notification.workerId === workerId);
    if (!notification) throw new Error('This notification is not available to this employee.');
    notification.read = true;
  }
  function card(title, glyph, body, action = '') {
    return `<section class="employee-card"><header>${glyph}<h2>${title}</h2>${action}</header>${body}</section>`;
  }
  function balances(context) {
    const { state, workerId, esc } = context;
    return `<div class="employee-balances">${ensure(state).profiles[workerId].balances.map((balance, index) => `<div><div class="employee-ring balance-${index}" style="--ring-progress:${balance.available / balance.entitlement * 100}%" role="img" aria-label="${esc(balance.type)}: ${balance.available} of ${balance.entitlement} demo days available"><span><strong>${balance.available.toString().padStart(2, '0')}</strong><small>days available</small></span></div><h3>${esc(balance.type)}</h3><p>${balance.entitlement} sample days / year</p></div>`).join('')}</div><p class="employee-footnote">Illustrative balances only. Requests need office approval; actual entitlements stay in the payroll system.</p>`;
  }
  function shell(context, section, content) {
    const { state, workerId, esc, profileImage, icon } = context;
    const worker = state.workers.find(worker => worker.id === workerId), profile = ensure(state).profiles[workerId];
    return `<a class="skip-link" data-action="skip-main" href="#main-content">Skip to main content</a><div class="employee-shell"><header class="employee-top"><a href="#/worker/home"><img src="/assets/ocd-brilliance-logo.png" alt="OCD Brilliance"></a><div><span class="employee-demo">Fictional employee demo</span><span class="employee-timezone">Perth · AWST</span><button class="employee-account" data-action="account-settings" type="button">${profileImage(worker.name)}<span>${esc(worker.name)}</span></button></div></header><nav class="employee-navigation" aria-label="Employee navigation">${navigation.map(([path, label]) => `<a href="#/worker/${path}" ${path === section ? 'aria-current="page"' : ''}>${label}</a>`).join('')}<label><span class="sr-only">Demo employee</span><select id="worker-persona" data-native-select aria-label="Choose a demo employee">${state.workers.map(person => `<option value="${esc(person.id)}" ${person.id === workerId ? 'selected' : ''}>${esc(person.name)} · ${esc(person.role || 'Employee')}</option>`).join('')}</select></label></nav><div class="employee-layout"><aside class="employee-sidebar"><section class="employee-profile"><div>${profileImage(worker.name)}<h2>${esc(worker.name)}</h2><p>${esc(worker.role || 'Role not recorded')}</p><small>${esc(profile.team)} · ${esc(worker.id)}</small></div><dl><dt>Contact</dt><dd>${esc(profile.email)}<br>${esc(profile.phone)}</dd><dt>Reporting manager</dt><dd>${esc(profile.manager)}<br><small>Office coordinator</small></dd><dt>Approved services</dt><dd>${esc(worker.services.join(' · '))}</dd><dt>Assignment status</dt><dd>${worker.approved ? 'Approved in demo' : 'Approval pending'}</dd></dl></section><section class="employee-quick"><h2>${icon('layers')} Quick links</h2>${[['today', 'calendar', 'My visits & attendance'], ['availability', 'clock', 'Update availability'], ['leave', 'calendar', 'Apply for leave'], ['calendar', 'calendar', 'My calendar'], ['review', 'file', 'Hours & documents']].map(([path, glyph, label]) => `<a href="#/worker/${path}">${icon(glyph)}${label}</a>`).join('')}<button type="button" data-action="employee-help">${icon('people')} Contact the office</button></section><p class="employee-sidebar-note">Sample week: 5–9 October 2026. Leave, notifications and training are fictional records for this demonstration.</p></aside><main class="employee-main" id="main-content" tabindex="-1">${content}</main></div><footer class="employee-footer"><span>OCD Brilliance · Employee workspace</span><span>Demo only · changes are saved in this browser</span></footer></div>`;
  }
  function requests(context) {
    const { state, workerId, esc, dateLabel } = context;
    return ensure(state).requests.filter(request => request.workerId === workerId).slice().reverse().map(request => `<article class="employee-notification"><span class="employee-category-dot time-off"></span><div><h3>${esc(request.type)}</h3><p>${dateLabel(request.from)}–${dateLabel(request.to)} · ${request.days} weekday${request.days === 1 ? '' : 's'}</p><small>${esc(request.note || 'No note supplied')}</small></div><div class="employee-request-actions"><span class="status ${request.status === 'Approved' ? 'green' : request.status === 'Pending' ? 'amber' : 'gray'}">${request.status}</span>${request.status === 'Pending' ? `<button type="button" data-action="employee-withdraw" data-id="${esc(request.id)}">Withdraw</button>` : ''}</div></article>`).join('');
  }
  function calendar(context) {
    const { state, workerId, esc, dateLabel, clockRange } = context, selected = view(workerId), data = ensure(state);
    const visits = state.bookings.filter(booking => booking.workerId === workerId && !['Cancelled', 'Needs cover', 'Proposed'].includes(booking.status)).map(booking => ({ date: booking.date, time: booking.start, title: state.participants.find(person => person.id === booking.participantId)?.name || 'Assigned service', detail: `${booking.service} · ${clockRange(booking.start, booking.end)}`, kind: 'visit', href: `worker/today/${booking.id}` }));
    const events = [...visits, ...data.events.filter(event => event.workerId === workerId), ...data.requests.filter(request => request.workerId === workerId && request.status === 'Approved').map(request => ({ date: request.from, to: request.to, title: request.type, detail: `${request.days} weekdays · Approved (sample)`, kind: 'leave', href: 'worker/leave' }))];
    const month = new Date(`${selected.month}-01T00:00:00Z`), first = month.getUTCDay(), days = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();
    const agenda = events.filter(event => selected.date ? event.date <= selected.date && (event.to || event.date) >= selected.date : event.date.startsWith(selected.month)).sort((a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`));
    const label = dateLabel(`${selected.month}-01`, { month: 'long', year: 'numeric' });
    return `<div class="employee-calendar"><div class="employee-agenda"><p>${selected.date ? dateLabel(selected.date) : 'This month'}</p>${agenda.slice(0, 3).map(event => `<a class="employee-event ${event.kind}" href="#/${event.href || 'worker/calendar'}"><span><strong>${event.date.slice(-2)}</strong><small>${dateLabel(event.date, { month: 'short' })}</small></span><div><h3>${esc(event.title)}</h3><p>${esc(event.detail)}</p></div></a>`).join('') || '<p class="employee-empty">No events on this date. Choose another day.</p>'}</div><div class="employee-month"><div class="employee-month-heading"><button type="button" data-action="employee-month" data-value="-1" aria-label="Previous month">‹</button><strong>${label}</strong><button type="button" data-action="employee-month" data-value="1" aria-label="Next month">›</button></div><div class="employee-calendar-grid">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => `<span aria-label="${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][index]}">${day}</span>`).join('')}${Array.from({ length: first }, () => '<span></span>').join('')}${Array.from({ length: days }, (_, index) => { const date = `${selected.month}-${String(index + 1).padStart(2, '0')}`, hasEvents = events.some(event => event.date <= date && (event.to || event.date) >= date); return `<button type="button" data-action="employee-date" data-value="${date}" aria-label="${esc(dateLabel(date))}${hasEvents ? ', events scheduled' : ''}" aria-pressed="${selected.date === date}" class="${hasEvents ? 'has-events' : ''}">${index + 1}</button>`; }).join('')}</div><button class="employee-month-reset" type="button" data-action="employee-date" data-value="">Show month overview</button></div></div>`;
  }
  function home(context) {
    const { state, workerId, esc, icon, profileImage } = context, selected = view(workerId), data = ensure(state);
    const worker = state.workers.find(worker => worker.id === workerId), notices = data.notifications.filter(notice => notice.workerId === workerId);
    const unread = notices.filter(notice => !notice.read), total = unread.length;
    const counts = ['Roster', 'Attendance', 'Time off'].map(category => unread.filter(notice => notice.category === category).length);
    const first = total ? counts[0] / total * 100 : 0, second = total ? (counts[0] + counts[1]) / total * 100 : 0;
    const list = notices.filter(notice => selected.category === 'All' || selected.category === notice.category);
    const notifications = `<div class="employee-tabs" role="group" aria-label="Notifications view">${[['updates', 'My updates'], ['requests', 'My requests']].map(([value, label]) => `<button type="button" data-action="employee-tab" data-value="${value}" aria-pressed="${selected.tab === value}">${label}</button>`).join('')}</div><div class="employee-notifications-layout"><div class="employee-notification-summary"><div class="employee-ring employee-total" style="--ring-gradient:${total ? `conic-gradient(var(--green) 0 ${first}%, var(--employee-sage) ${first}% ${second}%, var(--employee-lime) ${second}% 100%)` : '#e9edeb'}" role="img" aria-label="${total} unread notifications"><span><strong>${total.toString().padStart(2, '0')}</strong><small>Unread</small></span></div><div class="employee-legend">${['Roster', 'Attendance', 'Time off'].map((category, index) => `<button type="button" data-action="employee-category" data-value="${category}" aria-pressed="${selected.category === category}"><i class="category-${index}"></i>${category}<strong>${counts[index].toString().padStart(2, '0')}</strong></button>`).join('')}<button type="button" data-action="employee-category" data-value="All" aria-pressed="${selected.category === 'All'}">Show all updates</button></div></div><div class="employee-notification-list">${selected.tab === 'requests' ? requests(context) : list.map(notice => `<article class="employee-notification ${notice.read ? 'is-read' : ''}">${profileImage(worker.name)}<div><h3>${esc(notice.title)}</h3><p>${esc(notice.detail)}</p><a href="#/${esc(notice.href)}">View ${esc(notice.category.toLowerCase())} →</a></div>${notice.read ? '<span class="employee-read-label">Read</span>' : `<button type="button" data-action="employee-read" data-id="${esc(notice.id)}">Mark read</button>`}</article>`).join('') || '<p class="employee-empty">No updates in this category.</p>'}</div></div>`;
    return `<div class="employee-heading"><div><p>EMPLOYEE SELF SERVICE</p><h1>Welcome back, ${esc(worker.name.split(' ')[0])}</h1></div><span>October 2026 · Sample workspace</span></div>${card('Notifications', icon('inbox'), notifications)}<div class="employee-bottom-grid">${card('My calendar', icon('calendar'), calendar(context), '<a href="#/worker/calendar">View full calendar</a>')}${card('Leave balances', icon('calendar'), balances(context), '<a href="#/worker/leave">Apply for leave</a>')}</div>`;
  }
  function personal(context) {
    const { state, workerId, esc, icon } = context, worker = state.workers.find(worker => worker.id === workerId), profile = ensure(state).profiles[workerId];
    return `<div class="employee-heading"><h1>My personal details</h1><span>Fictional employee profile</span></div>${card('Employment & skills', icon('people'), `<div class="employee-personal"><dl><dt>Employee</dt><dd>${esc(worker.name)}</dd><dt>Role</dt><dd>${esc(worker.role || 'Role not recorded')}</dd><dt>Team</dt><dd>${esc(profile.team)}</dd><dt>Email</dt><dd>${esc(profile.email)}</dd><dt>Approved services</dt><dd>${esc(worker.services.join(' · '))}</dd><dt>Recorded skills</dt><dd>${esc((worker.skills || []).join(' · ') || 'Not recorded')}</dd><dt>Manager</dt><dd>${esc(profile.manager)}</dd></dl><a class="btn" href="#/worker/availability">Update my availability</a><p class="employee-footnote">Contact the office to update employment details or qualifications.</p></div>`)} `;
  }
  function leave(context) {
    const { icon, todayPerth } = context;
    return `<div class="employee-heading"><h1>My time off</h1><span>Leave requests · Fictional demo</span></div>${card('Leave balances', icon('calendar'), balances(context))}<div class="employee-bottom-grid">${card('Apply for leave', icon('calendar'), `<form data-form="employee-leave" class="employee-leave-form"><label>Leave type<select name="type" data-native-select>${leaveTypes.map(type => `<option>${type}</option>`).join('')}</select></label><div><label>From<input type="date" name="from" min="${todayPerth()}" required></label><label>To<input type="date" name="to" min="${todayPerth()}" required></label></div><label>Note (optional)<textarea name="note" maxlength="500" placeholder="A short note for your coordinator. Medical details are not needed."></textarea></label><p class="employee-footnote">Weekdays are counted for this demo. Your coordinator checks the roster and actual entitlement. A request does not change assigned visits.</p><button class="btn primary" type="submit">Save demo request</button></form>`)}${card('My leave requests', icon('file'), `<div class="employee-leave-list">${requests(context)}</div>`)}</div>`;
  }
  function action(context, button) {
    const { state, workerId, save, render, toast, openModal } = context, selected = view(workerId);
    try {
      const action = button.dataset.action;
      if (action === 'employee-read') { markRead(state, workerId, button.dataset.id); save(); }
      if (action === 'employee-withdraw') { withdrawLeave(state, workerId, button.dataset.id); save(); toast('Demo request withdrawn. Your roster is unchanged.'); }
      if (action === 'employee-tab') selected.tab = button.dataset.value;
      if (action === 'employee-category') { selected.category = button.dataset.value; selected.tab = 'updates'; }
      if (action === 'employee-date') selected.date = button.dataset.value;
      if (action === 'employee-month') { const date = new Date(`${selected.month}-01T00:00:00Z`); date.setUTCMonth(date.getUTCMonth() + Number(button.dataset.value)); selected.month = date.toISOString().slice(0, 7); selected.date = ''; }
      if (action === 'employee-help') return openModal('Contact your coordinator', 'Employee support', '<p>For leave, roster or document questions, contact your office coordinator using your usual workplace contact details.</p><p>For a same-day absence or an essential service, phone the office as well as reporting it in My visits.</p><a class="btn" href="#/worker/today" data-action="close-modal">Open my visits</a>');
      render();
      const replacement = document.querySelector(`[data-action="${action}"]${button.dataset.value !== undefined ? `[data-value="${button.dataset.value}"]` : button.dataset.id ? `[data-id="${button.dataset.id}"]` : ''}`);
      replacement?.focus({ preventScroll: true });
    } catch (error) { toast(error.message); }
  }
  return { ensure, requestLeave, withdrawLeave, markRead, shell, home, personal, leave, action };
});
