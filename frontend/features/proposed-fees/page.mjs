export function proposedFeesPage({
  state,
  esc,
  participant,
  booking,
  dateLabel,
  pill,
  empty,
  pageHeader,
}) {
  return `${pageHeader('Team & finance', 'Proposed fees', 'Review saved transport and cancellation proposals before billing.', '<a class="btn" href="#/office/fees">Calculate a fee</a>')}<section class="panel tight"><div class="panel-header"><h2>Proposed fees</h2><span class="muted tiny">Office approval before billing</span></div><div class="table-wrap"><table><thead><tr><th>Reference</th><th>Type</th><th>Service</th><th>Calculation</th><th>Status</th><th></th></tr></thead><tbody>${
    state.feeProposals.length
      ? [...state.feeProposals]
          .reverse()
          .map(
            (f) =>
              `<tr><td>${esc(f.id)}</td><td>${esc(f.type)}</td><td>${esc(participant(booking(f.bookingId)?.participantId)?.name)}<span class="cell-sub">${dateLabel(booking(f.bookingId)?.date)}</span></td><td>$${Number(f.amount).toFixed(2)}<span class="cell-sub">${esc(f.rule)}</span></td><td>${pill(f.status)}</td><td>${f.status === 'Proposed' ? `<button class="btn small primary" data-action="approve-fee" data-id="${esc(f.id)}" type="button">Approve</button>` : ''}</td></tr>`,
          )
          .join('')
      : `<tr><td colspan="6">${empty('No proposed fees yet', 'Create a transport or cancellation calculation in Routes & fees, then save the proposal.')}</td></tr>`
  }</tbody></table></div></section>`;
}
