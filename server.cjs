const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
try { process.loadEnvFile(path.join(__dirname, ".env.local")); }
catch (error) { if (error.code !== "ENOENT") throw error; }
const workflowHandler = require("./api/workflow.js");
const pushHandler = require("./api/push.js");
const shiftcareHandler = require("./api/shiftcare.js");
const integrationProofHandler = require("./api/integration-proof.js");
const journeyHandler = require("./api/journeys.js");
const seedLocalStaff = require("./scripts/local-staff.cjs");
const mapboxConfig = require("./lib/mapbox-config.cjs");

const root = __dirname;
const port = Number(process.env.PORT || 8001);
const mime = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".wasm": "application/wasm", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp" };

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  if (pathname === "/api/workflow") return workflowHandler(req, res);
  if (pathname === "/api/push") return pushHandler(req, res);
  if (pathname === "/api/shiftcare") return shiftcareHandler(req, res);
  if (pathname === "/api/integration-proof") return integrationProofHandler(req, res);
  if (pathname === "/api/journeys") return journeyHandler(req, res);
  if (!["GET", "HEAD"].includes(req.method)) { res.writeHead(405); return res.end(); }
  const vendor = pathname.match(/^\/vendor\/(pdfjs-dist\/(?:build|cmaps|standard_fonts)|tesseract\.js\/dist|tesseract\.js-core|@tesseract\.js-data\/eng\/4\.0\.0_best_int|three\/(?:build|examples\/jsm\/(?:loaders|utils)))\/(.+)$/);
  if (vendor && !vendor[2].includes('..')) {
    try {
      const content = await fs.readFile(path.join(root, 'node_modules', vendor[1], vendor[2]));
      res.writeHead(200, { 'Content-Type': mime[path.extname(vendor[2])] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
      return res.end(req.method === 'HEAD' ? undefined : content);
    } catch { res.writeHead(404); return res.end(); }
  }
  if (pathname === "/workspace/map-config.js") {
    res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    return res.end(req.method === "HEAD" ? undefined : mapboxConfig());
  }
  const landingRoute = /^\/(?:services(?:\/[a-z0-9-]+)?|resources(?:\/[a-z0-9-]+)?|funding|about|areas-we-serve|careers|intake|portal|login|contact|faq|participant-rights|complaints|privacy|terms)?\/?$/.test(pathname);
  const file = landingRoute ? "/frontend/landing/index.html" : pathname === "/workspace/" || pathname === "/workspace" ? "/workspace/index.html" : pathname === "/presentation" || pathname === "/presentation.html" ? "/index.html" : pathname === "/sw.js" ? "/workspace/sw.js" : pathname;
  if (!file.startsWith("/workspace/") && !file.startsWith("/assets/") && file !== "/index.html" && file !== "/frontend/landing/index.html") { res.writeHead(404); return res.end(); }
  const absolute = path.resolve(root, `.${file}`);
  if (!absolute.startsWith(`${root}${path.sep}`)) { res.writeHead(404); return res.end(); }
  try {
    const content = await fs.readFile(absolute);
    res.writeHead(200, { "Content-Type": `${mime[path.extname(file)] || "application/octet-stream"}; charset=utf-8`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    res.end(req.method === "HEAD" ? undefined : content);
  } catch (_) { res.writeHead(404); res.end(); }
});

seedLocalStaff().then(account => {
  server.listen(port, "127.0.0.1", () => {
    console.log(`OCD Brilliance workspace: http://127.0.0.1:${port}/`);
    if (account) console.log(`Local office sign-in: ${account.email} / ${account.password} (saved in ${account.file})`);
  });
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
