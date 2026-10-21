// Keep the legacy label for saved clips, but use specific rooms for new uploads.
export function roomVideoCategories(rooms) {
  return Object.entries(rooms).filter(([room]) => room !== 'other');
}

export function validateRoomVideo(file) {
  if (
    !['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type) ||
    !file.size ||
    file.size > 100 * 1024 * 1024
  )
    throw new Error('Choose MP4, MOV or WebM videos of up to 100 MB each.');
}

export function createRoomVideoSelection(rooms) {
  let selected = new Map();
  return {
    get files() {
      return [...selected.keys()];
    },
    room(file) {
      return selected.get(file);
    },
    add(incoming, room) {
      const next = new Map(selected);
      for (const file of incoming) {
        if (!Object.hasOwn(rooms, room)) throw new Error('Choose a room for this video.');
        validateRoomVideo(file);
        const duplicate = [...next.keys()].find(
          (previous) =>
            previous === file ||
            (previous.name === file.name &&
              previous.size === file.size &&
              previous.lastModified === file.lastModified),
        );
        if (duplicate) {
          if (next.get(duplicate) !== room)
            throw new Error(
              'This video is already in another room. Remove it first to change rooms.',
            );
          continue;
        }
        next.set(file, room);
      }
      if (next.size > 5) throw new Error('Attach up to 5 videos across all rooms.');
      selected = next;
    },
    remove(index) {
      const file = [...selected.keys()][index];
      selected.delete(file);
      return file;
    },
    clear() {
      selected.clear();
    },
  };
}
