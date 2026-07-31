/* Compiles the pure modules to CommonJS in .testbuild/ and stubs
   react-native so share.ts can be required in plain node. */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, '.testbuild');

execSync(
  'npx tsc src/lib.ts src/i18n.ts src/share.ts --ignoreConfig --outDir .testbuild ' +
    '--module commonjs --target es2020 --esModuleInterop --skipLibCheck',
  { cwd: root, stdio: 'inherit' }
);

const stubDir = path.join(out, 'node_modules', 'react-native');
fs.mkdirSync(stubDir, { recursive: true });
fs.writeFileSync(path.join(stubDir, 'index.js'), 'module.exports = { Linking: { openURL: async () => {} } };\n');

console.log('testbuild ready');
