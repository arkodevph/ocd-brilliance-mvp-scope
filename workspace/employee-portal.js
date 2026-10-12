(function (root, factory) {
  const portal = factory();
  if (typeof module === 'object' && module.exports) module.exports = portal;
  else root.OCD_EMPLOYEE = portal;
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const leaveTypes = ['Annual leave', 'Personal leave', 'Study leave'];
  const views = new Map();
  const navigation = [
    ['home', 'Home'],
    ['personal', 'Personal'],
    ['reviews', 'My reviews'],
    ['today', 'My visits'],
    ['map', 'Visit map'],
    ['calendar', 'Calendar'],
    ['leave', 'Time off'],
    ['review', 'Hours & documents'],
  ];
  function ensure(state) {
    state.employeePortal ||= {
      profiles: {},
      notifications: [],
      requests: [],
      events: [],
    };
    const data = state.employeePortal;
    for (const worker of state.workers) {
      if (data.profiles[worker.id]) continue;
      data.profiles[worker.id] = {
        email: `${worker.name.toLowerCase().replaceAll(' ', '.')}@example.test`,
        phone: '0400 000 300',
        manager: 'Mia Roberts',
        team: worker.role?.includes('nurse')
          ? 'Clinical care'
          : worker.role === 'Cleaner'
            ? 'Home services'
            : 'Community support',
        balances: [
          { type: 'Annual leave', available: 12, entitlement: 20 },
          { type: 'Personal leave', available: 7, entitlement: 10 },
          { type: 'Study leave', available: 3, entitlement: 5 },
        ],
      };
      data.notifications.push(
        {
          id: `EMP-${worker.id}-roster`,
          workerId: worker.id,
          category: 'Roster',
          title: 'Your October roster is ready',
          detail: 'Check your assigned visits, service times and location before heading out.',
          href: 'worker/today',
          read: false,
        },
        {
          id: `EMP-${worker.id}-leave`,
          workerId: worker.id,
          category: 'Time off',
          title: 'Annual leave approved — sample',
          detail: '19–20 October · Your sample annual leave request has been approved.',
          href: 'worker/leave',
          read: false,
        },
        {
          id: `EMP-${worker.id}-hours`,
          workerId: worker.id,
          category: 'Attendance',
          title: 'Review your recorded hours',
          detail: 'Check clock times and notes before the office completes its review.',
          href: 'worker/review',
          read: false,
        },
      );
      data.requests.push(
        {
          id: `LV-${worker.id}-1`,
          workerId: worker.id,
          type: 'Annual leave',
          from: '2026-10-19',
          to: '2026-10-20',
          days: 2,
          note: 'Family time — fictional example',
          status: 'Approved',
        },
        {
          id: `LV-${worker.id}-2`,
          workerId: worker.id,
          type: 'Study leave',
          from: '2026-10-14',
          to: '2026-10-14',
          days: 1,
          note: 'Professional development — fictional example',
          status: 'Pending',
        },
      );
      data.events.push(
        {
          workerId: worker.id,
          date: '2026-10-06',
          time: '14:00',
          title: 'Team check-in',
          detail: 'Office · service updates',
          kind: 'meeting',
        },
        {
          workerId: worker.id,
          date: '2026-10-15',
          time: '09:00',
          title: 'Safety refresher',
          detail: 'Training room · manual handling',
          kind: 'training',
        },
      );
    }
    return data;
  }
  function view(workerId) {
    if (!views.has(workerId))
      views.set(workerId, {
        month: '2026-10',
        date: '',
        category: 'All',
        tab: 'updates',
      });
    return views.get(workerId);
  }
  function validDate(date) {
    return (
      /^\d{4}-\d{2}-\d{2}$/.test(date || '') &&
      Number.isFinite(Date.parse(date)) &&
      new Date(date).toISOString().slice(0, 10) === date
    );
  }
  function requestLeave(state, workerId, input, today) {
    const data = ensure(state);
    if (!state.workers.some((worker) => worker.id === workerId))
      throw new Error('Choose a demo employee.');
    if (
      !leaveTypes.includes(input.type) ||
      !validDate(input.from) ||
      !validDate(input.to) ||
      input.from < today ||
      input.to < input.from
    )
      throw new Error('Choose a leave type and valid dates from today onwards.');
    const length = (Date.parse(input.to) - Date.parse(input.from)) / 86400000 + 1;
    if (length > 31) throw new Error('For this demo, request up to 31 calendar days at a time.');
    if (
      data.requests.some(
        (request) =>
          request.workerId === workerId &&
          ['Pending', 'Approved'].includes(request.status) &&
          input.from <= request.to &&
          input.to >= request.from,
      )
    )
      throw new Error('These dates overlap one of your pending or approved requests.');
    const note = String(input.note || '').trim();
    if (note.length > 500) throw new Error('Keep the note to 500 characters.');
    let days = 0;
    for (let index = 0; index < length; index++)
      if (![0, 6].includes(new Date(Date.parse(input.from) + index * 86400000).getUTCDay())) days++;
    if (!days) throw new Error('Select at least one weekday for this demo request.');
    const request = {
      id: `LV-${workerId}-${data.requests.length + 1}`,
      workerId,
      type: input.type,
      from: input.from,
      to: input.to,
      days,
      note,
      status: 'Pending',
    };
    data.requests.push(request);
    data.notifications.unshift({
      id: `EMP-${request.id}`,
      workerId,
      category: 'Time off',
      title: 'Leave request saved',
      detail: `${input.type} · ${input.from} to ${input.to} · awaiting office review.`,
      href: 'worker/leave',
      read: false,
    });
    return request;
  }
  function withdrawLeave(state, workerId, requestId) {
    const request = ensure(state).requests.find(
      (request) => request.id === requestId && request.workerId === workerId,
    );
    if (!request || request.status !== 'Pending')
      throw new Error('Only your own pending requests can be withdrawn.');
    request.status = 'Withdrawn';
  }
  function markRead(state, workerId, notificationId) {
    const notification = ensure(state).notifications.find(
      (notification) => notification.id === notificationId && notification.workerId === workerId,
    );
    if (!notification) throw new Error('This notification is not available to this employee.');
    notification.read = true;
  }
  function shell(context, section, content) {
    const { state, workerId, esc, profileImage, icon } = context;
    const worker = state.workers.find((worker) => worker.id === workerId),
      profile = ensure(state).profiles[workerId];
    return `<a class="skip-link" data-action="skip-main" href="#main-content">Skip to main content</a><div class="employee-shell"><header class="employee-top"><a href="#/worker/home"><img src="/assets/ocd-brilliance-logo.png" alt="OCD Brilliance"></a><div><span class="employee-demo">Fictional employee demo</span><span class="employee-timezone">Perth · AWST</span><button class="employee-alerts-button" type="button" data-app-tools-open aria-label="Manage phone notifications">${icon('bell')} Alerts</button><button class="employee-account" data-action="account-settings" type="button">${profileImage(worker.name)}<span>${esc(worker.name)}</span></button></div></header><nav class="employee-navigation" aria-label="Employee navigation">${navigation.map(([path, label]) => `<a href="#/worker/${path}" ${path === section ? 'aria-current="page"' : ''}>${label}</a>`).join('')}<label><span class="sr-only">Demo employee</span><select id="worker-persona" data-native-select aria-label="Choose a demo employee">${state.workers.map((person) => `<option value="${esc(person.id)}" ${person.id === workerId ? 'selected' : ''}>${esc(person.name)} · ${esc(person.role || 'Employee')}</option>`).join('')}</select></label></nav><div class="employee-layout"><aside class="employee-sidebar"><section class="employee-profile"><div>${profileImage(worker.name)}<h2>${esc(worker.name)}</h2><p>${esc(worker.role || 'Role not recorded')}</p><small>${esc(profile.team)} · ${esc(worker.id)}</small></div><dl><dt>Contact</dt><dd>${esc(profile.email)}<br>${esc(profile.phone)}</dd><dt>Reporting manager</dt><dd>${esc(profile.manager)}<br><small>Office coordinator</small></dd><dt>Approved services</dt><dd>${esc(worker.services.join(' · '))}</dd><dt>Assignment status</dt><dd>${worker.approved ? 'Approved in demo' : 'Approval pending'}</dd></dl>${section === 'home' ? '<a class="employee-personal-link" href="#/worker/personal">View personal details →</a>' : ''}</section><section class="employee-quick"><h2>${icon('layers')} Quick links</h2>${[
      ['today', 'calendar', 'My visits & attendance'],
      ['availability', 'clock', 'Update availability'],
      ['leave', 'calendar', 'Apply for leave'],
      ['calendar', 'calendar', 'My calendar'],
      ['review', 'file', 'Hours & documents'],
    ]
      .map(([path, glyph, label]) => `<a href="#/worker/${path}">${icon(glyph)}${label}</a>`)
      .join(
        '',
      )}<button type="button" data-action="employee-help">${icon('people')} Contact the office</button></section><p class="employee-sidebar-note">Sample week: 5–9 October 2026. Leave, notifications and training are fictional records for this demonstration.</p></aside><main class="employee-main" id="main-content" tabindex="-1">${content}</main></div><footer class="employee-footer"><span>OCD Brilliance · Employee workspace</span><span>Demo only · changes are saved in this browser</span></footer></div>`;
  }
  function calendar(context) {
    const { state, workerId, esc, dateLabel, clockRange } = context,
      selected = view(workerId),
      data = ensure(state);
    const visits = state.bookings
      .filter(
        (booking) =>
          booking.workerId === workerId &&
          !['Cancelled', 'Needs cover', 'Proposed'].includes(booking.status),
      )
      .map((booking) => ({
        date: booking.date,
        time: booking.start,
        title:
          state.participants.find((person) => person.id === booking.participantId)?.name ||
          'Assigned service',
        detail: `${booking.service} · ${clockRange(booking.start, booking.end)}`,
        kind: 'visit',
        href: `worker/today/${booking.id}`,
      }));
    const events = [
      ...visits,
      ...data.events.filter((event) => event.workerId === workerId),
      ...data.requests
        .filter((request) => request.workerId === workerId && request.status === 'Approved')
        .map((request) => ({
          date: request.from,
          to: request.to,
          title: request.type,
          detail: `${request.days} weekdays · Approved (sample)`,
          kind: 'leave',
          href: 'worker/leave',
        })),
    ];
    const month = new Date(`${selected.month}-01T00:00:00Z`),
      first = month.getUTCDay(),
      days = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();
    const agenda = events
      .filter((event) =>
        selected.date
          ? event.date <= selected.date && (event.to || event.date) >= selected.date
          : event.date.startsWith(selected.month),
      )
      .sort((a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`));
    const label = dateLabel(`${selected.month}-01`, {
      month: 'long',
      year: 'numeric',
    });
    return `<div class="employee-calendar"><div class="employee-agenda"><p>${selected.date ? dateLabel(selected.date) : 'This month'}</p>${
      agenda
        .slice(0, 3)
        .map(
          (event) =>
            `<a class="employee-event ${event.kind}" href="#/${event.href || 'worker/calendar'}"><span><strong>${event.date.slice(-2)}</strong><small>${dateLabel(event.date, { month: 'short' })}</small></span><div><h3>${esc(event.title)}</h3><p>${esc(event.detail)}</p></div></a>`,
        )
        .join('') || '<p class="employee-empty">No events on this date. Choose another day.</p>'
    }</div><div class="employee-month"><div class="employee-month-heading"><button type="button" data-action="employee-month" data-value="-1" aria-label="Previous month">‹</button><strong>${label}</strong><button type="button" data-action="employee-month" data-value="1" aria-label="Next month">›</button></div><div class="employee-calendar-grid">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => `<span aria-label="${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index]}">${day}</span>`).join('')}${Array.from({ length: first }, () => '<span></span>').join('')}${Array.from(
      { length: days },
      (_, index) => {
        const date = `${selected.month}-${String(index + 1).padStart(2, '0')}`,
          hasEvents = events.some(
            (event) => event.date <= date && (event.to || event.date) >= date,
          );
        return `<button type="button" data-action="employee-date" data-value="${date}" aria-label="${esc(dateLabel(date))}${hasEvents ? ', events scheduled' : ''}" aria-pressed="${selected.date === date}" class="${hasEvents ? 'has-events' : ''}">${index + 1}</button>`;
      },
    ).join(
      '',
    )}</div><button class="employee-month-reset" type="button" data-action="employee-date" data-value="">Show month overview</button></div></div>`;
  }
  function pageModel(context, page) {
    const { state, workerId, todayPerth } = context;
    const data = ensure(state), worker = state.workers.find((person) => person.id === workerId);
    return {
      page, today: todayPerth(),
      worker: { id: worker.id, name: worker.name, role: worker.role || 'Employee', services: worker.services, skills: worker.skills || [], approved: worker.approved },
      profile: data.profiles[workerId],
      notices: data.notifications.filter((notice) => notice.workerId === workerId),
      requests: data.requests.filter((request) => request.workerId === workerId).slice().reverse(),
      selected: { tab: view(workerId).tab, category: view(workerId).category },
      calendar: {
        month: view(workerId).month, date: view(workerId).date,
        events: [
          ...state.bookings.filter((booking) => booking.workerId === workerId && !['Cancelled', 'Needs cover', 'Proposed'].includes(booking.status)).map((booking) => ({ date: booking.date, title: state.participants.find((person) => person.id === booking.participantId)?.name || 'Assigned visit', href: `worker/today/${booking.id}` })),
          ...data.events.filter((event) => event.workerId === workerId),
          ...data.requests.filter((request) => request.workerId === workerId && request.status === 'Approved').map((request) => ({ date: request.from, to: request.to, title: request.type, href: 'worker/leave' })),
        ],
      },
    };
  }
  function home(context) {
    return `<div data-react-employee-page="${context.esc(JSON.stringify(pageModel(context, 'home')))}"></div>`;
  }
  function personal(context) {
    return `<div data-react-employee-page="${context.esc(JSON.stringify(pageModel(context, 'personal')))}"></div>`;
  }
  function leave(context) {
    return `<div data-react-employee-page="${context.esc(JSON.stringify(pageModel(context, 'leave')))}"></div>`;
  }
  function action(context, button) {
    const { state, workerId, save, render, toast, openModal } = context,
      selected = view(workerId);
    try {
      const action = button.dataset.action;
      if (action === 'employee-read') {
        markRead(state, workerId, button.dataset.id);
        save();
      }
      if (action === 'employee-withdraw') {
        withdrawLeave(state, workerId, button.dataset.id);
        save();
        toast('Demo request withdrawn. Your roster is unchanged.');
      }
      if (action === 'employee-tab') selected.tab = button.dataset.value;
      if (action === 'employee-category') {
        selected.category = button.dataset.value;
        selected.tab = 'updates';
      }
      if (action === 'employee-date') selected.date = button.dataset.value;
      if (action === 'employee-month') {
        const date = new Date(`${selected.month}-01T00:00:00Z`);
        date.setUTCMonth(date.getUTCMonth() + Number(button.dataset.value));
        selected.month = date.toISOString().slice(0, 7);
        selected.date = '';
      }
      if (action === 'employee-help')
        return openModal(
          'Contact your coordinator',
          'Employee support',
          '<p>For leave, roster or document questions, contact your office coordinator using your usual workplace contact details.</p><p>For a same-day absence or an essential service, phone the office as well as reporting it in My visits.</p><a class="btn" href="#/worker/today" data-action="close-modal">Open my visits</a>',
        );
      render();
      const replacement = document.querySelector(
        `[data-action="${action}"]${button.dataset.value !== undefined ? `[data-value="${button.dataset.value}"]` : button.dataset.id ? `[data-id="${button.dataset.id}"]` : ''}`,
      );
      replacement?.focus({ preventScroll: true });
    } catch (error) {
      toast(error.message);
    }
  }
  return {
    ensure,
    requestLeave,
    withdrawLeave,
    markRead,
    shell,
    home,
    personal,
    leave,
    action,
  };
});
