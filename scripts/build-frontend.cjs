const path = require('node:path');
const { build } = require('esbuild');

const root = path.resolve(__dirname, '..');
build({
  absWorkingDir: root,
  entryPoints: { frontend: 'frontend/main.tsx', landing: 'frontend/landing/main.jsx' },
  outdir: 'workspace/generated',
  assetNames: 'assets/[name]-[hash]',
  loader: { '.woff2': 'file', '.woff': 'file', '.png': 'file', '.svg': 'file' },
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2022'],
  jsx: 'automatic',
  minify: true,
  legalComments: 'eof',
  define: { 'process.env.NODE_ENV': '"production"' }
}).catch(error => { console.error(error.message); process.exitCode = 1; });
