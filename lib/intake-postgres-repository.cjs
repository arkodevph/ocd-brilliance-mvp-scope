const { Pool } = require('pg');
const { WorkflowError, duplicateOf } = require('./intake-domain.cjs');
const pools = new Map();
class PostgresIntakeRepository {
  constructor(connectionString) {
    if (!pools.has(connectionString)) pools.set(connectionString, new Pool({ connectionString, max: 3, connectionTimeoutMillis: 5000 }));
    this.pool = pools.get(connectionString);
  }
  async all() { return (await this.pool.query('SELECT record FROM intakes')).rows.map(row => row.record); }
  async get(id) { return (await this.pool.query('SELECT record FROM intakes WHERE id=$1', [id])).rows[0]?.record || null; }
  async set(record, expectedRevision, { unique = false } = {}) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Serialise intake uniqueness and replay checks across API instances.
      await client.query('SELECT pg_advisory_xact_lock(73620915)');
      const records = (await client.query('SELECT record FROM intakes')).rows.map(row => row.record);
      const previous = records.find(item => item.id === record.id);
      const replay = !expectedRevision && record.creationKey && records.find(item => item.creationKey === record.creationKey);
      if (replay) {
        if (replay.creationHash !== record.creationHash) throw new WorkflowError(409, 'Idempotency key was already used for different details.');
        await client.query('COMMIT'); return JSON.parse(replay.creationResult);
      }
      if (unique && duplicateOf(record, records)) throw new WorkflowError(409, 'A matching enquiry exists. Review it before creating another draft.');
      const { operations, creationResult, ...operationResult } = record;
      const candidate = operations?.at(-1);
      const replayable = expectedRevision && candidate?.inputRevision === expectedRevision && candidate.result === JSON.stringify(operationResult);
      const prior = replayable && previous?.operations?.find(item => item.inputRevision === candidate.inputRevision && item.by === candidate.by && item.action === candidate.action);
      if (prior) {
        if (prior.hash !== candidate.hash) throw new WorkflowError(409, 'Idempotency key was already used for different details.');
        await client.query('COMMIT'); return JSON.parse(prior.result);
      }
      if (expectedRevision && (previous?.revision || previous?.updatedAt) !== expectedRevision) throw new WorkflowError(409, 'This request changed. Refresh it before saving.');
      await client.query('INSERT INTO intakes(id,revision,record) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET revision=EXCLUDED.revision,record=EXCLUDED.record', [record.id, record.revision || record.updatedAt, record]);
      await client.query('COMMIT'); return record;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  static async close() { await Promise.all([...pools.values()].map(pool => pool.end())); pools.clear(); }
}
module.exports = { PostgresIntakeRepository };
