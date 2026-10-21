import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import {
  receiveTaskMessage,
  assignMessageTask,
  updateTaskAssignment,
  suggestTask,
  completeMessageTask,
} from '../frontend/features/inbox-tasks/engine.mjs';
import { inboxTasksPage } from '../frontend/features/inbox-tasks/page.mjs';
const require = createRequire(import.meta.url),
  E = require('../workspace/automation-engine.js');
function seed() {
  const box = { window: {} };
  vm.runInNewContext(
    fs.readFileSync(new URL('../workspace/data.js', import.meta.url), 'utf8'),
    box,
  );
  const s = structuredClone(box.window.OCD_DEMO_SEED);
  E.ensure(s);
  return s;
}
const mail = {
  sender: 'person@example.test',
  title: 'Booking request',
  body: 'Please book a cleaning visit on Friday.',
};
const assignment = (s) => ({
  sourceId: s.id,
  type: 'Booking request',
  owner: 'Roster team',
  dueDate: '2026-10-22',
  nextAction: 'Confirm the participant and service date.',
  checked: true,
  by: 'Reviewer',
});
test('booking, cancellation and document messages suggest a task without changing source systems', () => {
  for (const [title, type] of [
    ['Booking request', 'Booking request'],
    ['Cancel my booking', 'Cancellation'],
    ['Certificate attachment', 'Document email'],
    ['Hello', 'Other / clarify'],
  ])
    assert.equal(suggestTask({ title, body: '' }).type, type);
  const s = seed(),
    before = structuredClone(s.bookings),
    source = receiveTaskMessage(s, mail, E);
  assert.equal(s.automation.jobs.length, 0);
  const j = assignMessageTask(s, assignment(source), E);
  assert.equal(j.owner, 'Roster team');
  assert.equal(j.dueDate, '2026-10-22');
  assert.equal(j.status, 'manual_action_required');
  assert.deepEqual(s.bookings, before);
  assert.equal(j.source.body, mail.body);
});
test('duplicate imports and assignments reuse the same source/task across reload', () => {
  const s = seed(),
    source = receiveTaskMessage(s, mail, E);
  const j = assignMessageTask(s, assignment(source), E),
    n = s.automation.jobs.length;
  const restored = JSON.parse(JSON.stringify(s));
  assert.equal(receiveTaskMessage(restored, mail, E).id, source.id);
  assert.equal(assignMessageTask(restored, assignment(source), E).id, j.id);
  assert.equal(restored.automation.jobs.length, n);
  assert.equal(restored.automation.jobs.at(-1).dueDate, '2026-10-22');
});
test('invalid deadlines or unchecked review cannot create tasks', () => {
  const s = seed(),
    source = receiveTaskMessage(s, mail, E);
  for (const extra of [
    { dueDate: '2026-02-30' },
    { dueDate: '' },
    { checked: false },
    { owner: 'Unknown' },
    { nextAction: '' },
  ])
    assert.throws(() => assignMessageTask(s, { ...assignment(source), ...extra }, E), /Confirm/);
  assert.equal(s.automation.jobs.length, 0);
  assert.throws(() => receiveTaskMessage(s, { ...mail, sender: 'invalid' }, E), /valid sender/);
});
test('reassignment and deadlines persist with history; stale and completed tasks reject changes', () => {
  const s = seed(),
    source = receiveTaskMessage(s, mail, E),
    j = assignMessageTask(s, assignment(source), E);
  const token = JSON.stringify([j.owner, j.dueDate, j.draft.nextAction]);
  updateTaskAssignment(
    s,
    { id: j.id, token, owner: 'Office', dueDate: '2026-10-23', nextAction: 'Call participant' },
    E,
  );
  assert.equal(j.owner, 'Office');
  assert.equal(source.owner, 'Office');
  assert.match(j.history.at(-1).event, /2026-10-23/);
  assert.throws(
    () =>
      updateTaskAssignment(
        s,
        { id: j.id, token, owner: 'Office', dueDate: '2026-10-24', nextAction: 'Stale' },
        E,
      ),
    /changed/,
  );
  j.status = 'completed';
  assert.throws(() => updateTaskAssignment(s, { id: j.id }, E), /open/);
});
test('inbox views escape original text and show overdue tasks and verified completion handoff', () => {
  const s = seed(),
    source = receiveTaskMessage(s, { ...mail, title: '<img src=x>' }, E),
    j = assignMessageTask(s, assignment(source), E);
  const page = inboxTasksPage({
    state: s,
    detail: 'assigned',
    today: '2026-10-23',
    pageHeader: () => '',
  });
  assert.match(page, /Overdue/);
  assert.match(page, /Due 2026-10-22/);
  assert.ok(page.includes('&lt;img src=x&gt;'));
  const detail = inboxTasksPage({
    state: s,
    detail: j.id,
    today: '2026-10-23',
    pageHeader: () => '',
  });
  assert.match(detail, /Open team schedule/);
  assert.match(detail, /data-form="inbox-task-complete"/);
  assert.ok(!detail.includes('href="#/office/automation/'));
  assert.match(detail, /name="token"/);
  assert.match(detail, /data-form="inbox-task-update"/);
});

test('inbox triage cannot bypass review or duplicate an assigned email task', () => {
  const s = seed(),
    source = receiveTaskMessage(s, mail, E);
  E.ingest(s);
  assert.equal(
    s.automation.jobs.some((j) => j.source.id === source.id),
    false,
  );
  const j = assignMessageTask(s, assignment(source), E);
  E.ingest(s);
  assert.equal(s.automation.jobs.filter((x) => x.source.id === source.id).length, 1);
  assert.equal(j.dueDate, '2026-10-22');
});

test('checked completion stays on the task, requires current evidence and cannot mutate the booking', () => {
  const s = seed(),
    source = receiveTaskMessage(s, mail, E),
    j = assignMessageTask(s, assignment(source), E),
    before = structuredClone(s.bookings);
  const token = JSON.stringify([j.owner, j.dueDate, j.draft.nextAction]);
  assert.throws(
    () =>
      completeMessageTask(
        s,
        { id: j.id, token, checked: false, note: 'Done', reference: 'Contact log' },
        E,
      ),
    /confirmation/,
  );
  assert.throws(
    () =>
      completeMessageTask(
        s,
        { id: j.id, token: 'stale', checked: true, note: 'Done', reference: 'Contact log' },
        E,
      ),
    /changed/,
  );
  completeMessageTask(
    s,
    {
      id: j.id,
      token,
      checked: true,
      note: 'Confirmed requested service; scheduling remains separate.',
      reference: 'Contact log',
    },
    E,
  );
  assert.equal(j.status, 'completed');
  assert.equal(j.resolution.reference, 'Contact log');
  assert.deepEqual(s.bookings, before);
  const detail = inboxTasksPage({
    state: s,
    detail: j.id,
    today: '2026-10-21',
    pageHeader: () => '',
  });
  assert.match(detail, /Follow-up completed/);
  assert.match(detail, /Contact log/);
  assert.ok(!detail.includes('data-form="inbox-task-complete"'));
});

test('inbox separates message capture, pending messages, assigned work and completed history', () => {
  const s = seed(),
    waiting = receiveTaskMessage(s, { ...mail, title: 'Waiting message' }, E),
    assigned = receiveTaskMessage(s, { ...mail, title: 'Open assignment' }, E),
    closed = receiveTaskMessage(s, { ...mail, title: 'Finished follow-up' }, E);
  assignMessageTask(s, assignment(assigned), E);
  const done = assignMessageTask(s, assignment(closed), E);
  done.status = 'completed';
  const view = (detail) =>
    inboxTasksPage({ state: s, detail, today: '2026-10-23', pageHeader: () => '' });
  const messages = view();
  assert.match(messages, /Waiting message/);
  assert.ok(!messages.includes('Open assignment'));
  assert.ok(!messages.includes('Finished follow-up'));
  assert.ok(!messages.includes('data-form="inbox-task-receive"'));
  const open = view('assigned');
  assert.match(open, /Open assignment/);
  assert.ok(!open.includes('Waiting message'));
  assert.ok(!open.includes('Finished follow-up'));
  assert.match(open, /aria-current="page"/);
  const completed = view('completed');
  assert.match(completed, /Finished follow-up/);
  assert.ok(!completed.includes('Open assignment'));
  const compose = view('new');
  assert.match(compose, /data-form="inbox-task-receive"/);
  assert.ok(!compose.includes('inbox-task-list'));
  assert.ok(!compose.includes('Waiting message'));
});
