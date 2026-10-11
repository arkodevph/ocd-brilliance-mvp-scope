const { getApplication } = require('../.backend/application.js');

module.exports = async function dispatch(req, res) {
  try {
    const app = await getApplication();
    app.getHttpAdapter().getInstance()(req, res);
  } catch (_) {
    res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ error: 'The backend service is unavailable.' }));
  }
};
