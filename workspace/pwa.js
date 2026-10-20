(() => {
  const dialog = document.getElementById('app-tools-dialog') || document.createElement('dialog');
  if (!dialog.isConnected) {
    dialog.id = 'app-tools-dialog';
    dialog.className = 'app-tools-dialog';
    dialog.setAttribute('aria-labelledby', 'app-tools-heading');
    document.body.appendChild(dialog);
  }

  let installPrompt = null;

  let trigger = null;
  let activeWorker = null;
  let installationPending = false;
  let prompting = false;
  let registrationError = false;
  const alertStore = 'ocd-demo-alert-status-v2';
  let workerAlerts = {};

  try {
    workerAlerts = JSON.parse(localStorage.getItem(alertStore) || '{}');
  } catch (_) {}

  if (!workerAlerts || typeof workerAlerts !== 'object' || Array.isArray(workerAlerts))
    workerAlerts = {};

  function recordAlertStatus(workerId, status, detail) {
    if (!workerId) return;
    workerAlerts[workerId] = { status, detail, checkedAt: new Date().toISOString() };

    try {
      localStorage.setItem(alertStore, JSON.stringify(workerAlerts));
    } catch (_) {}

    document.querySelectorAll('[data-worker-alert-status]').forEach((node) => {
      if (node.dataset.workerAlertStatus === workerId) node.textContent = status;
    });

    document.querySelectorAll('[data-worker-alert-checked]').forEach((node) => {
      if (node.dataset.workerAlertChecked === workerId)
        node.textContent = `Last checked ${new Date(workerAlerts[workerId].checkedAt).toLocaleString('en-AU')}`;
    });

    document.querySelectorAll('[data-worker-alert-detail]').forEach((node) => {
      if (node.dataset.workerAlertDetail === workerId) node.textContent = detail;
    });
  }

  window.OCD_ALERTS = {
    get(workerId) {
      return (
        workerAlerts[workerId] || {
          status: 'Demo · off',
          detail: 'Sample notifications are off in this browser.',
        }
      );
    },
    setWorker(workerId) {
      if (activeWorker === workerId) return;
      activeWorker = workerId;
      if (workerId) refresh();
    },
  };

  window.addEventListener('storage', (event) => {
    if (event.key !== alertStore) return;
    try {
      const records = JSON.parse(event.newValue || '{}');
      if (!records || typeof records !== 'object' || Array.isArray(records)) return;
      workerAlerts = records;
      document.querySelectorAll('[data-worker-alert-checked]').forEach((node) => {
        const record = window.OCD_ALERTS.get(node.dataset.workerAlertChecked);
        node.textContent = record.checkedAt
          ? `Last checked ${new Date(record.checkedAt).toLocaleString('en-AU')}`
          : 'No device check recorded';
      });

      document.querySelectorAll('[data-worker-alert-status]').forEach((node) => {
        node.textContent = window.OCD_ALERTS.get(node.dataset.workerAlertStatus).status;
      });

      document.querySelectorAll('[data-worker-alert-detail]').forEach((node) => {
        node.textContent = window.OCD_ALERTS.get(node.dataset.workerAlertDetail).detail;
      });
    } catch (_) {}
    refresh();
  });

  dialog.innerHTML = `<div class="app-tools-head"><div><span class="app-tools-kicker">YOUR APP</span><h2 id="app-tools-heading" tabindex="-1">App & alerts</h2><p>Add the app to your device or use it in your browser.</p></div><button class="app-tools-close" type="button" data-app-tools-close aria-label="Close app and alerts">×</button></div>
    <div class="app-tools-body"><section class="app-tools-section" aria-labelledby="install-heading"><div class="app-tools-step">01</div><div class="app-tools-copy"><h3 id="install-heading">Use OCD Brilliance</h3><p id="install-status" role="status">Checking installation…</p><p class="app-tools-detail">Installation options depend on your browser. You can always open the workspace below.</p><div class="app-tools-buttons"><button class="btn primary app-tools-action" id="install-app" type="button" hidden>Add app</button><a class="btn primary app-tools-action" id="open-workspace" href="/portal">Open workspace</a></div><div id="install-steps" hidden><ol class="app-tools-detail"></ol><p class="app-tools-detail">After adding, open the OCD Brilliance icon from your Home Screen or app launcher.</p></div></div></section>
    <section class="app-tools-section" aria-labelledby="alerts-heading"><div class="app-tools-step">02</div><div class="app-tools-copy"><h3 id="alerts-heading">Demo notifications</h3><p id="alerts-status" role="status"></p><p class="app-tools-detail">Sample booking updates appear inside the open app. They use fictional records and do not change bookings or send phone push notifications.</p><div class="app-tools-buttons"><button class="btn primary app-tools-action" id="enable-alerts" type="button">Turn on demo alerts</button><button class="btn primary app-tools-action" id="preview-in-app-notification" type="button" hidden>Show sample notification</button><button class="btn app-tools-action" id="disable-alerts" type="button" hidden>Turn off demo alerts</button></div></div></section><p id="app-tools-feedback" class="app-tools-feedback" role="status" aria-live="polite"></p></div>`;

  const installStatus = dialog.querySelector('#install-status');
  const alertsStatus = dialog.querySelector('#alerts-status');
  const feedback = dialog.querySelector('#app-tools-feedback');
  const installButton = dialog.querySelector('#install-app');
  const installSteps = dialog.querySelector('#install-steps');
  const openApp = dialog.querySelector('#open-workspace');
  const enableButton = dialog.querySelector('#enable-alerts');
  const previewButton = dialog.querySelector('#preview-in-app-notification');
  const disableButton = dialog.querySelector('#disable-alerts');
  const standalone = () =>
    matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const appleMobile = () =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function showFeedback(message) {
    feedback.textContent = message;
  }

  function previewInAppNotification() {
    if (!demoAlertsEnabled()) return;
    dialog.close();
    document.getElementById('in-app-notification')?.remove();
    const notification = document.createElement('section');
    notification.id = 'in-app-notification';
    notification.className = 'in-app-notification';
    document.body.appendChild(notification);
    notification.innerHTML = `<div role="status" aria-live="polite"><span class="in-app-notification-label">Presentation demo</span><h2>Sample booking update</h2><p>Your sample booking is ready to review.</p><a href="/portal">Open demo workspace</a></div><button type="button" aria-label="Dismiss sample notification">×</button>`;
    notification.querySelector('button').addEventListener('click', () => {
      notification.remove();
      if (trigger?.isConnected) trigger.focus();
    });
  }

  dialog
    .querySelector('#preview-in-app-notification')
    .addEventListener('click', previewInAppNotification);

  function manualInstallSteps() {
    if (appleMobile())
      return [
        'Tap Share → Add to Home Screen → Add.',
        'If your browser does not offer that option, open this page in Safari and use Share → Add to Home Screen → Add.',
        'Return to your Home Screen and tap the OCD Brilliance icon.',
      ];
    if (/Android/.test(navigator.userAgent))
      return [
        'Open your browser’s menu → Add to Home screen or Install app.',
        'Confirm Add or Install in the browser prompt.',
        'Return to your Home Screen and tap the OCD Brilliance icon. If Brave stays on Installing or no icon appears, open this address in Chrome and try its menu → Add to Home screen.',
      ];
    return [
      'Click the install icon in the address bar, or open your browser’s menu (in Brave: Save and Share → Install OCD Brilliance).',
      'On a Mac using Safari, choose File → Add to Dock instead. Confirm Add or Install when asked.',
      'Launch OCD Brilliance from your desktop or app launcher. In Brave, find installed apps at brave://apps. If your browser has no install option, bookmark this page or use Open workspace below.',
    ];
  }

  function showInstallSteps() {
    installSteps.querySelector('ol').replaceChildren(
      ...manualInstallSteps().map((text) => {
        const item = document.createElement('li');
        item.textContent = text;
        return item;
      }),
    );
    installSteps.hidden = false;
  }

  function updateInstall() {
    installStatus.textContent = standalone()
      ? 'You are running OCD Brilliance in app mode.'
      : prompting
        ? 'Confirm installation in your browser’s prompt.'
        : installationPending
          ? 'Installation requested. Your browser handles setup and does not share download progress with this page. Open the OCD Brilliance icon to confirm it is ready.'
          : !window.isSecureContext
            ? 'Open the HTTPS version of this site to install it on your phone.'
            : registrationError
              ? 'App setup could not finish. Check your connection, reload this page and try again.'
              : installPrompt
                ? 'Ready to add from this browser.'
                : appleMobile()
                  ? 'Tap Share → Add to Home Screen → Add. If your browser does not show that option, open this page in Safari.'
                  : manualInstallSteps()[0];
    installButton.hidden = standalone();
    installButton.disabled = prompting;
    installButton.textContent = installPrompt ? 'Add app' : 'Show install steps';
    openApp.textContent = standalone() ? 'Open workspace' : 'Continue in browser';
    if (standalone()) installSteps.hidden = true;
  }

  function demoAlertsEnabled() {
    return workerAlerts[activeWorker || 'device']?.status === 'Demo · on';
  }

  function refresh() {
    updateInstall();
    const enabled = demoAlertsEnabled();
    alertsStatus.textContent = enabled
      ? 'Demo alerts are on. Show a sample booking update below.'
      : 'Demo alerts are off. Turn them on to try a sample booking update.';
    enableButton.hidden = enabled;
    previewButton.hidden = disableButton.hidden = !enabled;
  }

  function setDemoAlerts(enabled) {
    recordAlertStatus(
      activeWorker || 'device',
      enabled ? 'Demo · on' : 'Demo · off',
      enabled
        ? 'Sample notifications are enabled inside this open app.'
        : 'Sample notifications are off in this browser.',
    );
    if (!enabled) document.getElementById('in-app-notification')?.remove();
    showFeedback(
      enabled ? 'Ready. Tap Show sample notification to try it.' : 'Demo alerts are off.',
    );
    refresh();
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-app-tools-open]');
    if (!button) return;
    trigger = button;
    dialog.showModal();
    dialog.querySelector('#app-tools-heading').focus();
    showFeedback('');
    refresh();
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog || event.target.closest('[data-app-tools-close]')) dialog.close();
  });

  dialog.addEventListener('close', () => trigger?.isConnected && trigger.focus());
  installButton.addEventListener('click', async () => {
    if (!installPrompt) {
      showInstallSteps();
      showFeedback(installStatus.textContent);
      return;
    }

    prompting = true;
    updateInstall();
    const prompt = installPrompt;
    installPrompt = null;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      installationPending = installationPending || choice.outcome === 'accepted';
      showInstallSteps();
      showFeedback(
        choice.outcome === 'accepted'
          ? 'Installation requested. Wait for the browser to finish, then open the OCD Brilliance icon.'
          : 'Installation was cancelled. You can try again from your browser’s menu.',
      );
    } catch {
      showInstallSteps();
      showFeedback(
        'The browser could not open installation. Use its menu to add the app, or try Safari on iPhone and Chrome on Android.',
      );
    } finally {
      prompting = false;
      updateInstall();
    }
  });

  enableButton.addEventListener('click', () => setDemoAlerts(true));
  disableButton.addEventListener('click', () => setDemoAlerts(false));
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event;
    updateInstall();
  });

  window.addEventListener('appinstalled', () => {
    // Android can fire this before its app package has finished installing.
    installationPending = true;
    prompting = false;
    installPrompt = null;
    showInstallSteps();
    showFeedback(
      'Your browser accepted the request. Open the OCD Brilliance icon to check installation.',
    );
    updateInstall();
  });

  window.addEventListener('focus', () => {
    if (activeWorker) refresh();
  });

  if (window.isSecureContext && 'serviceWorker' in navigator)
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      registrationError = true;
      updateInstall();
    });

  refresh();
})();
