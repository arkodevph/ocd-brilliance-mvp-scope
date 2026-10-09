/* Shared presentation controls for the local operations records. */
(() => {
  const pages = new Map();
  const views = new Map();
  const panels = { navigation: true, cases: true, details: false };
  try { Object.assign(panels, JSON.parse(sessionStorage.getItem('ocd-workspace-panels') || '{}')); } catch {}
  const panelIcon = side => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M${side === 'right' ? 15 : 9} 4v16"/></svg>`;
  function reveal(element) {
    if (!element || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    element.animate([{ opacity: .8 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
  }

  function panelControls(root) {
    const shell = root.matches?.('.crm-shell') ? root : root.querySelector('.crm-shell');
    if (!shell || shell.querySelector('.navigation-toggle')) return;
    const sidebar = shell.querySelector('.sidebar');
    const topbar = shell.querySelector('.topbar-left');
    if (!sidebar || !topbar) return;
    sidebar.id = 'workspace-navigation';
    const navigation = document.createElement('button');
    navigation.type = 'button'; navigation.className = 'navigation-toggle';
    navigation.innerHTML = panelIcon('left');
    navigation.setAttribute('aria-controls', sidebar.id);
    topbar.prepend(navigation);
    const desk = shell.querySelector('.automation-desk');
    const queue = desk?.querySelector('.automation-queue');
    const context = desk?.querySelector('.automation-context');
    const controls = document.createElement('div'); controls.className = 'case-panel-controls';
    controls.setAttribute('role', 'group'); controls.setAttribute('aria-label', 'Case workspace panels');
    const buttons = [];
    function add(key, region, label) {
      if (!region) return;
      region.id = `case-panel-${key}`;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'case-panel-toggle';
      button.innerHTML = `${panelIcon(key === 'details' ? 'right' : 'left')}<span>${label}</span>`;
      button.setAttribute('aria-controls', region.id);
      button.addEventListener('click', () => { panels[key] = !panels[key]; update(); reveal(desk.querySelector('.automation-case-detail')); if (panels[key]) reveal(region); });
      controls.append(button); buttons.push({ key, region, label, button });
    }
    add('cases', queue, 'Cases'); add('details', context, 'Details');
    if (queue) desk.querySelector('.automation-case-layout').before(controls);
    function update() {
      shell.classList.toggle('navigation-folded', !panels.navigation);
      sidebar.hidden = !panels.navigation;
      const navigationLabel = panels.navigation ? 'Hide navigation' : 'Show navigation';
      navigation.setAttribute('aria-label', navigationLabel); navigation.title = navigationLabel;
      navigation.setAttribute('aria-expanded', String(panels.navigation));
      buttons.forEach(({ key, region, label, button }) => {
        region.hidden = !panels[key];
        desk.classList.toggle(`${key}-folded`, !panels[key]);
        const actionLabel = `${panels[key] ? 'Hide' : 'Show'} ${label.toLowerCase()}`;
        button.setAttribute('aria-label', actionLabel); button.title = actionLabel;
        button.setAttribute('aria-pressed', String(panels[key]));
        button.setAttribute('aria-expanded', String(panels[key]));
      });
      try { sessionStorage.setItem('ocd-workspace-panels', JSON.stringify(panels)); } catch {}
    }
    navigation.addEventListener('click', () => { panels.navigation = !panels.navigation; update(); reveal(shell.querySelector('main')); if (panels.navigation) reveal(sidebar); });
    update();
  }

  function enhance(root) {
    panelControls(root);
    root.querySelectorAll('.tabs, .automation-tabs').forEach(group => {
      group.setAttribute('role', 'group');
      if (!group.getAttribute('aria-label')) group.setAttribute('aria-label', 'Record views');
      group.querySelectorAll(':scope > button').forEach(button => button.setAttribute('aria-pressed', String(button.classList.contains('active'))));
    });
    root.querySelectorAll('details').forEach(details => {
      const section = document.createElement('section');
      section.className = `${details.className} expanded-details`;
      if (details.id) section.id = details.id;
      const summary = details.querySelector(':scope > summary');
      if (summary) {
        const title = document.createElement('div'); title.className = 'disclosure-title';
        title.append(...summary.childNodes); section.append(title); summary.remove();
      }
      section.append(...details.childNodes); details.replaceWith(section);
    });
    root.querySelectorAll('select').forEach(select => {
      if (select.dataset.visibleChoices) { select.refreshChoices?.(); return; }
      select.dataset.visibleChoices = 'true'; select.hidden = true; select.tabIndex = -1;
      const label = select.getAttribute('aria-label') || [...(select.labels?.[0]?.childNodes || [])].filter(n => n !== select).map(n => n.textContent).join(' ').trim() || select.name || 'Choose an option';
      const group = document.createElement('div'); group.className = 'visible-choices';
      group.setAttribute('role', 'group'); group.setAttribute('aria-label', label);
      const profiles = ['participantId', 'workerId'].includes(select.name);
      if (profiles) group.classList.add('profile-picker');
      if (select.name === 'service') group.classList.add('service-picker');
      const results = document.createElement('div'); results.className = 'profile-picker-results';
      const empty = document.createElement('p'); empty.className = 'profile-picker-empty'; empty.textContent = `No matching ${select.name === 'workerId' ? 'workers' : 'participants'}. Try another name.`; empty.hidden = true;
      if (profiles || select.options.length > 10) {
        const search = document.createElement('input'); search.type = 'search'; search.placeholder = `Find ${label.toLowerCase()}`; search.setAttribute('aria-label', `Search ${label.toLowerCase()}`);
        search.addEventListener('input', () => {
          group.querySelectorAll('button').forEach(button => { button.hidden = !button.textContent.toLowerCase().includes(search.value.trim().toLowerCase()); });
          empty.hidden = !!group.querySelector('button:not([hidden])');
        });
        group.append(search);
      }
      if (profiles) { group.append(results, empty); empty.setAttribute('role', 'status'); }
      const choices = [...select.options].map(option => {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = option.textContent; button.dataset.choice = option.value;
        if (profiles) {
          const avatar = document.createElement('span'); avatar.className = 'profile-picker-avatar'; avatar.setAttribute('aria-hidden', 'true');
          avatar.textContent = option.textContent.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('');
          const text = document.createElement('span'); text.className = 'profile-picker-text';
          const name = document.createElement('strong'); name.textContent = option.textContent;
          const detail = document.createElement('small'); detail.textContent = option.dataset.profileDetail || option.value;
          const indicator = document.createElement('span'); indicator.className = 'choice-indicator'; indicator.setAttribute('aria-hidden', 'true');
          text.append(name, detail); button.replaceChildren(avatar, text, indicator);
        } else if (select.name === 'service') {
          const indicator = document.createElement('span'); indicator.className = 'choice-indicator'; indicator.setAttribute('aria-hidden', 'true'); button.prepend(indicator);
        }
        button.addEventListener('click', () => {
          if (select.matches(':disabled') || option.disabled) return;
          if (select.multiple) option.selected = !option.selected; else select.value = option.value;
          group.querySelector('.choice-error')?.remove(); update();
          select.dispatchEvent(new Event('change', { bubbles: true }));
        });
        (profiles ? results : group).append(button); return { option, button };
      });
      function update() { choices.forEach(({ option, button }) => { button.setAttribute('aria-pressed', String(option.selected)); const disabled = select.matches(':disabled') || option.disabled; if (button.disabled !== disabled) button.disabled = disabled; }); }
      select.refreshChoices = update;
      select.addEventListener('change', update);
      select.addEventListener('invalid', event => {
        event.preventDefault(); choices.find(({ button }) => !button.disabled)?.button.focus();
        if (!group.querySelector('.choice-error')) { const error = document.createElement('p'); error.className = 'choice-error field-error'; error.textContent = 'Choose an option to continue.'; group.append(error); }
      });
      select.after(group); update();
    });
    root.querySelectorAll('.header-actions, .button-row, .work-item-actions, .update-actions, .form-actions').forEach(actions => {
      const states = [...actions.children].filter(child => child.matches('.status'));
      if (!states.length || !actions.querySelector('.btn, button')) return;
      const line = document.createElement('div'); line.className = 'record-state'; line.append(...states);
      const title = actions.matches('.header-actions') && actions.closest('.page-header')?.querySelector(':scope > div:first-child');
      if (title) title.append(line); else actions.before(line);
    });
    root.querySelectorAll('.visit-row, .document-item').forEach(row => {
      if (row.classList.contains('action-record')) return;
      const actions = [...row.children].filter(child => child.matches('.btn, .button-row, button'));
      if (!actions.length) return;
      const body = row.querySelector('.body');
      if (body) [...row.children].filter(child => child.matches('.status')).forEach(status => { const line = document.createElement('div'); line.className = 'record-state'; line.append(status); body.append(line); });
      const footer = document.createElement('div'); footer.className = 'record-actions'; footer.append(...actions); row.append(footer); row.classList.add('action-record');
    });
  }

  function sections(root, panels, label, key) {
    if (panels.length < 2) return;
    const navigation = document.createElement('div');
    navigation.className = 'section-navigation';
    navigation.setAttribute('role', 'group');
    navigation.setAttribute('aria-label', label);
    const buttons = panels.map((panel, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'section-button';
      button.textContent = panel.classList.contains('schedule-surface') ? 'Roster' : ({'Worker eligibility':'Staff approval','Recorded cancellations':'Cancellations'}[panel.querySelector('h2')?.textContent] || panel.querySelector('h2')?.textContent) || panel.getAttribute('aria-label') || `Section ${index + 1}`;
      panel.id ||= `workspace-section-${index}`;
      button.setAttribute('aria-controls', panel.id);
      button.addEventListener('click', () => select(index));
      navigation.append(button);
      return button;
    });
    function select(index) {
      views.set(key, index);
      panels.forEach((panel, position) => { panel.hidden = position !== index; if (position === index) reveal(panel); });
      buttons.forEach((button, position) => button.setAttribute('aria-pressed', String(position === index)));
    }
    root.classList.add('sectioned-page');
    const anchor = root.querySelector(':scope > .page-header, :scope > .queue-filter-group');
    if (root.querySelector(':scope > .queue-filter-group')) root.querySelector(':scope > .queue-filter-group').after(navigation);
    else if (anchor) anchor.after(navigation);
    else root.prepend(navigation);
    select(Math.min(views.get(key) || 0, panels.length - 1));
  }

  function paginate(container, rows, key, size, table = false) {
    const signature = rows.map(row => row.textContent).join('\n');
    let searchQuery = "";
    let current = pages.get(key);
    if (!current || current.signature !== signature) current = { page: 1, size: current?.size || size, signature };
    pages.set(key, current);
    const footer = document.createElement('nav');
    footer.className = 'pagination';
    footer.setAttribute('aria-label', `${container.closest('section')?.querySelector('h2')?.textContent || 'Records'} pagination`);
    const summary = document.createElement('span');
    summary.className = 'pagination-summary';
    summary.setAttribute('role', 'status');
    const label = document.createElement('label');
    label.textContent = 'Per page';
    const select = document.createElement('select');
    for (const count of [size, size * 2, size * 4]) {
      const option = document.createElement('option');
      option.value = count;
      option.textContent = count;
      select.append(option);
    }
    select.value = current.size;
    label.append(select);
    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'btn small';
    previous.textContent = 'Previous';
    const next = previous.cloneNode(true);
    next.textContent = 'Next';
    const position = document.createElement('span');
    position.className = 'pagination-position';
    footer.append(summary, ...(container.matches('.roster-scroll, .work-card-panel') ? [] : [label]), previous, position, next);
    if (table) container.after(footer);
    else container.append(footer);
    function update() {
      const matching = rows.filter(row => row.textContent.toLowerCase().includes(searchQuery));
      const total = Math.max(1, Math.ceil(matching.length / current.size));
      current.page = Math.max(1, Math.min(current.page, total));
      const start = (current.page - 1) * current.size;
      rows.forEach(row => { const index=matching.indexOf(row); row.hidden = index < start || index >= start + current.size; });
      summary.textContent = matching.length ? `${start + 1}–${Math.min(start + current.size, matching.length)} of ${matching.length}` : '0 records';
      const empty=container.closest("section")?.querySelector(".crm-search-empty");if(empty)empty.hidden=matching.length>0;
      position.textContent = `${current.page} / ${total}`;
      previous.disabled = current.page === 1;
      next.disabled = current.page === total;
      select.disabled = !rows.length;
    }
    function move(delta) {
      current.page += delta;
      update();
      if (previous.disabled || next.disabled) (delta > 0 ? previous : next).focus({ preventScroll: true });
    }
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    select.addEventListener('change', () => { current.size = Number(select.value); current.page = 1; update(); });
    const search=container.closest("section")?.querySelector("[data-list-search]");
    search?.addEventListener("input",()=>{searchQuery=search.value.toLowerCase().trim();current.page=1;update();});
    update();
  }

  function mount(root, route) {
    if (!root) return;
    enhance(root.closest("#app") || root);
    const caseList = root.querySelector('.automation-desk .automation-case-list');
    const selectedCase = caseList?.querySelector('.automation-case.selected:not([hidden])');
    if (selectedCase && caseList.clientHeight) caseList.scrollTop = Math.max(0, selectedCase.offsetTop - caseList.offsetTop - caseList.clientHeight / 2 + selectedCase.offsetHeight / 2);
    const record = root.querySelector('.record-page');
    if (record) {
      const body=record.querySelector('.grid-detail');
      sections(record, [...record.querySelectorAll('.grid-detail > section.panel, .grid-detail > div.stack > section.panel')], 'Record sections', route);
      if(body) {
        body.classList.add('crm-record-body');
        const navigation=record.querySelector(':scope > .section-navigation');
        const main=body.querySelector(':scope > div.stack');
        if(navigation&&main)main.prepend(navigation);
      }
    }
    if (route === 'office/schedule') {
      const panels = [...root.querySelectorAll('.schedule-surface, .grid-two > section.panel, :scope > section.panel')];
      sections(root, panels, 'Schedule sections', route);
    }
    root.querySelectorAll('.table-wrap, .roster-scroll').forEach((container, index) => {
      if (container.closest('.invoice-sheet')) return;
      container.tabIndex = 0;
      container.setAttribute('role', 'region');
      container.setAttribute('aria-label', container.closest('section')?.querySelector('h2')?.textContent || 'Records table');
      const rows = [...container.querySelectorAll('tbody > tr')].filter(row => !row.querySelector('.empty'));
      const filters = [...root.querySelectorAll('.toolbar input, .toolbar select, #schedule-worker-search')].map(input => input.value).join('|') + '|' + (root.querySelector('[data-action="schedule-status"][aria-pressed="true"]')?.dataset.value || '');
      const heading = container.querySelector('thead')?.textContent || '';
      paginate(container, rows, `${route}:table:${index}:${heading}:${filters}`, container.classList.contains('roster-scroll') ? (window.innerWidth > 1100 ? (window.innerHeight < 850 ? 2 : 3) : 4) : 8, true);
    });
    const cards = root.querySelector('.enquiry-cards');
    if (cards) {
      const rows = [...cards.querySelectorAll(':scope > .enquiry-card')];
      paginate(cards, rows, `${route}:enquiry-cards:${document.getElementById('enquiry-search')?.value || ''}:${document.getElementById('enquiry-status')?.value || ''}`, 8);
    }
    const candidates = root.querySelectorAll('.panel, .staff-list, .automation-inbox, .document-list, .automation-case-list, .proof-findings');
    candidates.forEach((container, index) => {
      if (container.matches(".automation-case-list") && container.closest(".automation-desk")) return;
      const rows = [...container.children].filter(child => child.matches('.work-item, .visit-row, .update-item, .document-item, .staff-card, .automation-case, .automation-inbox > article, .proof-findings > article'));
      const pageSize = container.classList.contains('work-card-panel') ? (window.innerWidth >= 1280 ? 3 : 2) : 5;
      if (rows.length > pageSize) paginate(container, rows, `${route}:list:${index}`, pageSize);
    });
  }

  window.OCD_UI = { mount, enhance };
  let pendingEnhancement = false;
  new MutationObserver(() => {
    if (pendingEnhancement) return;
    pendingEnhancement = true;
    queueMicrotask(() => { pendingEnhancement = false; enhance(document.body); });
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
  enhance(document.body);
})();
