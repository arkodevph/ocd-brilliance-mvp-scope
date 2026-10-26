const path = require('node:path');
try { process.loadEnvFile(path.resolve(__dirname, '../.env.local')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const { AutomationService } = require('../.backend/automation/service.js');
const { AutomationStore } = require('../.backend/automation/store.js');
const { Microsoft365Mailbox, mailboxConfiguration } = require('../.backend/automation/microsoft365.js');
const { ShiftCareOperations } = require('../.backend/automation/shiftcare-operations.js');
const { createAutomationRuntime } = require('../.backend/automation/runtime.js');
const seedLocalStaff = require('./local-staff.cjs');
const { PostgresIntakeRepository } = require('../lib/intake-postgres-repository.cjs');
const close = () => Promise.all([AutomationStore.close(), PostgresIntakeRepository.close()]);

async function tick() {
  await seedLocalStaff();
  const { service, mailbox } = createAutomationRuntime();
  const intakes = await service.syncIntakes(), schedules = await service.dueSchedules(), overdue = await service.followUpDeadlines();
  let imported = 0;
  if (mailboxConfiguration().configured) {
    try { imported = (await mailbox.poll()).imported; }
    catch (_) { console.error('Mailbox import failed; continuing other workflow checks.'); }
  }
  const processed = await service.process();
  console.log(JSON.stringify({ at: new Date().toISOString(), intakes, schedules, imported, processed, overdue }));
}
function startEmbeddedWorker() {
  let stopped = false, active;
  const run = () => {
    if (stopped || active) return;
    active = tick().catch(() => console.error('Application workflow check failed. Check storage and configured connections.')).finally(() => { active = null; });
  };
  const timer = setInterval(run, Math.max(5000, Number(process.env.AUTOMATION_POLL_MS) || 30000)); timer.unref(); run();
  return async () => { stopped = true; clearInterval(timer); await active; };
}
async function main() {
  if (process.argv.includes('--once')) { await tick(); await close(); return; }
  const interval = Math.max(5000, Number(process.env.AUTOMATION_POLL_MS) || 30000);
  let stopping = false;
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => { stopping = true; });
  while (!stopping) {
    try { await tick(); } catch (_) { console.error('Automation tick failed. Check storage, mailbox access and configured staff ownership.'); }
    if (!stopping) await new Promise(resolve => setTimeout(resolve, interval));
  }
  await close();
}
if (require.main === module) main().catch(async () => { console.error('Automation worker could not start. Check configuration.'); await close(); process.exitCode = 1; });
module.exports = { tick, startEmbeddedWorker };
