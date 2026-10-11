const { WorkflowError, clean } = require('./intake-domain.cjs');
const MAX_VIDEO_BYTES = 3 * 1024 * 1024;

function intakeVideo(value) {
  if (value == null) return null;
  if (typeof value !== 'object' || Array.isArray(value))
    throw new WorkflowError(422, 'Upload a valid service video.');
  const { name, type, data } = value;
  if (
    typeof data !== 'string' ||
    !data ||
    data.length > 4 * 1024 * 1024 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(data)
  ) {
    throw new WorkflowError(422, 'Upload an MP4 or WebM video of at most 3 MB.');
  }
  const bytes = Buffer.from(data, 'base64');
  const mp4 = type === 'video/mp4' && bytes.subarray(4, 8).toString() === 'ftyp';
  const webm = type === 'video/webm' && bytes.subarray(0, 4).equals(Buffer.from('1a45dfa3', 'hex'));
  if ((!mp4 && !webm) || bytes.length > MAX_VIDEO_BYTES || bytes.toString('base64') !== data) {
    throw new WorkflowError(422, 'Upload a valid MP4 or WebM video of at most 3 MB.');
  }
  return {
    name: clean(name, 120) || 'Service video',
    type,
    data,
    size: bytes.length,
  };
}
module.exports = { intakeVideo, MAX_VIDEO_BYTES };
