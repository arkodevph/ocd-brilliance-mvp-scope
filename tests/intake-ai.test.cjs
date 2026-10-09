const test = require('node:test');
const assert = require('node:assert/strict');
const { arrange, config, emailDraft, emailReview } = require('../lib/intake-ai.cjs');
const { IntakeService } = require('../lib/intake-service.cjs');
const { rules } = require('../lib/intake-rules.cjs');

function configure(t, demo = true) {
  const values = { OCD_AI_PROVIDER: 'openrouter', OPENROUTER_API_KEY: 'fictional-test-key', OCD_AI_MODEL: 'openrouter/free', OCD_AI_DEMO: String(demo) };
  for (const [key, value] of Object.entries(values)) {
    const previous = process.env[key]; process.env[key] = value;
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
  }
}
const source = 'Full name: Alex Demo\nEmail: alex@example.test\nService: Domestic assistance';
const policy = rules({});
const reply = fields => ({ ok: true, json: async () => ({ model: 'test/free', choices: [{ message: { content: JSON.stringify(fields) } }] }) });

test('OpenRouter request is bounded and missing or unsupported AI fields retain source evidence', async t => {
  configure(t);
  const result = await arrange(source, policy, [], async (url, options) => {
    assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(options.headers.Authorization, 'Bearer fictional-test-key');
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'openrouter/free');
    assert.equal(body.max_tokens, 2000);
    return reply({ fields: { name: 'Invented Person' }, evidence: { name: 'Invented Person' } });
  });
  assert.equal(result.fields.name, 'Alex Demo');
  assert.equal(result.fields.email, 'alex@example.test');
  assert.equal(result.evidence.email, 'Email: alex@example.test');
  assert.deepEqual(result.ai, { provider: 'OpenRouter', model: 'test/free', demo: true });
  assert.ok(!JSON.stringify(result).includes('fictional-test-key'));
});

test('free provider errors and malformed output never masquerade as successful AI extraction', async t => {
  configure(t);
  await assert.rejects(arrange(source, policy, [], async () => ({ ok: false, status: 429 })), { status: 429 });
  await assert.rejects(arrange(source, policy, [], async () => reply(null)), { status: 502 });
  await assert.rejects(arrange(source, policy, [], async () => { throw new Error('private provider error'); }), { status: 502 });
  delete process.env.OPENROUTER_API_KEY;
  await assert.rejects(arrange(source, policy, []), { status: 503 });
});

test('showcase bypass is explicit and leaves production extraction approval intact', async t => {
  configure(t, false);
  const service = new IntakeService({ all: async () => [] }, () => ({ status: 'covered' }), policy);
  await assert.rejects(service.previewText(source, true), { status: 422 });
  assert.equal(config().demo, false);
  const automatic = await service.previewText(source, false);
  assert.equal(automatic.draft.extractor, 'labelled-text-v1');
});

test('email drafts use supplied facts, bounded output and explicit unsent instructions', async t => {
  configure(t);
  const draft = await emailDraft({ fields: { name: 'Alex Demo', service: 'Transport', secret: 'never forward' }, sourceText: 'Can I arrange transport?' }, async (url, options) => {
    const body = JSON.parse(options.body);
    assert.match(body.messages[0].content, /unsent draft/);
    assert.match(body.messages[0].content, /Never confirm capacity/);
    assert.match(body.messages[0].content, /untrusted source data/);
    assert.ok(!body.messages[1].content.includes('never forward'));
    return reply({ subject: 'Your transport enquiry', message: 'Hi Alex, what day would you prefer?' });
  });
  assert.equal(draft.subject, 'Your transport enquiry');
  assert.equal(draft.ai.provider, 'OpenRouter');
  assert.ok(!JSON.stringify(draft).includes('fictional-test-key'));
  await assert.rejects(emailDraft({}, async () => reply({})), { status: 422 });
  await assert.rejects(emailDraft({ sourceText: 'Hello' }, async () => reply({ subject: 'x', message: '' })), { status: 502 });
  await assert.rejects(emailDraft({ sourceText: 'Hello' }, async () => reply({ subject: 'x', message: 'x'.repeat(6001) })), { status: 502 });
});

test('AI email review validates routing suggestions and treats original mail as untrusted', async t => {
  configure(t);
  const draft = { summary: 'A question about invoice hours.', category: 'Invoice query', team: 'Bookkeeper', reason: 'The message mentions invoice hours.', nextAction: 'Check the invoice against visit records.', subject: 'Your invoice question', message: 'Thank you for your message. Which invoice should we review?\nOCD Brilliance team' };
  const result = await emailReview({ sourceText: 'Please check the hours on my invoice.' }, async (url, options) => {
    const request = JSON.parse(options.body);
    assert.match(request.messages[0].content, /untrusted/);
    assert.match(request.messages[0].content, /Never confirm/);
    assert.equal(JSON.parse(request.messages[1].content).originalMessage, 'Please check the hours on my invoice.');
    return reply(draft);
  });
  assert.equal(result.team, 'Bookkeeper');
  assert.equal(result.ai.provider, 'OpenRouter');
  await assert.rejects(emailReview({ sourceText: '' }), { status: 422 });
  await assert.rejects(emailReview({ sourceText: 'Invoice question' }, async () => reply({ ...draft, team: 'Invented person' })), { status: 502 });
  await assert.rejects(emailReview({ sourceText: 'Invoice question' }, async () => reply({ ...draft, summary: '' })), { status: 502 });
});
