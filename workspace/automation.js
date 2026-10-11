/* Workflow screens for fictional cases. Live connections remain separate and read-only. */
(() => {
  'use strict';
  const E = window.OCD_AUTOMATION_ENGINE;
  const ui = { tab: 'cases', filter: 'open', query: '', page: 1 };
  const pageSize = 5;
  const esc = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[c],
    );
  const option = (value, label, selected) =>
    `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(label)}</option>`;
  const titles = {
    needs_review: 'Needs review',
    approved: 'Approved for native step',
    manual_action_required: 'Human action needed',
    verifying: 'Awaiting read-back',
    completed: 'Completed (demo)',
    reconciliation_required: 'Outcome unknown',
    retry_scheduled: 'Retry available',
    rejected: 'Rejected',
  };
  const status = (job) =>
    `<span class="status ${['reconciliation_required', 'retry_scheduled'].includes(job.status) ? 'red' : job.status === 'completed' ? 'dark' : 'amber'}">${esc(job.kind === 'email-review' ? (job.status === 'completed' ? 'Completed' : 'Assigned') : titles[job.status] || job.status)}</span>`;
  const dateTime = (value) =>
    value
      ? new Date(value).toLocaleString('en-AU', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      : '—';
  const button = (action, label, id = '', primary = false) =>
    `<button class="btn ${primary ? 'primary' : ''}" data-auto-action="${action}" data-id="${esc(id)}" type="button">${esc(label)}</button>`;
  const guard = `<label class="checkbox"><input type="checkbox" name="sourceReviewed" required><span>I checked the original evidence, person, fields and effect of this proposal.</span></label>`;
  function boundary() {
    return `<div class="automation-boundary"><span class="status blue">Prototype</span><p>Messages and tasks save in this browser · Gmail is not connected.</p><a href="#/office/shiftcare">Live read connection</a></div>`;
  }
  function header(title, subtitle) {
    return `<header class="page-header"><div><span class="eyebrow">Office / Workflow</span><h1>${esc(title)}</h1><details class="context-help"><summary>About this workflow</summary><p>${esc(subtitle)}</p></details></div><a class="btn" href="#/office/finance">Bookkeeping review</a></header>`;
  }
  function banner(c) {
    const a = E.ensure(c.state),
      open = a.jobs.filter((j) => j.status !== 'completed').length;
    return `<a class="automation-home-link" href="#/office/automation"><span><span class="eyebrow">From incoming request to verified outcome</span><strong>Follow the automation workflow</strong><small>${open} assigned tasks · review, native handoff, read-back and exceptions</small></span><span class="btn primary">Open automation →</span></a>`;
  }
  function casePerson(state, job) {
    const draft = job.draft || {};
    const booking = state.bookings.find((row) => row.id === job.targetId);
    const document = state.workerDocs.find((row) => row.id === job.targetId);
    const agreement = state.agreements.find((row) => row.id === job.targetId);
    const person = document
      ? state.workers.find((row) => row.id === document.workerId)
      : booking || agreement
        ? state.participants.find((row) => row.id === (booking || agreement).participantId)
        : state.enquiries.find((row) => row.id === job.targetId) ||
          state.participants.find((row) => row.id === job.targetId) ||
          state.workers.find((row) => row.id === job.targetId);
    const name =
      person?.name ||
      draft.person ||
      [draft.firstName, draft.lastName].filter(Boolean).join(' ') ||
      draft.name;
    return {
      name: name || 'Person needs confirmation',
      email: person?.email || draft.email || '',
      detail: person?.suburb || draft.suburb || '',
      booking,
    };
  }
  function nextAction(job) {
    if (job.status === 'completed') return 'Outcome recorded';
    if (job.status === 'reconciliation_required')
      return 'Confirm the native outcome before retrying';
    if (job.status === 'verifying') return 'Compare the result with the native record';
    if (job.status === 'retry_scheduled') return 'Recheck the source before retrying';
    if (job.stage === 'worker_acceptance') return 'Await the selected worker’s response';
    if (job.stage === 'accounting') return 'Confirm the separate accounting or payroll setup';
    if (job.status === 'approved') return 'Perform the approved native step';
    if (job.status === 'manual_action_required') return 'Record the checked human outcome';
    return job.draft.nextAction || 'Review the source and confirm the next step';
  }
  function caseSearch(state, job) {
    const person = casePerson(state, job);
    return `${person.name} ${person.email} ${person.detail} ${job.title} ${job.id} ${job.owner} ${job.source.body}`.toLowerCase();
  }
  function profileImage(name, className = 'automation-source-avatar') {
    if (!name || ['Person needs confirmation', 'Unassigned'].includes(name))
      return `<span class="${esc(className)}" aria-hidden="true">?</span>`;
    const hash = [...name].reduce((value, char) => (value * 31 + char.codePointAt(0)) >>> 0, 0);
    return `<span class="${esc(className)} profile-image"><img src="/assets/profiles/profile-${(hash % 6) + 1}.svg" alt="" width="80" height="80" loading="lazy"></span>`;
  }
  function caseCard(c, job, selected, matches) {
    const person = casePerson(c.state, job);
    const workflow = E.catalog.find((row) => row.id === job.workflow)?.title || job.workflow;
    return `<article class="automation-case ${selected ? 'selected' : ''}" ${matches ? '' : 'hidden'} data-case-search="${esc(caseSearch(c.state, job))}">
      <header class="automation-person-heading">${profileImage(person.name)}<div><h3>${esc(person.name)}</h3><p>${esc([person.email, person.detail].filter(Boolean).join(' · ') || 'Contact details not recorded')}</p></div>${status(job)}<a class="automation-person-open" href="#/office/automation${selected ? '' : '/' + esc(job.id)}" aria-label="${selected ? 'Hide' : 'Review'} case details for ${esc(person.name)}" aria-expanded="${selected}" ${selected ? `aria-controls="case-${esc(job.id)}"` : ''}>${selected ? 'Hide case details ↑' : 'Review case details →'}</a></header>
      <p class="automation-person-task">${esc(job.title)}</p>
      <dl class="automation-person-facts"><div><dt>Responsible person / team</dt><dd>${esc(job.owner || 'Unassigned')}</dd></div><div><dt>Workflow</dt><dd>${esc(workflow)}</dd></div><div><dt>Received</dt><dd>${dateTime(job.createdAt)}</dd></div>${person.booking ? `<div><dt>Visit</dt><dd>${esc(person.booking.date)} · ${esc(person.booking.start)}–${esc(person.booking.end)}</dd></div>` : ''}<div><dt>Next action</dt><dd>${esc(nextAction(job))}</dd></div></dl>
      <div class="automation-person-progress">${steps(job)}</div>
      <div class="automation-person-reference">${esc(job.id)}${job.priority === 'Urgent' ? ' · Urgent' : ''}</div>
      ${selected ? `<section id="case-${esc(job.id)}" class="automation-case-detail" aria-label="Case for ${esc(person.name)}">${caseDetail(c, job)}</section>` : ''}
    </article>`;
  }
  function page(c, detailId) {
    const a = E.ensure(c.state);
    const selected = detailId ? a.jobs.find((j) => j.id === detailId) : null;
    const tab = detailId ? 'cases' : ui.tab;
    const counts = {
      inbox: a.inbox.filter((m) => m.state === 'received').length,
      review: a.jobs.filter((j) => j.status === 'needs_review').length,
      native: a.jobs.filter((j) => j.status === 'manual_action_required').length,
      verification: a.jobs.filter((j) =>
        ['verifying', 'reconciliation_required'].includes(j.status),
      ).length,
    };
    let body;
    if (tab === 'inbox') body = inbox(c);
    else if (tab === 'readiness') body = readiness(c);
    else {
      const filter =
        selected?.status === 'completed' && ui.filter === 'open' ? 'completed' : ui.filter;
      const jobs = a.jobs.filter(
        (j) =>
          filter === 'all' ||
          (filter === 'completed'
            ? j.status === 'completed'
            : filter === 'exceptions'
              ? ['reconciliation_required', 'retry_scheduled', 'manual_action_required'].includes(
                  j.status,
                )
              : j.status !== 'completed'),
      );
      const matches = (job) => caseSearch(c.state, job).includes(ui.query.toLowerCase());
      const ordered = [...jobs].reverse();
      const matching = ordered.filter(matches);
      const selectedIndex = matching.findIndex((job) => job.id === selected?.id);
      const pages = Math.max(1, Math.ceil(matching.length / pageSize));
      ui.page =
        selectedIndex >= 0 ? Math.floor(selectedIndex / pageSize) + 1 : Math.min(ui.page, pages);
      const visible = matching.slice((ui.page - 1) * pageSize, ui.page * pageSize);
      return `<div class="automation-desk automation-pipeline"><header class="automation-desk-header"><div><h1>Automation</h1><span class="status blue">Prototype workspace</span></div><a class="btn small" href="#/office/finance">Bookkeeping review →</a></header><nav class="automation-tabs" aria-label="Automation workspace">${[
        ['cases', 'Cases'],
        ['inbox', 'Email review'],
        ['readiness', 'Connection status'],
      ]
        .map(
          ([key, label]) =>
            `<button type="button" class="${tab === key ? 'active' : ''}" data-auto-action="tab" data-id="${key}" aria-pressed="${tab === key}">${label}</button>`,
        )
        .join(
          '',
        )}<span>${counts.review} to review · ${counts.verification} to verify</span></nav><div class="automation-desk-tools"><button class="btn primary" data-action="add-inbox-message" type="button">Add message</button>${button('check', 'Check enquiry ownership', 'areas')}${button('check', 'Run three-day check', 'reminders')}${button('check', 'Check documents', 'documents')}<span>Prototype tasks · <a href="#/office/shiftcare">Live connection</a></span></div><div class="automation-case-layout"><section class="automation-queue" aria-label="Automation cases"><header class="automation-queue-header"><div><h2>People &amp; follow-ups</h2><span data-case-count>${jobs.filter(matches).length}</span></div><label class="automation-case-search"><span class="sr-only">Search cases</span><input type="search" id="automation-case-search" placeholder="Search person, owner or case" value="${esc(ui.query)}"></label><div class="automation-filters" role="group" aria-label="Case filter">${[
        ['open', 'Open'],
        ['exceptions', 'Needs help'],
        ['completed', 'Completed'],
        ['all', 'All'],
      ]
        .map(
          ([key, label]) =>
            `<button class="${filter === key ? 'active' : ''}" data-auto-action="filter" data-id="${key}" aria-pressed="${filter === key}">${label}</button>`,
        )
        .join(
          '',
        )}</div></header><div class="automation-case-list">${ordered.map((j) => caseCard(c, j, selected?.id === j.id, visible.includes(j))).join('')}<div class="empty automation-no-cases" ${jobs.some(matches) ? 'hidden' : ''}><strong>No matching cases</strong><p>${jobs.length ? 'Try another search.' : 'Add a message to start a follow-up.'}</p></div></div><nav class="automation-pagination" aria-label="Case pages"><button type="button" class="btn small" data-auto-action="case-page" data-id="previous" ${ui.page === 1 ? 'disabled' : ''}>← Previous</button><span data-page-summary role="status">${matching.length ? (ui.page - 1) * pageSize + 1 : 0}–${Math.min(ui.page * pageSize, matching.length)} of ${matching.length} cases · Page ${ui.page} of ${pages}</span><button type="button" class="btn small" data-auto-action="case-page" data-id="next" ${ui.page === pages ? 'disabled' : ''}>Next →</button></nav></section></div></div>`;
    }
    return `${header('Automation', 'Turn repeated checks into owned cases, then verify each outcome.')}${boundary()}<div class="automation-metrics">${[
      [counts.inbox, 'Incoming sources'],
      [counts.review, 'Need review'],
      [counts.native, 'Human handoffs'],
      [counts.verification, 'Need verification'],
    ]
      .map(([n, label]) => `<div><strong>${n}</strong><span>${label}</span></div>`)
      .join('')}</div><nav class="automation-tabs" aria-label="Automation workspace">${[
      ['cases', 'Cases'],
      ['inbox', 'Email review'],
      ['readiness', 'Connection status'],
    ]
      .map(
        ([key, label]) =>
          `<button type="button" class="${tab === key ? 'active' : ''}" data-auto-action="tab" data-id="${key}" aria-pressed="${tab === key}">${label}</button>`,
      )
      .join(
        '',
      )}</nav>${tab === 'cases' ? `<div class="automation-checks"><button class="btn primary" data-action="add-inbox-message" type="button">Add message</button>${button('check', 'Check enquiry ownership', 'areas')}${button('check', 'Run three-day check', 'reminders')}${button('check', 'Check documents', 'documents')}<small>Scenario date: 5 October 2026 · demo Perth time</small></div>` : ''}${body}`;
  }
  function inbox(c) {
    const a = c.state.automation;
    return `<section class="panel tight email-review"><header class="crm-list-toolbar"><div><h2>Email review</h2><p class="muted tiny">Add a message → AI review → Confirm team → Assigned task</p></div><div class="button-row"><button class="btn primary" data-action="add-inbox-message" type="button">Add message</button></div></header><ol class="email-flow" aria-label="Email processing steps"><li>1. Add message</li><li>2. Review AI suggestion</li><li>3. Confirm responsible team</li><li>4. Follow assigned task</li></ol><div class="automation-inbox">${
      a.inbox
        .map((m) => {
          const job = a.jobs.find((j) => j.id === m.jobId);
          return `<article class="email-source"><header><span class="automation-source-avatar" aria-hidden="true">${esc((m.owner || 'Office').slice(0, 1))}</span><div><h3>${esc(m.title)}</h3><small>${m.example ? 'Example · ' : ''}${esc(m.id)} · ${esc(E.catalog.find((w) => w[0] === m.workflow)?.[1] || m.workflow || 'Request')}</small></div><span class="status">${job ? 'Task created' : 'Needs review'}</span></header><p>${esc(m.body)}</p><dl class="email-routing"><div><dt>Responsible team</dt><dd>${esc(job?.owner || m.owner || 'Unassigned')}</dd></div><div><dt>Task</dt><dd>${esc(job?.id || 'Not assigned yet')}</dd></div><div><dt>Next step</dt><dd>${job ? job.draft.nextAction || 'Open assigned task' : m.aiReview ? 'Confirm the responsible team' : 'Review with AI'}</dd></div></dl><footer><button class="btn small" data-action="review-source-email" data-id="${esc(m.id)}" type="button">${m.aiReview ? 'View AI review' : 'Review with AI'}</button>${job ? `<a href="#/office/automation/${esc(job.id)}">Review task →</a>` : '<span class="muted tiny">Review, then confirm the team.</span>'}</footer></article>`;
        })
        .join('') ||
      '<div class="empty"><strong>No messages yet</strong><p>Add an email message. AI prepares a summary and reply; you confirm who follows up.</p></div>'
    }</div></section>`;
  }
  function steps(job) {
    if (job.kind === 'email-review')
      return `<ol class="automation-progress" aria-label="Workflow stages">${['Message added', 'AI reviewed', 'Team assigned', 'Completed'].map((name, i) => `<li class="${i === (job.status === 'completed' ? 3 : 2) ? 'current' : i < (job.status === 'completed' ? 3 : 2) ? 'past' : ''}"><span>${i + 1}</span>${name}</li>`).join('')}</ol>`;
    const names = [
      'Received',
      'Review',
      'Native step',
      'Read-back',
      ...(['participant', 'employee'].includes(job.kind) ? ['Accounting'] : []),
      'Closed',
    ];
    const current =
      job.status === 'completed'
        ? names.length - 1
        : job.stage === 'accounting'
          ? 4
          : ['readback', 'offer_readback'].includes(job.stage)
            ? 3
            : ['native', 'offer', 'worker_acceptance', 'assignment'].includes(job.stage)
              ? 2
              : 1;
    return `<ol class="automation-progress" aria-label="Workflow stages">${names.map((name, i) => `<li class="${i === current ? 'current' : i < current ? 'past' : ''}"><span>${i + 1}</span>${name}</li>`).join('')}</ol>`;
  }
  function field(name, label, value, type = 'text', required = true) {
    return `<label>${esc(label)}<input name="${name}" type="${type}" value="${esc(value || '')}" ${required ? 'required' : ''}></label>`;
  }
  function reviewForm(c, job) {
    const d = job.draft,
      state = c.state;
    let fields = '';
    if (['participant', 'employee'].includes(job.kind)) {
      const people =
        state.automation.remote[job.kind === 'participant' ? 'participants' : 'workers'];
      fields = `${field('firstName', 'First name', d.firstName)}${field('lastName', 'Last name', d.lastName)}${job.kind === 'participant' ? field('dob', 'Verified date of birth', d.dob, 'date') : ''}${field('email', 'Contact email', d.email, 'email')}${field('suburb', 'Service suburb', d.suburb, 'text', job.kind === 'participant')}${field('service', 'Requested service', d.service)}<label class="full">Existing record / new profile<select name="matchId">${option('', 'Create only after checking for duplicates', d.matchId || '')}${people.map((p) => option(p.id, `${p.id} · ${p.name}${p.email ? ` · ${p.email}` : ''}`, d.matchId)).join('')}</select></label><label class="checkbox full"><input name="consent" type="checkbox" ${d.consent ? 'checked' : ''} required><span>Consent/authority is present in the reviewed source.</span></label><p class="form-note full">${job.kind === 'participant' ? 'Missing DOB stays in review. Selecting an existing ID prevents a second profile.' : 'Worker role only. Screening approval, invitations and payroll/Xero records remain separate.'}</p>`;
    } else if (job.kind === 'cancel')
      fields = `<label class="full">Participant reason<textarea name="reason" required>${esc(d.reason)}</textarea></label><label>Billing treatment<select name="charge">${option('unconfirmed', 'Choose reviewed treatment', d.charge)}${option('native-policy', 'Native UI — agreed office treatment', d.charge)}${option('with-charge', 'With charge — reviewed reason code', d.charge)}</select></label><label>NDIS reason code (if charged)<select name="code">${option('', 'Office to confirm', d.code)}${['NSDH', 'NSDF', 'NSDT', 'NSDO'].map((x) => option(x, x, d.code)).join('')}</select></label><label>Scope<select name="scope">${option('occurrence', 'This occurrence only', d.scope)}</select></label><label class="checkbox full"><input name="policyReviewed" type="checkbox" required><span>The office reviewed the applicable charge, notice, people and policy. This prototype selects no rate or notice rule automatically.</span></label><p class="form-note full">Whole-shift with-charge MCP affects every participant. Group/locked services require a specific native office/bookkeeper action.</p>`;
    else if (job.kind === 'cover') {
      const b = state.bookings.find((b) => b.id === job.targetId);
      const matches = window.OCD_BOOKING_RULES.candidates(
        state.automation.remote.workers.filter((w) => w.id !== b?.workerId),
        b || {},
        state.participants.find((p) => p.id === b?.participantId),
        state.automation.remote.bookings,
      );
      fields = `<label class="full">Reviewed replacement<select name="workerId" data-native-select>${option('', 'Choose after checking native records', d.workerId || '')}${matches.map(({ worker: w, distanceKm }) => option(w.id, `${w.name} · ${w.role || 'Role not recorded'} · ${distanceKm === null ? 'Distance unavailable' : distanceKm.toFixed(1) + ' km approximate'}`, d.workerId)).join('')}</select></label><p class="form-note full">${matches.length} eligible workers, nearest dispatch area first. Skill, availability and overlap checks apply. Demo distances use dispatch areas, never employee home addresses. Confirm travel time and worker consent.</p>${job.stage === 'assignment' ? '<p class="form-note full">Worker acceptance was received in the simulated native step. Recheck current assignment before telling the participant.</p><label class="full">Participant communication / proposed outcome<textarea name="communication" required placeholder="Record who was contacted and the arrangement agreed."></textarea></label>' : '<label class="checkbox full"><input name="availabilityReviewed" type="checkbox" required><span>Office checked personal availability, leave, qualifications and conflicts. Calendar gaps alone are insufficient.</span></label>'}`;
    } else if (job.kind === 'document')
      fields = `${field('expires', 'Verified expiry date (if applicable)', d.expires, 'date', false)}<label class="checkbox"><input type="checkbox" name="noExpiration" ${d.noExpiration ? 'checked' : ''}><span>Evidence truly never expires; clear the date explicitly.</span></label><label class="full">Evidence / review note<textarea name="note" required>${esc(d.note || '')}</textarea></label><p class="form-note full">Staff-document correction is a native UI step. A blank date alone does not establish never-expires evidence.</p>`;
    else if (job.kind === 'file')
      fields = `<div class="review-box full"><strong>${esc(d.fileName)}</strong><p>${esc(d.person)} · ${esc(d.version)}</p></div><label class="checkbox full"><input type="checkbox" name="fileReviewed" required><span>I checked the correct person, approved version, signature and ShiftCare filing location.</span></label><p class="form-note full">Keep the existing signing provider. Native UI/Inbox Signals handles filing; no file-upload API is assumed.</p>`;
    else if (job.kind === 'area')
      fields = `<label>Reviewed area result<select name="area">${[
        ['review', 'Uncertain / adjacent — office review'],
        ['covered', 'Approved area; capacity still to confirm'],
        ['outside', 'Outside current area; record advice'],
      ]
        .map(([v, l]) => option(v, l, d.area))
        .join(
          '',
        )}</select></label>${field('owner', 'Case owner', d.owner)}${field('nextAction', 'Next action', d.nextAction)}`;
    else if (job.kind === 'profile-update')
      fields = `${field('email', 'Requested email', d.email, 'email')}${field('phone', 'Requested phone', d.phone)}<label class="full">Service preference<textarea name="preference" required>${esc(d.preference)}</textarea></label>`;
    else
      fields = `<p class="form-note full">${job.kind === 'yes' ? 'Record the participant response only. Worker acceptance and the roster remain independent.' : 'Verify the source, route it to the named owner and track the actual native/contact outcome.'}</p>`;
    if (job.kind === 'participant')
      fields += `<label class="checkbox full"><input name="areaReviewed" type="checkbox" required><span>The approved service area and capacity were checked before onboarding. Coverage alone is not availability.</span></label>`;
    if (job.kind === 'new-booking')
      fields = `<p class="form-note full">This creates/confirms one proposed occurrence through the simulated native workflow. A recurring proposal does not confirm other occurrences.</p><label class="checkbox full"><input name="participantAgreed" type="checkbox" required><span>The participant agreed to this occurrence and a signed agreement is on file.</span></label><label class="checkbox full"><input name="workerAccepted" type="checkbox" required><span>The worker accepted this exact occurrence in ShiftCare (demo native evidence).</span></label>`;
    return `<form data-auto-form="approve" data-id="${esc(job.id)}"><div class="form-grid">${fields}</div><div class="spacer"></div>${guard}<p class="field-error" role="alert" hidden></p><div class="form-actions"><button class="btn primary" type="submit">${['yes', 'area'].includes(job.kind) ? 'Record reviewed outcome' : 'Approve next step'}</button></div></form>`;
  }
  function caseDetail(c, job) {
    const a = c.state.automation;
    let actions = '';
    if (job.status === 'needs_review') actions = reviewForm(c, job);
    else if (['approved', 'retry_scheduled'].includes(job.status))
      actions = `<div class="notice">${job.kind === 'cover' && job.stage === 'offer' ? 'Post the sample native offer, then switch to the selected Worker. The booking is not reassigned until acceptance and read-back.' : 'Perform the approved step in the simulated ShiftCare source. The app displays success only after read-back.'}</div><form data-auto-form="native" data-id="${esc(job.id)}"><details class="automation-interruption"><summary>Try an interruption</summary><label>Sample outcome<select name="failure">${[
        ['success', 'Normal native result'],
        ['timeout', 'Lost response after the action'],
        ['network', 'Connection failed before dispatch'],
        ['denied', 'Feature/permission unavailable'],
        ['stale', 'Another person edited the source'],
      ]
        .map(([v, l]) => option(v, l, 'success'))
        .join(
          '',
        )}</select></label></details><p class="field-error" role="alert" hidden></p><div class="form-actions"><button class="btn primary" type="submit">${job.stage === 'offer' ? 'Post native offer (demo)' : 'Perform native step (demo)'}</button></div></form>`;
    else if (['verifying', 'reconciliation_required'].includes(job.status))
      actions = `<div class="notice ${job.status === 'reconciliation_required' ? 'warning' : ''}">${job.status === 'reconciliation_required' ? 'The action may have happened. Keep the request and read the native record before doing anything again. A blind retry is blocked.' : 'The native action returned a result. Compare the approved fields with the current record before updating the app.'}</div><div class="form-actions">${button('verify', job.status === 'reconciliation_required' ? 'Read back & reconcile (demo)' : 'Verify native result (demo)', job.id, true)}</div>`;
    else if (job.stage === 'worker_acceptance')
      actions = `<div class="notice warning">The offer is waiting for ${esc(c.state.workers.find((w) => w.id === job.draft.workerId)?.name)}. This must be accepted in ShiftCare. In this demonstration, switch to that worker and simulate the native response.</div><div class="form-actions"><a class="btn primary" href="#/worker/today">Open Worker workspace</a></div>`;
    else if (job.stage === 'accounting')
      actions = `<div class="notice">Sample ShiftCare ID: <strong>${esc(job.verifiedId)}</strong>. A ShiftCare profile does not prove Xero/payroll onboarding happened.</div><form data-auto-form="accounting" data-id="${esc(job.id)}">${field('reference', 'Separate Xero / payroll reference (demo)', '')}<label>Checked outcome<textarea name="note" required placeholder="Record the native contact/payroll link and reviewer."></textarea></label><label class="checkbox"><input name="checked" type="checkbox" required><span>The separate accounting/payroll onboarding was checked (demo).</span></label><p class="field-error" role="alert" hidden></p><div class="form-actions"><button class="btn primary">Record accounting check &amp; close</button></div></form>`;
    else if (job.status === 'manual_action_required')
      actions = `<div class="notice warning">${esc(job.history.at(-1)?.event || 'Native office action is required.')}</div><form data-auto-form="manual" data-id="${esc(job.id)}">${field('reference', 'Native record / contact reference (demo)', '')}<label>Human resolution and evidence<textarea name="note" required placeholder="Who checked it, what was done, and how the outcome was confirmed?"></textarea></label><label class="checkbox"><input name="checked" type="checkbox" required><span>The actual native/contact outcome was checked in this scenario.</span></label><p class="field-error" role="alert" hidden></p><div class="form-actions">${button('reopen', 'Return for fresh review', job.id)}<button class="btn primary">Record checked human outcome</button></div></form>`;
    else
      actions = `<div class="notice"><strong>${job.stage === 'manual_outcome' ? 'Human resolution recorded' : 'Sample workflow completed'}</strong><p>${esc(job.resolution?.note || job.accounting?.note || job.history.at(-1)?.event)}</p>${job.verifiedId ? `<p>Verified sample record: ${esc(job.verifiedId)}</p>` : ''}</div>`;
    if (job.kind === 'email-review') {
      actions = `<p><strong>Responsible team: ${esc(job.owner)}</strong></p><p>${esc(job.draft.nextAction)}</p>${job.status === 'completed' ? `<div class="notice"><strong>Follow-up completed</strong><p>${esc(job.resolution?.note)}</p></div>` : `<form data-auto-form="manual" data-id="${esc(job.id)}">${field('reference', 'Contact or record reference', '')}<label>Outcome<textarea name="note" rows="3" required placeholder="Record what was checked or communicated."></textarea></label><label class="checkbox"><input name="checked" type="checkbox" required><span>I checked the follow-up outcome.</span></label><p class="field-error" role="alert" hidden></p><div class="form-actions"><button class="btn primary" type="submit">Complete follow-up</button></div></form>`}`;
    }
    const msgs = a.messages.filter((m) => m.jobId === job.id);
    return `<section class="automation-case-view"><header class="automation-case-heading"><div><span class="eyebrow">${esc(job.id)} · ${esc(job.workflow)}</span><h2>${esc(job.title)}</h2></div>${status(job)}<a class="automation-back" href="#/office/automation">← Cases</a></header><div class="automation-case-content"><div class="automation-thread"><section class="automation-evidence"><header class="automation-message-heading"><span class="automation-source-avatar" aria-hidden="true">${esc((job.draft.name || job.draft.firstName || job.owner).slice(0, 1).toUpperCase())}</span><div><h3>Original source</h3><small>${esc(job.source.label || 'Sample source')} · ${esc(job.source.id)}</small></div><time>${dateTime(job.createdAt)}</time></header><p class="automation-source-text">${esc(job.source.body)}</p></section><section class="automation-next"><h3>${job.status === 'completed' ? 'Outcome' : 'Next action'}</h3>${actions}</section>${msgs.length ? `<section class="automation-outbox"><h3>Participant update</h3>${msgs.map((m) => `<article><strong>${esc(m.title)}</strong><p>${esc(m.detail)}</p><span class="status ${m.status === 'failed' ? 'red' : m.status === 'delivered' ? 'dark' : 'amber'}">${esc(m.status)} (demo)</span><small>Recipient: ${esc(m.to)} · attempts ${m.attempts}</small>${m.status !== 'delivered' ? `<div class="button-row">${button('deliver', m.status === 'failed' ? 'Retry delivery (demo)' : 'Deliver update (demo)', m.id)}${button('delivery-fail', 'Simulate delivery failure', m.id)}</div>` : ''}</article>`).join('')}</section>` : ''}<section class="automation-history automation-context-section"><h3>Activity <span>${job.history.length}</span></h3><ol class="timeline">${[
      ...job.history,
    ]
      .reverse()
      .map(
        (h) =>
          `<li><strong>${esc(h.event)}</strong><small>${esc(h.by)} · ${dateTime(h.at)}</small></li>`,
      )
      .join(
        '',
      )}</ol></section></div><aside class="automation-context" aria-label="Case details"><section class="automation-context-section"><h3>Case details</h3><dl class="automation-case-properties"><div><dt>Owner</dt><dd>${esc(job.owner)}</dd></div><div><dt>Task</dt><dd>${esc(job.targetId || job.resolution?.reference || 'Not linked')}</dd></div><div><dt>Stage</dt><dd>${esc({ review: 'Source review', followup: 'Follow-up', manual_outcome: 'Outcome recorded', done: 'Completed', native: 'Native handoff', readback: 'Verification' }[job.stage] || job.stage.replaceAll('_', ' '))}</dd></div></dl></section><section class="automation-context-section"><h3>Proposed data</h3>${
      Object.keys(job.draft).length
        ? `<dl class="automation-data">${Object.entries(job.draft)
            .filter(
              ([k]) =>
                ![
                  'sourceReviewed',
                  'fileReviewed',
                  'policyReviewed',
                  'availabilityReviewed',
                  'areaReviewed',
                  'checked',
                  'partial',
                  'participantAgreed',
                  'workerAccepted',
                  'consent',
                  'period',
                  'issues',
                ].includes(k) &&
                (k !== 'noExpiration' || job.kind === 'document'),
            )
            .map(
              ([key, value]) =>
                `<div><dt>${esc({ dob: 'Date of birth', matchId: 'Existing record', noExpiration: 'Never expires' }[key] || key.replaceAll(/([A-Z])/g, ' $1'))}</dt><dd>${esc(typeof value === 'boolean' ? (value ? 'Yes' : 'No') : typeof value === 'object' ? JSON.stringify(value) : value || '—')}</dd></div>`,
            )
            .join('')}</dl>`
        : '<p class="muted tiny">No proposed field changes.</p>'
    }</section><section class="automation-context-section"><h3>Workflow progress</h3>${steps(job)}</section></aside></div></section>`;
  }
  function finance(c) {
    const a = E.ensure(c.state),
      report = a.lastReport;
    const cases = a.jobs.filter(
      (j) =>
        ['W09', 'W10', 'W11'].includes(j.workflow) &&
        ['finance', 'partial-report'].includes(j.kind),
    );
    return `${header('Bookkeeping review', 'Gather visit exceptions before the existing Tuesday invoice and fortnightly pay checks.')}${boundary()}<div class="invoice-entry-link"><div><strong>Invoices</strong><p>Open invoice drafts, check line items and print a preview.</p></div><a class="btn primary" href="#/office/invoices">Open invoices →</a></div><div class="grid-two"><section class="panel"><h2>Run a review</h2><p class="muted">Use the agreed period and sample native visits. Findings are a checklist; they do not approve billing or calculate payroll.</p><form data-auto-form="report"><div class="form-grid">${field('from', 'Period starts', report?.period.from || '2026-09-28', 'date')}${field('to', 'Period ends (inclusive)', report?.period.to || '2026-10-05', 'date')}<label class="full">Review<select name="type">${option('invoices', 'Tuesday invoice review', report?.type || 'invoices')}${option('payroll', 'Fortnightly payroll review', report?.type)}${option('care', 'Visit / major-note review', report?.type)}</select></label><label class="checkbox full"><input type="checkbox" name="partial"><span>Try missing source pages/notes to show an incomplete report.</span></label></div><p class="field-error" role="alert" hidden></p><div class="form-actions"><button class="btn primary">Prepare exception checklist</button></div></form></section><aside class="panel"><h2>Keep the current financial process</h2><ol class="automation-tour"><li>Workers enter actual time, tasks and goals in ShiftCare.</li><li>OCD brings missing notes, duration and recipient/travel questions together.</li><li>The office checks major/private issues; the bookkeeper verifies financial treatment.</li><li>Approval, the existing Excel/Xero export and pay-run release stay native/manual.</li></ol><p class="muted tiny">No unverified rates, automated claim or duplicate export is created. Worker totals remain provisional.</p></aside></div><div class="spacer"></div>${report ? `<div class="notice ${report.complete ? '' : 'warning'}"><strong>${report.complete ? 'Sample scope read' : 'Incomplete source scope — do not treat this as a clean report'}</strong> ${esc(report.period.from)} to ${esc(report.period.to)} · ${dateTime(report.at)} · ${esc(a.timeZone)} (scenario only)</div>` : ''}<div class="spacer"></div><section class="panel"><div class="section-heading"><div><h2>Exceptions &amp; native handoffs</h2><p>${cases.filter((j) => j.status !== 'completed').length} open checks · rerunning the same scope reuses the existing cases</p></div>${cases.length ? button('export', 'Download review evidence') : ''}</div>${cases.length ? `<div class="table-wrap"><table><thead><tr><th>Visit / workflow</th><th>Finding</th><th>Owner</th><th>State</th><th>Review</th></tr></thead><tbody>${cases.map((j) => `<tr><td><strong>${esc(j.targetId || 'Source scope')}</strong><span class="cell-sub">${esc(j.workflow)}</span></td><td class="automation-finding">${esc(j.source.body)}</td><td>${esc(j.owner)}</td><td>${status(j)}</td><td><a class="btn small" href="#/office/automation/${esc(j.id)}">Open case</a></td></tr>`).join('')}</tbody></table></div>` : `<div class="empty"><strong>Prepare the first checklist</strong>Missing notes, overtime explanations, task/goal evidence, payer and travel checks will appear here.</div>`}</section>`;
  }
  function readiness(c) {
    const demonstrated = {
      W01: 'Owned area review',
      W02: 'Source routing + deduplication',
      W03: 'Mapping → native → read-back → Xero',
      W04: 'Employee mapping + separate payroll',
      W05: 'Returned signature + filing verification',
      W06: 'Native reminder / yes / ambiguous replies',
      W07: 'Reason + scope + billing approval',
      W08: 'Native offer → worker acceptance → verified assignment',
      W09: 'Task/goal and private major-issue checks',
      W10: 'Tuesday exception checklist',
      W11: 'Fortnightly hours/travel checklist',
      W12: 'Explicit never-expires cleanup',
      W13: 'Own delivery history + failure/retry',
      W14: 'Worker consent + stale ETA + own booking map',
    };
    return `<section class="panel"><div class="section-heading"><div><h2>What this prototype demonstrates</h2><p>The fourteen researched workflows are represented below. Human checkpoints deliberately remain visible.</p></div></div><div class="table-wrap"><table><thead><tr><th>Workflow / client pain</th><th>Prototype behaviour</th><th>Native / human checkpoint</th></tr></thead><tbody>${E.catalog.map((w) => `<tr><td><strong>${esc(w.id)} · ${esc(w.title)}</strong><span class="cell-sub">${esc(w.pain)}</span></td><td>${esc(demonstrated[w.id])}</td><td>${esc(w.native)}</td></tr>`).join('')}</tbody></table></div><div class="spacer"></div><div class="grid-two"><div class="review-box"><h3>Before a live pilot</h3><ul><li>Validate OCD's production account, real forms, area, time zone and cancellation/finance rules.</li><li>Confirm native Inbox Signals, referral, portal and matching features.</li><li>Verify REST credentials and each exact operation contract; the live screen is read-only.</li></ul></div><div class="review-box"><h3>Integrations still to build</h3><ul><li>Authorised mailbox/OCR, server job storage, scheduling, reconciliation and real recipient delivery.</li><li>Worker/participant identities and permissions enforced by the server.</li><li>Consented device location and tested background behaviour. Public ShiftCare webhooks are unverified.</li></ul></div></div><p class="muted tiny">Demo cases and the fictional source snapshot persist in this browser. They are not a production job runner or a mirror of the connected live account.</p></section>`;
  }
  function click(c, element) {
    const action = element.dataset.autoAction,
      id = element.dataset.id;
    if (!action) return false;
    try {
      let message = 'Sample workflow updated.';
      if (action === 'tab') {
        ui.tab = id;
        c.go('office/automation');
        return true;
      }
      if (action === 'filter') {
        ui.filter = id;
        ui.page = 1;
        c.go('office/automation');
        return true;
      }
      if (action === 'case-page') {
        ui.page += id === 'next' ? 1 : -1;
        const queue = element.closest('.automation-queue');
        paginate(queue);
        queue.scrollIntoView({ block: 'start' });
        queue.querySelector('#automation-case-search').focus({ preventScroll: true });
        return true;
      }
      if (action === 'ingest' || action === 'samples') return;
      if (action === 'check') E.run(c.state, id);
      if (action === 'verify') E.verify(c.state, id);
      if (action === 'reopen') E.reopen(c.state, id);
      if (action === 'deliver' || action === 'delivery-fail') {
        E.deliver(c.state, id, action === 'delivery-fail');
        message =
          action === 'deliver'
            ? 'Demo update delivered in the participant view. No real message sent.'
            : 'Delivery failed in the scenario. Use agreed fallback contact or retry delivery.';
      }
      if (action === 'export') {
        const evidence = {
          mode: 'fictional',
          report: c.state.automation.lastReport,
          cases: c.state.automation.jobs.filter((j) => ['W09', 'W10', 'W11'].includes(j.workflow)),
        };
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(evidence, null, 2)], {
            type: 'application/json',
          }),
        );
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ocd-demo-bookkeeping-review.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return true;
      }
      c.save();
      c.render();
      c.toast(message);
    } catch (error) {
      c.save();
      c.toast(error.message);
    }
    return true;
  }
  function submit(c, form) {
    if (!form.dataset.autoForm) return false;
    try {
      const values = Object.fromEntries(new FormData(form));
      for (const k of [
        'sourceReviewed',
        'consent',
        'policyReviewed',
        'availabilityReviewed',
        'noExpiration',
        'fileReviewed',
        'checked',
        'partial',
        'participantAgreed',
        'workerAccepted',
        'areaReviewed',
      ])
        if (form.elements[k]) values[k] = form.elements[k].checked === true;
      const kind = form.dataset.autoForm,
        id = form.dataset.id;
      if (kind === 'approve') E.approve(c.state, id, values);
      if (kind === 'native') E.native(c.state, id, values.failure);
      if (kind === 'accounting') E.accounting(c.state, id, values);
      if (kind === 'manual') E.manual(c.state, id, values);
      if (kind === 'report') E.run(c.state, values.type, values);
      c.save();
      c.render();
      c.toast(
        c.state.automation.jobs.find((j) => j.id === id)?.kind === 'email-review'
          ? 'Follow-up outcome saved.'
          : 'Prototype workflow updated. Native outcomes remain separate from proposals.',
      );
    } catch (error) {
      c.save();
      const node = form.querySelector('.field-error');
      if (node) {
        node.hidden = false;
        node.textContent = error.message;
        node.scrollIntoView({ block: 'nearest' });
      } else c.toast(error.message);
    }
    return true;
  }
  document.addEventListener('input', (event) => {
    if (event.target.id !== 'automation-case-search') return;
    ui.query = event.target.value;
    ui.page = 1;
    paginate(event.target.closest('.automation-queue'));
  });
  function paginate(queue) {
    const rows = [...queue.querySelectorAll('.automation-case')];
    const matching = rows.filter((row) => row.dataset.caseSearch.includes(ui.query.toLowerCase()));
    const pages = Math.max(1, Math.ceil(matching.length / pageSize));
    ui.page = Math.max(1, Math.min(ui.page, pages));
    const start = (ui.page - 1) * pageSize;
    const visible = matching.slice(start, start + pageSize);
    rows.forEach((row) => {
      row.hidden = !visible.includes(row);
    });
    queue.querySelector('[data-case-count]').textContent = matching.length;
    queue.querySelector('.automation-no-cases').hidden = matching.length > 0;
    queue.querySelector('[data-page-summary]').textContent =
      `${matching.length ? start + 1 : 0}–${Math.min(start + pageSize, matching.length)} of ${matching.length} cases · Page ${ui.page} of ${pages}`;
    queue.querySelector('[data-auto-action="case-page"][data-id="previous"]').disabled =
      ui.page === 1;
    queue.querySelector('[data-auto-action="case-page"][data-id="next"]').disabled =
      ui.page === pages;
  }
  window.OCD_AUTOMATION = {
    page,
    finance,
    banner,
    click,
    submit,
    profileImage,
  };
})();
