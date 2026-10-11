/* Fictional workflow adapter. No network calls or real ShiftCare writes. */
(function (root, factory) {
  const api = factory(
    typeof module === 'object' && module.exports
      ? require('./booking-rules.js')
      : root.OCD_BOOKING_RULES,
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OCD_AUTOMATION_ENGINE = api;
})(typeof window === 'undefined' ? globalThis : window, function (bookingRules) {
  'use strict';
  const clone = (value) => structuredClone(value);
  const now = () => new Date().toISOString();
  const catalog = [
    [
      'W01',
      'Area & enquiry ownership',
      'Enquiry received',
      'Area/capacity review',
      'Missed replies and unclear ownership',
    ],
    [
      'W02',
      'Email triage',
      'Authorised message received',
      'Original-message review',
      'Repeated sorting and urgent invoice queries',
    ],
    [
      'W03',
      'Participant onboarding',
      'Accepted intake or scan',
      'ShiftCare profile / Xero check',
      'Re-keying forms and finding the right record',
    ],
    [
      'W04',
      'Employee onboarding',
      'Employee form received',
      'Native staff / payroll setup',
      'Duplicate entry into ShiftCare and payroll',
    ],
    [
      'W05',
      'Agreements & returned files',
      'Signed copy received',
      'Native reviewed filing',
      'Following up and filing the right version',
    ],
    [
      'W06',
      'Service confirmation replies',
      'Native reminder / participant reply',
      'Native reminders remain',
      'Daily yes/no checks',
    ],
    [
      'W07',
      'Cancellation',
      'Matched cancellation request',
      'Reason, charge and scope approval',
      'Manual cancellation entry and billing risk',
    ],
    [
      'W08',
      'Change & replacement cover',
      'Sickness, decline or change',
      'Native offer and worker acceptance',
      'Short-notice cover and unreliable calendar gaps',
    ],
    [
      'W09',
      'Care exceptions',
      'Native visit records updated',
      'Worker care entry / office risk review',
      'Major notes and extra-time explanations',
    ],
    [
      'W10',
      'Tuesday invoice review',
      'Agreed Tuesday cut-off',
      'Bookkeeper / existing export',
      'Checking each shift, recipient and funding',
    ],
    [
      'W11',
      'Fortnightly payroll review',
      'Agreed pay-period cut-off',
      'Bookkeeper / payroll release',
      'Hours, travel and kilometre enquiries',
    ],
    [
      'W12',
      'Document cleanup',
      'Expiry check or new evidence',
      'Evidence / native metadata review',
      'False expiry flags and missing documents',
    ],
    [
      'W13',
      'Communication & delivery',
      'Verified outcome or feedback',
      'Native chat / agreed contact channel',
      'Fragmented messages and unconfirmed delivery',
    ],
    [
      'W14',
      'Bookings & arrival',
      'Worker starts a consented trip',
      'Device consent / identity / routing',
      'Arrival calls, lateness and location privacy',
    ],
  ].map(([id, title, trigger, native, pain]) => ({
    id,
    title,
    trigger,
    native,
    pain,
  }));
  const terminal = (job) => ['completed', 'rejected'].includes(job.status);
  function log(job, event, by = 'Demo automation') {
    job.history.push({ at: now(), by, event });
    job.updatedAt = now();
  }
  function set(job, status, stage, event, by) {
    job.status = status;
    job.stage = stage;
    log(job, event, by);
  }
  function record(state, kind, id) {
    return state.automation.remote[kind]?.find((row) => row.id === id);
  }
  function nextId(prefix, rows) {
    return `${prefix}-${Math.max(0, ...rows.map((r) => Number(r.id.split('-').pop()) || 0)) + 1}`;
  }
  function fingerprint(row) {
    return JSON.stringify(row || null);
  }
  function validDate(value) {
    return (
      /^\d{4}-\d{2}-\d{2}$/.test(value || '') &&
      Number.isFinite(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value
    );
  }
  function ensure(state) {
    state.coverOffers ||= [];
    if (state.automation?.version === 1) return state.automation;
    state.automation = {
      version: 1,
      mode: 'fictional',
      date: '2026-10-05',
      timeZone: 'Australia/Perth',
      jobs: [],
      inbox: [],
      messages: [],
      runs: [],
      remote: {
        participants: clone(state.participants),
        workers: clone(state.workers),
        bookings: clone(state.bookings),
        visits: clone(state.visits),
        documents: clone(state.workerDocs),
        agreements: clone(state.agreements),
        offers: clone(state.coverOffers || []),
      },
    };
    receiveSamples(state);
    return state.automation;
  }
  function receiveSamples(state) {
    const a = state.automation;
    const samples = [
      {
        id: 'DEMO-MAIL-INTAKE',
        kind: 'participant',
        workflow: 'W03',
        title: "Ava's scanned participant intake",
        owner: 'Intake team',
        targetId: 'ENQ-1042',
        body: 'Fictional scan: Ava Bennett; DOB 14 March 1981; ava.bennett@example.com; Joondalup; domestic assistance; consent signed. Review each field against this source.',
        fields: {
          firstName: 'Ava',
          lastName: 'Bennett',
          dob: '1981-03-14',
          email: 'ava.bennett@example.com',
          suburb: 'Joondalup',
          service: 'Domestic assistance',
          consent: true,
        },
      },
      {
        id: 'DEMO-MAIL-EMPLOYEE',
        kind: 'employee',
        workflow: 'W04',
        title: "Noah's employee onboarding",
        owner: 'HR / admin',
        body: 'Fictional employee form: Noah Reed; noah.reed@example.com; domestic assistance; worker role. Screening and payroll details still need checking.',
        fields: {
          firstName: 'Noah',
          lastName: 'Reed',
          email: 'noah.reed@example.com',
          service: 'Domestic assistance',
          consent: true,
        },
      },
      {
        id: 'DEMO-MAIL-AGREEMENT',
        kind: 'file',
        workflow: 'W05',
        title: "Farah's returned agreement",
        owner: 'Intake team',
        targetId: 'AGR-303',
        body: 'Fictional attachment: AGR-303, Farah Ali, signed-copy-v1.pdf. Confirm the person, approved version, signature and native filing location.',
        fields: {
          fileName: 'signed-copy-v1.pdf',
          person: 'Farah Ali',
          version: 'Demo template v1',
        },
      },
      {
        id: 'DEMO-SMS-YES',
        kind: 'yes',
        workflow: 'W06',
        title: 'Olivia confirmed her Tuesday visit',
        owner: 'Office',
        targetId: 'BKG-503',
        body: 'Native reminder reply example: Yes, I can attend BKG-503 on Tuesday. This participant response does not confirm the worker.',
      },
      {
        id: 'DEMO-SMS-CANCEL',
        kind: 'cancel',
        workflow: 'W07',
        title: 'Olivia cancelled one Thursday occurrence',
        owner: 'Office',
        targetId: 'BKG-505',
        body: 'Native reminder reply example: Please cancel my Thursday visit; I have a medical appointment.',
        fields: {
          reason: 'Medical appointment',
          charge: 'unconfirmed',
          code: '',
          scope: 'occurrence',
        },
      },
      {
        id: 'DEMO-SMS-UNCLEAR',
        kind: 'ambiguous',
        workflow: 'W06',
        title: 'Reply cannot be matched safely',
        owner: 'Office',
        body: 'Native SMS example: No thanks, not this week. No unique participant/visit reference. Do not guess or cancel.',
      },
      ...state.inbound.map((m) => ({
        id: m.id,
        kind: m.urgent ? 'finance-query' : 'enquiry',
        workflow: 'W02',
        title: m.subject,
        owner: m.urgent ? 'Bookkeeper' : 'Office',
        body: m.body,
        fields: {
          name: m.name,
          email: m.from,
          suburb: m.suburb,
          service: m.service,
        },
        urgent: m.urgent,
      })),
    ];
    let count = 0;
    for (const source of samples)
      if (!a.inbox.some((m) => m.id === source.id)) {
        a.inbox.push({
          ...clone(source),
          state: 'received',
          receivedAt: now(),
        });
        count++;
      }
    return count;
  }
  function pendingExamples(state) {
    const a = ensure(state);
    if (a.pendingExamples === 1) return;
    const fixture = clone(state);
    fixture.automation.inbox = [];
    receiveSamples(fixture);
    for (const example of fixture.automation.inbox) {
      const source = {
        ...example,
        id: `EXAMPLE-${example.id}`,
        prototypeInput: true,
        example: true,
        sender: example.fields?.email || 'office@example.test',
        label: 'Example message',
        state: 'received',
        receivedAt: now(),
      };
      delete source.jobId;
      if (!a.inbox.some((m) => m.id === source.id)) a.inbox.push(source);
      if (source.workflow !== 'W02') {
        const job = create(state, { ...source, source });
        source.state = 'routed';
        source.jobId = job.id;
      }
    }
    const doc = state.workerDocs.find((d) => d.id === 'WDC-04');
    if (doc)
      create(state, {
        kind: 'document',
        workflow: 'W12',
        title: `Review document — ${doc.name}`,
        owner: 'HR / admin',
        targetId: doc.id,
        source: {
          id: `EXAMPLE-document:${doc.id}`,
          label: 'Example document',
          body: `${doc.name}: expiry ${doc.expires || 'not recorded'}. Check the original document and decide whether renewal or a metadata correction is needed.`,
          fields: {
            expires: doc.expires || '',
            noExpiration: false,
            note: '',
          },
        },
      });
    a.pendingExamples = 1;
  }
  function create(state, input) {
    const a = ensure(state);
    const existing = a.jobs.find((j) => j.source.id === input.source.id && j.kind === input.kind);
    if (existing) {
      if (existing.kind === 'finance' && existing.source.body !== input.source.body) {
        existing.source = clone(input.source);
        existing.draft = clone(input.source.fields || {});
        delete existing.approvedAt;
        set(
          existing,
          'needs_review',
          'review',
          'Updated native evidence invalidated the earlier checklist; review the refreshed findings.',
        );
      }
      return existing;
    }
    const job = {
      id: nextId('AUTO', a.jobs),
      workflow: input.workflow,
      kind: input.kind,
      title: input.title,
      owner: input.owner || 'Office',
      targetId: input.targetId || '',
      source: clone(input.source),
      draft: clone(input.source.fields || {}),
      status: 'needs_review',
      stage: 'review',
      createdAt: now(),
      updatedAt: now(),
      history: [],
      attempts: 0,
      priority: input.urgent ? 'Urgent' : 'Routine',
    };
    a.jobs.push(job);
    log(job, 'Received source; classified and assigned for review.');
    if (job.kind === 'ambiguous')
      set(
        job,
        'manual_action_required',
        'matching',
        'No unique visit match. Office must clarify the reply.',
      );
    return job;
  }
  function ingest(state) {
    const a = ensure(state);
    let created = 0,
      duplicates = 0;
    for (const source of a.inbox) {
      const before = a.jobs.length;
      const job = create(state, { ...source, source });
      if (a.jobs.length === before) duplicates++;
      else created++;
      source.state = 'routed';
      source.jobId = job.id;
      const mail = state.inbound.find((m) => m.id === source.id);
      if (mail) {
        mail.status = 'Routed (demo)';
        mail.automationJobId = job.id;
      }
    }
    a.runs.unshift({
      at: now(),
      type: 'Inbox triage',
      result: `${created} new owned cases; ${duplicates} repeated sources skipped.`,
    });
    return { created, duplicates };
  }
  function intake(state, enquiryId) {
    ensure(state);
    const e = state.enquiries.find((e) => e.id === enquiryId && !e.serverRecord);
    if (!e)
      throw new Error(
        'Use the shared server request screen for a real enquiry; these cases use fictional records only.',
      );
    return create(state, {
      kind: 'participant',
      workflow: 'W03',
      title: `${e.name} — reviewed onboarding`,
      owner: e.owner || 'Intake team',
      targetId: e.id,
      source: {
        id: `intake:${e.id}`,
        label: e.source,
        body: `${e.intake?.support || e.service}. ${e.intake?.preference || ''}`,
        fields: {
          firstName: e.name.split(' ')[0],
          lastName: e.name.split(' ').slice(1).join(' '),
          dob: '',
          email: e.email,
          suburb: e.suburb,
          service: e.service,
          consent: Boolean(e.intake?.consent),
        },
      },
    });
  }
  function sync(state) {
    ensure(state);
    for (const r of state.requests.filter((r) => r.status === 'Pending')) request(state, r);
    for (const b of state.bookings.filter((b) => b.status === 'Needs cover')) cover(state, b.id);
  }
  function request(state, r) {
    const kind =
      r.type === 'Booking request'
        ? 'booking-request'
        : r.type === 'Cancellation request'
          ? 'cancel'
          : r.type === 'Feedback'
            ? 'feedback'
            : r.type === 'Profile update'
              ? 'profile-update'
              : 'change';
    return create(state, {
      kind,
      workflow:
        kind === 'cancel'
          ? 'W07'
          : kind === 'change'
            ? 'W08'
            : kind === 'profile-update'
              ? 'W03'
              : 'W13',
      title: `${r.type} — ${state.participants.find((p) => p.id === r.participantId)?.name}`,
      owner: 'Office',
      targetId: r.bookingId || r.participantId,
      source: {
        id: `request:${r.id}`,
        label: 'Demo participant portal',
        body: r.message,
        requestId: r.id,
        fields:
          kind === 'cancel'
            ? {
                reason: r.message,
                charge: 'unconfirmed',
                code: '',
                scope: 'occurrence',
              }
            : clone(r.fields || {}),
      },
    });
  }
  function cancellation(state, bookingId, reason) {
    ensure(state);
    const b = record(state, 'bookings', bookingId);
    if (!b) throw new Error('Booking was not found in the sample ShiftCare source.');
    return create(state, {
      kind: 'cancel',
      workflow: 'W07',
      title: `Cancellation review — ${bookingId}`,
      targetId: bookingId,
      source: {
        id: `office-cancel:${bookingId}`,
        label: 'Office request (demo)',
        body: reason,
        fields: {
          reason,
          charge: 'unconfirmed',
          code: '',
          scope: 'occurrence',
        },
      },
    });
  }
  function cover(state, bookingId) {
    ensure(state);
    const b = state.bookings.find((b) => b.id === bookingId);
    const remote = record(state, 'bookings', bookingId);
    if (!b || !remote) throw new Error('Sample booking not found.');
    return create(state, {
      kind: 'cover',
      workflow: 'W08',
      title: `Arrange cover — ${state.participants.find((p) => p.id === b.participantId)?.name}`,
      targetId: bookingId,
      source: {
        id: `cover:${bookingId}`,
        label: 'Native absence / office report (demo)',
        body:
          b.absenceReason ||
          'The assigned worker cannot attend. Check leave, qualifications, clashes and personal availability. A free calendar is not consent.',
        fields: { workerId: '', communication: '' },
      },
    });
  }
  function document(state, docId) {
    ensure(state);
    const d = record(state, 'documents', docId);
    if (!d) throw new Error('Sample document not found.');
    return create(state, {
      kind: 'document',
      workflow: 'W12',
      title: `Document evidence — ${d.name}`,
      targetId: docId,
      owner: 'HR / admin',
      source: {
        id: `document:${docId}`,
        label: 'Native document metadata (demo)',
        body: `${d.name}: ${d.expires || 'no date'}; ${d.status}. Confirm whether evidence is missing, expiring or truly never expires.`,
        fields: { expires: d.expires || '', noExpiration: false, note: '' },
      },
    });
  }
  function signedFile(state, agreementId) {
    ensure(state);
    const agreement = state.agreements.find((a) => a.id === agreementId);
    if (!agreement) throw new Error('Sample agreement not found.');
    const existing = state.automation.jobs.find(
      (j) => j.kind === 'file' && j.targetId === agreementId,
    );
    if (existing) return existing;
    return create(state, {
      kind: 'file',
      workflow: 'W05',
      targetId: agreementId,
      title: `Returned agreement — ${agreementId}`,
      source: {
        id: `signed-file:${agreementId}`,
        label: 'Existing signing provider (demo)',
        body: 'A sample signed copy was returned. Check person, approved version and signature, then confirm native filing before showing Signed.',
        fields: {
          fileName: `${agreementId}-signed-demo.pdf`,
          version: agreement.template,
          person: state.participants.find((p) => p.id === agreement.participantId)?.name,
        },
      },
    });
  }
  function bookingProposal(state, bookingId) {
    ensure(state);
    const b = state.bookings.find((b) => b.id === bookingId);
    if (!b || b.status !== 'Proposed')
      throw new Error('Only a proposed sample occurrence can start native booking confirmation.');
    return create(state, {
      kind: 'new-booking',
      workflow: 'W08',
      targetId: b.id,
      title: `Native booking confirmation — ${b.id}`,
      source: {
        id: `booking:${b.id}`,
        label: 'Office proposal (demo)',
        body: `${b.service}; ${b.date} ${b.start}–${b.end}; ${b.recurrence}. This proposal is not a confirmed ShiftCare booking. Verify participant agreement and native worker acceptance.`,
        fields: { ...clone(b), workerAccepted: false },
      },
    });
  }
  function run(state, type, options = {}) {
    const a = ensure(state);
    if (type === 'documents') {
      for (const d of a.remote.documents.filter((d) => d.status !== 'Valid')) document(state, d.id);
    } else if (type === 'reminders') {
      const targetDate = '2026-10-08';
      for (const b of a.remote.bookings.filter(
        (b) => b.date === targetDate && b.status === 'Confirmed',
      )) {
        create(state, {
          workflow: 'W06',
          kind: 'reminder',
          targetId: b.id,
          title: `Three-day reminder — ${b.id}`,
          source: {
            id: `reminder:${b.id}:${targetDate}`,
            label: 'Demo cut-off 5 October / native ShiftCare reminder',
            body: 'ShiftCare sends the reminder. OCD checks reply/exception status and follows up silence; it does not send a second reminder or infer cancellation.',
          },
        });
      }
    } else if (['care', 'invoices', 'payroll'].includes(type)) {
      const workflow = type === 'care' ? 'W09' : type === 'invoices' ? 'W10' : 'W11';
      const period = {
        from: options.from || '2026-09-28',
        to: options.to || '2026-10-05',
      };
      if (!validDate(period.from) || !validDate(period.to) || period.from > period.to)
        throw new Error('Set a valid inclusive review period.');
      if (options.partial)
        create(state, {
          kind: 'partial-report',
          workflow,
          title: 'Review is incomplete — native records required',
          owner: 'Bookkeeper',
          source: {
            id: `partial:${type}:${period.from}:${period.to}`,
            label: 'Sample interrupted paginated read',
            body: 'Some source pages/notes were unavailable. A clean report cannot be produced. Review the missing scope in ShiftCare.',
          },
        });
      for (const v of a.remote.visits) {
        const b = a.remote.bookings.find((b) => b.id === v.bookingId);
        if (!b || b.date < period.from || b.date > period.to || b.status !== 'Completed') continue;
        const issues = financeIssues(state, b, v, type);
        if (!issues.length) continue;
        create(state, {
          kind: 'finance',
          workflow,
          title: `${type === 'care' ? 'Care' : type === 'invoices' ? 'Invoice' : 'Payroll'} exception — ${b.id}`,
          owner: type === 'care' || v.majorIssue ? 'Office' : 'Bookkeeper',
          targetId: b.id,
          urgent: Boolean(v.majorIssue),
          source: {
            id: `review:${type}:${b.id}:${period.from}:${period.to}`,
            label: `Sample native care / ${period.from} to ${period.to}`,
            body: issues.join('\n'),
            fields: { period, issues, type },
          },
        });
      }
      a.lastReport = { type, period, at: now(), complete: !options.partial };
    } else if (type === 'areas') {
      for (const e of state.enquiries.filter(
        (e) => !e.serverRecord && !['Active', 'Closed'].includes(e.status),
      ))
        create(state, {
          kind: 'area',
          workflow: 'W01',
          title: `Enquiry ownership — ${e.name}`,
          targetId: e.id,
          source: {
            id: `area:${e.id}`,
            label: 'Fictional enquiry',
            body: `${e.service} in ${e.suburb}. No capacity promise; uncertain/adjacent areas need office review.`,
            fields: {
              area: 'review',
              owner: e.owner || 'Office',
              nextAction: 'Confirm postcode, capacity and preferred service',
            },
          },
        });
    }
    a.runs.unshift({
      at: now(),
      type: `${type} check`,
      result: 'Existing source IDs reused; no external messages, invoices or pay runs created.',
    });
  }
  function minutes(time) {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(time || ''));
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  }
  function captureCare(state, bookingId) {
    const a = ensure(state),
      b = state.bookings.find((b) => b.id === bookingId),
      v = state.visits.find((v) => v.bookingId === bookingId);
    if (!b || !v) return;
    const index = a.remote.visits.findIndex((row) => row.id === v.id);
    if (index >= 0) a.remote.visits[index] = clone(v);
    else a.remote.visits.push(clone(v));
    const nativeBooking = a.remote.bookings.find((row) => row.id === b.id);
    if (nativeBooking) nativeBooking.status = b.status;
  }
  function financeIssues(state, b, v, type) {
    const issues = [];
    const duration = (start, end) => {
      const x = minutes(start),
        y = minutes(end);
      return x === null || y === null || y < x ? null : y - x;
    };
    const scheduled = duration(b.start, b.end),
      actual = duration(v.clockIn, v.clockOut);
    if (scheduled === null)
      issues.push(
        'Scheduled clock times are missing/invalid; verify the native occurrence before comparing durations.',
      );
    if (actual === null)
      issues.push(
        'Actual clock times are missing/invalid; do not infer delivered hours from the roster.',
      );
    else if (scheduled !== null && actual !== scheduled)
      issues.push(
        `Actual ${actual} min versus scheduled ${scheduled} min. Review the explanation and agreed billing treatment; no rounding rule assumed.`,
      );
    if (!v.note) issues.push('Worker progress note missing.');
    if (!v.tasks || !v.goals)
      issues.push(
        'Task/outcome evidence needs native review; a progress note alone does not establish every goal was completed.',
      );
    if (v.majorIssue)
      issues.push(
        'Major issue flagged by worker — restricted office review; follow the existing urgent process.',
      );
    if (type === 'invoices')
      issues.push(
        'Bookkeeper must verify payer, funding and approved service lines before the existing Excel/Xero export.',
      );
    if (type === 'payroll')
      issues.push(
        'Hours, kilometres/travel and employment/pay-item rules need verification; payroll vendor/release stays with the bookkeeper.',
      );
    return issues;
  }
  function get(state, id) {
    const job = ensure(state).jobs.find((j) => j.id === id);
    if (!job) throw new Error('Automation case not found.');
    return job;
  }
  function targetCollection(job) {
    return ['cancel', 'cover', 'change', 'new-booking'].includes(job.kind)
      ? 'bookings'
      : job.kind === 'document'
        ? 'documents'
        : job.kind === 'file'
          ? 'agreements'
          : job.kind === 'profile-update'
            ? 'participants'
            : null;
  }
  function assignmentIssue(state, occurrence, workerId, replacement = false) {
    const w = record(state, 'workers', workerId);
    if (
      !w?.approved ||
      !w.services?.includes(occurrence.service) ||
      (replacement && w.id === occurrence.workerId)
    )
      return 'Recheck the approved worker and service eligibility in the native roster.';
    if (
      minutes(occurrence.start) === null ||
      minutes(occurrence.end) === null ||
      occurrence.end <= occurrence.start ||
      !validDate(occurrence.date)
    )
      return 'Verify the occurrence date and clock times before offering or confirming it.';
    if (bookingRules.requiredSkills(occurrence).some((skill) => !w.skills?.includes(skill)))
      return 'Recheck required skills before assigning this service.';
    const bookings = [
      ...state.automation.remote.bookings,
      ...state.bookings.filter(
        (b) =>
          b.status === 'Proposed' && !state.automation.remote.bookings.some((r) => r.id === b.id),
      ),
    ];
    if (
      bookings.some(
        (b) =>
          b.workerId === workerId &&
          b.id !== occurrence.id &&
          b.date === occurrence.date &&
          !['Cancelled', 'Needs cover'].includes(b.status) &&
          b.start < occurrence.end &&
          b.end > occurrence.start,
      )
    )
      return 'The proposed worker overlaps another sample native visit. Review the current roster.';
    return '';
  }
  function approve(state, id, input) {
    const job = get(state, id);
    if (
      !['needs_review', 'manual_action_required'].includes(job.status) ||
      ['accounting', 'native', 'worker_acceptance'].includes(job.stage)
    )
      throw new Error('This case is not awaiting a new review.');
    if (input.sourceReviewed !== true)
      throw new Error('Compare the proposal with the source and confirm your review.');
    const draft = { ...job.draft, ...clone(input) };
    delete draft.sourceReviewed;
    const collection = targetCollection(job),
      remote = collection ? record(state, collection, job.targetId) : null;
    if (['participant', 'employee'].includes(job.kind)) {
      if (!draft.firstName || !draft.lastName || !/^\S+@\S+\.\S+$/.test(draft.email || ''))
        throw new Error('Review the name and a valid contact email.');
      if (job.kind === 'participant' && (!validDate(draft.dob) || draft.dob > '2026-10-05'))
        throw new Error('A verified date of birth is required; do not invent a placeholder.');
      if (job.kind === 'participant' && input.areaReviewed !== true)
        throw new Error(
          'Confirm approved service area and capacity before participant onboarding.',
        );
      if (draft.consent !== true)
        throw new Error('Consent/authority must be checked against the source.');
      const people =
        state.automation.remote[job.kind === 'participant' ? 'participants' : 'workers'];
      const matches = people.filter((p) => p.email?.toLowerCase() === draft.email.toLowerCase());
      if (matches.length && !draft.matchId)
        throw new Error(
          'A possible existing record matches this email. Select and review the existing ID instead of creating a duplicate.',
        );
      if (draft.matchId && !people.some((p) => p.id === draft.matchId))
        throw new Error('Choose an existing record from the reviewed sample list.');
    }
    if (job.kind === 'cancel') {
      if (!remote || !['Confirmed', 'Needs cover'].includes(remote.status))
        throw new Error(
          'This occurrence is completed, cancelled or unavailable; resolve it in ShiftCare.',
        );
      if (remote.invoiced || remote.approved || (remote.participantIds?.length || 1) > 1) {
        job.draft = draft;
        set(
          job,
          'manual_action_required',
          'exception',
          'Group attendance or a financial lock requires a specific native office/bookkeeper action.',
        );
        return job;
      }
      if (
        !draft.reason ||
        !['with-charge', 'native-policy'].includes(draft.charge) ||
        draft.policyReviewed !== true ||
        draft.scope !== 'occurrence'
      )
        throw new Error(
          'Review the reason, single-occurrence scope and billing treatment with the office policy.',
        );
      if (draft.charge === 'with-charge' && !['NSDH', 'NSDF', 'NSDT', 'NSDO'].includes(draft.code))
        throw new Error('Choose the reviewed NDIS reason code. Free text is retained separately.');
    }
    if (job.kind === 'cover') {
      if (!remote || !['Needs cover', 'Confirmed'].includes(remote.status))
        throw new Error('The sample occurrence is no longer available for cover.');
      const issue = assignmentIssue(state, remote, draft.workerId, true);
      if (issue) throw new Error(issue);
      if (job.stage === 'assignment') {
        const offer = state.coverOffers.find(
          (o) => o.automationJobId === job.id && o.status === 'Accepted',
        );
        if (!offer || offer.workerId !== draft.workerId)
          throw new Error(
            'Native worker acceptance must be received before approving the assignment.',
          );
        if (!draft.communication)
          throw new Error('Record the proposed participant contact/outcome.');
      } else {
        if (draft.availabilityReviewed !== true)
          throw new Error(
            'Office must check actual availability, leave, qualifications and clashes; a free calendar is not consent.',
          );
      }
    }
    if (job.kind === 'new-booking') {
      const b = state.bookings.find((b) => b.id === job.targetId);
      if (!b || b.status !== 'Proposed' || b.workerId !== draft.workerId)
        throw new Error('Recheck the proposal in the native roster.');
      const issue = assignmentIssue(state, b, draft.workerId);
      if (issue) throw new Error(issue);
      if (
        !state.agreements.some(
          (a) => a.participantId === b.participantId && a.status === 'Signed',
        ) ||
        input.participantAgreed !== true ||
        input.workerAccepted !== true
      )
        throw new Error(
          'Signed agreement, participant agreement and a native worker acceptance are separate required checks.',
        );
      job.proposalSnapshot = fingerprint(b);
    }
    if (
      job.kind === 'profile-update' &&
      (!remote || !/^\S+@\S+\.\S+$/.test(draft.email || '') || !draft.phone || !draft.preference)
    )
      throw new Error('Verify the target participant and the permitted contact/preference fields.');
    if (
      job.kind === 'document' &&
      (!draft.note || (draft.noExpiration !== true && !validDate(draft.expires)))
    )
      throw new Error(
        'Record the evidence and either a verified expiry date or an explicit never-expires decision.',
      );
    if (job.kind === 'file' && input.fileReviewed !== true)
      throw new Error('Check person, approved version, signature and native filing location.');
    if (
      job.kind === 'area' &&
      (!draft.owner || !draft.nextAction || !['covered', 'review', 'outside'].includes(draft.area))
    )
      throw new Error('Assign an owner, next action and reviewed area outcome.');
    job.draft = draft;
    job.snapshot = fingerprint(remote);
    job.approvedAt = now();
    log(
      job,
      'Exact proposal and source reviewed; human approval recorded.',
      'Office reviewer (demo)',
    );
    if (['yes', 'enquiry', 'finance-query', 'area', 'reminder', 'feedback'].includes(job.kind)) {
      if (job.kind === 'area') {
        const e = state.enquiries.find((e) => e.id === job.targetId);
        if (e) {
          e.owner = draft.owner;
          e.handoff ||= {};
          e.handoff.followUp = draft.nextAction;
        }
      }
      if (job.kind === 'yes') {
        const b = state.bookings.find((b) => b.id === job.targetId);
        if (b) b.participantResponse = 'Yes (demo)';
      }
      if (['finance-query', 'enquiry', 'feedback', 'reminder'].includes(job.kind)) {
        set(
          job,
          'manual_action_required',
          'followup',
          'Triage complete. Owner records the actual follow-up; no automatic email reply.',
        );
      } else if (job.kind === 'area' && draft.area !== 'covered')
        set(
          job,
          'manual_action_required',
          'followup',
          'Area outcome requires owned follow-up; no service availability or automatic rejection is promised.',
        );
      else
        set(
          job,
          'completed',
          'done',
          'Local ownership/response audit complete. No ShiftCare roster mutation.',
        );
      return job;
    }
    if (
      ['finance', 'partial-report', 'ambiguous', 'change', 'booking-request'].includes(job.kind)
    ) {
      set(
        job,
        'manual_action_required',
        'followup',
        'Native review/action required; record evidence after resolving the exception.',
      );
      return job;
    }
    set(
      job,
      'approved',
      job.kind === 'cover' && job.stage !== 'assignment' ? 'offer' : 'native',
      'Approved for the supported native handoff. No record has changed yet.',
    );
    return job;
  }
  function native(state, id, failure = 'success') {
    const job = get(state, id);
    if (
      job.status !== 'approved' &&
      !(job.status === 'retry_scheduled' && ['native', 'offer'].includes(job.stage))
    )
      throw new Error(
        'Approve the exact proposal before the native step. Unknown outcomes require reconciliation, not a retry.',
      );
    const collection = targetCollection(job),
      remote = collection ? record(state, collection, job.targetId) : null;
    if (collection && fingerprint(remote) !== job.snapshot) {
      delete job.approvedAt;
      job.snapshot = fingerprint(remote);
      set(
        job,
        'needs_review',
        job.kind === 'cover' && job.stage === 'native' ? 'assignment' : 'review',
        'Source changed since approval; the old approval is invalid. Review again.',
      );
      return job;
    }
    if (['cover', 'new-booking'].includes(job.kind)) {
      const occurrence = remote || state.bookings.find((b) => b.id === job.targetId);
      const issue =
        job.kind === 'new-booking' &&
        fingerprint(state.bookings.find((b) => b.id === job.targetId)) !== job.proposalSnapshot
          ? 'the local occurrence proposal changed'
          : occurrence &&
            assignmentIssue(state, occurrence, job.draft.workerId, job.kind === 'cover');
      if (!occurrence || issue) {
        delete job.approvedAt;
        set(
          job,
          'needs_review',
          job.kind === 'cover' && job.stage === 'native' ? 'assignment' : 'review',
          `Approval invalidated before dispatch: ${issue || 'occurrence unavailable'}`,
        );
        return job;
      }
    }
    if (failure === 'stale') {
      if (remote) remote.externalEdit = now();
      delete job.approvedAt;
      set(
        job,
        'needs_review',
        job.kind === 'cover' && job.stage === 'native' ? 'assignment' : 'review',
        'Simulated concurrent native edit invalidated approval. Refresh and re-review.',
      );
      return job;
    }
    job.attempts++;
    if (failure === 'denied') {
      set(
        job,
        'manual_action_required',
        'exception',
        'Feature/permission unavailable. Owner must use a supported native route; no endless retry.',
      );
      return job;
    }
    if (failure === 'network') {
      set(
        job,
        job.attempts < 3 ? 'retry_scheduled' : 'manual_action_required',
        job.attempts < 3 ? job.stage : 'exception',
        job.attempts < 3
          ? 'Pre-dispatch failure; safe bounded retry can resume after a fresh source check.'
          : 'Retry limit reached; owner resolves access manually.',
      );
      return job;
    }
    if (job.kind === 'cover' && job.stage === 'offer') {
      const offers = (state.automation.remote.offers ||= clone(state.coverOffers));
      let offer = offers.find(
        (o) =>
          o.automationJobId === job.id &&
          o.workerId === job.draft.workerId &&
          o.status === 'Pending',
      );
      if (!offer) {
        offer = {
          id: nextId('OFR', offers),
          automationJobId: job.id,
          bookingId: job.targetId,
          workerId: job.draft.workerId,
          status: 'Pending',
          created: state.automation.date,
        };
        offers.push(offer);
      }
      job.expected = {
        collection: 'offers',
        id: offer.id,
        fields: {
          bookingId: offer.bookingId,
          workerId: offer.workerId,
          status: 'Pending',
        },
      };
      set(
        job,
        failure === 'timeout' ? 'reconciliation_required' : 'verifying',
        'offer_readback',
        failure === 'timeout'
          ? 'Native offer may have posted; read back before posting it again.'
          : 'Sample native offer posted. Verify it before exposing the worker response step.',
      );
      return job;
    }
    if (
      job.kind === 'cover' &&
      !state.coverOffers.some(
        (o) =>
          o.automationJobId === job.id &&
          o.status === 'Accepted' &&
          o.workerId === job.draft.workerId,
      )
    )
      throw new Error('A native worker acceptance is required before changing the assignment.');
    set(
      job,
      'executing',
      'native',
      'Simulated native action dispatched; app projection remains unchanged.',
    );
    applyRemote(state, job);
    set(
      job,
      failure === 'timeout' ? 'reconciliation_required' : 'verifying',
      'readback',
      failure === 'timeout'
        ? 'Response lost after dispatch. Outcome is unknown; read back before any repeat.'
        : 'Sample native result received. Read-back still required before success.',
    );
    return job;
  }
  function applyRemote(state, job) {
    const a = state.automation,
      d = job.draft;
    if (['participant', 'employee'].includes(job.kind)) {
      const key = job.kind === 'participant' ? 'participants' : 'workers',
        rows = a.remote[key];
      let p = rows.find((p) => p.id === d.matchId);
      if (!p) {
        p =
          job.kind === 'participant'
            ? {
                id: nextId('PAR', rows),
                name: `${d.firstName} ${d.lastName}`,
                email: d.email,
                dob: d.dob,
                phone: 'To confirm',
                suburb: d.suburb,
                address: `${d.suburb}, WA`,
                service: d.service,
                funding: 'To confirm',
                preferredWorker: '',
                schedulePreference: 'To confirm',
                representative: 'To confirm',
                emergencyContact: 'Restricted native record',
                status: 'Onboarding',
                intakeUpdate: 'Reviewed sample onboarding',
                sharedDocs: [],
              }
            : {
                id: nextId('WRK', rows),
                name: `${d.firstName} ${d.lastName}`,
                email: d.email,
                initials: `${d.firstName[0]}${d.lastName[0]}`,
                services: [d.service || 'Domestic assistance'],
                approved: false,
                review: 'Pending screening',
                days: [],
              };
        rows.push(p);
      }
      job.expected = {
        collection: key,
        id: p.id,
        fields: { name: p.name, email: p.email },
      };
    } else if (job.kind === 'new-booking') {
      let b = record(state, 'bookings', job.targetId);
      if (!b) {
        b = clone(state.bookings.find((b) => b.id === job.targetId));
        a.remote.bookings.push(b);
      }
      b.status = 'Confirmed';
      b.workerAccepted = true;
      b.participantAgreed = true;
      job.expected = {
        collection: 'bookings',
        id: b.id,
        fields: {
          participantId: b.participantId,
          workerId: b.workerId,
          date: b.date,
          start: b.start,
          end: b.end,
          service: b.service,
          status: 'Confirmed',
          workerAccepted: true,
          participantAgreed: true,
        },
      };
    } else if (job.kind === 'cancel') {
      const b = record(state, 'bookings', job.targetId);
      b.status = 'Cancelled';
      b.cancellation = {
        cause: 'Participant',
        notice: '2026-10-05T10:00',
        note: d.reason,
        chargeTreatment: d.charge,
        code: d.code,
        source: 'Sample native action',
      };
      job.expected = {
        collection: 'bookings',
        id: b.id,
        fields: { status: 'Cancelled', cancellation: clone(b.cancellation) },
      };
    } else if (job.kind === 'cover') {
      const b = record(state, 'bookings', job.targetId);
      b.workerId = d.workerId;
      b.status = 'Confirmed';
      b.workerAccepted = true;
      b.coverOutcome = d.communication;
      job.expected = {
        collection: 'bookings',
        id: b.id,
        fields: {
          status: 'Confirmed',
          workerId: b.workerId,
          workerAccepted: true,
        },
      };
    } else if (job.kind === 'document') {
      const dremote = record(state, 'documents', job.targetId);
      dremote.noExpiration = d.noExpiration === true;
      dremote.expires = dremote.noExpiration ? '' : d.expires;
      dremote.status = dremote.noExpiration
        ? 'Valid'
        : d.expires < a.date
          ? 'Expired'
          : d.expires <= '2026-11-04'
            ? 'Due soon'
            : 'Valid';
      dremote.reviewNote = d.note;
      job.expected = {
        collection: 'documents',
        id: dremote.id,
        fields: {
          noExpiration: dremote.noExpiration,
          expires: dremote.expires,
        },
      };
    } else if (job.kind === 'file') {
      const agreement = record(state, 'agreements', job.targetId);
      if (!agreement) throw new Error('Original agreement no longer exists in the sample source.');
      agreement.status = 'Signed';
      agreement.signed = a.date;
      agreement.filedReference = `DEMO-FILE-${agreement.id}`;
      job.expected = {
        collection: 'agreements',
        id: agreement.id,
        fields: {
          status: 'Signed',
          filedReference: agreement.filedReference,
        },
      };
    } else if (job.kind === 'profile-update') {
      const p = record(state, 'participants', job.targetId);
      if (!p || !/^\S+@\S+\.\S+$/.test(d.email || ''))
        throw new Error('Verify the participant and contact fields first.');
      Object.assign(p, {
        email: d.email,
        phone: d.phone,
        intakeUpdate: d.preference,
      });
      job.expected = {
        collection: 'participants',
        id: p.id,
        fields: {
          email: p.email,
          phone: p.phone,
          intakeUpdate: p.intakeUpdate,
        },
      };
    } else
      throw new Error(
        'This operation needs a manual native outcome; no simulated write adapter is defined.',
      );
  }
  function verify(state, id) {
    const job = get(state, id);
    if (!['verifying', 'reconciliation_required'].includes(job.status))
      throw new Error('This case is not waiting for a read-back.');
    const expected = job.expected,
      row = expected ? record(state, expected.collection, expected.id) : null;
    if (
      !row ||
      !Object.entries(expected.fields).every(([k, v]) => fingerprint(row[k]) === fingerprint(v))
    ) {
      set(
        job,
        'manual_action_required',
        'exception',
        'Read-back did not confirm the approved fields. Reconcile in ShiftCare; no success message or blind retry.',
      );
      return job;
    }
    const key =
      expected.collection === 'documents'
        ? 'workerDocs'
        : expected.collection === 'offers'
          ? 'coverOffers'
          : expected.collection;
    const index = state[key].findIndex((item) => item.id === row.id);
    if (index >= 0) state[key][index] = clone(row);
    else state[key].push(clone(row));
    job.verifiedAt = now();
    job.verifiedId = `DEMO-SC-${row.id}`;
    log(
      job,
      `Read-back confirmed ${job.verifiedId}; the permitted sample projection is refreshed.`,
    );
    if (expected.collection === 'offers') {
      set(
        job,
        'manual_action_required',
        'worker_acceptance',
        "Native offer read-back confirmed. Waiting for the selected worker's ShiftCare response; the booking is unchanged.",
      );
    } else if (['participant', 'employee'].includes(job.kind)) {
      const e = state.enquiries.find((e) => e.id === job.targetId && !e.serverRecord);
      if (e) {
        e.shiftCareId = job.verifiedId;
        e.handoff = {
          ...e.handoff,
          status: 'Entered in ShiftCare',
          reference: job.verifiedId,
          verifiedAt: job.verifiedAt,
          demo: true,
        };
      }
      set(
        job,
        'manual_action_required',
        'accounting',
        'ShiftCare sample ID verified. Separate Xero/payroll onboarding must be checked before closing.',
      );
    } else {
      set(
        job,
        'completed',
        'done',
        'Verified sample native outcome recorded. Real ShiftCare was not changed.',
      );
      resolveRequest(state, job);
      if (job.kind === 'cover')
        state.coverOffers
          .filter((o) => o.bookingId === job.targetId && ['Pending', 'Accepted'].includes(o.status))
          .forEach((o) => {
            o.status = o.automationJobId === job.id ? 'Confirmed' : 'Closed';
          });
      queueMessage(state, job);
    }
    return job;
  }
  function accounting(state, id, input) {
    const job = get(state, id);
    if (job.stage !== 'accounting' || job.status !== 'manual_action_required')
      throw new Error('Verify the sample ShiftCare outcome before the accounting handoff.');
    if (!input.reference || !input.note || input.checked !== true)
      throw new Error('Record the separate checked accounting/payroll reference and evidence.');
    job.accounting = {
      reference: input.reference,
      note: input.note,
      verifiedAt: now(),
      demo: true,
    };
    set(
      job,
      'completed',
      'done',
      'Separate sample Xero/payroll check recorded; owned onboarding task closed.',
      'Bookkeeper / admin (demo)',
    );
    return job;
  }
  function workerResponse(state, offerId, workerId, accepted) {
    const offer = state.coverOffers.find((o) => o.id === offerId);
    if (!offer || offer.workerId !== workerId || offer.status !== 'Pending')
      throw new Error('This sample offer is not available for this worker.');
    offer.status = accepted ? 'Accepted' : 'Declined';
    const nativeOffer = record(state, 'offers', offer.id);
    if (nativeOffer) nativeOffer.status = offer.status;
    if (!offer.automationJobId) return;
    const job = get(state, offer.automationJobId);
    log(job, `Native worker response simulated: ${offer.status}.`, 'Assigned worker (demo)');
    if (accepted)
      set(
        job,
        'needs_review',
        'assignment',
        'Worker accepted natively (demo). Office must approve current assignment and verify it before informing the participant.',
      );
    else
      set(
        job,
        'manual_action_required',
        'exception',
        'Worker declined. Office needs another reviewed offer or an agreed alternative.',
      );
  }
  function resolveRequest(state, job) {
    const r = state.requests.find((r) => r.id === job.source.requestId);
    if (r) {
      r.status = 'Handled';
      r.outcome = 'Verified sample native outcome; no real system was changed.';
    }
  }
  function manual(state, id, input) {
    const job = get(state, id);
    if (
      job.status !== 'manual_action_required' ||
      ['native', 'accounting', 'worker_acceptance'].includes(job.stage)
    )
      throw new Error('Complete the specific handoff before closing this case.');
    if (!input.note || !input.reference || input.checked !== true)
      throw new Error('Record who resolved it, the native/contact reference and checked evidence.');
    job.resolution = {
      note: input.note,
      reference: input.reference,
      at: now(),
      demo: true,
    };
    set(
      job,
      'completed',
      'manual_outcome',
      'Checked human outcome recorded. No inferred roster/billing mutation.',
      job.owner,
    );
    resolveRequest(state, job);
    return job;
  }
  function reopen(state, id) {
    const job = get(state, id);
    if (
      terminal(job) ||
      job.status === 'reconciliation_required' ||
      ['accounting', 'worker_acceptance'].includes(job.stage)
    )
      throw new Error(
        'Resolve the pending handoff or reconcile the unknown outcome before starting another attempt.',
      );
    delete job.approvedAt;
    set(
      job,
      'needs_review',
      'review',
      'Owner returned the case for a fresh proposal and approval.',
    );
    return job;
  }
  function queueMessage(state, job) {
    if (!['cancel', 'cover', 'profile-update'].includes(job.kind)) return;
    if (state.automation.messages.some((m) => m.jobId === job.id)) return;
    const b = state.bookings.find((b) => b.id === job.targetId),
      participantId = b?.participantId || (job.kind === 'profile-update' ? job.targetId : '');
    const title =
      job.kind === 'cancel'
        ? 'Cancellation confirmed (demo)'
        : job.kind === 'cover'
          ? 'Replacement confirmed (demo)'
          : 'Contact update reviewed (demo)';
    state.automation.messages.push({
      id: nextId('MSG', state.automation.messages),
      jobId: job.id,
      to: `client:${participantId}`,
      title,
      detail:
        job.kind === 'cover'
          ? `${b.id}: ${state.workers.find((w) => w.id === b.workerId)?.name} accepted; assignment verified in the sample source.`
          : job.kind === 'cancel'
            ? `${b.id}: your single occurrence is cancelled in the sample source. Contact the office for billing questions.`
            : 'Your permitted contact update was verified in the sample source.',
      status: 'pending',
      createdAt: now(),
      attempts: 0,
    });
  }
  function deliver(state, messageId, fail = false) {
    const m = ensure(state).messages.find((m) => m.id === messageId);
    if (!m || m.status === 'delivered')
      throw new Error('This update is already delivered or unavailable.');
    m.attempts++;
    m.status = fail ? 'failed' : 'delivered';
    m.updatedAt = now();
    log(
      get(state, m.jobId),
      fail
        ? 'Sample notification failed; owner uses agreed fallback contact.'
        : 'Sample in-app notification delivered; no real email, SMS or push sent.',
    );
    if (!fail && !state.updates.some((u) => u.messageId === m.id))
      state.updates.unshift({
        id: nextId('UPD', state.updates),
        messageId: m.id,
        to: m.to,
        title: m.title,
        detail: m.detail,
        href: 'client/bookings',
        date: state.automation.date,
        read: false,
      });
    return m;
  }
  return {
    catalog,
    ensure,
    receiveSamples,
    pendingExamples,
    create,
    ingest,
    intake,
    sync,
    request,
    cancellation,
    cover,
    document,
    signedFile,
    bookingProposal,
    run,
    get,
    approve,
    native,
    verify,
    accounting,
    workerResponse,
    manual,
    reopen,
    deliver,
    captureCare,
    financeIssues,
  };
});
