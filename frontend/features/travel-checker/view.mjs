import { inspectTravel } from './engine.mjs';
const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
export function travelChecker(state, selectedId = '') {
  const items = inspectTravel(state);
  const flagged = items.filter((item) => item.reasons.length);
  items.sort((a, b) => Number(!!b.reasons.length) - Number(!!a.reasons.length));
  const selected = items.find((item) => item.estimate.bookingId === selectedId) || items[0];
  const bookingList = items
    .map(({ estimate: r, reasons }) => {
      const b = state.bookings.find((b) => b.id === r.bookingId);
      const p = state.participants.find((p) => p.id === b?.participantId);
      const active = selected?.estimate.bookingId === r.bookingId;
      return `<button class="travel-booking" type="button" data-action="select-travel-review" data-id="${esc(r.bookingId)}" aria-controls="travel-${esc(r.bookingId)}" aria-expanded="${active}"><span class="travel-booking-top"><strong>${esc(p?.name || r.bookingId)}</strong><span>${reasons.length ? 'Needs review' : 'Current'}</span></span><span>${esc(r.bookingId)} · ${esc(b?.date)}</span><span>${esc(r.distance)} km · ${esc(r.duration)} min</span><span class="travel-booking-reason">${esc(reasons[0] || 'No changes detected')}</span></button>`;
    })
    .join('');
  return `<section class="panel travel-checker"><header class="section-heading"><div><h2>Travel checker</h2><p>Review kilometres and drive time after worker, address or booking changes.</p></div><span class="status ${flagged.length ? 'amber' : 'gray'}">${flagged.length} to review</span></header><p class="form-note">Saved estimates are compared with the current roster. Review actual travel separately before approving a claim.</p>${
    !items.length
      ? '<p class="muted">Save a route estimate to begin checking travel.</p>'
      : `<div class="travel-workspace"><nav class="travel-bookings" aria-label="Travel reviews"><h3>Bookings <span>${items.length}</span></h3>${bookingList}</nav><div class="travel-review-pane">${items
          .map(({ estimate: r, context, reasons, token, gap }) => {
            const b = state.bookings.find((b) => b.id === r.bookingId);
            const p = state.participants.find((p) => p.id === b?.participantId);
            return `<article class="travel-check" id="travel-${esc(r.bookingId)}" aria-labelledby="travel-title-${esc(r.bookingId)}" ${selected?.estimate.bookingId === r.bookingId ? '' : 'hidden'}><div class="travel-check-heading"><div><h3 id="travel-title-${esc(r.bookingId)}" tabindex="-1">${esc(p?.name || r.bookingId)}</h3><p>${esc(r.bookingId)} · ${esc(b?.date)} · ${esc(b?.start)}–${esc(b?.end)}</p></div><span class="status ${reasons.length ? 'amber' : 'dark'}">${reasons.length ? 'Needs review' : 'Current'}</span></div><section class="travel-comparison" aria-label="Saved and current travel"><h4>Route comparison</h4><dl class="travel-values"><div><dt>Saved distance</dt><dd>${esc(r.distance)} km</dd></div><div><dt>Saved drive time</dt><dd>${esc(r.duration)} min</dd></div><div><dt>Saved worker</dt><dd>${esc(state.workers.find((w) => w.id === r.travelContext?.workerId)?.name || r.travelContext?.workerId || 'Not captured')}</dd></div><div><dt>Current worker</dt><dd>${esc(state.workers.find((w) => w.id === b?.workerId)?.name || 'Unassigned')}</dd></div><div><dt>Saved destination</dt><dd>${esc(r.destination)}</dd></div><div><dt>Current destination</dt><dd>${esc(context?.booking.address || context?.destination.address || r.destination)}</dd></div><div><dt>Source</dt><dd>${esc(r.source || 'Not recorded')}</dd></div></dl></section>${reasons.length ? `<ul class="travel-reasons">${reasons.map((reason) => `<li>${esc(reason)}</li>`).join('')}</ul>` : `<p class="form-note">${r.review ? `Reviewed by ${esc(r.review.by)} · ${esc(r.review.note)}` : 'No changes detected since this estimate was saved.'}</p>`}${reasons.length && context ? `<form data-form="travel-review"><input type="hidden" name="bookingId" value="${esc(r.bookingId)}"><input type="hidden" name="token" value="${esc(token)}"><h4>Review travel</h4><p class="form-note">Confirm the route and save your checked values.</p><div class="form-grid"><label>Reviewed distance (km)<input name="distance" type="number" min="0" step="any" required value="${Number.isFinite(r.distance) ? r.distance : ''}"></label><label>Reviewed drive time (minutes)<input name="duration" type="number" min="0" step="any" required value="${Number.isFinite(r.duration) ? r.duration : ''}"></label><label class="full">Route source<input name="source" required placeholder="Map result or checked route reference"></label><label class="full">Review note<textarea name="note" required rows="2" placeholder="What changed, what was checked and any agreed schedule or claim correction."></textarea></label>${gap !== null ? `<label class="checkbox full"><input name="scheduleRiskAcknowledged" type="checkbox"><span>If travel exceeds the ${esc(gap)} minute gap, I recorded the agreed scheduling outcome above.</span></label>` : ''}<label class="checkbox full"><input name="checked" type="checkbox" required><span>I checked the route, kilometres and drive time for this booking.</span></label></div><p class="field-error" role="alert" hidden></p><div class="form-actions"><a class="btn" href="#/office/schedule/${encodeURIComponent(r.bookingId)}">Open booking</a><button class="btn primary" type="submit">Save travel review</button></div></form>` : ''}${r.review?.scheduleRiskAcknowledged ? '<p class="form-note">Travel timing exception recorded. The office must carry out the agreed scheduling action.</p>' : ''}</article>`;
          })
          .join('')}</div></div>`
  }</section>`;
}

export function selectTravelReview(root, bookingId) {
  const panel = [...root.querySelectorAll('.travel-check')].find(
    (panel) => panel.id === `travel-${bookingId}`,
  );
  if (!panel) return;
  root.querySelectorAll('.travel-check').forEach((item) => {
    item.hidden = item !== panel;
  });
  root.querySelectorAll('.travel-booking').forEach((button) => {
    button.setAttribute('aria-expanded', String(button.dataset.id === bookingId));
  });
  panel.querySelector('h3')?.focus({ preventScroll: true });
}
