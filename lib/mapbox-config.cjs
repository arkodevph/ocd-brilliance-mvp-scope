/* Only a browser-safe public Mapbox token may enter the static configuration. */
function mapboxConfig(env = process.env) {
  const token = String(env.MAPBOX_PUBLIC_TOKEN || "").trim();
  const accessToken = /^pk\.[A-Za-z0-9._-]+$/.test(token) && token.length >= 30 ? token : "";
  return `window.OCD_MAPBOX_CONFIG = ${JSON.stringify({ accessToken, style: "mapbox://styles/mapbox/standard" })};\n`;
}
module.exports = mapboxConfig;
