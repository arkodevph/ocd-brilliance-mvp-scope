import { ArrowRight, Check, CheckCircle2, ChevronRight, Clock, Users } from '../../solar-icons';
import type { WorkflowCase } from './model';

const GUIDE_KEY = 'ocd-demo-walkthrough-v1';
export const GUIDE_STEPS = [
  ['Read the request', 'Meet Ava and understand what she needs.'],
  ['Check the details', 'Compare the three proposed values with the request. You can edit them.'],
  ['Review the evidence', 'Check each item after reviewing the fictional information.'],
  ['Approve and save', 'Approve the reviewed proposal, then save it to the demo.'],
  ['Check the result', 'Verify that the saved demo record matches what you approved.'],
  ['Finish the follow-up', 'Record the two remaining checks, then close the case.'],
];

export function readGuide(): { caseId: string; step: number } | null {
  try {
    const value = JSON.parse(localStorage.getItem(GUIDE_KEY) || 'null');
    if (typeof value?.caseId === 'string' && Number.isInteger(value.step))
      return { caseId: value.caseId, step: Math.max(0, Math.min(5, value.step)) };
  } catch {}
  return null;
}

export function saveGuide(caseId: string, step: number) {
  try {
    localStorage.setItem(GUIDE_KEY, JSON.stringify({ caseId, step }));
  } catch {
    // The case's existing storage warning explains any unsaved browser state.
  }
}

export function DemoStart({
  practice,
  onStart,
}: {
  practice?: WorkflowCase;
  onStart: (fresh?: boolean) => void;
}) {
  return (
    <div className="demo-start" data-demo-start>
      <header className="demo-welcome">
        <span className="ops-kicker">WELCOME TO THE OCD DEMO</span>
        <h1>Start with one simple request.</h1>
        <p>
          See how the office turns a request into a reviewed, checked outcome. We’ll guide you
          through it.
        </p>
      </header>
      <section className="demo-first-step" aria-labelledby="demo-first-title">
        <div className="demo-first-copy">
          <span className="demo-recommended">
            <Clock size={14} /> About 5 minutes · recommended first
          </span>
          <h2 id="demo-first-title">Help Ava get started</h2>
          <p>
            Ava has asked for help at home. Review her request, approve a sample profile and check
            the follow-up, one step at a time.
          </p>
          <button className="ops-button ops-primary" data-demo-begin onClick={() => onStart()}>
            {practice
              ? practice.status === 'completed'
                ? 'Review your completed example'
                : 'Continue guided demo'
              : 'Start guided demo'}
            <ArrowRight size={17} />
          </button>
          {practice && (
            <button className="ops-text-button demo-restart" onClick={() => onStart(true)}>
              Start a new practice case
            </button>
          )}
          <small>Fictional information. You can pause and return here at any time.</small>
        </div>
        <ol className="demo-story" aria-label="What you will learn">
          {[
            ['Understand', 'Read the original request.'],
            ['Review', 'Check the details before approving.'],
            ['Complete', 'Verify the result and follow up.'],
          ].map(([title, detail], index) => (
            <li key={title}>
              <span>{index + 1}</span>
              <div>
                <strong>{title}</strong>
                <p>{detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className="demo-other-paths" aria-labelledby="demo-explore-title">
        <h2 id="demo-explore-title">Or explore at your own pace</h2>
        <div className="demo-path-grid">
          <a href="#/office/operations/library">
            <span className="demo-path-icon">
              <CheckCircle2 size={21} />
            </span>
            <div>
              <h3>Browse the workflows</h3>
              <p>Choose an area such as intake, scheduling or finance.</p>
            </div>
            <ChevronRight size={18} />
          </a>
          <a href="/portal">
            <span className="demo-path-icon">
              <Users size={21} />
            </span>
            <div>
              <h3>Try another role</h3>
              <p>See the separate employee and client examples.</p>
            </div>
            <ChevronRight size={18} />
          </a>
        </div>
      </section>
      <details className="demo-explainer">
        <summary>What does this demonstration show?</summary>
        <p>
          The custom application helps the team prepare work, review decisions and follow up.
          ShiftCare continues to hold care and roster records; accounting and payroll stay in their
          existing systems.
        </p>
        <p>
          This walkthrough uses fictional records saved in this browser. The other demo tools have
          separate examples, so a practice profile will not appear in their client lists.
        </p>
        <a href="#/office/operations/overview">
          Open the full demo dashboard <ArrowRight size={14} />
        </a>
      </details>
    </div>
  );
}

export function GuideHeading({ step, complete }: { step: number; complete: boolean }) {
  return (
    <header className="demo-guide-heading" tabIndex={-1} data-guide-heading>
      <div className="demo-guide-meta">
        <a href="#/office/start">← Start here</a>
        <span>
          {complete ? 'Guided example complete' : `Step ${step + 1} of ${GUIDE_STEPS.length}`}
        </span>
      </div>
      <ol className="demo-guide-progress" aria-label="Guided demo progress">
        {GUIDE_STEPS.map(([title], index) => (
          <li
            key={title}
            className={complete || index < step ? 'is-done' : index === step ? 'is-current' : ''}
            aria-current={!complete && index === step ? 'step' : undefined}
          >
            <span>{complete || index < step ? <Check size={12} /> : index + 1}</span>
            <small>{title}</small>
          </li>
        ))}
      </ol>
      <h1>{complete ? 'You’ve followed a request through.' : GUIDE_STEPS[step][0]}</h1>
      <p>
        {complete
          ? 'You reviewed the source, approved the sample profile, checked the result and recorded the required follow-up.'
          : GUIDE_STEPS[step][1]}
      </p>
      {!complete && step === 5 && (
        <p className="demo-guide-tip">
          For each check, use “Use example reference”, confirm what was checked, then record the
          outcome. These are fictional practice references.
        </p>
      )}
    </header>
  );
}
