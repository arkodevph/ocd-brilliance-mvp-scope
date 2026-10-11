(function exposeTranscriptSummary(global) {
  const detailWords =
    /\b(need|support|help|looking for|goal|prefer|schedule|available|morning|afternoon|weekly|fortnight|fund|plan|transport|clean|domestic|nurs|community|risk|allerg|mobility|medication)\w*/i;
  const nextStepWords =
    /\b(confirm|follow[ -]?up|contact|call back|send|check|book|next step|discuss|provide|office will)\b/i;

  function cleanSentence(value) {
    return value
      .replace(/^\s*(?:\[?\d{1,2}:\d{2}(?::\d{2})?\]?\s*[-–—]?\s*)/, '')
      .replace(/^\s*[A-Za-z][A-Za-z .'-]{0,35}:\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function transcriptSentences(transcript) {
    return transcript
      .replace(/\r/g, '')
      .split(/\n+/)
      .flatMap((line) => line.split(/(?<=[.!?])\s+/))
      .map(cleanSentence)
      .filter(
        (sentence) =>
          sentence.length >= 12 &&
          !/^(?:um+|uh+|okay|thanks?|thank you|hello|hi)[.!]?$/i.test(sentence),
      )
      .filter(
        (sentence, index, sentences) =>
          sentences.findIndex((item) => item.toLowerCase() === sentence.toLowerCase()) === index,
      );
  }

  function limit(value, maximum) {
    if (value.length <= maximum) return value;
    const clipped = value.slice(0, maximum - 1).replace(/\s+\S*$/, '');
    return `${clipped}…`;
  }

  function bullets(sentences, fallback) {
    return sentences.length
      ? sentences.map((sentence) => `• ${limit(sentence, 240)}`).join('\n')
      : fallback;
  }

  function summarizeTranscript(transcript) {
    const source = String(transcript || '').trim();
    if (source.length < 40) throw new Error('Add a longer transcript before preparing a summary.');
    if (source.length > 20000) throw new Error('Keep the transcript under 20,000 characters.');

    const sentences = transcriptSentences(source);
    if (!sentences.length)
      throw new Error('The transcript does not contain enough detail to summarize.');

    const ranked = sentences
      .map((sentence, index) => ({
        sentence,
        index,
        score: (detailWords.test(sentence) ? 2 : 0) + (nextStepWords.test(sentence) ? 1 : 0),
      }))
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, Math.min(3, sentences.length))
      .sort((a, b) => a.index - b.index)
      .map((item) => item.sentence);
    const details = sentences.filter((sentence) => detailWords.test(sentence)).slice(0, 5);
    const nextSteps = sentences.filter((sentence) => nextStepWords.test(sentence)).slice(0, 4);

    return {
      summary: limit(ranked.join(' '), 600),
      keyPoints: bullets(
        details,
        "• Review the transcript and record the participant's support needs and preferences.",
      ),
      nextSteps: bullets(
        nextSteps,
        '• Confirm the requested support, preferred schedule, funding and next action.',
      ),
    };
  }

  const api = { summarizeTranscript };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (global) global.OCD_TRANSCRIPT = api;
})(typeof window !== 'undefined' ? window : globalThis);
