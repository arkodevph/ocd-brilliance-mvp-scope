import { object, string, type Data, type Policy, type Proposal, type WorkflowId } from './types';
import { personMapping } from './mapping';
import { extractPerson } from './person-extraction';
const { extractText, validDate } = require('../../lib/intake-domain.cjs');

const rows = (value: unknown): Data[] =>
  Array.isArray(value) ? value.slice(0, 250).map(object) : [];
const dateTime = (value: unknown) =>
  typeof value === 'string' &&
  /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
  Number.isFinite(Date.parse(value))
    ? Date.parse(value)
    : NaN;
export function localDate(now: Date, timeZone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// These handlers prepare proposals from explicitly supplied evidence. They never mutate
// ShiftCare, infer delivered hours, invent capacity, or release invoices/payroll.
export function prepare(
  workflow: WorkflowId,
  data: Data,
  policy: Policy,
  now = new Date(),
): Proposal {
  const p: Proposal = {
    summary: '',
    findings: [],
    missing: [],
    nextAction: '',
    effect: 'internal',
    operation: 'review.record',
    fields: {},
  };
  const need = (condition: unknown, message: string) => {
    if (!condition) p.missing.push(message);
  };
  const requireEvidence = () =>
    need(
      string(data.evidenceReference) || string(data.intakeId) || string(data.messageId),
      'Supply the original evidence reference.',
    );
  requireEvidence();
  if (data.collectionError) p.missing.push(string(data.collectionError, 1000));
  switch (workflow) {
    case 'W01': {
      const postcode = string(data.postcode);
      need(/^\d{4}$/.test(postcode), 'Supply a valid Australian postcode.');
      need(policy.postcodes.length, 'Configure the approved service-area list.');
      const coverage = policy.postcodes.includes(postcode) ? 'covered' : 'office_review';
      p.summary = 'Check coverage and assign enquiry follow-up.';
      p.fields = {
        postcode,
        coverage,
        capacityConfirmed: data.capacityConfirmed === true,
        intakeId: data.intakeId || null,
      };
      if (coverage === 'office_review')
        p.findings.push('Area needs office review, including negotiable adjacent areas.');
      if (data.capacityConfirmed !== true)
        p.findings.push('Worker capacity and preferred hours remain to confirm.');
      p.nextAction = 'Confirm capacity and contact the enquirer; record the next action.';
      break;
    }
    case 'W02': {
      const text = `${string(data.subject, 250)}\n${string(data.text, 12000)}\n${string(data.attachmentText, 12000)}`;
      need(text.trim(), 'Supply the original message text.');
      const urgent = /\b(urgent|missed visit|no show|unsafe|complaint)\b/i.test(text);
      const reply = string(data.text, 12000)
        .match(/^\s*(yes|no|cancel|change)\b/i)?.[1]
        ?.toLowerCase();
      const reminder = reply && /\b(reminder|confirmation|shiftcare)\b/i.test(string(data.subject));
      const shiftRefs = [
        ...new Set(
          [
            ...text.matchAll(
              /\b(?:ShiftCare\s+)?shift(?:\s+(?:id|reference))?\s*[:#]\s*([1-9]\d*)\b/gi,
            ),
          ].map((m) => m[1]),
        ),
      ];
      const category = reminder
        ? 'reminder'
        : /\b(payroll|pay query|underpaid)\b/i.test(text)
          ? 'payroll'
          : /\b(invoice|payment|billing)\b/i.test(text)
            ? 'finance'
            : /\b(cancel|cancellation)\b/i.test(text)
              ? 'cancellation'
              : /\b(sickness|sick|replacement cover|reschedule)\b/i.test(text)
                ? 'change'
                : /\b(employee|worker onboarding|staff application)\b/i.test(text)
                  ? 'worker'
                  : /\b(intake|referral|participant form)\b/i.test(text)
                    ? 'participant'
                    : /\b(agreement|signed|signature)\b/i.test(text)
                      ? 'agreement'
                      : 'enquiry';
      const suggestion = (
        {
          reminder: 'W06',
          payroll: 'W11',
          finance: 'W10',
          cancellation: 'W07',
          change: 'W08',
          worker: 'W04',
          participant: 'W03',
          agreement: 'W05',
          enquiry: 'W01',
        } as const
      )[category];
      const selectedRoute = [
        'W01',
        'W03',
        'W04',
        'W05',
        'W06',
        'W07',
        'W08',
        'W09',
        'W10',
        'W11',
        'W12',
        'W13',
      ].includes(string(data.nextWorkflow));
      const route = selectedRoute ? string(data.nextWorkflow) : suggestion;
      const extraction = text.trim() ? extractPerson(text) : null;
      p.summary = 'Prepare mailbox classification and an owned follow-up.';
      p.fields = {
        category,
        suggestedWorkflow: route,
        routingSource: selectedRoute ? 'staff-selected' : 'classification-suggestion',
        urgent,
        extracted: extraction?.fields || {},
        extractionEvidence: extraction?.evidence || {},
        messageId: data.messageId || null,
        attachmentsPendingReview: data.hasAttachments === true,
        replyCandidate: reminder
          ? {
              response: reply,
              shiftId: shiftRefs.length === 1 ? shiftRefs[0] : '',
              ambiguous: shiftRefs.length !== 1,
            }
          : null,
      };
      p.findings = [
        'Classification is a suggestion. Staff confirm the person, urgency and route.',
        ...(extraction?.warnings || []),
      ];
      if (data.sourceTextTruncated === true)
        p.findings.push(
          'This is a bounded text excerpt. Review the complete original in Outlook before confirming.',
        );
      if (category === 'finance')
        p.findings.push('Invoice identity and any adjustment require bookkeeper review.');
      if (reminder)
        p.findings.push(
          'Check the original reply and exact native occurrence. Quoted references and sender addresses do not establish participant identity.',
        );
      p.nextAction = 'Review the original message, confirm routing and assign the follow-up.';
      break;
    }
    case 'W03':
    case 'W04': {
      need(
        policy.onboardingReady,
        'Validate native intake coverage and approve the remaining onboarding extraction/mapping rules.',
      );
      const source = `${string(data.text, 12000)}\n${string(data.attachmentText, 12000)}`
        .trim()
        .slice(0, 12000);
      const extracted = source ? extractPerson(source) : { fields: {}, warnings: [], evidence: {} };
      const fields = { ...extracted.fields, ...object(data.fields) };
      need(string(fields.name), 'Confirm the person’s full name.');
      need(
        string(fields.email) || (workflow === 'W03' && string(fields.phone)),
        'Confirm contact details.',
      );
      if (fields.email)
        need(/^\S+@\S+\.\S+$/.test(string(fields.email)), 'Correct the email address.');
      if (workflow === 'W03') {
        need(data.consent === true, 'Confirm consent from the original participant paperwork.');
        if (!string(data.nativeId))
          need(
            validDate(string(fields.dob)),
            'A new client needs a verified date of birth; use the reviewed intake screen to resolve missing fields.',
          );
      }
      need(
        data.identityChecked === true,
        'Check existing ShiftCare records for duplicates and confirm identity.',
      );
      p.summary =
        workflow === 'W03'
          ? 'Prepare reviewed participant fields and an accounting checkpoint.'
          : 'Prepare worker setup and a separate screening/payroll checkpoint.';
      p.effect = 'native';
      p.operation =
        workflow === 'W03'
          ? 'client.upsert'
          : string(data.nativeId)
            ? 'staff.update'
            : 'staff.create';
      p.fields = {
        fields,
        nativeWriteFields: personMapping(
          workflow === 'W03',
          fields,
          Boolean(string(data.nativeId)),
        ),
        nativeId: string(data.nativeId),
        intakeId: string(data.intakeId),
        evidence: extracted.evidence,
        accountingRequired: true,
        matchCandidates: data.matchCandidates || [],
      };
      p.findings = [
        ...extracted.warnings,
        'Validate the client’s approved field mapping and native Inbox Signals/Referrals coverage before custom extraction.',
        'This adapter writes only the displayed nativeWriteFields. Service, funding and assessment details remain in the original intake and require their own checked native setup.',
      ];
      p.nextAction =
        'Review source fields, use the supported native handoff, then check accounting/payroll separately.';
      break;
    }
    case 'W05':
      p.summary = 'Track the existing agreement process and correct returned-document filing.';
      need(string(data.nativeId), 'Match the document to the correct native person.');
      need(string(data.documentName), 'Identify the document and version.');
      p.effect = data.returned === true ? 'native' : 'internal';
      p.operation = data.returned === true ? 'document.file' : 'agreement.follow_up';
      if (data.returned === true && data.fileId) {
        need(data.signedChecked === true, 'Check the returned signature and agreement version.');
        need(
          data.filingChecked === true,
          'Confirm the document type, participant and staff visibility.',
        );
        need(string(data.documentTypeId), 'Choose the account’s actual document type.');
      }
      p.fields = {
        nativeId: data.nativeId,
        documentName: data.documentName,
        returned: data.returned === true,
        signedChecked: data.signedChecked === true,
        fileId: data.fileId || '',
        documentTypeId: data.documentTypeId || '',
        staffVisible: data.staffVisible === true,
        expires: data.expires || '',
        noExpiration: data.noExpiration === true,
      };
      if (data.returned !== true)
        p.findings.push(
          'Returned document is outstanding; office follows the existing signing process.',
        );
      p.nextAction =
        'Check the returned version and file through Inbox Signals or ShiftCare Documents.';
      break;
    case 'W06': {
      need(string(data.shiftId), 'Match the reply to one exact ShiftCare occurrence.');
      const response = string(data.response).toLowerCase();
      need(
        ['yes', 'no', 'cancel', 'change'].includes(response),
        'Clarify the reply; silence or an unclear response is not a cancellation.',
      );
      p.summary = 'Record the reviewed reply to the existing native reminder.';
      p.operation = 'reply.record';
      p.fields = { shiftId: data.shiftId || null, response, reason: string(data.reason, 2000) };
      if (response !== 'yes')
        p.findings.push(
          'Prepare a separate cancellation/change case after occurrence and reason review.',
        );
      p.nextAction =
        'Confirm the occurrence and reply; route any service change for its own review.';
      break;
    }
    case 'W07':
      need(string(data.shiftId), 'Select the exact shift occurrence.');
      need(string(data.reason, 2000), 'Record the cancellation reason.');
      need(
        data.scopeChecked === true,
        'Check all affected clients and staff; group cases need native review.',
      );
      need(
        ['with_charge', 'without_charge'].includes(string(data.treatment)),
        'Confirm the charge/pay treatment under the client’s policy.',
      );
      need(data.policyChecked === true, 'Confirm the notice rule and any billing exception.');
      need(
        data.travelChecked === true && string(data.travelReference, 1000),
        'Before cancellation, check actual travel and complete any untravelled-mileage cleanup in ShiftCare; record the checked reference or a source-backed not-required explanation.',
      );
      p.summary = 'Prepare the exact cancellation, reason and money consequences.';
      p.effect = 'native';
      p.operation = 'shift.cancel';
      p.fields = {
        shiftId: data.shiftId || null,
        reason: data.reason || null,
        treatment: data.treatment || null,
        travelReference: string(data.travelReference, 1000),
      };
      p.findings = [
        'Verify the current native shift and charging consequences immediately before execution.',
      ];
      p.nextAction =
        'Check travel cleanup before cancellation, approve the exact occurrence and treatment, then verify the native result. Financial and participant/worker communication follow-through must finish before case closure.';
      break;
    case 'W08':
      need(string(data.shiftId), 'Identify the native occurrence or reviewed booking request.');
      need(string(data.workerId), 'Select a real eligible worker through the native roster.');
      for (const [key, label] of [
        ['availabilityChecked', 'availability and recurring commitments'],
        ['qualificationsChecked', 'qualifications and service eligibility'],
        ['workerAccepted', 'worker acceptance'],
        ['participantAgreed', 'participant agreement'],
      ] as const)
        need(data[key] === true, `Confirm ${label}.`);
      if (data.startAt || data.endAt)
        need(
          Number.isFinite(dateTime(data.startAt)) &&
            Number.isFinite(dateTime(data.endAt)) &&
            dateTime(data.endAt) > dateTime(data.startAt),
          'Supply both rescheduled times with explicit time-zone offsets.',
        );
      p.summary = 'Coordinate booking changes or replacement cover with native acceptance.';
      p.effect = 'native';
      p.operation = 'shift.assign';
      p.fields = {
        shiftId: data.shiftId || null,
        workerId: data.workerId || null,
        payGroupId: data.payGroupId || null,
        startAt: data.startAt || null,
        endAt: data.endAt || null,
        recurringChange: false,
      };
      p.findings = [
        'An empty calendar slot is insufficient. Preserve recurring commitments and escalate if no suitable cover is available.',
      ];
      p.nextAction =
        'Use native matching/offers, obtain acceptance, and verify the final assignment.';
      break;
    case 'W09':
    case 'W10':
    case 'W11': {
      const visits = rows(data.visits);
      need(
        visits.length ||
          (object(data.nativeEvidence).complete === true && data.collectionEmpty === true),
        'Provide current visit evidence or collect an explicit native review period.',
      );
      const exceptions = visits.map((v) => {
        const findings: string[] = [];
        const start = dateTime(v.startAt),
          end = dateTime(v.endAt),
          actualStart = dateTime(v.clockIn),
          actualEnd = dateTime(v.clockOut);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
          findings.push('Scheduled times missing/invalid.');
        if (
          !Number.isFinite(actualStart) ||
          !Number.isFinite(actualEnd) ||
          actualEnd <= actualStart
        )
          findings.push('Actual times missing/invalid; delivered time cannot be inferred.');
        else if (
          Number.isFinite(start) &&
          Number.isFinite(end) &&
          actualEnd - actualStart !== end - start
        )
          findings.push('Actual and scheduled duration differ; check the explanation.');
        if (!string(v.note, 12000)) findings.push('Progress note needs review.');
        if (v.significantIssue === true)
          findings.push(
            'Significant issue: restricted office review under the existing escalation process.',
          );
        if (v.timesheetAmbiguous === true)
          findings.push(
            'Several timesheets match; check the original attendance before using these hours.',
          );
        if (!string(v.workerId) && v.source === 'ShiftCare API v3')
          findings.push('No worker is assigned to the source shift.');
        if (workflow === 'W10' && (!string(v.payer) || !string(v.funding)))
          findings.push('Verify payer and funding.');
        if (
          workflow === 'W11' &&
          (typeof v.kilometres !== 'number' ||
            v.kilometres < 0 ||
            typeof v.travelMinutes !== 'number' ||
            v.travelMinutes < 0)
        )
          findings.push('Verify kilometres and travel evidence.');
        if (
          workflow === 'W11' &&
          Array.isArray(v.payItems) &&
          v.payItems.some((item) => !object(item).id)
        )
          findings.push(
            'Native pay items are missing; check pay configuration before payroll export.',
          );
        return { shiftId: string(v.shiftId), workerId: string(v.workerId), findings };
      });
      p.summary =
        workflow === 'W09'
          ? 'Prepare an office care/attendance exception list.'
          : workflow === 'W10'
            ? 'Prepare the bookkeeper’s invoice exception list.'
            : 'Prepare the bookkeeper’s payroll exception list.';
      p.fields = {
        exceptions,
        period: object(data.period),
        reviewedVisitCount: visits.length,
        sourceComplete: object(data.nativeEvidence).complete === true,
        invoices: data.invoices || [],
      };
      p.findings =
        workflow === 'W09'
          ? ['Keep source notes and confidential access controls; check native Care Signals first.']
          : ['Rates, financial approval, existing exports and release remain with the bookkeeper.'];
      if (data.collectionEmpty === true)
        p.findings.push(
          'The completed native read returned no visits for this exact period and scope.',
        );
      p.nextAction =
        'Review exceptions against native evidence and record the reviewer’s disposition.';
      break;
    }
    case 'W12': {
      const documents = rows(data.documents),
        today = localDate(now, policy.timeZone);
      need(
        documents.length,
        'Supply current document categories, expiry dates and verification evidence.',
      );
      p.summary = 'Prepare document cleanup and genuine renewal follow-up.';
      p.fields = {
        documents: documents.map((d) => {
          const expiry = string(d.expires);
          const days = validDate(expiry)
            ? (Date.parse(`${expiry}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000
            : null;
          const status =
            d.noExpirationVerified === true && !expiry
              ? 'verified_non_expiring'
              : days === null
                ? 'needs_evidence'
                : days < 0
                  ? 'expired'
                  : days <= policy.documentNoticeDays
                    ? 'due_soon'
                    : 'current';
          return {
            id: string(d.id),
            personId: string(d.personId),
            category: string(d.category),
            expiry,
            days,
            status,
          };
        }),
      };
      if (string(data.documentId)) {
        const resource = string(data.documentResource);
        need(
          ['client-document', 'staff-qualification'].includes(resource),
          'Choose a supported native metadata correction. Staff-file corrections remain a checked ShiftCare handoff.',
        );
        need(
          data.metadataChecked === true,
          'Check the original document before correcting its expiry.',
        );
        need(
          resource !== 'client-document' || string(data.nativeId),
          'Identify the client who owns the document.',
        );
        need(
          (resource === 'client-document' && data.noExpiration === true) ||
            validDate(string(data.expires)),
          'Confirm the corrected expiry or verified non-expiring treatment.',
        );
        p.effect = 'native';
        p.operation = resource === 'client-document' ? 'document.metadata' : 'qualification.expiry';
        p.fields.correction = {
          resource,
          id: data.documentId,
          clientId: data.nativeId || '',
          expires: data.expires || '',
          noExpiration: data.noExpiration === true,
        };
      }
      p.findings = [
        'Blank expiry alone does not prove a document never expires. Correct native metadata from evidence before suppressing alerts.',
      ];
      p.nextAction =
        'Check categories and dates; assign genuine renewal follow-up using existing reminders.';
      break;
    }
    case 'W13':
      need(string(data.recipient), 'Confirm the actual recipient and access rights.');
      need(string(data.message, 2000), 'Review the message to deliver.');
      need(string(data.channel) === 'native', 'Use the agreed staff handoff through ShiftCare.');
      need(
        data.outcomeVerified === true,
        'Verify the underlying outcome before communicating success.',
      );
      p.summary = 'Prepare a reviewed communication and track its separate delivery outcome.';
      p.effect = 'delivery';
      p.operation = 'message.deliver';
      if (data.assigneeId) {
        p.effect = 'native';
        p.operation = 'communication.handoff';
      }
      p.fields = {
        recipient: data.recipient || null,
        message: data.message || null,
        channel: data.channel || null,
      };
      if (data.assigneeId) p.fields.assigneeId = data.assigneeId;
      p.findings = [
        'Staff communicate through ShiftCare. Creating a follow-up action item does not establish message delivery.',
      ];
      p.nextAction = 'Complete the ShiftCare communication and retain its checked reference.';
      break;
    case 'W14': {
      const updated = dateTime(data.updatedAt),
        remaining = data.remainingMinutes;
      const fresh =
        Number.isFinite(updated) &&
        now.getTime() >= updated &&
        now.getTime() - updated <= policy.etaFreshSeconds * 1000;
      need(
        string(data.shiftId) && string(data.workerId),
        'Verify the current native assignment and authorised worker identity.',
      );
      need(
        data.consent === true && data.assignmentChecked === true,
        'Confirm active journey consent and current assignment.',
      );
      need(fresh, 'Journey information is stale or missing; withdraw the estimate.');
      need(
        typeof remaining === 'number' && Number.isFinite(remaining) && remaining >= 0,
        'Provide a real calculated or worker-entered arrival estimate.',
      );
      p.summary = 'Validate an authorised arrival estimate and withdraw stale data.';
      p.effect = 'journey';
      p.operation = 'journey.publish';
      p.fields = {
        shiftId: data.shiftId || null,
        workerId: data.workerId || null,
        visible: fresh && data.consent === true && data.assignmentChecked === true,
        remainingMinutes: fresh ? (remaining ?? null) : null,
        updatedAt: data.updatedAt || null,
      };
      p.findings = [
        'Mapbox calculates routes; worker location capture, production identities and audience permissions remain separate integration work.',
      ];
      p.nextAction =
        'Verify journey source and recipient permissions before publishing an arrival update.';
      break;
    }
  }
  if (p.effect === 'native') p.fields.nativeContext = object(data.nativeContext);
  if (workflow === 'W07') p.fields.absentReason = string(data.absentReason);
  return p;
}
