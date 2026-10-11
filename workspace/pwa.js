(() => {
  const dialog = document.getElementById('app-tools-dialog');
  let installPrompt = null;
  let registration = null;
  let subscription = null;
  let config = { available: false, publicKey: '', localDemo: false };
  let trigger = null;

  dialog.innerHTML = `<div class="app-tools-head"><div><span class="app-tools-kicker">YOUR APP</span><h2 id="app-tools-heading" tabindex="-1">App & alerts</h2><p>Keep the demo close and choose whether this device receives updates.</p></div><button class="app-tools-close" type="button" data-app-tools-close aria-label="Close app and alerts">×</button></div>
    <div class="app-tools-body"><section class="app-tools-section" aria-labelledby="install-heading"><div class="app-tools-step">01</div><div class="app-tools-copy"><h3 id="install-heading">Add to Home Screen</h3><p id="install-status" role="status">Checking installation…</p><p class="app-tools-detail">On iPhone or iPad, use Share → Add to Home Screen. On other devices, look for Install or Add to Home Screen in your browser menu.</p><button class="btn primary app-tools-action" id="install-app" type="button" hidden>Add app</button></div></section>
    <section class="app-tools-section" aria-labelledby="alerts-heading"><div class="app-tools-step">02</div><div class="app-tools-copy"><h3 id="alerts-heading">Push alerts</h3><p id="alerts-status" role="status">Checking this device…</p><p class="app-tools-detail">Optional demo updates go to devices that turn alerts on. Messages use fictional, general wording and may arrive after the app closes.</p><div class="app-tools-buttons"><button class="btn primary app-tools-action" id="enable-alerts" type="button" hidden>Turn on alerts</button><button class="btn app-tools-action" id="test-alerts" type="button" hidden>Send me a test</button><button class="btn app-tools-action" id="disable-alerts" type="button" hidden>Turn off alerts</button></div><div id="demo-broadcast" class="app-tools-demo" hidden><p>Local demo: send one update to every device that opted in.</p><button class="btn app-tools-action" id="broadcast-demo" type="button">Send update to all</button></div><p id="app-tools-feedback" class="app-tools-feedback" role="status" aria-live="polite"></p></div></section></div>`;

  const installStatus = dialog.querySelector('#install-status');
  const alertsStatus = dialog.querySelector('#alerts-status');
  const feedback = dialog.querySelector('#app-tools-feedback');
  const installButton = dialog.querySelector('#install-app');
  const enableButton = dialog.querySelector('#enable-alerts');
  const testButton = dialog.querySelector('#test-alerts');
  const disableButton = dialog.querySelector('#disable-alerts');
  const demoBroadcast = dialog.querySelector('#demo-broadcast');
  const broadcastButton = dialog.querySelector('#broadcast-demo');
  const standalone = () =>
    matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const appleMobile = () =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const supported = () =>
    window.isSecureContext &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;
  const readyRegistration = () =>
    Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Service worker is not ready.')), 6000),
      ),
    ]);

  function showFeedback(message) {
    feedback.textContent = message;
  }
  function updateInstall() {
    installStatus.textContent = standalone()
      ? 'Added to this device.'
      : installPrompt
        ? 'Ready to add from this browser.'
        : 'Not added yet.';
    installButton.hidden = standalone() || !installPrompt;
  }

  async function refresh() {
    updateInstall();
    if (appleMobile() && !standalone()) {
      alertsStatus.textContent =
        'Add the app to your Home Screen, then open it from its icon to turn on alerts.';
      enableButton.hidden = testButton.hidden = disableButton.hidden = true;
      demoBroadcast.hidden = true;
      return;
    }
    if (!supported()) {
      alertsStatus.textContent = !window.isSecureContext
        ? 'Alerts need HTTPS or localhost.'
        : 'Push alerts are unavailable in this browser. You can still use the app.';
      enableButton.hidden = testButton.hidden = disableButton.hidden = true;
      demoBroadcast.hidden = true;
      return;
    }
    try {
      registration ||= await readyRegistration();
      const response = await fetch('/api/push', { cache: 'no-store' });
      config = await response.json();
      subscription = await registration.pushManager.getSubscription();
      if (subscription && config.available && Notification.permission === 'granted')
        await post('subscribe', { subscription: subscription.toJSON() });
      if (Notification.permission === 'denied') {
        alertsStatus.textContent =
          'Blocked in browser settings. Allow notifications there to turn alerts on.';
      } else if (!config.available) {
        alertsStatus.textContent = 'The demo push server is not configured yet.';
      } else {
        alertsStatus.textContent = subscription
          ? 'Alerts are on for this device.'
          : 'Alerts are off. Turn them on when you want demo updates.';
      }
      enableButton.hidden =
        Boolean(subscription) || Notification.permission === 'denied' || !config.available;
      testButton.hidden =
        !subscription || !config.available || Notification.permission !== 'granted';
      disableButton.hidden = !subscription;
      demoBroadcast.hidden = !config.localDemo || !subscription;
    } catch (_) {
      alertsStatus.textContent = 'Cannot reach the push server right now. The app still works.';
      enableButton.hidden = testButton.hidden = true;
      disableButton.hidden = !subscription;
      demoBroadcast.hidden = true;
    }
  }

  function applicationServerKey(value) {
    const padded = `${value}${'='.repeat((4 - (value.length % 4)) % 4)}`
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  }

  async function post(action, data = {}) {
    const response = await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data }),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || 'The push server could not complete this request.');
    return result;
  }

  async function enable() {
    showFeedback('');
    enableButton.disabled = true;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        showFeedback('Alerts remain off. You can use the app without them.');
        return;
      }
      registration ||= await readyRegistration();
      subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey(config.publicKey),
        }));
      await post('subscribe', { subscription: subscription.toJSON() });
      showFeedback('This device is subscribed. Send yourself a test to check delivery.');
    } catch (error) {
      showFeedback(
        error instanceof DOMException
          ? 'This browser could not register for push. Check its notification settings and try again.'
          : error.message || 'Could not turn on alerts.',
      );
    } finally {
      enableButton.disabled = false;
      await refresh();
    }
  }

  async function disable() {
    showFeedback('');
    disableButton.disabled = true;
    try {
      const current = subscription || (await registration.pushManager.getSubscription());
      if (current) {
        try {
          await post('unsubscribe', { endpoint: current.endpoint });
        } finally {
          await current.unsubscribe();
          subscription = null;
        }
      }
      showFeedback('Alerts are off for this device.');
    } catch (error) {
      showFeedback(
        `Alerts stopped on this device. Server cleanup may be delayed: ${error.message}`,
      );
    } finally {
      disableButton.disabled = false;
      await refresh();
    }
  }

  async function test() {
    showFeedback('Sending a test to this device…');
    testButton.disabled = true;
    try {
      await post('test', { endpoint: subscription.endpoint });
      showFeedback('Test accepted by the push service. It may take a moment to appear.');
    } catch (error) {
      showFeedback(error.message || 'The test could not be sent.');
    } finally {
      testButton.disabled = false;
    }
  }

  async function broadcast() {
    showFeedback('Sending a demo update…');
    broadcastButton.disabled = true;
    try {
      const result = await post('broadcast-demo');
      showFeedback(
        `Update sent to the push service for ${result.sent} of ${result.subscribed} subscribed devices.`,
      );
    } catch (error) {
      showFeedback(error.message || 'The update could not be sent.');
    } finally {
      broadcastButton.disabled = false;
    }
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
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    updateInstall();
  });
  enableButton.addEventListener('click', enable);
  disableButton.addEventListener('click', disable);
  testButton.addEventListener('click', test);
  broadcastButton.addEventListener('click', broadcast);
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event;
    updateInstall();
  });
  window.addEventListener('appinstalled', updateInstall);
  if ('serviceWorker' in navigator)
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  updateInstall();
})();
