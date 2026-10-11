const test = require('node:test');
const assert = require('node:assert/strict');
const { summarizeTranscript } = require('../workspace/transcript.js');

test('summarizes transcript needs and next steps without speaker labels', () => {
  const transcript = [
    '[00:01] Mia: Thanks for taking the call today.',
    '00:12 Ava: I need weekly help with household cleaning and laundry.',
    'Mia: Do you have a preferred schedule?',
    'Ava: Tuesday mornings work best and I prefer a consistent worker.',
    'Mia: I will follow up to confirm funding and service capacity.',
  ].join('\n');

  const result = summarizeTranscript(transcript);

  assert.match(result.summary, /weekly help/i);
  assert.match(result.keyPoints, /Tuesday mornings/i);
  assert.match(result.nextSteps, /confirm funding/i);
  assert.doesNotMatch(result.summary, /Mia:/);
});

test('rejects transcripts that are too short to summarize', () => {
  assert.throws(() => summarizeTranscript('Short call.'), /longer transcript/);
});
