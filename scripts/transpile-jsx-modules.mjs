import fs from 'node:fs';
import path from 'node:path';
import Babel from '../vendor/babel.min.js';

const root = process.cwd();
const srcRoot = path.join(root, 'src');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!entry.name.endsWith('.jsx')) continue;
    if (entry.name === 'main.jsx') continue;
    const source = fs.readFileSync(full, 'utf8');
    const outFile = full.replace(/\.jsx$/, '.js');
    const result = Babel.transform(source, { presets: ['react'], sourceType: 'module' }).code;
    fs.writeFileSync(outFile, result + '\n');
    console.log('transpiled', path.relative(root, outFile));
  }
}

walk(srcRoot);
