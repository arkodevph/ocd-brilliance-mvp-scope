const signature = (value) => JSON.stringify(value);
const number = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const minutes = (time) => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time || '');
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};
const place = (participant) => ({
  address: participant?.address || '',
  suburb: participant?.suburb || '',
  coordinates: participant?.location?.coordinates || null,
});
export function travelContext(state, bookingId) {
  const b = state.bookings.find((item) => item.id === bookingId);
  if (!b) throw new Error('The booking is no longer available.');
  const participant = state.participants.find((p) => p.id === b.participantId);
  const worker = state.workers.find((w) => w.id === b.workerId);
  const previous = b.workerId
    ? state.bookings
        .filter(
          (other) =>
            other.id !== b.id &&
            other.workerId === b.workerId &&
            other.date === b.date &&
            !['Cancelled', 'Proposed', 'Needs cover'].includes(other.status) &&
            minutes(other.start) !== null &&
            minutes(b.start) !== null &&
            other.start < b.start,
        )
        .sort((a, z) => z.start.localeCompare(a.start) || a.id.localeCompare(z.id))[0]
    : null;
  return structuredClone({
    workerId: b.workerId || '',
    dispatch: worker?.dispatchLocation || null,
    destination: place(participant),
    booking: {
      participantId: b.participantId,
      date: b.date,
      start: b.start,
      end: b.end,
      status: b.status,
      service: b.service,
      address: b.address || '',
      location: b.location || null,
    },
    previous: previous
      ? {
          id: previous.id,
          end: previous.end,
          destination: place(state.participants.find((p) => p.id === previous.participantId)),
        }
      : null,
  });
}
export function latestEstimates(state) {
  return [
    ...new Map(
      (state.routeEstimates || []).map((estimate) => [estimate.bookingId, estimate]),
    ).values(),
  ];
}
export function inspectTravel(state) {
  return latestEstimates(state).map((estimate) => {
    const b = state.bookings.find((item) => item.id === estimate.bookingId);
    const reasons = [];
    if (!b)
      return {
        estimate,
        context: null,
        token: signature(estimate),
        reasons: ['Booking no longer exists. Check the saved travel record.'],
      };
    const context = travelContext(state, b.id);
    if (!state.participants.some((p) => p.id === b.participantId))
      reasons.push('Participant record is unavailable.');
    if (b.workerId && !state.workers.some((w) => w.id === b.workerId))
      reasons.push('Assigned worker record is unavailable.');
    const baseline = estimate.travelContext;
    if (!baseline) reasons.push('Assignment and address were not captured with this estimate.');
    else {
      if (
        signature([baseline.workerId, baseline.dispatch]) !==
        signature([context.workerId, context.dispatch])
      )
        reasons.push('Worker or dispatch location changed.');
      if (signature(baseline.destination) !== signature(context.destination))
        reasons.push('Participant address or map location changed.');
      if (signature(baseline.booking) !== signature(context.booking))
        reasons.push('Booking time, service, participant or status changed.');
      if (signature(baseline.previous) !== signature(context.previous))
        reasons.push('The preceding visit or its address changed.');
    }
    if (
      !number(estimate.distance) ||
      !number(estimate.duration) ||
      (estimate.distance > 0 && estimate.duration === 0)
    )
      reasons.push('Kilometres or travel time are missing or invalid.');
    if (estimate.destination !== (b.address || context.destination.address))
      reasons.push('Saved destination does not match the current booking address.');
    const gap =
      context.previous &&
      minutes(context.booking.start) !== null &&
      minutes(context.previous.end) !== null
        ? minutes(context.booking.start) - minutes(context.previous.end)
        : null;
    const fitIssue = gap !== null && number(estimate.duration) && estimate.duration > gap;
    if (fitIssue && estimate.review?.scheduleRiskAcknowledged !== true)
      reasons.push('Travel time exceeds the gap after the preceding visit.');
    // Acknowledgement applies only to the exact reviewed schedule and route values.
    if (
      fitIssue &&
      estimate.review?.scheduleRiskAcknowledged === true &&
      (signature(baseline) !== signature(context) ||
        estimate.review.distance !== estimate.distance ||
        estimate.review.duration !== estimate.duration)
    )
      reasons.push('Recheck the travel time against the changed schedule.');
    return { estimate, context, gap, reasons, token: signature([estimate, context]) };
  });
}
export function reviewTravel(state, input) {
  const item = inspectTravel(state).find((row) => row.estimate.bookingId === input.bookingId);
  if (!item?.context || item.token !== input.token)
    throw new Error('The booking or estimate changed. Reload this review before saving.');
  if (
    !number(input.distance) ||
    !number(input.duration) ||
    (input.distance > 0 && input.duration === 0)
  )
    throw new Error('Enter valid kilometres and travel minutes.');
  if (
    !String(input.source || '').trim() ||
    !String(input.note || '').trim() ||
    input.checked !== true
  )
    throw new Error('Record the route source, review note and confirmation.');
  const scheduleRisk = item.gap !== null && input.duration > item.gap;
  if (scheduleRisk && input.scheduleRiskAcknowledged !== true)
    throw new Error(
      'Travel does not fit between visits. Record the agreed scheduling outcome and confirm the timing exception.',
    );
  const b = state.bookings.find((booking) => booking.id === input.bookingId);
  if (
    !state.participants.some((p) => p.id === b.participantId) ||
    (b.workerId && !state.workers.some((w) => w.id === b.workerId)) ||
    !item.context.destination.address
  )
    throw new Error(
      'Restore the participant address and assigned worker record before reviewing travel.',
    );
  const estimate = {
    ...item.estimate,
    id: `RTE-${Math.max(0, ...(state.routeEstimates || []).map((r) => Number(r.id.split('-').pop()) || 0)) + 1}`,
    destination: b.address || item.context.destination.address,
    distance: input.distance,
    duration: input.duration,
    source: input.source.trim(),
    created: new Date().toISOString().slice(0, 10),
    travelContext: structuredClone(item.context),
    review: {
      previousEstimateId: item.estimate.id,
      note: input.note.trim(),
      by: input.by || 'Office',
      at: new Date().toISOString(),
      scheduleRiskAcknowledged: scheduleRisk,
      distance: input.distance,
      duration: input.duration,
    },
  };
  state.routeEstimates.push(estimate);
  return estimate;
}
