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
  await fs.copyFile(path.join(root, 'frontend/landing/index.html'), path.join(output, 'index.html'));
  await fs.copyFile(path.join(root, 'workspace/index.html'), path.join(output, 'workspace/index.html'));
  await fs.copyFile(path.join(root, "index.html"), path.join(output, "presentation.html"));
  await fs.cp(path.join(root, 'workspace/generated'), path.join(output, 'workspace/generated'), { recursive: true });
  await fs.copyFile(path.join(root, "workspace/ui-layout.js"), path.join(output, "workspace/ui-layout.js"));
  await fs.copyFile(path.join(root, "workspace/intake-documents.js"), path.join(output, "workspace/intake-documents.js"));
  for (const directory of ['pdfjs-dist/build', 'pdfjs-dist/cmaps', 'pdfjs-dist/standard_fonts', 'tesseract.js/dist', 'tesseract.js-core', '@tesseract.js-data/eng/4.0.0_best_int']) {
    await fs.cp(path.join(root, 'node_modules', directory), path.join(output, 'vendor', directory), { recursive: true });
  }
  for (const file of ['build/three.module.js', 'build/three.core.js', 'examples/jsm/loaders/GLTFLoader.js', 'examples/jsm/utils/BufferGeometryUtils.js', 'examples/jsm/utils/SkeletonUtils.js', 'LICENSE']) {
    const destination = path.join(output, 'vendor/three', file);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(path.join(root, 'node_modules/three', file), destination);
  }
  await fs.copyFile(path.join(root, 'workspace/journey-scene.js'), path.join(output, 'workspace/journey-scene.js'));
  await fs.copyFile(path.join(root, "workspace/shiftcare.js"), path.join(output, "workspace/shiftcare.js"));
  for (const file of ["employee-portal.js", "employee-portal.css", "booking-rules.js", "crm.css", "invoices.js", "automation-engine.js", "automation.js", "automation.css", "integration-proof.js", "integration-proof.css"]) await fs.copyFile(path.join(root, "workspace", file), path.join(output, "workspace", file));
  await fs.copyFile(path.join(root, "workspace/data.js"), path.join(output, "workspace/data.js"));
  await fs.writeFile(path.join(output, "workspace/map-config.js"), mapboxConfig());
  await fs.copyFile(path.join(root, "workspace/maps.js"), path.join(output, "workspace/maps.js"));
  await fs.copyFile(path.join(root, "workspace/journey-api.js"), path.join(output, "workspace/journey-api.js"));
  await fs.copyFile(path.join(root, "workspace/maps.css"), path.join(output, "workspace/maps.css"));
  await fs.copyFile(path.join(root, "workspace/pwa.js"), path.join(output, "workspace/pwa.js"));
  await fs.copyFile(path.join(root, "workspace/pwa.css"), path.join(output, "workspace/pwa.css"));
  await fs.copyFile(path.join(root, "workspace/transcript.js"), path.join(output, "workspace/transcript.js"));
  await fs.copyFile(path.join(root, "workspace/styles.css"), path.join(output, "workspace/styles.css"));
  await fs.copyFile(path.join(root, "workspace/manifest.webmanifest"), path.join(output, "workspace/manifest.webmanifest"));
  await fs.copyFile(path.join(root, "workspace/sw.js"), path.join(output, "sw.js"));
  await fs.cp(path.join(root, "assets"), path.join(output, "assets"), { recursive: true });
  console.log("Built the operations workspace in dist.");
}

build().catch(error => { console.error(error.message); process.exitCode = 1; });
