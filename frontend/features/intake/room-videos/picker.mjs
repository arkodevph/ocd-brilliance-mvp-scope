import { roomVideoCategories } from './selection.mjs';

const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character],
  );

export function roomVideoPicker(rooms) {
  return `<fieldset class="room-video-picker"><legend>Room-by-room videos (optional)</legend>
    <p id="service-video-help" class="form-note">Choose videos under the room they show. Up to 5 videos in total, 100 MB each. Include only people who agree to appear. The office reviews the videos to assess the work and pricing.</p>
    <div class="room-video-picker-grid">${roomVideoCategories(rooms)
      .map(
        ([room, label]) => `
      <label class="room-video-picker-category"><span>${escape(label)}</span>
        <input name="serviceVideo" data-room="${escape(room)}" type="file" multiple accept="video/mp4,video/webm,video/quicktime,.mov" aria-label="Upload ${escape(label.toLowerCase())} videos" aria-describedby="service-video-help">
      </label>`,
      )
      .join('')}
    </div><div id="service-video-preview" class="service-video-review" aria-live="polite"></div>
  </fieldset>`;
}
