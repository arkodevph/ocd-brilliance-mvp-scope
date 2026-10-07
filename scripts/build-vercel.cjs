/* Publish the operations workspace. The presentation remains at /presentation.html. */
const fs = require("node:fs/promises");
const path = require("node:path");
const mapboxConfig = require("../lib/mapbox-config.cjs");

async function build() {
  const root = path.resolve(__dirname, "..");
  try { process.loadEnvFile(path.join(root, ".env.local")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const output = path.join(root, "dist");
  await fs.rm(output, { recursive: true, force: true });
  await fs.mkdir(path.join(output, "workspace"), { recursive: true });
  await fs.copyFile(path.join(root, "workspace/index.html"), path.join(output, "index.html"));
  await fs.copyFile(path.join(root, "index.html"), path.join(output, "presentation.html"));
  await fs.copyFile(path.join(root, "workspace/app.js"), path.join(output, "workspace/app.js"));
  await fs.copyFile(path.join(root, "workspace/shiftcare.js"), path.join(output, "workspace/shiftcare.js"));
  for (const file of ["automation-engine.js", "automation.js", "automation.css", "integration-proof.js", "integration-proof.css"]) await fs.copyFile(path.join(root, "workspace", file), path.join(output, "workspace", file));
  await fs.copyFile(path.join(root, "workspace/data.js"), path.join(output, "workspace/data.js"));
  await fs.writeFile(path.join(output, "workspace/map-config.js"), mapboxConfig());
  await fs.copyFile(path.join(root, "workspace/maps.js"), path.join(output, "workspace/maps.js"));
  await fs.copyFile(path.join(root, "workspace/maps.css"), path.join(output, "workspace/maps.css"));
  await fs.copyFile(path.join(root, "workspace/pwa.js"), path.join(output, "workspace/pwa.js"));
  await fs.copyFile(path.join(root, "workspace/pwa.css"), path.join(output, "workspace/pwa.css"));
  await fs.copyFile(path.join(root, "workspace/styles.css"), path.join(output, "workspace/styles.css"));
  await fs.copyFile(path.join(root, "workspace/manifest.webmanifest"), path.join(output, "workspace/manifest.webmanifest"));
  await fs.copyFile(path.join(root, "workspace/sw.js"), path.join(output, "sw.js"));
  await fs.cp(path.join(root, "assets"), path.join(output, "assets"), { recursive: true });
  console.log("Built the operations workspace in dist.");
}

build().catch(error => { console.error(error.message); process.exitCode = 1; });
