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
  let installed = false;
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

  dialog.innerHTML = `<div class="app-tools-head"><div><span class="app-tools-kicker">YOUR APP</span><h2 id="app-tools-heading" tabindex="-1">App & alerts</h2><p>Add the app to your phone and try sample notifications.</p></div><button class="app-tools-close" type="button" data-app-tools-close aria-label="Close app and alerts">×</button></div>
    <div class="app-tools-body"><section class="app-tools-section" aria-labelledby="install-heading"><div class="app-tools-step">01</div><div class="app-tools-copy"><h3 id="install-heading">Add to Home Screen</h3><p id="install-status" role="status">Checking installation…</p><p class="app-tools-detail">On iPhone or iPad, use Share → Add to Home Screen. On other devices, look for Install or Add to Home Screen in your browser menu.</p><button class="btn primary app-tools-action" id="install-app" type="button" hidden>Add app</button></div></section>
    <section class="app-tools-section" aria-labelledby="alerts-heading"><div class="app-tools-step">02</div><div class="app-tools-copy"><h3 id="alerts-heading">Demo notifications</h3><p id="alerts-status" role="status"></p><p class="app-tools-detail">Sample booking updates appear inside the open app. They use fictional records and do not change bookings or send phone push notifications.</p><div class="app-tools-buttons"><button class="btn primary app-tools-action" id="enable-alerts" type="button">Turn on demo alerts</button><button class="btn primary app-tools-action" id="preview-in-app-notification" type="button" hidden>Show sample notification</button><button class="btn app-tools-action" id="disable-alerts" type="button" hidden>Turn off demo alerts</button></div></div></section><p id="app-tools-feedback" class="app-tools-feedback" role="status" aria-live="polite"></p></div>`;

  const installStatus = dialog.querySelector('#install-status');
  const alertsStatus = dialog.querySelector('#alerts-status');
  const feedback = dialog.querySelector('#app-tools-feedback');
  const installButton = dialog.querySelector('#install-app');
  const enableButton = dialog.querySelector('#enable-alerts');
  const previewButton = dialog.querySelector('#preview-in-app-notification');
  const disableButton = dialog.querySelector('#disable-alerts');
  const standalone = () =>
    installed || matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
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

  function updateInstall() {
    const instructions = appleMobile()
      ? 'Tap Share → Add to Home Screen → Add. If Brave does not show that option, open this page in Safari and use its Share menu.'
      : /Android/.test(navigator.userAgent)
        ? 'Open your browser’s menu → Install app or Add to Home Screen. If Brave does not offer it, open this page in Chrome and try again.'
        : 'Open your browser’s menu and choose Install app or Add to Home Screen.';
    installStatus.textContent = standalone()
      ? 'Added to this device.'
      : !window.isSecureContext
        ? 'Open the HTTPS version of this site to install it on your phone.'
        : registrationError
          ? 'App setup could not finish. Check your connection, reload this page and try again.'
          : installPrompt
            ? 'Ready to add from this browser.'
            : instructions;
    installButton.hidden = standalone();
    installButton.textContent = installPrompt ? 'Add app' : 'Show install steps';
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
      showFeedback(installStatus.textContent);
      return;
    }

    installButton.disabled = true;
    const prompt = installPrompt;
    installPrompt = null;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      showFeedback(
        choice.outcome === 'accepted'
          ? 'Installation accepted. Look for OCD Brilliance on your Home Screen or in your app list.'
          : 'Installation was cancelled. You can try again from your browser’s menu.',
      );
    } catch {
      showFeedback(
        'The browser could not open installation. Use its menu to add the app, or try Safari on iPhone and Chrome on Android.',
      );
    } finally {
      installButton.disabled = false;
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
    installed = true;
    installPrompt = null;
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
