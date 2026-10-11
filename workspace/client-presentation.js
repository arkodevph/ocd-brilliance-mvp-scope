/* Client walkthrough. Sample cases and saved evidence stay separate; no native writes. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OCD_CLIENT_PRESENTATION = api;
})(typeof window === 'undefined' ? globalThis : window, function (root) {
  'use strict';
  const sections = [
    ['overview', 'Business overview'],
    ['use-cases', 'Use cases'],
    ['walkthrough', 'Guided demo'],
    ['value', 'Measure value'],
    ['pilot', 'Pilot & proof'],
  ];
  const areas = [
    {
      id: 'onboarding',
      title: 'Paperwork into checked records',
      workflows: ['W03', 'W04', 'W05'],
      requirements: 'A01 / A10',
      owner: 'Intake team / HR',
      pain: 'Staff copy participant and employee details from emailed forms and scans, then chase and file returned agreements.',
      trigger: 'An authorised intake, employee form or signed agreement arrives.',
      handles:
        'Prepare fields beside the original source, check missing details and possible duplicates, and assign the review to the right person.',
      outcome:
        'A checked ShiftCare record or filing result, with a separate accounting or payroll handoff where needed.',
      human:
        'Staff confirm identity, consent, service capacity and the exact proposed change. HR screening and accounting setup still need their owners.',
      benefit:
        'Less repeated typing and searching; clearer responsibility for incomplete paperwork.',
      metric: 'Staff minutes per intake; corrections and duplicate records per 100 intakes.',
      demo: 'onboarding',
    },
    {
      id: 'replies',
      title: 'Replies and cancellations in one queue',
      workflows: ['W06', 'W07'],
      requirements: 'A04',
      owner: 'Office',
      pain: 'The office checks reminder replies daily and manually enters cancellations and reasons.',
      trigger: 'A reply to an existing ShiftCare reminder or a cancellation request is received.',
      handles:
        'Match the person and exact visit, separate yes/no/unclear replies, and prepare cancellation details for approval.',
      outcome: 'A verified confirmation or cancellation, followed by an agreed communication step.',
      human:
        'Keep existing reminders. Staff resolve ambiguous replies and approve the cancellation reason, occurrence and charge before a change.',
      benefit:
        'Less daily checking and a lower risk of cancelling the wrong service or charging incorrectly.',
      metric: 'Daily reply-checking minutes; unresolved replies; cancellation corrections.',
      demo: 'cancellation',
    },
    {
      id: 'cover',
      title: 'Replacement cover with acceptance',
      workflows: ['W08'],
      requirements: 'A05 / A06',
      owner: 'Rostering team',
      pain: 'Sickness and last-minute changes require repeated calls; a gap in the calendar does not prove a worker is available.',
      trigger: 'A worker is sick, declines an offer, or a visit needs a change.',
      handles:
        'Create an owned cover case, review suitable available workers, track an offer and escalate if no suitable person accepts.',
      outcome:
        'A replacement assignment checked in ShiftCare, or an owned office follow-up when cover cannot be arranged.',
      human:
        'The worker accepts in ShiftCare. Staff confirm personal availability, suitability and participant contact before assignment.',
      benefit:
        'Faster coordination and a clearer view of services at risk, without assuming missing capacity can be created.',
      metric: 'Minutes to arrange cover; percentage accepted before the agreed deadline.',
      demo: 'cover',
    },
    {
      id: 'documents',
      title: 'Useful document alerts',
      workflows: ['W12'],
      requirements: 'A07',
      owner: 'HR / compliance',
      pain: 'Missing documents and false expiry flags create repeated follow-up and noise.',
      trigger:
        'A document is due for review, new evidence arrives, or an expiry flag needs correction.',
      handles:
        'Prepare an evidence-based exception list, distinguish expiring from non-expiring documents, and track the responsible reviewer.',
      outcome:
        'Reviewed filing or corrected document metadata in ShiftCare, with fewer misleading alerts.',
      human:
        'Staff inspect the evidence, confirm the person and document type, and verify native filing or metadata changes.',
      benefit:
        'Attention goes to documents that actually need action; fewer unnecessary reminders.',
      metric: 'False expiry alerts; unresolved document cases; minutes spent checking each case.',
      demo: 'documents',
    },
    {
      id: 'care',
      title: 'Care records that need attention',
      workflows: ['W09'],
      requirements: 'A08',
      owner: 'Care supervisor',
      pain: 'The office checks actual visit times, notes, tasks and explanations, and must notice major issues.',
      trigger: 'ShiftCare attendance or care records change, or a review cut-off is reached.',
      handles:
        'Highlight missing or inconsistent evidence and route sensitive or serious issues to an authorised person.',
      outcome: 'An owned review list, with corrections and care decisions retained in ShiftCare.',
      human:
        'Workers keep entering care in ShiftCare. A supervisor judges risks and explanations; unknown data is not treated as a missed service.',
      benefit:
        'Less searching across visits and more focused review of the records that need attention.',
      metric: 'Review minutes; unresolved exceptions; time to acknowledge a major issue.',
      demo: 'care',
    },
    {
      id: 'finance',
      title: 'A clearer bookkeeping handoff',
      workflows: ['W10', 'W11'],
      requirements: 'A09',
      owner: 'Bookkeeper',
      pain: 'Tuesday invoice checks and fortnightly payroll checks involve comparing hours, payer/funding details, travel and kilometres.',
      trigger: 'The agreed Tuesday invoice or fortnightly payroll cut-off is reached.',
      handles:
        'Prepare a period-specific checklist and flag missing or inconsistent inputs for review.',
      outcome:
        'A reviewed exception pack for the current bookkeeper, followed by the existing financial export or release.',
      human:
        'The bookkeeper confirms payer, funding, hours and travel. Invoice export, payroll calculations and final release keep their current approval process.',
      benefit:
        'Less time gathering information, fewer last-minute questions and a traceable review history.',
      metric: 'Review minutes per cycle; queries and corrections before and after release.',
      demo: 'finance',
    },
    {
      id: 'communications',
      title: 'Enquiries and follow-up with an owner',
      workflows: ['W01', 'W02', 'W13'],
      requirements: 'A02 / A03 / A11',
      owner: 'Office / bookkeeper',
      pain: 'Enquiries and invoice complaints can be overlooked, duplicated or left without a clear next action.',
      trigger: 'A new enquiry, authorised email, feedback or a verified service outcome arrives.',
      handles:
        'Screen the service area, flag urgency, suggest the right record and owner, and track follow-up and delivery status.',
      outcome:
        'One visible next action and a recorded result; an undelivered message stays in the queue.',
      human:
        'Staff confirm service capacity, clarify ambiguous messages and approve sensitive replies. Financial complaints go to the bookkeeper.',
      benefit:
        'Fewer forgotten requests and less repeated checking between staff, with a clearer participant experience.',
      metric: 'Overdue follow-ups per 100 requests; response time; failed or duplicate messages.',
      demo: 'communications',
    },
  ];
  const metrics = [
    {
      id: 'intake',
      label: 'Onboarding effort',
      unit: 'minutes / intake',
      direction: 'lower',
      evidence: 'Time the same form types, including review and exceptions.',
    },
    {
      id: 'replies',
      label: 'Reply-checking effort',
      unit: 'minutes / day',
      direction: 'lower',
      evidence: 'Include matching, corrections and follow-up calls.',
    },
    {
      id: 'followup',
      label: 'Overdue follow-ups',
      unit: 'per 100 requests',
      direction: 'lower',
      evidence: 'Agree what counts as overdue and record the request count.',
    },
    {
      id: 'errors',
      label: 'Record corrections',
      unit: 'per 100 records',
      direction: 'lower',
      evidence: 'Count wrong matches, repeated records and re-entry corrections.',
    },
    {
      id: 'finance',
      label: 'Bookkeeper review effort',
      unit: 'minutes / cycle',
      direction: 'lower',
      evidence: 'Compare equivalent invoice or payroll periods.',
    },
    {
      id: 'cover',
      label: 'Cover accepted before deadline',
      unit: 'per 100 cover cases',
      direction: 'higher',
      evidence: 'Keep worker acceptance and the deadline definition consistent.',
    },
  ];
  const scenarios = [
    {
      id: 'onboarding',
      name: 'An emailed intake',
      label: 'Start here',
      kind: 'participant',
      why: 'Ava’s fictional intake shows the most repeated client request: less re-keying from forms.',
      steps: [
        [
          'Receive and assign',
          'The sample intake appears with its source and an intake owner.',
          'Show the original source beside the case. Nobody needs to guess who is following up.',
        ],
        [
          'Prepare the fields',
          'The prototype has pre-filled sample fields for review. Real mailbox reading and scan extraction still need connection.',
          'Clear the date of birth to demonstrate that incomplete information blocks approval.',
        ],
        [
          'Check the match',
          'Review identity, consent, possible duplicates and service area/capacity.',
          'Area coverage alone does not promise an available worker. Staff can correct the proposal.',
        ],
        [
          'Approve the exact change',
          'An authorised staff member approves the checked fields.',
          'Explain who is accountable before a native record is changed.',
        ],
        [
          'Check the ShiftCare result',
          'The demo simulates a native step, then requires a separate read-back. A timeout enters reconciliation.',
          'Use “Try an interruption” in the working case. The queue keeps the owner; it does not blindly create another record.',
        ],
        [
          'Finish the handoff',
          'A separate checked Xero reference is needed before closing the sample onboarding case.',
          'ShiftCare stays the client record. Accounting setup and the final bookkeeper checks retain their owners.',
        ],
      ],
    },
    {
      id: 'cancellation',
      name: 'A cancellation reply',
      kind: 'cancel',
      why: 'Olivia’s sample reply cancels one visit. The rest of the recurring service must be protected.',
      steps: [
        [
          'Match the reply',
          'Use the participant and exact occurrence, not an unqualified “no thanks”.',
          'The unclear sample reply goes to a person instead of cancelling anything.',
        ],
        [
          'Review the policy',
          'Confirm the reason, charge treatment and one-occurrence scope.',
          'A policy decision remains visible and owned by the office.',
        ],
        [
          'Apply and check',
          'Simulate the native cancellation and read back the exact booking result.',
          'Other occurrences remain unchanged. In production this needs a validated supported native action.',
        ],
        [
          'Contact and close',
          'Prepare the agreed participant/worker communication after verification.',
          'Failed delivery remains an exception. A cancellation success is separate from a message success.',
        ],
      ],
    },
    {
      id: 'cover',
      name: 'A sick worker needs cover',
      kind: 'cover',
      why: 'The case for BKG-502 shows that the worker’s acceptance matters as much as a free time slot.',
      steps: [
        [
          'Own the risk',
          'A service needing cover becomes an office case with a responsible person.',
          'Show how the office sees an at-risk visit in one place.',
        ],
        [
          'Review and offer',
          'Check suitability and personal availability before a sample native offer.',
          'For the prepared scenario choose Elena Cruz and check the required review boxes.',
        ],
        [
          'Worker accepts',
          'Switch to the selected Worker persona and accept the sample native offer.',
          'Real workers continue to accept or decline in ShiftCare. The prototype does not accept for them.',
        ],
        [
          'Verify or escalate',
          'Return to the office, review contact, then simulate and verify assignment.',
          'If no suitable worker accepts, staff contact the participant and agree the next step.',
        ],
      ],
    },
    {
      id: 'documents',
      name: 'A false document expiry',
      route: 'office/automation',
      why: 'A non-expiring document should not keep creating unnecessary follow-up.',
      steps: [
        [
          'Select the evidence',
          'Open a document review from the automation workspace or work queue.',
          'Show the stored source and the responsible reviewer.',
        ],
        [
          'Check the document',
          'Confirm whether it expires, the person, the type and the native filing details.',
          'A date is not cleared simply because someone wants fewer alerts.',
        ],
        [
          'Verify the correction',
          'The sample native metadata change needs read-back before closure.',
          'Native document tracking remains in ShiftCare; supported filing methods need account validation.',
        ],
      ],
    },
    {
      id: 'care',
      name: 'A visit record needs review',
      route: 'office/finance',
      why: 'The supervisor needs a focused exception list, not another place for workers to re-enter care.',
      steps: [
        [
          'Read care evidence',
          'In Bookkeeping, prepare the care exception review from sample native records.',
          'Actual attendance, notes, tasks and goals are distinct from the planned roster.',
        ],
        [
          'Review the exception',
          'Inspect missing information and extra-time explanations.',
          'Unknown attendance or missing recent-note evidence is a review signal, not proof of a missed service.',
        ],
        [
          'Retain the care decision',
          'A supervisor handles risk and native corrections, then records the checked review.',
          'Workers keep using ShiftCare. Sensitive details go only to the authorised reviewer.',
        ],
      ],
    },
    {
      id: 'finance',
      name: 'Tuesday / fortnightly checks',
      route: 'office/finance',
      why: 'Prepare the information the bookkeeper needs while retaining the current Xero and payroll process.',
      steps: [
        [
          'Select a period',
          'Use the Tuesday invoice or fortnightly payroll review in Bookkeeping.',
          'Confirm the chosen window so records are not silently omitted.',
        ],
        [
          'Prepare exceptions',
          'Review payer, funding, actual hours and travel/kilometre questions.',
          'The layer flags the items needing attention; it does not invent missing figures.',
        ],
        [
          'Approve the handoff',
          'The bookkeeper checks the pack and retains export and release responsibility.',
          'The benefit to measure is preparation/review time and fewer corrections, not automatic payroll release.',
        ],
      ],
    },
    {
      id: 'communications',
      name: 'An enquiry or invoice complaint',
      kind: 'finance-query',
      why: 'Urgent invoice questions and ordinary enquiries should each have a clear owner and next action.',
      steps: [
        [
          'Receive and screen',
          'An authorised message becomes an owned sample case. Public intake first checks the service area.',
          'Service capacity and unusual nearby areas still need an office decision.',
        ],
        [
          'Route and review',
          'The invoice complaint goes to the bookkeeper; an unclear match requires clarification.',
          'Keep the original source available and avoid duplicate work on the same message.',
        ],
        [
          'Track the follow-up',
          'Review the response and record whether the agreed communication was delivered.',
          'A failed delivery stays visible. Live email/SMS sending needs a validated connector and approved rules.',
        ],
      ],
    },
    {
      id: 'arrival',
      name: 'Participant arrival information',
      route: 'client/map/BKG-501',
      why: 'Bookings and an arrival estimate support the automation. Location sharing needs consent and privacy controls.',
      steps: [
        [
          'Show the booking',
          'Open the participant’s own booking and consented sample journey.',
          'Use the Office, Worker and Client map views to explain the different needs.',
        ],
        [
          'Share only what is needed',
          'The participant sees an estimate/status, without the worker’s exact route or home location.',
          'The Mapbox map is real; worker journeys and arrival data are simulated.',
        ],
        [
          'Handle missing updates',
          'A stale sample journey withdraws its estimate and prompts an office contact.',
          'Real device consent, identity and phone updates must be validated before promising live arrival tracking.',
        ],
      ],
    },
  ];
  const number = (value) => {
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '') ||
      !['string', 'number'].includes(typeof value)
    )
      return null;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 && n <= Number.MAX_SAFE_INTEGER ? n : null;
  };
  function estimate(input = {}) {
    const volume = number(input.volume),
      manual = number(input.manualMinutes),
      assisted = number(input.assistedMinutes),
      rate = number(input.hourlyRate);
    if ([volume, manual, assisted].includes(null))
      return { ready: false, hours: null, costEquivalent: null };
    const savedMinutes = (manual - assisted) * volume,
      hours = savedMinutes / 60;
    if (!Number.isFinite(savedMinutes) || Math.abs(savedMinutes) > Number.MAX_SAFE_INTEGER)
      return { ready: false, hours: null, costEquivalent: null };
    const cost = rate === null ? null : hours * rate;
    return {
      ready: true,
      hours,
      costEquivalent:
        cost !== null && Number.isFinite(cost) && Math.abs(cost) <= Number.MAX_SAFE_INTEGER
          ? cost
          : null,
    };
  }
  function comparison(baseline, pilot, direction = 'lower') {
    const before = number(baseline),
      after = number(pilot);
    if ([before, after].includes(null)) return { ready: false, change: null, improvement: null };
    const change = after - before;
    return {
      ready: true,
      change,
      improvement: direction === 'higher' ? change > 0 : change < 0,
    };
  }
  function evidenceSummary(response) {
    const c = response?.capture;
    const authenticated =
      c?.source?.authenticated === true && ['mcp', 'rest'].includes(c?.source?.method);
    const validTime = (v) => typeof v === 'string' && Number.isFinite(Date.parse(v));
    if (!c || !authenticated || !validTime(c.capturedAt))
      return {
        available: false,
        nativeVerified: false,
        reason: c ? 'Only example or unverified data is loaded.' : 'No account evidence is loaded.',
      };
    const p = c.proof,
      rb = p?.readback,
      args = p?.proposal?.args;
    const nativeVerified =
      p?.status === 'verified' &&
      p.proposal?.tool === 'create_action_item' &&
      rb?.tool === 'get_action_item' &&
      String(p.createdId || '') === String(rb.id || '') &&
      !!rb.id &&
      validTime(rb.verifiedAt) &&
      !!args &&
      rb.title === args.title &&
      rb.description === args.description &&
      String(rb.assigneeId) === String(args.assignee_id) &&
      rb.dueDate === args.due_date &&
      rb.priority === args.priority &&
      rb.verificationMethod === args.verification_method;
    const run = (response.runs || []).find(
      (r) => r.sourceHash === response.captureHash && r.account?.id === c.account?.id,
    );
    return {
      available: true,
      method: c.source.method,
      capturedAt: c.capturedAt,
      timeZone: c.account?.timeZone || 'UTC',
      reads: (c.receipts || []).filter((r) => r.status === 'passed').length,
      complete: (c.receipts || []).some(
        (r) => r.tool === 'list_shifts' && r.status === 'passed' && r.complete === true,
      ),
      participants: c.data?.participants?.length ?? 0,
      staff: c.data?.staff?.length ?? 0,
      shifts: c.data?.shifts?.length ?? 0,
      findings: run ? run.findings.length : null,
      nativeVerified,
      verifiedAt: nativeVerified ? rb.verifiedAt : null,
      actionId: nativeVerified ? String(rb.id) : '',
      statusAtRead: nativeVerified ? rb.status : '',
      restConfigured: response.rest?.configured === true,
    };
  }
  const decimal = (n) => new Intl.NumberFormat('en-AU', { maximumFractionDigits: 2 }).format(n);
  const money = (n) =>
    new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      maximumFractionDigits: 2,
    }).format(n);
  const esc = (v) =>
    String(v ?? '').replace(
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
  const reportText = (v) =>
    String(v ?? '')
      .replace(/[\r\n|]/g, ' ')
      .replace(/[\\`*_<>&\[\]#]/g, '')
      .slice(0, 180)
      .trim();
  const observation = (v) => (number(v) === null ? 'Not recorded' : decimal(number(v)));
  function buildReport(input = {}) {
    const e = input.estimate || {},
      calculated = estimate(e),
      proof = input.evidence || { available: false },
      score = input.score || {};
    const lines = [
      '# OCD Brilliance — Client automation presentation and pilot report',
      '',
      `Prepared: ${reportText(input.date || new Date().toISOString().slice(0, 10))}`,
      '',
      '## The business case',
      '',
      'Reduce repeated entry from forms, daily reply checking, cover chasing and bookkeeping preparation. Give each exception a responsible person and check the result before closing the work.',
      '',
      'ShiftCare remains the main record for people, rosters, care, documents and service billing. The supporting web app prepares work, tracks approvals and exceptions, and records checked outcomes. Xero and payroll retain their financial responsibilities.',
      '',
      'There are 7 core automation areas, covering 13 operational workflows. Booking and arrival support adds W14: 14 planned workflows in total. This count does not mean 14 live integrations.',
      '',
      '## Client needs, proposed handling and expected benefit',
      '',
      ...areas.flatMap((a) => [
        `### ${a.title} (${a.workflows.join(', ')})`,
        '',
        `Current work: ${a.pain}`,
        '',
        `Trigger: ${a.trigger}`,
        '',
        `Proposed handling: ${a.handles}`,
        '',
        `Expected result: ${a.outcome}`,
        '',
        `Staff / native responsibility: ${a.human}`,
        '',
        `Expected benefit: ${a.benefit}`,
        '',
        `Measure: ${a.metric}`,
        '',
      ]),
      '### Booking and arrival support (W14)',
      '',
      'Office and worker booking maps and participant arrival status can reduce “where is my worker?” calls. The map renders with Mapbox; journeys and arrival updates are simulated. A participant does not see the worker’s exact route. Live device updates, identity, consent and stale-update handling must be validated in a pilot.',
      '',
      '## How the workflow operates',
      '',
      'Receive a source → match the correct record → prepare/check the proposal → staff approve → perform a supported ShiftCare action → independently check the result → complete the accounting/contact handoff → record the outcome.',
      '',
      'If matching is unclear, permission is missing, no worker accepts, a record changes, a message fails or a write result is unknown, keep an owned exception. Check ShiftCare before retrying an unknown write. Do not treat a prepared case as a completed native action.',
      '',
      '## What the demonstration proves',
      '',
      'The interactive sample demonstrates field review, approvals, duplicate prevention, worker acceptance, separate accounting checks and failure recovery. Mailbox reading, scan extraction, outgoing messages, unattended jobs, financial release and live worker journeys are not working production integrations in this prototype.',
      '',
    ];
    if (proof.available) {
      lines.push(
        `Saved authenticated ${proof.method === 'rest' ? 'website read' : 'assistant MCP read'} evidence: ${reportText(proof.capturedAt)}. ${proof.reads} passed read receipts; ${proof.shifts} visible shifts. This is a dated capture, not a live connection check.`,
        '',
      );
      if (proof.findings !== null)
        lines.push(
          `${proof.findings} review signals in the matching saved check run. These are not confirmed missed services or financial errors.`,
          '',
        );
      if (proof.nativeVerified)
        lines.push(
          `One approved administrative follow-up was independently read back at ${reportText(proof.verifiedAt)}. This demonstrates one supervised native action, not the full production automation. Current completion is not polled.`,
          '',
        );
      else lines.push('No native write/read-back proof is loaded in this presentation.', '');
    } else
      lines.push(
        'No authenticated account evidence is loaded in this presentation. The sample workflow is not proof of native ShiftCare actions.',
        '',
      );
    lines.push(
      '## Capacity estimate — not measured savings',
      '',
      `Input basis: ${input.estimateBasis === 'illustrative' ? 'Illustrative example; not client measurements.' : 'Presenter-entered assumptions; not yet verified.'}`,
      '',
      `Cases per month: ${observation(e.volume)}`,
      `Manual minutes per case: ${observation(e.manualMinutes)}`,
      `Assisted minutes per case, including review and exceptions: ${observation(e.assistedMinutes)}`,
      `Optional hourly staff cost (AUD): ${observation(e.hourlyRate)}`,
      '',
      calculated.ready
        ? `Estimated capacity change: ${decimal(calculated.hours)} staff hours per month ${calculated.hours >= 0 ? 'released' : '(additional effort)'}.`
        : 'Estimated capacity change: not calculated; required inputs are missing or invalid.',
      '',
      calculated.costEquivalent !== null
        ? `Gross staff-time cost equivalent: ${money(calculated.costEquivalent)} per month. This is capacity value, not a cash-saving or return-on-investment claim.`
        : 'Gross staff-time cost equivalent: not calculated.',
      '',
      'Formula: cases/month × (manual minutes − assisted minutes) ÷ 60. Licensing, implementation, training, support and other operating costs are excluded. No cash saving is assumed unless an actual budget change is measured.',
      '',
      '## Pilot observations — presenter entered, not independently verified',
      '',
      `Baseline period: ${reportText(input.baselinePeriod) || 'Not recorded'}`,
      `Pilot period: ${reportText(input.pilotPeriod) || 'Not recorded'}`,
      '',
      '| Measure | Unit | Baseline | Pilot | Raw change (pilot − baseline) |',
      '| --- | --- | --- | --- | --- |',
      ...metrics.map((m) => {
        const v = score[m.id] || {},
          c = comparison(v.baseline, v.pilot, m.direction);
        return `| ${m.label} | ${m.unit} | ${observation(v.baseline)} | ${observation(v.pilot)} | ${c.ready ? decimal(c.change) : 'Not comparable'} |`;
      }),
      '',
      'Compare equivalent work and record volumes. A decrease is favourable for effort, overdue follow-ups and corrections; an increase is favourable for cover accepted by deadline. Missing periods or unmatched work make a comparison provisional. Rate measures need their underlying case counts; zero must be entered explicitly.',
      '',
      '## Recommended pilot and client decisions',
      '',
      '1. Agree an onboarding form, its required fields, the reviewer and baseline volume/time. Confirm authorised access to the intended ShiftCare account.',
      '2. Validate the chosen read and write actions, exact fields and independent result checks in the authorised account. Unsupported actions remain an explicit staff handoff.',
      '3. Pilot a limited set of intake cases with staff approval, an owner for failures and a dated measurement log. Include difficult and incomplete cases.',
      '4. Compare total handling time and corrections with the baseline, including review and exceptions. Agree success thresholds with the client; no thresholds are assumed here.',
      '5. Add replies/cancellation, then cover, documents and bookkeeping only after policies, connectors and responsibilities are confirmed. Validate arrival tracking separately.',
      '',
      '## Reporting and follow-up',
      '',
      'Report the volume processed, staff effort, exceptions, checked native results, corrections, outstanding manual work and next decisions each week. Keep care details, personal identifiers and credentials out of this presentation report.',
      '',
      'Reference: 5 October 2026 client meeting, reviewed requirements register and ShiftCare integration design. This report describes the prototype and proposed pilot; it does not certify a production deployment.',
      '',
    );
    return lines.join('\n');
  }
  const ui = {
    section: 'overview',
    scenario: 'onboarding',
    step: 0,
    presentation: false,
    estimate: {},
    estimateBasis: 'assumptions',
    score: {},
    baselinePeriod: '',
    pilotPeriod: '',
    evidence: null,
    evidenceError: '',
    preparation: '',
  };
  let active = null;
  const tag = (label, tone = '') => `<span class="cp-tag ${tone}">${esc(label)}</span>`;
  const link = (route, text, primary = false) =>
    `<a class="btn ${primary ? 'primary' : ''}" href="#/${route}">${esc(text)} <span aria-hidden="true">↗</span></a>`;
  const heading = (eyebrow, title, intro) =>
    `<div class="cp-section-heading"><span class="eyebrow">${eyebrow}</span><h2>${title}</h2><p>${intro}</p></div>`;
  function banner() {
    return '<a class="cp-launch" href="#/office/presentation"><span><strong>Present the automation to the client</strong><small>Business benefits, working examples and a pilot report</small></span><span aria-hidden="true">Open walkthrough →</span></a>';
  }
  function overview() {
    return `<div class="cp-hero"><div><span class="eyebrow">LESS ADMIN. CLEARER FOLLOW-THROUGH.</span><h2>More time for people.<br>Less time chasing paperwork.</h2><p>Prepare the repetitive work, put exceptions in front of the right person, and check the result in ShiftCare.</p><div class="cp-hero-actions"><button class="btn primary" type="button" data-client-scenario="onboarding">Start with an intake →</button>${link('office/presentation/use-cases', 'Explore the use cases')}</div></div><aside class="cp-hero-note"><span class="cp-overline">THE CLIENT’S FIRST PRIORITY</span><blockquote>Move information from emailed forms and scans into the right records, with staff checking the result.</blockquote><p>Paraphrased from the 5 October meeting.</p><div class="cp-counts"><div><strong>7</strong><span>core areas</span></div><div><strong>14</strong><span>planned workflows</span></div></div></aside></div>
      <section class="cp-block"><div class="cp-section-line"><h3>A better way to handle the same work</h3>${tag('Expected benefits · to measure in a pilot', 'amber')}</div><div class="cp-before-after"><article><span class="cp-overline">CURRENT PROCESS</span><h4>Check, copy, chase, repeat</h4><ul><li>Copy details from forms into existing systems.</li><li>Revisit email and reminder replies to see what changed.</li><li>Call around for cover and gather bookkeeping information.</li><li>Follow up again when ownership or the result is unclear.</li></ul></article><article><span class="cp-overline">PROPOSED PROCESS</span><h4>Prepare, review, verify, follow through</h4><ul><li>Review prepared information beside its source.</li><li>Work from a queue with an owner and a next action.</li><li>Focus on incomplete, risky or exceptional cases.</li><li>Close work after the native result and handoff are checked.</li></ul></article></div></section>
      <section class="cp-block"><h3>Keep the systems that already run the business</h3><div class="cp-system-grid"><article><span class="cp-system-number">01</span><h4>ShiftCare</h4><p>The main record for participants, staff, rosters, care, documents and service billing.</p>${tag('Source of truth')}</article><article><span class="cp-system-number">02</span><h4>Automation + web app</h4><p>Prepare proposals, assign reviews, track exceptions and show checked outcomes.</p>${tag('Supporting layer', 'blue')}</article><article><span class="cp-system-number">03</span><h4>Staff + bookkeeper</h4><p>Approve decisions, resolve unclear cases and keep Xero/payroll release responsibilities.</p>${tag('Accountable people')}</article></div><p class="cp-caption">The planned path is: source → checked proposal → approval → supported ShiftCare action → independent result check → contact/accounting handoff. The prototype simulates operational changes; saved real evidence is shown separately.</p></section>
      <div class="cp-benefit-strip"><article><strong>Reduce manual effort</strong><span>Less re-entry and repeated checking.</span></article><article><strong>Reduce avoidable errors</strong><span>Exact matches, review and result checks.</span></article><article><strong>Improve follow-through</strong><span>One owner; failed steps stay visible.</span></article></div>`;
  }
  function useCases() {
    return `${heading('BASED ON THE CLIENT’S WORK', 'Seven automation areas, one supporting layer', 'Start with paperwork. Extend to other repeated tasks once the account, policies and connections are validated. Seven core areas cover W01–W13; booking and arrival support is W14.')}<div class="cp-use-grid">${areas.map((a, index) => `<article class="cp-use-card" id="cp-use-${a.id}"><div class="cp-card-top"><span class="cp-card-index">${String(index + 1).padStart(2, '0')}</span>${tag(a.workflows.join(' · '), 'blue')}</div><h3>${esc(a.title)}</h3><p class="cp-pain">${esc(a.pain)}</p><dl><div><dt>Trigger</dt><dd>${esc(a.trigger)}</dd></div><div><dt>What we handle</dt><dd>${esc(a.handles)}</dd></div><div><dt>Checked outcome</dt><dd>${esc(a.outcome)}</dd></div><div><dt>Staff / ShiftCare step</dt><dd>${esc(a.human)}</dd></div><div class="cp-benefit"><dt>Expected business benefit</dt><dd>${esc(a.benefit)}</dd></div><div><dt>How to measure it</dt><dd>${esc(a.metric)}</dd></div></dl><button class="btn" data-client-scenario="${a.demo}" type="button">Show this example →</button></article>`).join('')}</div><section class="cp-block"><div class="cp-section-line"><h3>What the supporting subsystem adds</h3>${tag('Booking / arrival · W14', 'blue')}</div><div class="cp-support-grid"><article><h4>Office control</h4><p>An owned queue, source comparison, review history and recovery steps make the work visible.</p></article><article><h4>Worker workflow</h4><p>Offers, availability and document follow-up support workers. Care entry and real offer acceptance stay in ShiftCare.</p></article><article><h4>Participant experience</h4><p>Bookings, requests, shared documents and privacy-aware arrival information can reduce avoidable calls.</p></article></div><p class="cp-caption">The three workspaces use sample personas. The Mapbox map renders, while journeys and ETA are simulated. Mailbox connections, permissions, sending, unattended jobs and device updates need pilot implementation.</p>${link('office/presentation/walkthrough', 'Walk through the examples', true)}</section>`;
  }
  function scenarioRoute(context, scenario) {
    const job = context.state.automation?.jobs.find((j) => j.kind === scenario.kind);
    return job ? `office/automation/${job.id}` : scenario.route || 'office/automation';
  }
  function walkthrough(context) {
    const s = scenarios.find((s) => s.id === ui.scenario) || scenarios[0],
      step = s.steps[Math.min(ui.step, s.steps.length - 1)];
    return `${heading('A PRACTICAL CLIENT DEMO', 'Follow one piece of work from start to finish', 'These steps explain the story. Open the working example to perform the sample approvals and checks; moving through this guide does not execute an automation.')}<div class="cp-demo-layout"><nav class="cp-scenarios" aria-label="Demo scenarios">${scenarios.map((scenario) => `<button type="button" data-client-scenario="${scenario.id}" ${s.id === scenario.id ? 'aria-current="true"' : ''}><strong>${esc(scenario.name)}</strong>${scenario.label ? `<small>${scenario.label}</small>` : ''}</button>`).join('')}</nav><section class="cp-demo-stage"><div class="cp-section-line"><span class="cp-overline">${esc(s.name)}</span>${tag('Fictional sample · no ShiftCare write', 'blue')}</div><p class="cp-demo-why">${esc(s.why)}</p><ol class="cp-step-list" aria-label="Walkthrough steps">${s.steps.map((v, i) => `<li><button type="button" data-client-step="${i}" ${ui.step === i ? 'aria-current="step"' : ''}><span>${i + 1}</span>${esc(v[0])}</button></li>`).join('')}</ol><div class="cp-step-content" aria-live="polite"><span class="eyebrow">STEP ${ui.step + 1} OF ${s.steps.length}</span><h3>${esc(step[0])}</h3><p>${esc(step[1])}</p><aside><strong>What to show and explain</strong><p>${esc(step[2])}</p></aside></div><div class="cp-step-actions"><button class="btn" data-client-action="previous" type="button" ${ui.step === 0 ? 'disabled' : ''}>← Previous</button><span>${ui.step + 1} / ${s.steps.length}</span><button class="btn primary" data-client-action="next" type="button" ${ui.step === s.steps.length - 1 ? 'disabled' : ''}>Next step →</button></div><div class="cp-demo-open">${link(scenarioRoute(context, s), 'Open working example', true)}<button class="btn" data-client-action="prepare" type="button">Prepare sample cases</button><p data-client-preparation role="status">${esc(ui.preparation || 'Prepares fictional inbox cases once. It keeps existing case history and never touches native ShiftCare data.')}</p></div></section></div><div class="cp-failure"><div><span class="eyebrow">SHOW A FAILURE, TOO</span><h3>A visible exception is better than a hidden mistake</h3><p>Demonstrate a missing field, an unclear reply or a lost response. The case keeps its owner and explains the next action. An unknown write is checked before another attempt.</p></div>${link('office/automation', 'Open the exception queue')}</div>`;
  }
  function estimateResult() {
    const result = estimate(ui.estimate);
    if (!result.ready)
      return '<span class="cp-overline">MONTHLY CAPACITY ESTIMATE</span><strong class="cp-value-number">Not calculated</strong><p>Enter case volume and both handling times. Empty fields are unknown, not zero.</p>';
    return `<span class="cp-overline">${result.hours < 0 ? 'MONTHLY ADDITIONAL EFFORT' : 'MONTHLY CAPACITY RELEASED'}</span><strong class="cp-value-number">${decimal(Math.abs(result.hours))}<small>staff hours</small></strong><p>${result.hours < 0 ? 'This assumption uses more staff time. Review the process before claiming a benefit.' : 'Staff time potentially available for other work. This is an estimate, not a measured result.'}</p><div class="cp-value-cost"><strong>${result.costEquivalent === null ? 'Cost equivalent not entered' : money(result.costEquivalent)}</strong><span>Gross staff-time cost equivalent / month. Capacity value, not a cash saving; project and operating costs are excluded.</span></div>`;
  }
  function scoreChange(metric) {
    const input = ui.score[metric.id] || {},
      c = comparison(input.baseline, input.pilot, metric.direction);
    if (!c.ready) return '<span class="cp-muted">Not compared</span>';
    return `<strong class="${c.change === 0 ? 'cp-neutral' : c.improvement ? 'cp-positive' : 'cp-negative'}">${c.change > 0 ? '+' : ''}${decimal(c.change)}</strong><small>${c.change === 0 ? 'No change' : c.improvement ? 'Favourable direction' : 'Needs review'}${ui.baselinePeriod.trim() && ui.pilotPeriod.trim() ? ' · verify comparable work' : ' · periods missing'}</small>`;
  }
  function value() {
    return `${heading('A BUSINESS CASE YOU CAN CHECK', 'Measure effort, accuracy and follow-through', 'Agree a baseline before the pilot. Compare similar work, include review and exception time, and report what is still manual. No client savings are pre-filled.')}<section class="cp-block"><div class="cp-section-line"><h3>Estimate potential capacity</h3>${tag(ui.estimateBasis === 'illustrative' ? 'Illustrative example · not client data' : 'Assumptions · not measured savings', 'amber')}</div><div class="cp-value-grid"><form id="client-value-form" class="cp-value-form"><label>Cases per month<input type="number" name="volume" min="0" step="1" inputmode="numeric" value="${esc(ui.estimate.volume ?? '')}" placeholder="e.g. monthly intakes"></label><label>Manual minutes per case<input type="number" name="manualMinutes" min="0" step="any" inputmode="decimal" value="${esc(ui.estimate.manualMinutes ?? '')}" placeholder="Before automation"></label><label>Assisted minutes per case<input type="number" name="assistedMinutes" min="0" step="any" inputmode="decimal" value="${esc(ui.estimate.assistedMinutes ?? '')}" placeholder="Include review + exceptions"></label><label>Hourly staff cost · AUD · optional<input type="number" name="hourlyRate" min="0" step="any" inputmode="decimal" value="${esc(ui.estimate.hourlyRate ?? '')}" placeholder="For a cost equivalent"></label><p class="cp-caption">Capacity = cases × (manual − assisted minutes) ÷ 60. Savings must include the staff work left in the process.</p><div class="cp-form-actions"><button class="btn" data-client-action="illustrate" type="button">Try illustrative example</button><button class="btn" data-client-action="clear-estimate" type="button">Clear estimate</button></div></form><aside class="cp-value-result" data-client-estimate aria-live="polite">${estimateResult()}</aside></div></section><section class="cp-block"><div class="cp-section-line"><h3>Baseline and pilot scorecard</h3>${tag('Presenter-entered observations', 'blue')}</div><p class="cp-caption">These entries are not independently verified. Keep the source log and underlying case counts. A raw change is not sufficient to prove that automation caused the result.</p><div class="cp-periods"><label>Baseline period<input data-client-period="baselinePeriod" value="${esc(ui.baselinePeriod)}" maxlength="100" placeholder="Dates + case counts"></label><label>Pilot period<input data-client-period="pilotPeriod" value="${esc(ui.pilotPeriod)}" maxlength="100" placeholder="Dates + case counts"></label></div><div class="cp-score-wrap"><table class="cp-score"><thead><tr><th>Measure / unit</th><th>Baseline</th><th>Pilot</th><th>Raw change</th></tr></thead><tbody>${metrics.map((m) => `<tr><th scope="row"><strong>${m.label}</strong><small>${m.unit} · ${m.direction === 'lower' ? 'lower' : 'higher'} is favourable</small><span>${m.evidence}</span></th><td><input type="number" data-client-metric="${m.id}" data-client-observation="baseline" aria-label="${m.label} baseline" min="0" ${m.unit.startsWith('per 100') ? 'max="100"' : ''} step="any" value="${esc(ui.score[m.id]?.baseline ?? '')}" placeholder="—"></td><td><input type="number" data-client-metric="${m.id}" data-client-observation="pilot" aria-label="${m.label} pilot" min="0" ${m.unit.startsWith('per 100') ? 'max="100"' : ''} step="any" value="${esc(ui.score[m.id]?.pilot ?? '')}" placeholder="—"></td><td data-client-change="${m.id}">${scoreChange(m)}</td></tr>`).join('')}</tbody></table></div></section><section class="cp-report-callout"><div><h3>A report the client can take away</h3><p>Download the scope, expected benefits, saved proof status, assumptions and scorecard as Markdown. Entries stay in this page’s memory until reload; save the report to keep them. Record details and credentials are excluded.</p></div><button class="btn primary" data-client-action="report" type="button">Download client report .md</button></section>`;
  }
  function formatDate(value, timeZone) {
    if (!value) return 'Not recorded';
    try {
      return new Intl.DateTimeFormat('en-AU', {
        timeZone: timeZone || 'UTC',
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value));
    } catch (_) {
      return value;
    }
  }
  function proofBlock() {
    const e = ui.evidence;
    if (!e)
      return `<p class="cp-caption">${ui.evidenceError ? esc(ui.evidenceError) : 'Loading saved account evidence…'}</p>`;
    if (!e.available)
      return `<div class="cp-proof-empty"><strong>${esc(e.reason)}</strong><p>Use the fictional walkthrough to explain the design. Open Integration proof to load and check authorised evidence; this screen cannot establish native success from sample data.</p>${link('office/verification', 'Open Integration proof')}</div>`;
    return `<div class="cp-proof-summary"><article><span>Saved ${e.method === 'mcp' ? 'authenticated assistant reads' : 'authenticated website reads'}</span><strong>${e.reads} read receipts</strong><p>${e.shifts} visible shifts · ${e.participants} participants · ${e.staff} staff</p><small>Captured ${esc(formatDate(e.capturedAt, e.timeZone))} · ${esc(e.timeZone)}. ${e.complete ? 'The requested shift scope is marked complete.' : 'The visible scope requires review.'} Not a live connection check.</small></article><article><span>Matching saved checks</span><strong>${e.findings === null ? 'No saved run selected' : `${e.findings} review signals`}</strong><p>${e.findings === null ? 'Run captured-data checks in Integration proof, then refresh this saved summary.' : 'Items for a person to investigate. These are not confirmed missed services or financial mistakes.'}</p><small>Clicking this presentation does not re-read ShiftCare or execute a check run.</small></article><article><span>Native action proof</span><strong>${e.nativeVerified ? 'One follow-up checked' : 'No verified write loaded'}</strong><p>${e.nativeVerified ? `Administrative action ${esc(e.actionId)} was independently read back. This is one supervised test, not the whole automation.` : 'Sample approvals are separate from native ShiftCare proof.'}</p><small>${e.nativeVerified ? `Read back ${esc(formatDate(e.verifiedAt, e.timeZone))} · status at that read: ${esc(e.statusAtRead)}. Current completion is not polled.` : 'Native actions need exact approval, supported account access and an independent result check.'}</small></article></div><div class="cp-form-actions">${link('office/verification', 'Inspect the saved evidence')}<button class="btn" type="button" data-client-action="refresh-proof">Refresh saved summary</button></div>`;
  }
  function pilot() {
    return `${heading('START SMALL, THEN MEASURE', 'A supervised pilot before a wider rollout', 'Begin with the strongest client need. Validate access and exact actions in the intended account, measure total handling effort, and expand only when the results justify it.')}<section class="cp-block"><div class="cp-section-line"><h3>What we can honestly show today</h3>${tag('Prototype + dated evidence', 'blue')}</div><div class="cp-status-grid"><article><span class="cp-status-dot sample"></span><h4>Interactive sample</h4><p>Field review, approvals, duplicate checks, cover acceptance, separate handoffs and failure recovery work with fictional records.</p></article><article><span class="cp-status-dot recorded"></span><h4>Recorded native proof</h4><p>Saved authenticated trial reads and a checked administrative task can be shown when the private evidence is loaded below.</p></article><article><span class="cp-status-dot planned"></span><h4>Production pilot work</h4><p>Connect the actual sources and supported actions, add secure identities and background jobs, and validate sending, recovery and reporting.</p></article></div><div data-client-proof aria-live="polite">${proofBlock()}</div></section><section class="cp-block"><h3>A practical rollout</h3><ol class="cp-pilot-list"><li><span>01</span><div><h4>Agree the baseline and rules</h4><p>Choose a representative intake form, case volume, reviewer, required fields and success thresholds. Confirm consent and the intended ShiftCare account.</p></div></li><li><span>02</span><div><h4>Pilot reviewed onboarding</h4><p>Validate the chosen reads, writes and result checks. Run a limited set of real cases with staff approval, an exception owner and a separate accounting handoff.</p></div></li><li><span>03</span><div><h4>Review time and accuracy</h4><p>Compare equivalent cases, including review and recovery time. Report corrections, remaining manual work and total operating costs.</p></div></li><li><span>04</span><div><h4>Extend the workflows that earn their place</h4><p>Add reply/cancellation handling, then cover, documents and bookkeeping once policies and connections are confirmed. Validate live arrival information separately.</p></div></li></ol></section><div class="cp-pilot-bottom"><article class="cp-block"><h3>Decisions to agree with the client</h3><ul><li>Which forms, messages and periods are in the first pilot?</li><li>Who approves each change and owns a failed step?</li><li>Which cancellation, availability and communication rules apply?</li><li>What counts as success, and where will the evidence be logged?</li><li>Which existing exports and native tools should be retained?</li></ul></article><article class="cp-block"><h3>Explain the advantage plainly</h3><p>“Your team keeps working in ShiftCare. We prepare repetitive work and show what needs a decision. You should spend less time copying and chasing, and have a clearer record of what was checked. We will measure those benefits in a small pilot before expanding.”</p>${link('office/presentation/value', 'Set up the value report', true)}</article></div>`;
  }
  function body(context) {
    return {
      overview,
      'use-cases': useCases,
      walkthrough: () => walkthrough(context),
      value,
      pilot,
    }[ui.section]();
  }
  function page(context, section) {
    ui.section = sections.some((s) => s[0] === section) ? section : 'overview';
    return `<section class="client-presentation" id="client-presentation"><header class="cp-header"><div><span class="eyebrow">OCD BRILLIANCE · CLIENT WALKTHROUGH</span><h1>Automation, explained through your work.</h1><p>A proposed workflow, a practical prototype and a measurable pilot.</p></div><div class="cp-header-actions"><button class="btn" data-client-action="presentation" type="button" aria-pressed="${ui.presentation}">${ui.presentation ? 'Exit presentation' : 'Presentation view'}</button><button class="btn" data-client-action="report" type="button">Download report .md</button><button class="btn" data-client-action="print" type="button">Print view</button></div></header><nav class="cp-tabs" aria-label="Client walkthrough sections">${sections.map(([id, label], i) => `<a href="#/office/presentation/${id}" ${ui.section === id ? 'aria-current="page"' : ''}><span>${i + 1}</span>${label}</a>`).join('')}</nav><div data-client-content>${body(context)}</div><footer class="cp-footer"><span>Designed from the 5 October client workflow. Expected benefits must be measured in a pilot.</span><a href="#/office/overview">Return to office →</a></footer></section>`;
  }
  function unmount() {
    active?.controller.abort();
    active = null;
    root.document?.body.classList.remove('client-presentation-mode');
  }
  function mount(element, context) {
    unmount();
    const controller = new AbortController(),
      ctx = { element, context, controller };
    active = ctx;
    const alive = () => active === ctx && element.isConnected;
    const redraw = () => {
      if (alive()) element.querySelector('[data-client-content]').innerHTML = body(context);
    };
    const mode = () => {
      root.document.body.classList.toggle('client-presentation-mode', ui.presentation);
      const button = element.querySelector('[data-client-action="presentation"]');
      button.textContent = ui.presentation ? 'Exit presentation' : 'Presentation view';
      button.setAttribute('aria-pressed', String(ui.presentation));
    };
    const loadEvidence = async () => {
      try {
        const response = await root.fetch('/api/integration-proof', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (response.status === 401) {
          root.dispatchEvent(new Event('ocd-session-expired'));
          return;
        }
        if (!response.ok)
          throw new Error(
            'Saved evidence is unavailable. Open Integration proof to check the connection.',
          );
        const summary = evidenceSummary(await response.json());
        if (!alive()) return;
        ui.evidence = summary;
        ui.evidenceError = '';
      } catch (error) {
        if (!alive() || error.name === 'AbortError') return;
        ui.evidence = null;
        ui.evidenceError =
          'Saved evidence is unavailable. Open Integration proof to check the connection.';
      }
      const box = element.querySelector('[data-client-proof]');
      if (box && alive()) box.innerHTML = proofBlock();
    };
    element.addEventListener(
      'click',
      (event) => {
        const target = event.target.closest('button');
        if (!target) return;
        if (target.dataset.clientScenario) {
          ui.scenario = target.dataset.clientScenario;
          ui.step = 0;
          if (ui.section !== 'walkthrough') context.go('office/presentation/walkthrough');
          else redraw();
          return;
        }
        if (target.dataset.clientStep !== undefined) {
          ui.step = Number(target.dataset.clientStep);
          redraw();
          return;
        }
        switch (target.dataset.clientAction) {
          case 'presentation':
            ui.presentation = !ui.presentation;
            mode();
            break;
          case 'print':
            root.print();
            break;
          case 'previous':
            ui.step = Math.max(0, ui.step - 1);
            redraw();
            break;
          case 'next':
            ui.step = Math.min(
              scenarios.find((s) => s.id === ui.scenario).steps.length - 1,
              ui.step + 1,
            );
            redraw();
            break;
          case 'prepare': {
            const engine = root.OCD_AUTOMATION_ENGINE;
            engine.ensure(context.state);
            engine.receiveSamples(context.state);
            const result = engine.ingest(context.state);
            engine.sync(context.state);
            context.save();
            ui.preparation = `${result.created} new sample cases prepared; ${result.duplicates} repeated sources skipped. Existing case history is retained. No native ShiftCare changes.`;
            redraw();
            break;
          }
          case 'illustrate':
            ui.estimate = {
              volume: '40',
              manualMinutes: '20',
              assistedMinutes: '8',
              hourlyRate: '35',
            };
            ui.estimateBasis = 'illustrative';
            redraw();
            break;
          case 'clear-estimate':
            ui.estimate = {};
            ui.estimateBasis = 'assumptions';
            redraw();
            break;
          case 'refresh-proof':
            loadEvidence();
            break;
          case 'report': {
            const date = new Date().toISOString().slice(0, 10);
            const report = buildReport({
              date,
              estimate: ui.estimate,
              estimateBasis: ui.estimateBasis,
              score: ui.score,
              baselinePeriod: ui.baselinePeriod,
              pilotPeriod: ui.pilotPeriod,
              evidence: ui.evidence,
            });
            const url = root.URL.createObjectURL(
              new Blob([report], { type: 'text/markdown;charset=utf-8' }),
            );
            const a = root.document.createElement('a');
            a.href = url;
            a.download = `OCD_Client_Automation_Report_${date}.md`;
            root.document.body.append(a);
            a.click();
            a.remove();
            root.setTimeout(() => root.URL.revokeObjectURL(url), 1000);
            break;
          }
        }
      },
      { signal: controller.signal },
    );
    element.addEventListener(
      'input',
      (event) => {
        const target = event.target;
        if (target.form?.id === 'client-value-form') {
          ui.estimate[target.name] = target.value;
          ui.estimateBasis = 'assumptions';
          element.querySelector('[data-client-estimate]').innerHTML = estimateResult();
          element
            .querySelector('#client-value-form')
            .closest('.cp-block')
            .querySelector('.cp-tag').textContent = 'Assumptions · not measured savings';
        }
        if (target.dataset.clientMetric) {
          (ui.score[target.dataset.clientMetric] ||= {})[target.dataset.clientObservation] = target
            .validity.valid
            ? target.value
            : '';
        }
        if (target.dataset.clientPeriod) ui[target.dataset.clientPeriod] = target.value;
        if (target.dataset.clientMetric || target.dataset.clientPeriod)
          for (const metric of metrics) {
            element.querySelector(`[data-client-change="${metric.id}"]`).innerHTML =
              scoreChange(metric);
          }
      },
      { signal: controller.signal },
    );
    element.addEventListener('submit', (event) => event.preventDefault(), {
      signal: controller.signal,
    });
    root.document.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape' && ui.presentation) {
          ui.presentation = false;
          mode();
        }
      },
      { signal: controller.signal },
    );
    mode();
    loadEvidence();
  }
  return {
    sections,
    areas,
    metrics,
    scenarios,
    estimate,
    comparison,
    evidenceSummary,
    buildReport,
    banner,
    page,
    mount,
    unmount,
  };
});
