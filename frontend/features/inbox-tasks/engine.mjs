const clean = (v) => String(v || '').trim();
export const taskTypes = ['Booking request', 'Cancellation', 'Document email', 'Other / clarify'];
export const taskTeams = ['Roster team', 'HR / admin', 'Intake team', 'Bookkeeper', 'Office'];
const validDate = (v) =>
  /^\d{4}-\d{2}-\d{2}$/.test(v || '') &&
  Number.isFinite(Date.parse(v)) &&
  new Date(v).toISOString().slice(0, 10) === v;
export function suggestTask(source) {
  const text = `${source.title} ${source.body}`;
  if (/\bcancel(?:lation|led|ing)?\b/i.test(text))
    return {
      type: 'Cancellation',
      owner: 'Roster team',
      nextAction:
        'Confirm the participant and exact booking; review cancellation, travel and charge treatment.',
    };
  if (/\b(document|certificate|attachment|agreement|screening)\b/i.test(text))
    return {
      type: 'Document email',
      owner: 'HR / admin',
      nextAction:
        'Check the person, original document, version and expiry before filing or updating records.',
    };
  if (/\b(book(?:ing)?|visit|appointment)\b/i.test(text))
    return {
      type: 'Booking request',
      owner: 'Roster team',
      nextAction:
        'Confirm the participant, requested service and date; check availability before proposing a booking.',
    };
  return {
    type: 'Other / clarify',
    owner: 'Office',
    nextAction: 'Clarify the request and confirm the person and source before taking action.',
  };
}
export function receiveTaskMessage(state, input, engine) {
  const sender = clean(input.sender),
    title = clean(input.title),
    body = clean(input.body);
  if (!/^\S+@\S+\.\S+$/.test(sender) || !title || !body)
    throw new Error('Add a valid sender, subject and original message.');
  if (title.length > 200 || body.length > 12000)
    throw new Error('Keep the subject within200 characters and message within12000 characters.');
  const store = engine.ensure(state);
  const identity = JSON.stringify([sender.toLowerCase(), title, body]);
  const existing = store.inbox.find((s) => s.taskIdentity === identity);
  if (existing) return existing;
  const source = {
    id: `TASK-MAIL-${crypto.randomUUID()}`,
    sender,
    title,
    body,
    taskIdentity: identity,
    prototypeInput: true,
    label: 'Pasted email',
    workflow: 'W02',
    state: 'received',
    receivedAt: new Date().toISOString(),
  };
  source.taskSuggestion = suggestTask(source);
  store.inbox.push(source);
  return source;
}
export function assignMessageTask(state, input, engine) {
  const store = engine.ensure(state),
    source = store.inbox.find((s) => s.id === input.sourceId);
  if (!source) throw new Error('Message not found. Reopen Inbox tasks.');
  if (source.jobId) {
    const job = store.jobs.find((j) => j.id === source.jobId);
    if (job) return job;
    throw new Error('The linked task is unavailable. Review the original message before retrying.');
  }
  if (
    input.checked !== true ||
    !taskTypes.includes(input.type) ||
    !taskTeams.includes(input.owner) ||
    !clean(input.nextAction) ||
    !validDate(input.dueDate)
  )
    throw new Error(
      'Confirm the request type, responsible team, next action, due date and source review.',
    );
  const job = engine.create(state, {
    kind: 'email-review',
    workflow: 'W02',
    title: source.title,
    owner: input.owner,
    source: {
      id: source.id,
      label: `Email from ${source.sender}`,
      body: source.body,
      fields: { category: input.type, nextAction: clean(input.nextAction) },
    },
  });
  job.dueDate = input.dueDate;
  job.status = 'manual_action_required';
  job.stage = 'followup';
  job.history.push({
    at: new Date().toISOString(),
    event: `Original email reviewed; ${input.owner} assigned; due ${input.dueDate}.`,
    by: clean(input.by) || 'Office',
  });
  source.kind = 'email-review';
  source.jobId = job.id;
  source.owner = job.owner;
  source.state = 'routed';
  return job;
}
export function updateTaskAssignment(state, input, engine) {
  const job = engine.ensure(state).jobs.find((j) => j.id === input.id);
  if (!job || job.kind !== 'email-review' || job.status === 'completed')
    throw new Error('Choose an open email task.');
  if (input.token !== JSON.stringify([job.owner, job.dueDate || '', job.draft.nextAction || '']))
    throw new Error('This assignment changed. Reopen the task before saving.');
  if (!taskTeams.includes(input.owner) || !validDate(input.dueDate) || !clean(input.nextAction))
    throw new Error('Choose a responsible team, valid due date and next action.');
  job.owner = input.owner;
  job.dueDate = input.dueDate;
  job.draft.nextAction = clean(input.nextAction);
  job.updatedAt = new Date().toISOString();
  job.history.push({
    at: job.updatedAt,
    event: `Assignment updated: ${job.owner}; due ${job.dueDate}; ${job.draft.nextAction}`,
    by: clean(input.by) || 'Office',
  });
  const source = state.automation.inbox.find((s) => s.jobId === job.id);
  if (source) source.owner = job.owner;
  return job;
}

export function completeMessageTask(state, input, engine) {
  const job = engine.ensure(state).jobs.find((j) => j.id === input.id);
  if (!job || job.kind !== 'email-review' || job.status === 'completed')
    throw new Error('Choose an open email follow-up.');
  if (input.token !== JSON.stringify([job.owner, job.dueDate || '', job.draft.nextAction || '']))
    throw new Error('This task changed. Reopen it before recording the outcome.');
  if (input.checked !== true || !clean(input.reference) || !clean(input.note))
    throw new Error('Record the outcome, supporting reference and confirmation.');
  return engine.manual(state, job.id, {
    checked: true,
    reference: clean(input.reference),
    note: clean(input.note),
  });
}
