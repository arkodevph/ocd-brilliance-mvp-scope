/* Prototype invoices: explicit billable hours and rates; no payment or export calls. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OCD_INVOICES = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  function lineTotal(line) {
    const hours = Number(line.hours), rate = Number(line.rate);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24 || !Number.isFinite(rate) || rate <= 0 || rate > 10000) throw new Error('Enter positive billable hours (up to 24) and an hourly rate.');
    return Math.round(hours * Math.round(rate * 100));
  }
  function total(invoice) { return invoice.lines.reduce((sum, line) => sum + lineTotal(line), 0); }
  function create(state, input) {
    const person = state.participants.find(p => p.id === input.participantId);
    const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
    if (!person || !validDate(input.from) || !validDate(input.to) || input.from > input.to) throw new Error('Choose a participant and a valid service period.');
    lineTotal({ hours: 1, rate: input.rate });
    const used = new Set((state.invoices || []).flatMap(i => i.lines.map(l => l.bookingId)));
    const bookings = state.bookings.filter(b => b.participantId === person.id && b.status === 'Completed' && b.date >= input.from && b.date <= input.to && !used.has(b.id));
    if (!bookings.length) throw new Error('No uninvoiced completed visits in this period. Open an existing invoice or choose another period.');
    const lines = bookings.map(b => {
      const minutes = time => Number(time.split(':')[0]) * 60 + Number(time.split(':')[1]);
      return { bookingId: b.id, date: b.date, description: b.service, hours: (minutes(b.end) - minutes(b.start)) / 60, rate: Number(input.rate) };
    });
    const invoice = { id: `INV-${String((state.invoices || []).length + 1).padStart(4, '0')}`, participantId: person.id, billingName: person.name, billingEmail: person.email, from: input.from, to: input.to, created: new Date().toISOString().slice(0, 10), status: 'Draft', lines, rateSource: String(input.rateSource || '').trim(), reviewNote: '', reviewedBy: '', example: input.example === true };
    if (!invoice.rateSource) throw new Error('Record the source of the hourly rate.');
    total(invoice);
    return invoice;
  }
  function ensure(state) {
    if (state.invoices) return state.invoices;
    state.invoices = [];
    for (const participantId of ['PAR-101', 'PAR-102']) {
      if (state.bookings.some(b => b.participantId === participantId && b.status === 'Completed' && b.date < '2026-10-05')) state.invoices.push(create(state, { participantId, from: '2026-10-01', to: '2026-10-04', rate: 65, rateSource: 'Fictional example rate — replace with the agreed rate before review', example: true }));
    }
    return state.invoices;
  }
  return { lineTotal, total, create, ensure };
});
