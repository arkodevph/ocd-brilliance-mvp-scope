import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { travelChecker, selectTravelReview } from '../frontend/features/travel-checker/view.mjs';
const state = {
  bookings: [
    { id: 'B1', participantId: 'P1', date: '2026-10-21', start: '10:00', end: '12:00' },
    { id: 'B2', participantId: 'P2', date: '2026-10-21', start: '13:00', end: '15:00' },
  ],
  participants: [
    { id: 'P1', name: 'Olivia', address: 'Woodvale' },
    { id: 'P2', name: 'Daniel', address: 'Kingsley' },
  ],
  workers: [],
  routeEstimates: [
    { id: 'RTE-1', bookingId: 'B1', distance: 12, duration: 20, destination: 'Woodvale' },
    { id: 'RTE-2', bookingId: 'B2', distance: 13, duration: 22, destination: 'Kingsley' },
  ],
};
test('one review opens at a time and switching retains unfinished edits and moves focus', () => {
  const dom = new JSDOM(travelChecker(state));
  try {
    const root = dom.window.document.querySelector('.travel-checker');
    assert.equal(root.querySelectorAll('.travel-check:not([hidden])').length, 1);
    const note = root.querySelector('[name=note]');
    note.value = 'Unfinished';
    selectTravelReview(root, 'B2');
    assert.equal(root.querySelector('.travel-check:not([hidden])').id, 'travel-B2');
    assert.equal(dom.window.document.activeElement.id, 'travel-title-B2');
    assert.equal(root.querySelector('[data-id=B2]').getAttribute('aria-expanded'), 'true');
    assert.equal(root.querySelector('[data-id=B1]').getAttribute('aria-expanded'), 'false');
    selectTravelReview(root, 'B1');
    assert.equal(note.value, 'Unfinished');
    selectTravelReview(root, 'missing');
    assert.equal(root.querySelector('.travel-check:not([hidden])').id, 'travel-B1');
  } finally {
    dom.window.close();
  }
});
test('deep-linked selection opens the matching review and empty state needs no selection', () => {
  const dom = new JSDOM(travelChecker(state, 'B2'));
  try {
    assert.equal(dom.window.document.querySelector('.travel-check:not([hidden])').id, 'travel-B2');
  } finally {
    dom.window.close();
  }
  assert.match(travelChecker({ ...state, routeEstimates: [] }), /Save a route estimate/);
});
