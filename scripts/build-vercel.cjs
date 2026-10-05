/* Build the static demo and inject only the browser's public Mapbox configuration. */
const fs = require("node:fs/promises");
const path = require("node:path");

async function build() {
  const accessToken = process.env.MAPBOX_PUBLIC_TOKEN?.trim() || "";
  if (!/^pk\.[A-Za-z0-9._-]+$/.test(accessToken) || accessToken.length < 30) {
    throw new Error("Set MAPBOX_PUBLIC_TOKEN to a Mapbox public pk. token before building.");
  }
  const root = path.resolve(__dirname, "..");
  const output = path.join(root, "dist");
  const publicFiles = [
    "index.html",
    "prototype/index.html",
    "prototype/app.js",
    "prototype/data.js",
    "prototype/styles.css",
    "prototype/maps.js",
    "prototype/maps.css"
  ];
  await fs.rm(output, { recursive: true, force: true });
  await fs.mkdir(path.join(output, "prototype"), { recursive: true });
  for (const file of publicFiles) await fs.copyFile(path.join(root, file), path.join(output, file));
  await fs.cp(path.join(root, "assets"), path.join(output, "assets"), { recursive: true });
  await fs.cp(path.join(root, "prototype/assets"), path.join(output, "prototype/assets"), { recursive: true });
  const config = { accessToken, style: "mapbox://styles/mapbox/standard" };
  await fs.writeFile(path.join(output, "prototype/map-config.js"), `// Generated from the deployment environment; do not commit.\nwindow.OCD_MAPBOX_CONFIG = ${JSON.stringify(config, null, 2)};\n`);
  console.log("Built the static demo in dist with its public Mapbox configuration.");
}

build().catch(error => { console.error(error.message); process.exitCode = 1; });
