(function (root, factory) {
  const rules = factory();
  if (typeof module === 'object' && module.exports) module.exports = rules;
  else root.OCD_BOOKING_RULES = rules;
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const serviceSkills = {
    'Domestic assistance': ['household-support'], Cleaning: ['cleaning'],
    'Support work': ['personal-care'], Nursing: ['registered-nursing'],
    Transport: ['client-transport'], 'Support coordination': ['support-coordination']
  };
  function requiredSkills(booking) {
    return [...new Set([...(serviceSkills[booking.service] || []), ...(booking.requiredSkills || [])])];
  }
  function assignmentIssue(worker, booking, bookings = []) {
    if (!worker?.approved) return 'Worker approval is required.';
    if (!worker.services?.includes(booking.service)) return 'Worker is not approved for this service.';
    const missing = requiredSkills(booking).filter(skill => !worker.skills?.includes(skill));
    if (missing.length) return `Required skills missing: ${missing.join(', ')}.`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(booking.date || '') || !Number.isFinite(Date.parse(booking.date)) || new Date(booking.date).toISOString().slice(0, 10) !== booking.date || !/^([01]\d|2[0-3]):[0-5]\d$/.test(booking.start || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(booking.end || '') || booking.start >= booking.end) return 'Choose a valid date and visit times.';
    if (!worker.days?.includes(new Date(`${booking.date}T00:00:00Z`).getUTCDay())) return 'Worker is unavailable on this day.';
    if (bookings.some(other => other.id !== booking.id && other.workerId === worker.id && other.date === booking.date && !['Cancelled', 'Needs cover'].includes(other.status) && booking.start < other.end && booking.end > other.start)) return 'Worker has another booking at this time.';
    return '';
  }
  function distanceKm(origin, destination) {
    const valid = value => Array.isArray(value) && value.length === 2 && value.every(Number.isFinite) && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
    if (!valid(origin) || !valid(destination)) return null;
    const rad = degrees => degrees * Math.PI / 180;
    const a = Math.sin(rad(destination[1] - origin[1]) / 2) ** 2 + Math.cos(rad(origin[1])) * Math.cos(rad(destination[1])) * Math.sin(rad(destination[0] - origin[0]) / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
  }
  function candidates(workers, booking, participant, bookings = []) {
    return workers.filter(worker => !assignmentIssue(worker, booking, bookings)).map(worker => ({
      worker, distanceKm: distanceKm(worker.dispatchLocation?.coordinates, participant?.location?.coordinates)
    })).sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) || a.worker.name.localeCompare(b.worker.name));
  }
  function previousBooking(bookings, participantId) {
    return bookings.filter(booking => booking.participantId === participantId && booking.status === 'Completed')
      .sort((a, b) => `${b.date}${b.start}`.localeCompare(`${a.date}${a.start}`))[0] || null;
  }
  return { requiredSkills, assignmentIssue, distanceKm, candidates, previousBooking };
});
