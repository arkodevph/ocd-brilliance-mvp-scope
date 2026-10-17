const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
// Deleted source files must not leave obsolete framework code in Vercel's bundle.
fs.rmSync(path.join(root, '.backend'), { recursive: true, force: true });

execFileSync(
  process.execPath,
  [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.backend.json'],
  {
    cwd: root,
    stdio: 'inherit',
  },
);
