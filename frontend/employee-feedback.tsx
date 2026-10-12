import { useRef, useState } from 'react';
import { ArrowRight, Check, Mail, Star } from './solar-icons';

export type EmployeeFeedbackModel = {
  mode: 'summary' | 'reviews' | 'profile';
  hideAlerts?: boolean;
  worker: { id: string; name: string };
  completed: number;
  alerts: { status: string; detail: string; checkedAt?: string };
};

type DemoReview = { name: string; date: string; score: number; title: string; text: string };

function demoReviews(workerName: string): DemoReview[] {
  const firstName = workerName.split(' ')[0];
  return [
    {
      name: 'Olivia Hart',
      date: '8 Oct 2026',
      score: 5,
      title: 'Kind and dependable',
      text: `${firstName} explained the plan clearly and made the visit feel comfortable. I appreciated the friendly, thoughtful support.`,
    },
    {
      name: 'Ava Morgan',
      date: '6 Oct 2026',
      score: 5,
      title: 'A great experience',
      text: 'Arrived prepared, listened carefully and checked that everything was taken care of before leaving.',
    },
    {
      name: 'Liam Bennett',
      date: '2 Oct 2026',
      score: 4,
      title: 'Helpful and professional',
      text: 'The support was excellent. A little more notice about the arrival time would make the next visit even better.',
    },
  ];
}

export function demoRating(workerName: string) {
  const reviews = demoReviews(workerName);
  return { average: reviews.reduce((total, review) => total + review.score, 0) / reviews.length, count: reviews.length };
}

export function WorkerRating({ name }: { name: string }) {
  const { average, count } = demoRating(name);
  return <div className="worker-directory-rating"><Star size={16} aria-hidden="true" /><strong>{average.toFixed(1)}<span> / 5</span></strong><span>{count} demo reviews</span></div>;
}

function Stars({ score }: { score: number }) {
  return (
    <span className="feedback-stars" role="img" aria-label={`${score} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          size={18}
          aria-hidden="true"
          className={value <= Math.round(score) ? 'filled' : ''}
        />
      ))}
    </span>
  );
}

export function EmployeeFeedback({ model, onReadReviews }: { model: EmployeeFeedbackModel; onReadReviews?: () => void }) {
  const reviewsRef = useRef<HTMLDivElement>(null);
  const reviews = demoReviews(model.worker.name);
  const average = reviews.reduce((total, review) => total + review.score, 0) / reviews.length;
  if (model.mode === 'reviews') return <ReviewCards key={model.worker.id} reviews={reviews} />;
  if (model.mode === 'profile') return <>
    <EmployeeFeedback model={{ ...model, mode: 'summary' }} onReadReviews={() => reviewsRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })} />
    <div ref={reviewsRef}><ReviewCards key={model.worker.id} reviews={reviews} /></div>
  </>;
  const ratingPercent = Math.round((average / 5) * 100);
  return (
    <section className="employee-feedback" aria-label="Employee ratings and notification status">
      <div className={`feedback-stat-grid${model.hideAlerts ? ' feedback-stat-grid-public' : ''}`}>
        <article className="feedback-stat feedback-average">
          <span className="feedback-stat-label">
            <span className="feedback-metric-icon feedback-metric-gold" aria-hidden="true"><Star size={17} /></span>
            <span>Average rating <i>Demo</i></span>
          </span>
          <strong>
            {average.toFixed(1)}
            <small> / 5</small>
          </strong>
          <Stars score={average} />
          <small>{reviews.length} fictional reviews</small>
        </article>
        <article className="feedback-stat feedback-score">
          <div>
            <span>
              Rating score <i>Demo</i>
            </span>
            <strong>
              {ratingPercent}
              <small>%</small>
            </strong>
            <small>Based on sample star ratings</small>
          </div>
          <svg
            viewBox="0 0 80 80"
            role="img"
            aria-label={`Demo rating score ${ratingPercent} percent`}
          >
            <circle cx="40" cy="40" r="32" />
            <circle
              className="feedback-ring"
              cx="40"
              cy="40"
              r="32"
              pathLength="100"
              strokeDasharray={`${ratingPercent} 100`}
            />
          </svg>
        </article>
        {!model.hideAlerts && <article className="feedback-stat feedback-notifications">
          <span className="feedback-stat-label"><span className="feedback-metric-icon feedback-metric-violet" aria-hidden="true"><Mail size={17} /></span><span>Phone notifications</span></span>
          <strong data-worker-alert-status={model.worker.id}>{model.alerts.status}</strong>
          <p data-worker-alert-detail={model.worker.id}>{model.alerts.detail}</p>
          <small>This demo browser</small>
        </article>}
        <article className="feedback-stat">
          <span>Completed visits</span>
          <strong>{model.completed}</strong>
          <small>Recorded bookings</small>
          <span className="feedback-completed-icon">
            <Check size={23} />
          </span>
        </article>
      </div>
      <div className="feedback-distribution">
        <div className="feedback-distribution-title">
          <h2>
            Rating breakdown <span>Demo</span>
          </h2>
          <button type="button" onClick={onReadReviews} data-action={onReadReviews ? undefined : 'employee-tab'} data-value={onReadReviews ? undefined : 'Demo reviews'}>
            Read reviews
            <ArrowRight size={15} />
          </button>
        </div>
        <div className="feedback-bars">
          {[5, 4, 3, 2, 1].map((score) => {
            const count = reviews.filter((review) => review.score === score).length;
            return (
              <div key={score}>
                <span>
                  {score}
                  <Star size={12} aria-hidden="true" />
                </span>
                <meter
                  min={0}
                  max={reviews.length}
                  value={count}
                  aria-label={`${score} stars: ${count} demo reviews`}
                />
                <small>{count}</small>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ReviewCards({ reviews }: { reviews: DemoReview[] }) {
  const [index, setIndex] = useState(0);
  const review = reviews[index];
  return (
    <section className="feedback-review-section">
      <header>
        <div>
          <h2>Client feedback</h2>
          <p>Fictional examples for this demo.</p>
        </div>
        <span className="feedback-demo-label">Demo reviews</span>
      </header>
      <article className="feedback-review-card">
        <div className="feedback-review-author">
          <span className="feedback-review-avatar" aria-hidden="true">
            {review.name
              .split(' ')
              .map((part) => part[0])
              .join('')}
          </span>
          <div>
            <strong>{review.name}</strong>
            <small>{review.date} · Fictional client</small>
          </div>
          <Stars score={review.score} />
        </div>
        <h3>{review.title}</h3>
        <p>{review.text}</p>
      </article>
      <nav className="feedback-review-pagination" aria-label="Demo review pages">
        <button type="button" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          Previous
        </button>
        <span aria-live="polite">
          {index + 1} of {reviews.length}
        </span>
        <button
          type="button"
          disabled={index === reviews.length - 1}
          onClick={() => setIndex(index + 1)}
        >
          Next
        </button>
      </nav>
    </section>
  );
}
