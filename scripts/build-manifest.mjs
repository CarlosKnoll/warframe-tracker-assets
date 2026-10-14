// scripts/build-manifest.mjs
//
// Validates icons.src.json against the files on disk and writes dist/icons.json.
// This is also the repo's test: if it exits non-zero, the release workflow stops
// before anything is published.
//
// Usage:  VERSION=v1.0.0 node scripts/build-manifest.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version = process.env.VERSION ?? '';

const TAG_RE = /^v\d+\.\d+\.\d+$/;                  // exact git tag name, e.g. v1.2.3
const KEY_RE = /^[a-z0-9]+([.-][a-z0-9]+)*$/;       // e.g. reward.legendary-core
const ALLOWED_EXT = new Set(['.webp', '.svg', '.png']);
const WARN_BYTES = 40 * 1024;

const errors = [];
const warnings = [];

if (!TAG_RE.test(version)) {
  errors.push(`VERSION must be an exact tag like v1.2.3, got "${version}"`);
}

let icons = null;
try {
  icons = JSON.parse(readFileSync(join(root, 'icons.src.json'), 'utf8')).icons;
} catch (e) {
  errors.push(`Cannot read icons.src.json: ${e.message}`);
}
if (icons === null || typeof icons !== 'object' || Array.isArray(icons)) {
  errors.push('icons.src.json must contain an "icons" object of key -> relative path');
  icons = {};
}

const seenPaths = new Map();
for (const [key, rel] of Object.entries(icons)) {
  if (!KEY_RE.test(key)) errors.push(`Bad key "${key}" (lowercase letters, digits, "." and "-" only)`);
  if (typeof rel !== 'string' || !rel) { errors.push(`"${key}": path must be a non-empty string`); continue; }
  if (rel.startsWith('/') || rel.split('/').includes('..') || rel.includes('\\')) {
    errors.push(`"${key}": path "${rel}" must be relative, forward-slash, and without ".."`);
    continue;
  }
  if (!ALLOWED_EXT.has(extname(rel).toLowerCase())) {
    errors.push(`"${key}": extension of "${rel}" not in ${[...ALLOWED_EXT].join(', ')}`);
    continue;
  }
  const abs = join(root, rel);
  if (!existsSync(abs)) { errors.push(`"${key}": file not found: ${rel}`); continue; }
  const size = statSync(abs).size;
  if (size === 0) errors.push(`"${key}": file is empty: ${rel}`);
  if (size > WARN_BYTES) warnings.push(`"${key}": ${rel} is ${(size / 1024).toFixed(1)} KB (> ${WARN_BYTES / 1024} KB)`);
  if (seenPaths.has(rel)) warnings.push(`"${key}" and "${seenPaths.get(rel)}" share the file ${rel}`);
  seenPaths.set(rel, key);
}

warnings.forEach(w => console.warn(`warn:  ${w}`));
if (errors.length) {
  errors.forEach(e => console.error(`error: ${e}`));
  console.error(`\n${errors.length} error(s). Manifest NOT written.`);
  process.exit(1);
}

// Sorted keys keep the manifest diff-friendly between releases.
const sorted = Object.fromEntries(Object.entries(icons).sort(([a], [b]) => a.localeCompare(b)));
const manifest = { assetsVersion: version, icons: sorted };

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'icons.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`ok: ${Object.keys(sorted).length} icons, assetsVersion ${version} -> dist/icons.json`);
