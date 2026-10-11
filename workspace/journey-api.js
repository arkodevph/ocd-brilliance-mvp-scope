/* Procedural transport for the shared prototype arrival service. */
(() => {
  async function request(input, signal) {
    const response = await fetch('/api/journeys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      cache: 'no-store',
      signal: signal || AbortSignal.timeout(15000),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Shared arrival update failed.');
    return result;
  }

  function subscribe(ctx, changed, failed) {
    let disposed = false,
      pending = false,
      abort;
    async function poll() {
      if (disposed || pending) return;
      pending = true;
      abort = new AbortController();
      const timeout = setTimeout(() => abort.abort(), 10000);
      try {
        const params = new URLSearchParams({
          area: ctx.area,
          id: ctx.area === 'worker' ? ctx.workerId : ctx.clientId || '',
        });
        const response = await fetch(`/api/journeys?${params}`, {
          cache: 'no-store',
          signal: abort.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Shared arrival updates unavailable.');
        if (disposed) return;
        const before = JSON.stringify({
          journeys: ctx.state.journeys,
          bookings: ctx.state.bookings,
        });
        for (const b of result.bookings) {
          const local = ctx.state.bookings.find((item) => item.id === b.id);
          if (local && ctx.area !== 'office')
            Object.assign(local, {
              workerId: b.workerId,
              status: b.status,
              date: b.date,
              start: b.start,
            });
          if (ctx.area === 'worker' && (b.visited || b.status !== 'Confirmed'))
            delete ctx.state.journeys[b.id];
        }
        // Never replace an active worker GPS session with an older polling response.
        if (ctx.area !== 'worker') {
          for (const [id, journey] of Object.entries(ctx.state.journeys))
            if (journey.backendShared) delete ctx.state.journeys[id];
          Object.assign(ctx.state.journeys, result.journeys);
        } else {
          for (const [id, journey] of Object.entries(result.journeys)) {
            if (!ctx.state.journeys[id]?.backendShared) ctx.state.journeys[id] = journey;
          }
        }
        if (
          before !==
          JSON.stringify({
            journeys: ctx.state.journeys,
            bookings: ctx.state.bookings,
          })
        )
          changed();
      } catch (error) {
        if (!disposed) failed(error.message);
      } finally {
        clearTimeout(timeout);
        pending = false;
      }
    }
    poll();
    const timer = setInterval(poll, 5000);
    return () => {
      disposed = true;
      clearInterval(timer);
      abort?.abort();
    };
  }

  async function publish(ctx) {
    const bookings = ctx.state.bookings.map((b) => ({
      id: b.id,
      workerId: b.workerId,
      date: b.date,
      start: b.start,
      status: b.status,
      visited: ctx.state.visits.some((v) => v.bookingId === b.id && v.clockIn),
    }));
    return request({ action: 'publish', bookings });
  }
  window.OCD_JOURNEY_API = { request, subscribe, publish };
})();
