import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createRoomVideoSelection,
  roomVideoCategories,
} from '../frontend/features/intake/room-videos/selection.mjs';

const rooms = { 'master-bedroom': 'Master bedroom', kitchen: 'Kitchen' };
const video = (name) => new File(['fictional video'], name, { type: 'video/mp4', lastModified: 1 });

test('new upload choices use specific rooms while legacy room labels remain available', () => {
  const catalogue = { ...rooms, bathroom: 'Bathroom', other: 'Other rooms' };
  assert.deepEqual(
    roomVideoCategories(catalogue).map(([room]) => room),
    ['master-bedroom', 'kitchen', 'bathroom'],
  );
  assert.equal(catalogue.other, 'Other rooms');
});

test('room selection keeps categories when videos are removed or cleared', () => {
  const selection = createRoomVideoSelection(rooms);
  const bedroom = video('bedroom.mp4');
  const kitchen = video('kitchen.mp4');
  selection.add([bedroom], 'master-bedroom');
  selection.add([kitchen], 'kitchen');
  assert.equal(selection.remove(0), bedroom);
  assert.deepEqual(selection.files, [kitchen]);
  assert.equal(selection.room(kitchen), 'kitchen');
  assert.equal(selection.room(bedroom), undefined);
  selection.clear();
  assert.deepEqual(selection.files, []);
  assert.equal(selection.room(kitchen), undefined);
});

test('invalid room, file or sixth video does not erase already selected videos', () => {
  const selection = createRoomVideoSelection(rooms);
  const first = video('first.mp4');
  selection.add([first], 'kitchen');
  assert.throws(() => selection.add([video('wrong-room.mp4')], 'unknown'), /Choose a room/);
  assert.throws(
    () => selection.add([video('valid.mp4'), new File(['text'], 'bad.txt')], 'kitchen'),
    /MP4/,
  );
  assert.deepEqual(selection.files, [first]);
  selection.add(
    Array.from({ length: 4 }, (_, i) => video(`more-${i}.mp4`)),
    'master-bedroom',
  );
  assert.throws(() => selection.add([video('sixth.mp4')], 'kitchen'), /up to 5/);
  assert.equal(selection.files.length, 5);
});

test('duplicate video cannot silently move to another room', () => {
  const selection = createRoomVideoSelection(rooms);
  const original = video('room.mp4');
  selection.add([original], 'kitchen');
  selection.add([video('room.mp4')], 'kitchen');
  assert.equal(selection.files.length, 1);
  assert.throws(() => selection.add([video('room.mp4')], 'master-bedroom'), /another room/);
  assert.equal(selection.room(original), 'kitchen');
  selection.remove(0);
  selection.add([original], 'master-bedroom');
  assert.equal(selection.room(original), 'master-bedroom');
});
