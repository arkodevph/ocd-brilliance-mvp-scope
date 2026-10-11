const fs = require('node:fs/promises');
const path = require('node:path');
const { Redis } = require('@upstash/redis');
const { WorkflowError, duplicateOf } = require('./intake-domain.cjs');
let localWrite = Promise.resolve();

// Owns persistence and compare-and-set updates; domain rules stay in IntakeService.
class IntakeRepository {
  constructor({ directory = process.env.WORKFLOW_DATA_DIR || path.join(__dirname, '..', '.local'), redis = null } = {}) {
    this.file = path.join(directory, 'intakes.json');
    this.redis = redis;
  }
  static configured() {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) return new IntakeRepository({ redis: Redis.fromEnv() });
    return process.env.VERCEL ? null : new IntakeRepository();
  }
  unpack(value) { return typeof value === 'string' ? JSON.parse(value) : value; }
  async readFile() {
    try { return JSON.parse(await fs.readFile(this.file, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return {}; throw error; }
  }
  async all() {
    if (this.redis) return Object.values(await this.redis.hgetall('ocd:intakes') || {}).map(value => this.unpack(value));
    await localWrite;
    return Object.values(await this.readFile());
  }
  async get(id) {
    if (this.redis) return this.unpack(await this.redis.hget('ocd:intakes', id));
    await localWrite;
    return (await this.readFile())[id] || null;
  }
  async set(record, expectedRevision, { unique = false } = {}) {
    const { operations, creationResult, ...operationResult } = record;
    const candidate = operations?.at(-1);
    const replayable = Boolean(expectedRevision && candidate?.inputRevision === expectedRevision && candidate.result === JSON.stringify(operationResult));
    if (this.redis) {
      const result = await this.redis.eval(`
        local records = redis.call('HVALS', KEYS[1])
        local incoming = cjson.decode(ARGV[2])
        local function phone(value)
          local number = string.gsub(value or '', '%D', '')
          if #number == 11 and string.sub(number, 1, 2) == '61' then number = '0' .. string.sub(number, 3) end
          return number
        end
        for _, value in ipairs(records) do
          local item = cjson.decode(value)
          if ARGV[3] == '' and incoming.creationKey and item.creationKey == incoming.creationKey then
            if item.creationHash ~= incoming.creationHash then return 'KEY_CONFLICT' end
            return item.creationResult or value
          end
          if ARGV[4] == '1' and item.id ~= incoming.id then
            local incomingRequest = incoming.bookingRequest ~= nil and incoming.bookingRequest ~= cjson.null
            local itemRequest = item.bookingRequest ~= nil and item.bookingRequest ~= cjson.null
            local comparable = not incomingRequest and not itemRequest
            if incomingRequest and itemRequest and item.status ~= 'Closed' then
              local left, right = incoming.bookingRequest.services, item.bookingRequest.services
              table.sort(left); table.sort(right)
              comparable = incoming.bookingRequest.preferredDate == item.bookingRequest.preferredDate and table.concat(left, '|') == table.concat(right, '|')
            end
            if comparable and ((incoming.email ~= '' and string.lower(incoming.email) == string.lower(item.email or '')) or
               (phone(incoming.phone) ~= '' and phone(incoming.phone) == phone(item.phone))) then return 'DUPLICATE' end
          end
        end
        local previous = redis.call('HGET', KEYS[1], ARGV[1])
        if previous and ARGV[5] == '1' then
          local operation = incoming.operations[#incoming.operations]
          for _, item in ipairs(cjson.decode(previous).operations or {}) do
            if item.inputRevision == operation.inputRevision and item.by == operation.by and item.action == operation.action then
              if item.hash ~= operation.hash then return 'KEY_CONFLICT' end
              return item.result
            end
          end
        end
        if ARGV[3] ~= '' then
          if not previous then return 0 end
          if (cjson.decode(previous).revision or cjson.decode(previous).updatedAt or '') ~= ARGV[3] then return 0 end
        end
        redis.call('HSET', KEYS[1], ARGV[1], ARGV[2])
        return 1
      `, ['ocd:intakes'], [record.id, JSON.stringify(record), expectedRevision || '', unique ? '1' : '0', replayable ? '1' : '0']);
      if (result === 'KEY_CONFLICT') throw new WorkflowError(409, 'Idempotency key was already used for different details.');
      if (result === 'DUPLICATE') throw new WorkflowError(409, 'A matching enquiry exists. Review it before creating another draft.');
      if (!result) throw new WorkflowError(409, 'This request changed. Refresh it before saving.');
      return typeof result === 'string' ? JSON.parse(result) : record;
    }
    const next = localWrite.then(async () => {
      const records = await this.readFile();
      const replay = !expectedRevision && record.creationKey && Object.values(records).find(item => item.creationKey === record.creationKey);
      if (replay) {
        if (replay.creationHash !== record.creationHash) throw new WorkflowError(409, 'Idempotency key was already used for different details.');
        return JSON.parse(replay.creationResult);
      }
      if (unique && duplicateOf(record, Object.values(records))) throw new WorkflowError(409, 'A matching enquiry exists. Review it before creating another draft.');
      const operation = replayable && candidate;
      const priorOperation = operation && records[record.id]?.operations?.find(item => item.inputRevision === operation.inputRevision && item.by === operation.by && item.action === operation.action);
      if (priorOperation) {
        if (priorOperation.hash !== operation.hash) throw new WorkflowError(409, 'Idempotency key was already used for different details.');
        return JSON.parse(priorOperation.result);
      }
      if (expectedRevision && (records[record.id]?.revision || records[record.id]?.updatedAt) !== expectedRevision) throw new WorkflowError(409, 'This request changed. Refresh it before saving.');
      records[record.id] = record;
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      const temp = `${this.file}.tmp`;
      await fs.writeFile(temp, JSON.stringify(records, null, 2), { mode: 0o600 });
      await fs.rename(temp, this.file);
      return record;
    });
    localWrite = next.catch(() => {});
    return await next;
  }
}
module.exports = { IntakeRepository };
