/* Prototype invoices: explicit billable hours and rates; no payment or export calls. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OCD_INVOICES = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  function lineTotal(line) {
    const hours = Number(line.hours),
      rate = Number(line.rate);
    if (
      !Number.isFinite(hours) ||
      hours <= 0 ||
      hours > 24 ||
      !Number.isFinite(rate) ||
      rate <= 0 ||
      rate > 10000
    )
      throw new Error('Enter positive billable hours (up to 24) and an hourly rate.');
    return Math.round(hours * Math.round(rate * 100));
  }

  function total(invoice) {
    return invoice.lines.reduce((sum, line) => sum + lineTotal(line), 0);
  }

  function create(state, input) {
    const person = state.participants.find((p) => p.id === input.participantId);
    const validDate = (value) =>
      /^\d{4}-\d{2}-\d{2}$/.test(value || '') &&
      Number.isFinite(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value;
    if (!person || !validDate(input.from) || !validDate(input.to) || input.from > input.to)
      throw new Error('Choose a participant and a valid service period.');
    lineTotal({ hours: 1, rate: input.rate });

    const used = new Set((state.invoices || []).flatMap((i) => i.lines.map((l) => l.bookingId)));
    const bookings = state.bookings.filter(
      (b) =>
        b.participantId === person.id &&
        b.status === 'Completed' &&
        b.date >= input.from &&
        b.date <= input.to &&
        !used.has(b.id),
    );
    if (!bookings.length)
      throw new Error(
        'No uninvoiced completed visits in this period. Open an existing invoice or choose another period.',
      );
    const lines = bookings.map((b) => {
      const minutes = (time) => Number(time.split(':')[0]) * 60 + Number(time.split(':')[1]);
      return {
        bookingId: b.id,
        date: b.date,
        description: b.service,
        category: person.billingProfile?.serviceCategories?.[b.service] || '',
        hours: (minutes(b.end) - minutes(b.start)) / 60,
        rate: Number(input.rate),
      };
    });

    const invoice = {
      id: `INV-${String((state.invoices || []).length + 1).padStart(4, '0')}`,
      participantId: person.id,
      billingName: person.billingProfile?.name || person.name,
      billingEmail: person.billingProfile?.email || person.email,
      from: input.from,
      to: input.to,
      created: new Date().toISOString().slice(0, 10),
      status: 'Draft',
      lines,
      rateSource: String(input.rateSource || '').trim(),
      reviewNote: '',
      reviewedBy: '',
      example: input.example === true,
    };

    if (!invoice.rateSource) throw new Error('Record the source of the hourly rate.');
    total(invoice);
    return invoice;
  }

  function ensure(state) {
    if (state.invoices) return state.invoices;
    state.invoices = [];
    for (const participantId of ['PAR-101', 'PAR-102']) {
      if (
        state.bookings.some(
          (b) =>
            b.participantId === participantId && b.status === 'Completed' && b.date < '2026-10-05',
        )
      )
        state.invoices.push(
          create(state, {
            participantId,
            from: '2026-10-01',
            to: '2026-10-04',
            rate: 65,
            rateSource: 'Fictional example rate — replace with the agreed rate before review',
            example: true,
          }),
        );
    }

    return state.invoices;
  }

  const text = (value) => String(value || '').trim();
  const emailValid = (value) => /^\S+@\S+\.\S+$/.test(text(value));

  function saveBillingProfile(state, input, by) {
    const person = state.participants.find((p) => p.id === input.participantId);
    if (
      !person ||
      !text(input.name) ||
      !emailValid(input.email) ||
      !text(input.source) ||
      !text(by)
    )
      throw new Error('Record the agreed billing name, valid email, source and reviewer.');
    person.billingProfile = {
      name: text(input.name),
      email: text(input.email),
      source: text(input.source),
      serviceCategories: Object.fromEntries(
        Object.entries(input.serviceCategories || {})
          .map(([service, category]) => [service, text(category)])
          .filter(([, category]) => category),
      ),
      by: text(by),
      at: new Date().toISOString(),
    };
  }

  function invoiceIssues(state, invoice) {
    const issues = [];
    const person = state.participants.find((p) => p.id === invoice.participantId);
    const profile = person?.billingProfile;
    const add = (type, detail) => issues.push({ type, detail });
    if (!profile || !text(profile.source) || !text(profile.name) || !emailValid(profile.email))
      add(
        'Missing billing information',
        'Record the agreed billing recipient and agreement source.',
      );
    if (
      !text(invoice.billingName) ||
      !emailValid(invoice.billingEmail) ||
      !text(invoice.rateSource)
    )
      add('Missing billing information', 'Complete the invoice recipient and rate source.');
    if (
      profile &&
      (text(invoice.billingName) !== text(profile.name) ||
        text(invoice.billingEmail).toLowerCase() !== text(profile.email).toLowerCase())
    )
      add(
        'Incorrect recipient',
        `Invoice recipient differs from the agreed recipient: ${profile.name} · ${profile.email}.`,
      );
    for (const line of invoice.lines) {
      const booking = state.bookings.find((b) => b.id === line.bookingId);
      if (
        !booking ||
        booking.participantId !== invoice.participantId ||
        booking.status !== 'Completed'
      ) {
        add(
          'Service/category mismatch',
          `${line.bookingId}: check the participant and completed service record.`,
        );
        continue;
      }
      const expected = profile?.serviceCategories?.[booking.service];
      if (!text(expected) || !text(line.category))
        add(
          'Missing billing information',
          `${line.bookingId}: record an agreed category for ${booking.service} and the invoice line category.`,
        );
      if (
        text(line.description) !== text(booking.service) ||
        (text(expected) && text(line.category) && text(line.category) !== text(expected))
      )
        add(
          'Service/category mismatch',
          `${line.bookingId}: expected ${booking.service}${expected ? ` / ${expected}` : ''}; invoice has ${line.description} / ${line.category || 'no category'}.`,
        );
    }
    return issues;
  }

  function reviewQueue(state) {
    const invoices = state.invoices || [];
    const rows = invoices.flatMap((invoice) => {
      const issues = invoiceIssues(state, invoice);
      return issues.length
        ? [{ id: invoice.id, participantId: invoice.participantId, invoiceId: invoice.id, issues }]
        : [];
    });
    const used = new Set(invoices.flatMap((i) => i.lines.map((line) => line.bookingId)));
    for (const booking of state.bookings) {
      if (booking.status !== 'Completed' || used.has(booking.id)) continue;
      rows.push({
        id: booking.id,
        participantId: booking.participantId,
        bookingId: booking.id,
        date: booking.date,
        issues: [
          {
            type: 'Awaiting invoicing',
            detail: `${booking.date} · ${booking.service} · completed service has no invoice draft.`,
          },
        ],
      });
    }
    return rows;
  }

  return { lineTotal, total, create, ensure, saveBillingProfile, invoiceIssues, reviewQueue };
});
