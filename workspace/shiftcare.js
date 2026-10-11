/* Office-only ShiftCare reads. Results stay in this screen's memory. */
(() => {
  let active = null;
  const esc = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (char) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[char],
    );

  function unmount() {
    active?.controller.abort();
    active = null;
  }

  async function mount(root) {
    unmount();
    const context = {
      root,
      controller: new AbortController(),
      config: null,
      result: null,
      readiness: null,
      resource: 'shifts',
      page: 1,
      busy: true,
      error: '',
      checkedAt: '',
      from: '',
      to: '',
    };
    active = context;
    const alive = () => active === context && root.isConnected;
    async function request(params) {
      const response = await fetch(`/api/shiftcare?${new URLSearchParams(params)}`, {
        cache: 'no-store',
        signal: context.controller.signal,
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) window.dispatchEvent(new Event('ocd-session-expired'));
        throw new Error(data.error || 'The ShiftCare read failed.');
      }
      return data;
    }
    function dateTime(value) {
      if (!value) return 'Not provided';
      const date = new Date(value);
      if (!Number.isFinite(date.getTime())) return 'Not provided';
      return new Intl.DateTimeFormat('en-AU', {
        timeZone: context.config.timeZone,
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    }
    function names(records, empty) {
      if (records === null) return 'Details not returned';
      return records.length
        ? records.map((record) => record.name || `ID ${record.id}`).join(', ')
        : empty;
    }
    function results() {
      const result = context.result;
      if (!result) return '<p class="muted">Choose what to read, then select Load records.</p>';
      const { records, pagination } = result;
      const rows = records
        .map((record) =>
          context.resource === 'shifts'
            ? `<tr><td>${esc(record.id)}</td><td>${esc(dateTime(record.startAt))}<br><span class="muted">to ${esc(dateTime(record.endAt))}</span></td><td>${esc(names(record.clients, 'No clients listed'))}</td><td>${esc(names(record.staff, 'No staff assigned'))}</td></tr>`
            : `<tr><td>${esc(record.id)}</td><td>${esc(record.name || 'Name not provided')}</td></tr>`,
        )
        .join('');
      return `<div class="section-heading"><h2>${esc({ shifts: 'Bookings', clients: 'Clients', staff: 'Staff' }[context.resource])}</h2><span class="muted tiny">${records.length} on this page${pagination.total !== null ? ` · ${pagination.total} total` : ''}</span></div>
        ${records.length ? `<div class="table-wrap"><table><thead><tr>${(context.resource === 'shifts' ? ['ShiftCare ID', 'Scheduled time', 'Clients', 'Assigned staff'] : ['ShiftCare ID', 'Name']).map((title) => `<th>${title}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="empty"><strong>No records on this page</strong>Try an earlier page or a different booking date range.</div>'}
        <div class="form-actions"><button class="btn small" data-page="previous" type="button" ${context.busy || pagination.page === 1 ? 'disabled' : ''}>Previous</button><span class="muted tiny">Page ${pagination.page}</span><button class="btn small" data-page="next" type="button" ${context.busy || !pagination.hasNext ? 'disabled' : ''}>Next page</button></div>
        <p class="form-note">Read ${esc(dateTime(result.fetchedAt))} · times shown in ${esc(result.timeZone)}. These records are a snapshot; refresh to check for changes.</p>`;
    }
    function render() {
      if (!alive()) return;
      const config = context.config;
      if (!config) {
        root.innerHTML = context.error
          ? `<p class="field-error" role="alert">${esc(context.error)}</p>`
          : '<p class="muted">Checking connection settings…</p>';
        return;
      }
      root.innerHTML = `<div class="section-heading"><div><h2>ShiftCare connection</h2><p>Current account and connection status</p></div><span class="status ${context.checkedAt ? '' : 'amber'}">${context.checkedAt ? 'Verified' : config.configured ? 'Ready to check' : 'Awaiting setup'}</span></div>
        <p class="muted">Account ${esc(config.accountId || 'not set')} · ${esc(config.region.toUpperCase())} · ${esc(config.timeZone || 'time zone not set')}</p>
        ${config.configured ? `<button class="btn" data-check type="button" ${context.busy ? 'disabled' : ''}>${context.busy ? 'Reading…' : 'Check connection'}</button>${context.checkedAt ? `<p class="form-note">Last successful read: ${esc(dateTime(context.checkedAt))}</p>` : ''}` : `<div class="notice warning">${esc(config.error || 'The office administrator needs to finish the account connection before live records can be read.')}</div>`}
        ${config.configured ? `<div class="spacer"></div><button class="btn" data-readiness type="button" ${context.busy ? 'disabled' : ''}>Check clients, staff &amp; bookings</button><p class="form-note">Checks the selected booking dates, or today when no dates are entered.</p>` : ''}
        ${context.readiness ? `<div class="review-box" role="status"><strong>${context.readiness.readsReady ? 'All three reads passed' : 'Connection needs attention'}</strong><ul>${context.readiness.reads.map((check) => `<li>${esc({ clients: 'Clients', staff: 'Staff', shifts: 'Bookings' }[check.resource])}: ${check.connected ? 'Read verified' : esc(check.error)}</li>`).join('')}</ul><p class="form-note">Native writes and live worker location are not connected.</p></div>` : ''}
        <details><summary>ShiftCare setup &amp; workflow references</summary><p>Ask your ShiftCare administrator to enable API access and configure the account connection.</p><ul><li><a href="https://help.shiftcare.com/en/articles/13906196-managing-api-keys" target="_blank" rel="noopener noreferrer">API key setup</a></li><li><a href="https://help.shiftcare.com/en/articles/3703862-scheduler-interface-and-navigation" target="_blank" rel="noopener noreferrer">Roster screenshots</a></li><li><a href="https://help.shiftcare.com/en/articles/3852009-create-a-shift-in-the-scheduler-roster" target="_blank" rel="noopener noreferrer">Booking workflow screenshots</a></li></ul></details>
        ${context.error ? `<p class="field-error" role="alert">${esc(context.error)}</p>` : ''}
        ${
          config.configured
            ? `<div class="spacer"></div><form data-shiftcare-read><div class="form-grid"><label>Records<select name="resource" ${context.busy ? 'disabled' : ''}>${[
                ['shifts', 'Bookings'],
                ['clients', 'Clients'],
                ['staff', 'Staff'],
              ]
                .map(
                  ([value, title]) =>
                    `<option value="${value}" ${context.resource === value ? 'selected' : ''}>${title}</option>`,
                )
                .join(
                  '',
                )}</select></label><label class="shiftcare-date" ${context.resource !== 'shifts' ? 'hidden' : ''}>From<input name="from" type="date" value="${esc(context.from)}" ${context.resource === 'shifts' ? 'required' : 'disabled'}></label><label class="shiftcare-date" ${context.resource !== 'shifts' ? 'hidden' : ''}>To<input name="to" type="date" value="${esc(context.to)}" ${context.resource === 'shifts' ? 'required' : 'disabled'}></label></div><p class="form-note">Bookings can be read for up to 31 days at a time.</p><div class="form-actions"><button class="btn primary" type="submit" ${context.busy ? 'disabled' : ''}>Load records</button></div></form><div class="spacer"></div>${results()}`
            : ''
        }`;
    }
    async function read(check = false, page = 1) {
      context.busy = true;
      context.error = '';
      render();
      try {
        const result = await request(
          check === 'readiness'
            ? { action: 'readiness', from: context.from, to: context.to }
            : check
              ? { action: 'check' }
              : {
                  action: context.resource,
                  page,
                  per_page: 20,
                  ...(context.resource === 'shifts' ? { from: context.from, to: context.to } : {}),
                },
        );
        if (!alive()) return;
        if (check === 'readiness') context.readiness = result;
        context.checkedAt = result.readsReady === false ? '' : result.checkedAt || result.fetchedAt;
        if (!check) {
          context.result = result;
          context.page = result.pagination.page;
        }
      } catch (error) {
        if (!alive()) return;
        context.error = error.message;
        context.checkedAt = '';
      } finally {
        if (alive()) {
          context.busy = false;
          render();
        }
      }
    }
    root.addEventListener(
      'submit',
      (event) => {
        if (!event.target.matches('[data-shiftcare-read]')) return;
        event.preventDefault();
        if (context.busy || !alive()) return;
        const values = new FormData(event.target);
        context.resource = values.get('resource');
        if (context.resource === 'shifts') {
          context.from = values.get('from');
          context.to = values.get('to');
        }
        context.result = null;
        read();
      },
      { signal: context.controller.signal },
    );
    root.addEventListener(
      'change',
      (event) => {
        if (event.target.name !== 'resource' || context.busy || !alive()) return;
        context.resource = event.target.value;
        context.result = null;
        // Preserve typed dates when changing between bookings and people.
        context.from = root.querySelector('[name=from]').value;
        context.to = root.querySelector('[name=to]').value;
        render();
      },
      { signal: context.controller.signal },
    );
    root.addEventListener(
      'click',
      (event) => {
        if (context.busy || !alive()) return;
        const button = event.target.closest('button');
        if (button?.hasAttribute('data-check')) read(true);
        else if (button?.hasAttribute('data-readiness')) {
          context.from = root.querySelector('[name=from]').value || context.from;
          context.to = root.querySelector('[name=to]').value || context.to;
          context.readiness = null;
          read('readiness');
        } else if (button?.dataset.page && context.result)
          read(false, context.page + (button.dataset.page === 'next' ? 1 : -1));
      },
      { signal: context.controller.signal },
    );
    render();
    try {
      context.config = await request({ action: 'status' });
      if (!alive()) return;
      if (context.config.configured) {
        const parts = Object.fromEntries(
          new Intl.DateTimeFormat('en-CA', {
            timeZone: context.config.timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })
            .formatToParts(new Date())
            .map((part) => [part.type, part.value]),
        );
        context.from = context.to = `${parts.year}-${parts.month}-${parts.day}`;
      }
    } catch (error) {
      if (alive()) context.error = error.message;
    } finally {
      if (alive()) {
        context.busy = false;
        render();
      }
    }
  }

  window.OCD_SHIFTCARE = { mount, unmount };
})();
