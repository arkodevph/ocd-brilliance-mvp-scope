import { taskTypes, taskTeams, suggestTask } from './engine.mjs';
const esc = (v) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const opts = (items, value) =>
  items.map((v) => `<option${v === value ? ' selected' : ''}>${esc(v)}</option>`).join('');
const error = '<p class="field-error" role="alert" hidden></p>';
export function inboxTasksPage({ state, detail, today, pageHeader }) {
  const store = state.automation,
    source = store.inbox.find((s) => s.id === detail),
    job = store.jobs.find((j) => j.id === detail);
  const view = ['new', 'assigned', 'completed'].includes(detail)
    ? detail
    : !detail
      ? 'messages'
      : 'detail';
  const messages = store.inbox.filter((s) => (s.taskIdentity || s.prototypeInput) && !s.jobId);
  const tasks = store.jobs.filter((j) => j.kind === 'email-review');
  const open = tasks.filter((j) => j.status !== 'completed');
  const completed = tasks.filter((j) => j.status === 'completed');
  const navigation = `<nav class="inbox-task-views" aria-label="Inbox task views">${[
    ['messages', 'Messages', messages.length, ''],
    ['assigned', 'Assigned', open.length, '/assigned'],
    ['completed', 'Completed', completed.length, '/completed'],
  ]
    .map(
      ([key, label, count, path]) =>
        `<a href="#/office/inbox-tasks${path}"${view === key ? ' aria-current="page"' : ''}>${label}<span>${count}</span></a>`,
    )
    .join('')}</nav>`;
  let content = '';
  if (view === 'new') {
    content = `<section class="panel inbox-task-compose"><h2>Email details</h2><p class="form-note">Paste the original email. You’ll review its suggested task before assigning it.</p><form data-form="inbox-task-receive"><label>Sender email<input name="sender" type="email" required maxlength="200" autocomplete="email"></label><label>Subject<input name="title" required maxlength="200"></label><label>Original message<textarea name="body" rows="6" required maxlength="12000"></textarea></label>${error}<div class="inbox-task-form-actions"><a class="btn" href="#/office/inbox-tasks">Cancel</a><button class="btn primary" type="submit">Review suggested task</button></div></form></section>`;
  } else if (source) {
    const suggestion = source.taskSuggestion || suggestTask(source);
    content = `<div class="inbox-task-review"><section class="panel"><h2>Original message</h2><p><strong>${esc(source.title)}</strong></p><p class="form-note">From ${esc(source.sender || 'Sample source')}</p><p class="inbox-task-body">${esc(source.body)}</p></section><section class="panel"><h2>Owner &amp; deadline</h2>${source.jobId ? `<p>This message already has an assigned task.</p><a class="btn primary" href="#/office/inbox-tasks/${esc(source.jobId)}">Open assigned task</a>` : `<p class="form-note">Suggestions use message keywords. Check the request, person and responsible team.</p><form data-form="inbox-task-assign" data-id="${esc(source.id)}"><label>Request type<select name="type">${opts(taskTypes, suggestion.type)}</select></label><label>Responsible team<select name="owner">${opts(taskTeams, suggestion.owner)}</select></label><label>Due date<input name="dueDate" type="date" required value="${esc(today)}"></label><label>Next action<textarea name="nextAction" required maxlength="1500">${esc(suggestion.nextAction)}</textarea></label><label class="checkbox"><input name="checked" type="checkbox" required><span>I checked the original message, request type, owner and deadline.</span></label>${error}<button class="btn primary" type="submit">Create assigned task</button></form>`}</section></div>`;
  } else if (job) {
    const token = JSON.stringify([job.owner, job.dueDate || '', job.draft.nextAction || '']);
    const destination =
      job.draft.category === 'Booking request' || job.draft.category === 'Cancellation'
        ? ['#/office/schedule', 'Open team schedule']
        : job.draft.category === 'Document email'
          ? ['#/office/staff', 'Open staff records']
          : ['#/office/work', 'Open work queue'];
    content = `<div class="inbox-task-review"><div class="inbox-task-stack"><section class="panel"><div class="inbox-task-section-heading"><h2>Next action</h2><span class="status">${job.status === 'completed' ? 'Completed' : job.dueDate && job.dueDate < today ? 'Overdue' : 'Assigned'}</span></div><p class="inbox-task-next">${esc(job.draft.nextAction)}</p><dl class="inbox-task-facts"><div><dt>Responsible team</dt><dd>${esc(job.owner)}</dd></div><div><dt>Due date</dt><dd>${esc(job.dueDate || 'Needs review')}</dd></div><div><dt>Request type</dt><dd>${esc(job.draft.category || 'Email follow-up')}</dd></div></dl><a class="btn" href="${destination[0]}">${destination[1]}</a>${job.draft.category === 'Document email' ? '<a class="btn" href="#/office/agreements">Open client agreements</a>' : ''}<p class="form-note">Confirm the matching person and record in the relevant section. This follow-up does not change that record.</p></section><section class="panel"><h2>Original email</h2><p class="form-note">${esc(job.source.label)}</p><p class="inbox-task-body">${esc(job.source.body)}</p></section><section class="panel inbox-task-history"><h2>Activity</h2><ol>${job.history.map((h) => `<li><p>${esc(h.event)}</p><small>${esc(h.at)}${h.by ? ' · ' + esc(h.by) : ''}</small></li>`).join('')}</ol></section></div><div class="inbox-task-stack">${job.status === 'completed' ? `<section class="panel"><h2>Follow-up completed</h2><p>${esc(job.resolution?.note)}</p><p class="form-note">Reference: ${esc(job.resolution?.reference)}</p></section>` : `<section class="panel"><h2>Record the outcome</h2><p class="form-note">Complete this follow-up after checking the requested action. Booking, document and financial decisions remain in their own sections.</p><form data-form="inbox-task-complete" data-id="${esc(job.id)}"><input type="hidden" name="token" value="${esc(token)}"><label>Outcome<textarea name="note" required maxlength="1500" placeholder="What was done, and how was it checked?"></textarea></label><label>Record or contact reference<input name="reference" required maxlength="500"></label><label class="checkbox"><input name="checked" type="checkbox" required><span>I checked the follow-up outcome and its reference.</span></label>${error}<button class="btn primary" type="submit">Complete follow-up</button></form></section><details class="panel inbox-task-edit"><summary>Edit assignment</summary><form data-form="inbox-task-update" data-id="${esc(job.id)}"><input type="hidden" name="token" value="${esc(token)}"><label>Responsible team<select name="owner">${opts(taskTeams, job.owner)}</select></label><label>Due date<input name="dueDate" type="date" value="${esc(job.dueDate)}" required></label><label>Next action<textarea name="nextAction" required maxlength="1500">${esc(job.draft.nextAction)}</textarea></label>${error}<button class="btn" type="submit">Save assignment</button></form></details>`}</div></div>`;
  } else if (view === 'detail') {
    content =
      '<section class="panel"><h2>Message or task unavailable</h2><p>Return to Inbox tasks and choose an existing record.</p></section>';
  } else {
    const listTitle =
      view === 'messages'
        ? 'Messages to review'
        : view === 'completed'
          ? 'Completed follow-ups'
          : 'Assigned follow-ups';
    const jobs = (view === 'completed' ? completed : open)
      .slice()
      .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
    const rows =
      view === 'messages'
        ? messages
            .map(
              (m) =>
                `<article><div><strong>${esc(m.title)}</strong><p>${esc(m.sender || 'Sample source')} · ${esc((m.taskSuggestion || suggestTask(m)).type)}</p></div><a class="btn" href="#/office/inbox-tasks/${esc(m.id)}">Review message</a></article>`,
            )
            .join('')
        : jobs
            .map(
              (j) =>
                `<article><div><strong>${esc(j.title)}</strong><p>${esc(j.owner)} · ${esc(j.draft.category || 'Email follow-up')}</p><span>${j.status === 'completed' ? 'Completed' : j.dueDate && j.dueDate < today ? 'Overdue' : j.dueDate === today ? 'Due today' : 'Assigned'} · ${j.dueDate ? `Due ${esc(j.dueDate)}` : 'Deadline needs review'}</span></div><a class="btn" href="#/office/inbox-tasks/${esc(j.id)}">Review task</a></article>`,
            )
            .join('');
    const emptyTitle =
      view === 'messages'
        ? 'No messages awaiting review'
        : view === 'completed'
          ? 'No completed follow-ups yet'
          : 'No assigned follow-ups';
    const emptyHelp =
      view === 'messages'
        ? 'Add a message when there’s a new request to review.'
        : view === 'completed'
          ? 'Checked outcomes will appear here after a follow-up is completed.'
          : 'Review a message, then confirm its owner and deadline.';
    content = `${navigation}<section class="panel inbox-task-collection" aria-labelledby="inbox-collection-title"><header class="inbox-task-collection-header"><h2 id="inbox-collection-title">${listTitle}</h2><span>${view === 'messages' ? messages.length : jobs.length} ${view === 'messages' ? 'messages' : 'tasks'}</span></header>${view === 'assigned' ? '<p class="form-note">Ordered by deadline · Perth time</p>' : ''}<div class="inbox-task-list">${rows || `<div class="inbox-task-empty"><strong>${emptyTitle}</strong><p>${emptyHelp}</p>${view === 'messages' ? '<a class="btn" href="#/office/inbox-tasks/new">Add message</a>' : ''}</div>`}</div></section><p class="inbox-task-local-note">Messages and tasks are saved in this browser. Mailbox sync and notifications are not connected.</p>`;
  }
  const backPath = job ? (job.status === 'completed' ? '/completed' : '/assigned') : '';
  const headerActions =
    view === 'new' || view === 'detail'
      ? `<a class="btn" href="#/office/inbox-tasks${backPath}">${job ? 'Back to tasks' : 'Back to messages'}</a>`
      : '<a class="btn primary" href="#/office/inbox-tasks/new">Add message</a>';
  const title = job?.title || source?.title || (view === 'new' ? 'Add message' : 'Inbox tasks');
  const subtitle = job
    ? 'Assigned follow-up · ' + (job.draft.category || 'Email')
    : source
      ? 'Review the original email, then confirm its task.'
      : view === 'new'
        ? 'Capture one email, then review the suggested follow-up.'
        : 'Review incoming messages and track their follow-ups.';
  return `${pageHeader('Daily work', title, subtitle, headerActions)}<div class="inbox-task-page">${content}</div>`;
}
