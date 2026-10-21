import { useState } from 'react';
import { demoRating } from '../../employee-feedback';
import { ArrowRight, Shuffle, Star, Users } from '../../solar-icons';
import { PageList } from '../../shared/portal/paginated-list';
import type { ClientHomeModel } from './home-model';

export function WorkerPanel({ model }: { model: ClientHomeModel }) {
  const demoWorkers = model.workers.map((worker) => ({
    ...worker,
    rating: demoRating(worker.name).average.toFixed(1),
    reviews: demoRating(worker.name).count,
  }));

  const [favourites, setFavourites] = useState<string[]>(
    model.preferredWorkerId ? [model.preferredWorkerId] : [],
  );
  const [suggestedWorkerId, setSuggestedWorkerId] = useState(model.preferredWorkerId);
  const suggestedWorker =
    demoWorkers.find((worker) => worker.id === suggestedWorkerId) || demoWorkers[0];
  return (
    <section className="portal-panel panel client-help-panel">
      <div className="portal-help-icon">
        <Users size={24} />
      </div>
      <h2>Your support worker</h2>
      <p>Browse profiles and save a favourite. The office confirms availability.</p>
      <button
        className="btn client-suggest-button"
        type="button"
        disabled={demoWorkers.length < 2}
        onClick={() => {
          const current = demoWorkers.findIndex((worker) => worker.id === suggestedWorker?.id);
          setSuggestedWorkerId(demoWorkers[(current + 1) % demoWorkers.length]?.id);
        }}
      >
        <Shuffle size={15} />
        Show another worker
      </button>
      <div className="client-featured-workers">
        {!demoWorkers.length && (
          <p>Worker profiles are not available yet. Ask the office for help choosing a worker.</p>
        )}
        <PageList
          key={suggestedWorker?.id}
          label="Support worker pages"
          pageSize={1}
          items={[
            ...(suggestedWorker ? [suggestedWorker] : []),
            ...demoWorkers.filter((worker) => worker.id !== suggestedWorker?.id),
          ].map((worker) => {
            const favourite = favourites.includes(worker.id);
            return (
              <article
                className={`client-featured-worker${suggestedWorker?.id === worker.id ? ' is-suggested' : ''}`}
                key={worker.id}
              >
                <div className="client-worker-avatar" aria-hidden="true">
                  {worker.name
                    .split(' ')
                    .map((part) => part[0])
                    .join('')}
                </div>
                <div className="client-worker-copy">
                  <a href={`#/client/workers/${worker.id}`}>
                    <strong>{worker.name}</strong>
                  </a>
                  <span>{worker.role}</span>
                  <small>
                    <Star size={13} aria-hidden="true" /> {worker.rating} · {worker.reviews} demo
                    reviews
                  </small>
                  <a className="portal-link" href={`#/client/workers/${worker.id}`}>
                    View profile & reviews
                    <ArrowRight size={14} />
                  </a>
                </div>
                <button
                  className={`client-favourite${favourite ? ' is-favourite' : ''}`}
                  type="button"
                  aria-pressed={favourite}
                  aria-label={`${favourite ? 'Remove' : 'Add'} ${worker.name} ${favourite ? 'from' : 'to'} favourites`}
                  onClick={() =>
                    setFavourites((current) =>
                      favourite
                        ? current.filter((id) => id !== worker.id)
                        : [...current, worker.id],
                    )
                  }
                >
                  <Star size={18} />
                </button>
              </article>
            );
          })}
        />
      </div>
      <button className="btn client-office-help" type="button" data-action="client-feedback">
        Ask the office for help
        <ArrowRight size={16} />
      </button>
      <a className="client-agreement-link" href="#/client/documents">
        {model.agreementPending ? 'Review your service agreement' : 'My documents'}
        <ArrowRight size={14} />
      </a>
    </section>
  );
}
