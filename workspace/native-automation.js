/* Shared application workflows. No browser seed data is sent to the server. */
(() => {
  'use strict';
  let host,
    controller,
    status,
    jobs = [],
    selected,
    selectedFiles = [],
    selectedLinks = [],
    page = 1,
    workflow = '',
    createWorkflow = 'W01',
    context;
  const esc = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const labels = {
    queued: 'Queued',
    running: 'Preparing',
    blocked: 'Needs information',
    needs_review: 'Ready for review',
    approved: 'Approved',
    awaiting_native: 'Native step needed',
    executing: 'Executing',
    awaiting_verification: 'Verification needed',
    reconciliation_required: 'Check unknown outcome',
    follow_up: 'Native action verified · follow-through open',
    completed: 'Completed',
    rejected: 'Rejected',
  };
  const inputs = {
    W01: ['postcode', 'capacityConfirmed'],
    W02: ['subject', 'text', 'nextWorkflow'],
    W03: [
      'name',
      'firstName',
      'familyName',
      'email',
      'phone',
      'dob',
      'address',
      'ndisNumber',
      'referenceNumber',
      'nativeId',
      'consent',
      'identityChecked',
      'text',
    ],
    W04: ['name', 'email', 'phone', 'nativeId', 'identityChecked', 'text'],
    W05: [
      'nativeId',
      'documentName',
      'fileId',
      'documentTypeId',
      'returned',
      'signedChecked',
      'filingChecked',
      'staffVisible',
      'expires',
      'noExpiration',
    ],
    W06: ['shiftId', 'response', 'reason'],
    W07: [
      'shiftId',
      'reason',
      'treatment',
      'absentReason',
      'scopeChecked',
      'policyChecked',
      'travelChecked',
      'travelReference',
    ],
    W08: [
      'shiftId',
      'workerId',
      'payGroupId',
      'startAt',
      'endAt',
      'availabilityChecked',
      'qualificationsChecked',
      'workerAccepted',
      'participantAgreed',
    ],
    W09: ['periodFrom', 'periodTo', 'nativeId', 'workerId', 'visits'],
    W10: ['periodFrom', 'periodTo', 'nativeId', 'visits'],
    W11: ['periodFrom', 'periodTo', 'workerId', 'visits'],
    W12: [
      'workerId',
      'documents',
      'documentResource',
      'documentId',
      'nativeId',
      'expires',
      'noExpiration',
      'metadataChecked',
    ],
    W13: ['recipient', 'message', 'channel', 'assigneeId', 'outcomeVerified'],
    W14: ['shiftId', 'workerId', 'consent', 'assignmentChecked', 'updatedAt', 'remainingMinutes'],
  };
  const captions = {
    nativeId: 'ShiftCare person ID',
    shiftId: 'Exact ShiftCare shift ID',
    workerId: 'ShiftCare worker ID',
    dob: 'Verified date of birth',
    identityChecked: 'I checked identity and existing records',
    capacityConfirmed: 'Capacity confirmed with the office',
    consent: 'Consent checked against the source',
    scopeChecked: 'Affected clients and staff checked',
    policyChecked: 'Cancellation policy and charges checked',
    availabilityChecked: 'Actual availability and recurring commitments checked',
    qualificationsChecked: 'Qualifications and eligibility checked',
    workerAccepted: 'Worker acceptance confirmed in ShiftCare',
    participantAgreed: 'Participant agreement confirmed',
    signedChecked: 'Returned signature and version checked',
    outcomeVerified: 'Underlying outcome independently verified',
    assignmentChecked: 'Current assignment and audience permissions checked',
    remainingMinutes: 'Arrival estimate in minutes',
    updatedAt: 'Actual journey update timestamp with time zone',
    visits: 'Visit evidence records (JSON)',
    documents: 'Document evidence records (JSON)',
  };
  Object.assign(captions, {
    periodFrom: 'Review period starts',
    periodTo: 'Review period ends',
    fileId: 'Original file ID from this case',
    documentTypeId: 'ShiftCare document type ID',
    filingChecked: 'Document type, participant and visibility checked',
    staffVisible: 'Allow assigned staff to see this document',
    expires: 'Verified expiry date',
    noExpiration: 'Original evidence confirms this document never expires',
    metadataChecked: 'Original evidence and corrected metadata checked',
    documentResource: 'Native document resource',
    documentId: 'Native document or qualification ID',
    assigneeId: 'ShiftCare staff ID for the communication follow-up',
  });
  Object.assign(captions, {
    travelChecked:
      'Actual travel checked and required native mileage cleanup completed before cancellation',
    travelReference: 'Checked travel/cleanup reference or source-backed not-required explanation',
  });
  const checks = new Set([
    'travelChecked',
    'identityChecked',
    'capacityConfirmed',
    'consent',
    'scopeChecked',
    'policyChecked',
    'availabilityChecked',
    'qualificationsChecked',
    'workerAccepted',
    'participantAgreed',
    'returned',
    'signedChecked',
    'outcomeVerified',
    'assignmentChecked',
    'filingChecked',
    'staffVisible',
    'noExpiration',
    'metadataChecked',
  ]);
  const admin = () => status?.role === 'admin';
  const writable = () => ['admin', 'coordinator'].includes(status?.role);
  const ownerField = (value) =>
    `<label>Responsible staff<select name="owner">${status.owners.map((o) => `<option value="${esc(o.email)}" ${o.email === value ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}</select></label>`;
  async function api(action, data, extra = '') {
    const response = await fetch(`/api/automation?action=${action}${extra}`, {
      signal: controller?.signal,
      headers: data ? { 'Content-Type': 'application/json' } : {},
      ...(data ? { method: 'POST', body: JSON.stringify(data) } : {}),
    });
    const result = await response.json();
    if (!response.ok)
      throw Object.assign(new Error(result.error || 'The workflow request failed.'), {
        status: response.status,
      });
    return result;
  }
  function fields(id, payload = {}) {
    return (inputs[id] || [])
      .map((key) => {
        const value = payload[key] ?? payload.fields?.[key] ?? '';
        const caption =
          captions[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
        if (checks.has(key))
          return `<label class="checkbox"><input type="checkbox" name="${key}" ${value === true ? 'checked' : ''}><span>${esc(caption)}</span></label>`;
        if (key === 'fileId' && selectedFiles.length)
          return `<label>${esc(caption)}<select name="fileId"><option value="">Select original file…</option>${selectedFiles.map((f) => `<option value="${f.id}" ${f.id === value ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</select></label>`;
        if (['text', 'reason', 'message', 'visits', 'documents'].includes(key))
          return `<label class="full">${esc(caption)}<textarea name="${key}" rows="4" maxlength="40000">${esc(Array.isArray(value) ? JSON.stringify(value, null, 2) : value)}</textarea></label>`;
        if (key === 'nextWorkflow')
          return `<label>Confirmed follow-up workflow<select name="nextWorkflow"><option value="">Use the reviewed classification suggestion</option>${status.catalog
            .filter((w) => !['W02', 'W14'].includes(w.id))
            .map(
              (w) =>
                `<option value="${w.id}" ${w.id === value ? 'selected' : ''}>${w.id} · ${esc(w.title)}</option>`,
            )
            .join('')}</select></label>`;
        if (['response', 'treatment', 'channel', 'absentReason'].includes(key)) {
          const values = {
            response: ['yes', 'no', 'cancel', 'change'],
            treatment: ['with_charge', 'without_charge'],
            channel: ['native'],
            absentReason: ['NSDH', 'NSDF', 'NSDT', 'NSDO'],
          }[key];
          return `<label>${esc(caption)}<select name="${key}"><option value="">Select…</option>${values.map((v) => `<option value="${v}" ${v === value ? 'selected' : ''}>${esc(v.replaceAll('_', ' '))}</option>`).join('')}</select></label>`;
        }
        if (key === 'documentResource')
          return `<label>${esc(caption)}<select name="${key}"><option value="">Review only</option><option value="client-document" ${value === 'client-document' ? 'selected' : ''}>Client document</option><option value="staff-qualification" ${value === 'staff-qualification' ? 'selected' : ''}>Staff qualification</option></select></label>`;
        return `<label>${esc(caption)}<input name="${key}" type="${['dob', 'periodFrom', 'periodTo', 'expires'].includes(key) ? 'date' : key === 'remainingMinutes' ? 'number' : 'text'}" value="${esc(value)}" ${key === 'remainingMinutes' ? 'min="0" step="1"' : ''}></label>`;
      })
      .join('');
  }
  function values(form, id) {
    const result = {},
      person = {};
    for (const key of inputs[id] || []) {
      const control = form.elements[key];
      if (!control) continue;
      let value = checks.has(key) ? control.checked : control.value.trim();
      if (['visits', 'documents'].includes(key)) {
        value = value ? JSON.parse(value) : [];
        if (!Array.isArray(value)) throw new Error('Supply an array of evidence records.');
      }
      if (key === 'remainingMinutes') value = value === '' ? null : Number(value);
      if (
        [
          'name',
          'firstName',
          'familyName',
          'email',
          'phone',
          'dob',
          'address',
          'ndisNumber',
          'referenceNumber',
        ].includes(key)
      )
        person[key] = value;
      else result[key] = value;
    }
    if (Object.keys(person).length)
      result.fields = { ...(selected?.payload.fields || {}), ...person };
    if (
      ['W09', 'W10', 'W11'].includes(id) &&
      result.periodFrom &&
      result.periodTo &&
      !result.visits?.length
    )
      result.collectionRequired = true;
    if (id === 'W12' && result.workerId && !result.documents?.length)
      result.collectionRequired = true;
    if (result.visits?.length || result.documents?.length) {
      result.collectionRequired = false;
      result.collectionError = '';
    }
    return result;
  }
  function evidenceSummary(job) {
    const p = job.proposal?.fields || {};
    const table = (headers, rows) =>
      `<div class="native-table-wrap"><table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    let content = '';
    if (Array.isArray(p.exceptions))
      content += `<h3>Visit exceptions</h3>${table(
        ['Shift', 'Worker', 'Review'],
        p.exceptions.map((e) => [
          e.shiftId,
          e.workerId || 'Unspecified',
          e.findings.join(' ') || 'No listed exceptions',
        ]),
      )}`;
    if (Array.isArray(p.documents))
      content += `<h3>Document review</h3>${table(
        ['Person', 'Document', 'Expiry', 'Outcome'],
        p.documents.map((d) => [
          d.personId,
          d.category,
          d.expiry || 'Needs evidence',
          String(d.status).replaceAll('_', ' '),
        ]),
      )}`;
    if (Array.isArray(job.payload.matchCandidates) && job.payload.matchCandidates.length)
      content += `<h3>Possible existing records</h3>${table(
        ['ShiftCare ID', 'Name', 'Email'],
        job.payload.matchCandidates.map((person) => [person.id, person.name, person.email]),
      )}<p>Check the original and select the actual person in the evidence form.</p>`;
    if (job.payload.nativeEvidence)
      content += `<p>Native evidence collected ${esc(job.payload.nativeEvidence.collectedAt)} · ${job.payload.nativeEvidence.complete ? 'Complete bounded read' : 'Incomplete'}</p>`;
    if (selectedFiles.length)
      content += `<h3>Original files</h3>${selectedFiles.map((file) => `<p><a href="/api/automation?action=file&id=${file.id}" target="_blank" rel="noopener">${esc(file.name)}</a> · ${Math.ceil(file.size / 1024)} KB<br><small>${esc(file.extraction || 'Awaiting extraction')}</small></p>`).join('')}`;
    if (Array.isArray(job.payload.attachmentWarnings))
      content += job.payload.attachmentWarnings.map((w) => `<p>${esc(w)}</p>`).join('');
    return content;
  }
  function render() {
    if (!host?.isConnected) return;
    const current = selected;
    const title = (id) => status.catalog.find((w) => w.id === id)?.title || id;
    host.innerHTML = `<header class="page-header"><div><span class="eyebrow">Office / Automation</span><h1>Shared workflows</h1><p>Owned cases, source review and checked outcomes saved by the application.</p><p>Office session: ${esc(status.owners.find((o) => o.email === status.owner)?.name || status.owner)} · ${esc(status.role)}</p></div><div class="button-row"><a class="btn" href="#/office/automation">Demo cases</a><button class="btn" data-action="sign-out" type="button">Sign out of office</button></div></header>
      <div class="automation-boundary"><span class="status blue">Shared queue</span><p>ShiftCare remains the native record. ${status.connectors.microsoft365.configured ? 'Microsoft 365 reader configured.' : 'Microsoft 365 connection awaiting setup.'} ${status.connectors.shiftcare.configured ? (status.connectors.shiftcare.readOnly ? 'ShiftCare reads configured; native writes await setup.' : 'Approved ShiftCare API operations enabled.') : 'ShiftCare API connection awaiting setup.'}</p><a href="#/office/shiftcare">Connections</a></div>
      <div class="automation-checks"><button class="btn" data-native-action="refresh">Refresh</button>${writable() ? '<button class="btn primary" data-native-action="process">Import requests and run checks</button>' : ''}${writable() && status.connectors.microsoft365.configured ? '<button class="btn" data-native-action="mail">Import Microsoft 365 mail</button>' : ''}<span>${esc(status.timeZone)} · ${status.overdue || 0} overdue follow-ups</span><a href="#/live/services" class="btn">Verified service access</a></div>
      <p id="native-message" role="status" aria-live="polite"></p>
      <div class="native-workflow-layout"><section class="panel"><header class="panel-header"><h2>Shared review queue</h2><label><span class="sr-only">Filter workflow</span><select id="native-filter"><option value="">All workflows</option>${status.catalog.map((w) => `<option value="${w.id}" ${workflow === w.id ? 'selected' : ''}>${w.id} · ${esc(w.title)}</option>`).join('')}</select></label></header>
      ${jobs.length ? jobs.map((j) => `<article class="native-case"><h3><button class="btn" data-native-action="select" data-id="${j.id}">${j.workflow} · ${esc(title(j.workflow))}</button></h3><p><span class="status ${j.status === 'completed' ? 'dark' : 'amber'}">${esc(labels[j.status])}</span> · ${esc(j.owner)}</p><p>${esc(j.proposal?.summary || 'Waiting for preparation')}</p><small>${esc(j.sourceKind)} · ${esc(j.createdAt)}</small></article>`).join('') : '<p>No cases on this page. Import the shared requests or log an office case.</p>'}
      <div class="button-row"><button class="btn" data-native-action="previous" ${page <= 1 ? 'disabled' : ''}>Previous</button><span>Page ${page}</span><button class="btn" data-native-action="next" ${status.hasNext ? '' : 'disabled'}>Next</button></div></section>
      <section class="panel">${current ? detail(current) : '<h2>Review a case</h2><p>Select a case to see the original source, proposed effect, missing information and audit history.</p>'}</section></div>
      <details class="panel"><summary>All 14 workflow areas</summary><div class="native-catalog">${status.catalog.map((w) => `<article><h3>${w.id} · ${esc(w.title)}</h3><p>${esc(w.trigger)}</p><p>${esc(w.nativeStep)}</p></article>`).join('')}</div></details>
      ${writable() ? `<details class="panel"><summary>Log an office case</summary><form data-native-form="enqueue"><label>Workflow<select name="workflow" id="native-create-workflow">${status.catalog.map((w) => `<option value="${w.id}" ${createWorkflow === w.id ? 'selected' : ''}>${w.id} · ${esc(w.title)}</option>`).join('')}</select></label>${ownerField(status.owner)}<label>Original evidence reference<input name="evidenceReference" required maxlength="1000" placeholder="Form, native record, office call or document reference"></label><label>Follow-up deadline<input name="dueAt" placeholder="2026-10-20T09:00:00+08:00"></label><div class="form-grid">${fields(createWorkflow)}</div><button class="btn primary">Save case</button></form></details>` : ''}
      ${
        admin()
          ? `<details class="panel"><summary>Configure a review schedule</summary><p>Schedules create owned review cases. Current evidence must be supplied before approval.</p><form data-native-form="schedule" class="form-grid"><label>Review<select name="workflow">${status.catalog
              .filter((w) => ['W09', 'W10', 'W11', 'W12'].includes(w.id))
              .map((w) => `<option value="${w.id}">${esc(w.title)}</option>`)
              .join(
                '',
              )}</select></label><label>Frequency<select name="cadence"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="fortnightly">Fortnightly</option></select></label><label>Local time<input name="localTime" type="time" value="09:00" required></label><label>Weekday<select name="weekday">${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d, i) => `<option value="${i}">${d}</option>`).join('')}</select></label><label>Fortnight anchor date<input name="anchorDate" type="date"></label><label>Days in the agreed review period<input name="periodDays" type="number" min="1" max="31" value="7" required></label><label class="checkbox"><input name="includeCutoff" type="checkbox"><span>Include the cut-off day in the review</span></label><label class="checkbox"><input type="checkbox" name="enabled"><span>Enable this agreed schedule</span></label><button class="btn primary">Save schedule</button></form><ul>${status.schedules.map((s) => `<li>${s.workflow} · ${esc(s.cadence)} at ${esc(s.localTime)} · ${s.enabled ? 'Enabled' : 'Disabled'}</li>`).join('')}</ul></details>`
          : ''
      }`;
    host
      .querySelectorAll('select')
      .forEach((select) => select.setAttribute('data-native-select', ''));
  }
  function detail(job) {
    const p = job.proposal;
    const editable =
      writable() && ['blocked', 'needs_review', 'approved', 'awaiting_native'].includes(job.status);
    return `<h2>${esc(status.catalog.find((w) => w.id === job.workflow)?.title)}</h2><p><span class="status">${esc(labels[job.status])}</span> · ${esc(job.owner)}</p>${job.dueAt ? `<p>Follow-up due ${esc(job.dueAt)} ${job.escalatedAt ? '· Deadline passed: office follow-up required' : ''}</p>` : ''}
      ${job.payload.outcomeJobId ? `<p>Required follow-through for <button class="btn" data-native-action="select" data-id="${esc(job.payload.outcomeJobId)}">Open parent case</button></p>` : ''}
      ${job.status === 'follow_up' && !job.followUpReviewRequired ? `<section class="panel"><h3>Required business outcomes</h3><p>The native action is checked. This case remains open until its separate communications and financial outcome are verified.</p><ul>${(job.requiredChildren || []).map((link) => `<li><button class="btn" data-native-action="select" data-id="${link.id}">${esc(link.label)}</button> · ${esc(labels[selectedLinks.find((child) => child.id === link.id)?.status] || 'Open to check')}</li>`).join('')}</ul>${admin() ? `<form data-native-form="close">${job.workflow === 'W07' && (job.payload.travelChecked !== true || !job.payload.travelReference) ? '<label>Retrospective native travel/cleanup reference<input name="travelReference" required maxlength="1000"></label><label class="checkbox"><input name="travelChecked" type="checkbox" required><span>I checked actual travel and corrected any remaining untravelled mileage in ShiftCare.</span></label>' : ''}${job.workflow === 'W07' ? '<label>Final native charge/pay reference or not-required explanation<input name="financialReference" required maxlength="1000"></label><label class="checkbox"><input name="financialChecked" type="checkbox" required><span>I checked the final cancellation charges and pay treatment.</span></label>' : ''}<button class="btn primary" ${(job.requiredChildren || []).some((link) => selectedLinks.find((child) => child.id === link.id)?.status !== 'completed') ? 'disabled' : ''}>Close checked business case</button></form>` : ''}</section>` : ''}
      ${writable() && !job.followUpReviewRequired && !['completed', 'rejected'].includes(job.status) ? `<details><summary>Follow-up owner and deadline</summary><form data-native-form="assign">${ownerField(job.owner)}<label>Next deadline<input name="dueAt" value="${esc(job.dueAt || '')}" placeholder="Date and time with time zone"></label><button class="btn">Save follow-up assignment</button></form></details>` : ''}
      ${job.followUpReviewRequired ? `<section class="panel"><h3>Native action verified; follow-through needs review</h3><p>This older record confirms the action only. Review its required outcomes before treating the business case as complete.</p>${admin() ? '<button class="btn" data-native-action="restore-follow-ups">Review required follow-through</button>' : ''}</section>` : ''}
      <h3>Original source</h3><p class="native-source">${esc(job.payload.text || job.payload.evidenceReference || job.sourceId)}</p>${job.payload.intakeId ? `<a class="btn" href="#/office/intake/${encodeURIComponent(job.payload.intakeId)}">Open reviewed intake</a>` : ''}${job.sourceKind === 'microsoft365' ? `<button class="btn" data-native-action="attachments" data-id="${job.id}">List source attachments</button><div id="native-attachments"></div>` : ''}
      ${job.sourceKind === 'microsoft365' && /^https:\/\/(outlook\.office\.com|outlook\.office365\.com|outlook\.live\.com)\//.test(job.payload.webLink || '') ? `<a class="btn" href="${esc(job.payload.webLink)}" target="_blank" rel="noopener noreferrer">Open original in Outlook</a>` : ''}
      ${editable && status.connectors.shiftcare.configured && ['W03', 'W04', 'W07', 'W08', 'W12'].includes(job.workflow) && (job.payload.nativeId || job.payload.shiftId || job.payload.documentId) ? '<button class="btn" data-native-action="capture-native">Read current ShiftCare record</button>' : ''}
      ${editable && status.connectors.shiftcare.configured && ['W02', 'W03', 'W04', 'W06', 'W09', 'W10', 'W11', 'W12'].includes(job.workflow) ? '<button class="btn" data-native-action="collect">Collect matching ShiftCare evidence</button>' : ''}
      ${editable && job.sourceKind === 'microsoft365' ? '<button class="btn" data-native-action="import-attachments">Import original attachments</button>' : ''}
      ${evidenceSummary(job)}
      ${editable ? '<details><summary>Add original paperwork</summary><form data-native-form="upload"><label>PDF, image or text file (up to 5 MB)<input name="originalFile" type="file" accept="application/pdf,image/png,image/jpeg,text/plain" required></label><button class="btn">Import and read original</button></form></details>' : ''}
      ${p ? `<h3>Proposed outcome</h3><p>${esc(p.summary)}</p><ul>${[...p.missing, ...p.findings].map((f) => `<li>${esc(f)}</li>`).join('')}</ul><p><strong>Next action:</strong> ${esc(p.nextAction)}</p><details><summary>Exact proposed fields</summary><pre class="native-json">${esc(JSON.stringify(p.fields, null, 2))}</pre></details>` : ''}
      ${editable ? `<details><summary>Update reviewed evidence</summary><form data-native-form="revise">${ownerField(job.owner)}<label>Follow-up deadline<input name="dueAt" value="${esc(job.dueAt || '')}" placeholder="Date and time with time zone"></label><div class="form-grid">${fields(job.workflow, job.payload)}</div><button class="btn">Recheck revised evidence</button></form></details>` : ''}
      ${admin() && job.status === 'needs_review' ? '<form data-native-form="approve"><label class="checkbox"><input name="sourceReviewed" type="checkbox" required><span>I reviewed the original source, identity, proposed fields and consequences.</span></label><button class="btn primary">Approve this proposal</button></form>' : ''}
      ${admin() && job.status === 'approved' ? `<button class="btn primary" data-native-action="execute" data-id="${job.id}">${p.effect === 'internal' ? 'Record reviewed outcome' : status.connectors.shiftcare.registeredWriteOperations.includes(p.operation) ? 'Apply approved changes to ShiftCare' : 'Continue approved native handoff'}</button>` : ''}
      ${admin() && ['awaiting_native', 'awaiting_verification', 'reconciliation_required'].includes(job.status) ? `<form data-native-form="verify"><p>Perform and check the native step before recording its result. A staff check is retained as a staff check.</p><label>Native record or delivery reference<input name="reference" required maxlength="1000"></label><label class="checkbox"><input name="nativeChecked" type="checkbox" required><span>I checked the actual native outcome against the approved proposal.</span></label>${['W03', 'W04'].includes(job.workflow) ? '<label>Separate accounting/payroll reference or not-required explanation<input name="accountingReference" required maxlength="1000"></label><label class="checkbox"><input name="accountingChecked" type="checkbox" required><span>I checked the separate accounting/payroll handoff.</span></label>' : ''}${job.workflow === 'W13' ? '<label>ShiftCare communication history reference<input name="communicationReference" required maxlength="1000"></label><label class="checkbox"><input name="communicationChecked" type="checkbox" required><span>I completed and checked the actual communication in ShiftCare.</span></label>' : ''}${job.workflow === 'W08' && job.payload.payGroupId ? '<label class="checkbox"><input name="payGroupChecked" type="checkbox" required><span>I checked the native pay group separately from the assignment read-back.</span></label>' : ''}<label>Review note<textarea name="note" maxlength="2000"></textarea></label><button class="btn primary">Record checked outcome</button></form>` : ''}
      ${job.receipt ? `<p><strong>Outcome evidence:</strong> ${esc(job.receipt.method)} · ${esc(job.receipt.reference)}</p>${job.receipt.details?.originalIntakeLink === 'office_review_required' ? '<p role="status">The checked native outcome is saved. Review the original intake to finish linking its native record.</p>' : ''}` : ''}<details><summary>Case history</summary><ol>${job.history.map((h) => `<li>${esc(h.at)} · ${esc(h.by)}<br>${esc(h.event)}</li>`).join('')}</ol></details>`;
  }
  async function load() {
    status = await api('status');
    const result = await api(
      'jobs',
      null,
      `&page=${page}&workflow=${encodeURIComponent(workflow)}`,
    );
    jobs = result.jobs;
    status.hasNext = result.hasNext;
    if (selected) {
      const result = await api('job', null, `&id=${selected.id}`);
      selected = result.job;
      selectedFiles = result.files || [];
      selectedLinks = result.followUps || [];
    }
    render();
  }
  const message = (text) => {
    const node = host?.querySelector('#native-message');
    if (node) node.textContent = text;
  };
  async function click(event) {
    const button = event.target.closest('[data-native-action]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    button.disabled = true;
    try {
      const action = button.dataset.nativeAction;
      if (action === 'select') selected = (await api('job', null, `&id=${button.dataset.id}`)).job;
      else if (action === 'previous' || action === 'next') page += action === 'next' ? 1 : -1;
      else if (action === 'process' || action === 'mail') {
        const result = await api('process', { pollMail: action === 'mail' });
        await load();
        message(
          `Prepared ${result.processed} cases; imported ${result.intakes} requests and ${result.mail.imported} messages. ${result.mail.error || ''}`,
        );
        return;
      } else if (action === 'restore-follow-ups')
        selected = (await api(action, { id: selected.id, revision: selected.revision })).job;
      else if (action === 'execute')
        selected = (await api('execute', { id: selected.id, revision: selected.revision })).job;
      else if (action === 'capture-native') {
        selected = (await api('capture-native', { id: selected.id, revision: selected.revision }))
          .job;
        await api('process', {});
      } else if (['collect', 'import-attachments'].includes(action))
        selected = (await api(action, { id: selected.id, revision: selected.revision })).job;
      else if (action === 'attachments') {
        const result = await api('attachments', null, `&id=${button.dataset.id}`);
        host.querySelector('#native-attachments').innerHTML =
          result.attachments
            .map((a) => `<p>${esc(a.name)} · ${esc(a.type)} · ${esc(a.size)} bytes</p>`)
            .join('') || '<p>No source attachments found.</p>';
        return;
      }
      await load();
    } catch (error) {
      if (error.name !== 'AbortError') message(error.message);
    } finally {
      button.disabled = false;
    }
  }
  async function submit(event) {
    const form = event.target.closest('[data-native-form]');
    if (!form) return;
    event.preventDefault();
    event.stopPropagation();
    const button = form.querySelector('button');
    button.disabled = true;
    try {
      const action = form.dataset.nativeForm;
      if (action === 'enqueue') {
        const payload = values(form, createWorkflow);
        if (payload.fields)
          payload.fields = Object.fromEntries(
            Object.entries(payload.fields).filter(([, value]) => value !== ''),
          );
        selected = (
          await api('enqueue', {
            workflow: createWorkflow,
            owner: form.elements.owner.value,
            sourceId: `office:${crypto.randomUUID()}`,
            ...(form.elements.dueAt.value ? { dueAt: form.elements.dueAt.value.trim() } : {}),
            payload: {
              ...payload,
              evidenceReference: form.elements.evidenceReference.value.trim(),
            },
          })
        ).job;
        await api('process', {});
      } else if (action === 'schedule') {
        await api('schedule', {
          ...Object.fromEntries(new FormData(form)),
          weekday: Number(form.elements.weekday.value),
          periodDays: Number(form.elements.periodDays.value),
          includeCutoff: form.elements.includeCutoff.checked,
          enabled: form.elements.enabled.checked,
        });
      } else if (action === 'upload') {
        const file = form.elements.originalFile.files[0];
        if (!file || file.size > 5 * 1024 * 1024)
          throw new Error('Choose an original file up to 5 MB.');
        const content = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        selected = (
          await api('upload', {
            id: selected.id,
            revision: selected.revision,
            name: file.name,
            type: file.type,
            content,
          })
        ).job;
      } else {
        const data = { id: selected.id, revision: selected.revision };
        if (action === 'assign') {
          data.owner = form.elements.owner.value;
          data.dueAt = form.elements.dueAt.value.trim();
        }
        if (action === 'close') {
          data.travelChecked = form.elements.travelChecked?.checked || false;
          data.travelReference = form.elements.travelReference?.value.trim() || '';
          data.financialChecked = form.elements.financialChecked?.checked || false;
          data.financialReference = form.elements.financialReference?.value.trim() || '';
        }
        if (action === 'revise') {
          data.payload = values(form, selected.workflow);
          data.owner = form.elements.owner.value;
          data.dueAt = form.elements.dueAt.value.trim();
        }
        if (action === 'approve') {
          data.sourceReviewed = form.elements.sourceReviewed.checked;
          data.proposalHash = selected.proposalHash;
        }
        if (action === 'verify') {
          Object.assign(data, Object.fromEntries(new FormData(form)));
          data.nativeChecked = form.elements.nativeChecked.checked;
          data.accountingChecked = form.elements.accountingChecked?.checked || false;
          data.payGroupChecked = form.elements.payGroupChecked?.checked || false;
          data.communicationChecked = form.elements.communicationChecked?.checked || false;
        }
        selected = (await api(action, data)).job;
        if (action === 'revise') await api('process', {});
      }
      await load();
      message('Workflow case saved.');
    } catch (error) {
      if (error.name !== 'AbortError') message(error.message);
    } finally {
      button.disabled = false;
    }
  }
  function unmount() {
    controller?.abort();
    host?.removeEventListener('click', click);
    host?.removeEventListener('submit', submit);
    host = null;
  }
  async function mount(element, c) {
    unmount();
    host = element;
    context = c;
    controller = new AbortController();
    if (!host) return;
    host.innerHTML = '<p role="status">Loading shared workflows…</p>';
    host.addEventListener('click', click);
    host.addEventListener('submit', submit);
    host.addEventListener(
      'change',
      (event) => {
        if (event.target.id === 'native-filter') {
          workflow = event.target.value;
          page = 1;
          selected = null;
          load().catch((error) => message(error.message));
        }
        if (event.target.id === 'native-create-workflow') {
          createWorkflow = event.target.value;
          render();
          host.querySelector('[data-native-form="enqueue"]').closest('details').open = true;
        }
      },
      { signal: controller.signal },
    );
    try {
      await load();
    } catch (error) {
      if (error.name === 'AbortError' || !host) return;
      host.innerHTML = `<section class="panel"><h1>Shared workflows</h1><p>${esc(error.message)}</p><button class="btn primary" data-action="office-sign-in" type="button">Office sign-in</button><a class="btn" href="#/office/automation">Demo cases</a></section>`;
    }
  }
  window.OCD_NATIVE_AUTOMATION = { mount, unmount };
})();
