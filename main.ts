// Vice Panels — the handover program for the gta6-cover-art-01 entry.
//
// The cover maker itself lives in app/ (plain static files: index.html plus its
// ES modules and stylesheet, no build step, no network). This program is only
// the courier: it checks the app and its screenshots are inside the bounty
// gate's limits, copies both folders into the output directory, and asks the
// vendored make.fun library to write the dossier.json the judge reads.
//
// Run it from this directory with Node 22 or newer:
//   MAKEFUN_OUTPUT_DIR=out node main.ts
// Without MAKEFUN_OUTPUT_DIR it writes to /output, as the grader expects.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The gate's own caps, copied from the bounty rules: only text_max_bytes
// changes what dossier.json contains; the rest mirror the scorer, so a tree
// that fails one of them is refused here instead of at the gate.
const GATE = {
  textMaxBytes: 163840,
  shotMaxCount: 4,
  shotMinCount: 3,
  shotMaxBytes: 262144,
  shotLongSideMax: 1280,
  shotShortSideMin: 480,
  appMaxFiles: 993,
  appMaxBytes: 50331648,
  appPathMaxBytes: 1000,
} as const;

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Walk a directory depth-first and return every regular file below it,
// as paths relative to the directory walked.
function listFiles(root: string, base = root): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) found.push(...listFiles(full, base));
    else if (entry.isFile()) found.push(full.slice(base.length + 1));
  }
  return found.sort();
}

// Read the pixel size of a PNG (IHDR chunk) or a JPEG (first SOF marker).
// Returns null when the bytes are neither, so the caller can reject them.
function imageSize(bytes: Buffer): { width: number; height: number } | null {
  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(pngSig)) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let cursor = 2;
    while (cursor + 9 < bytes.length) {
      if (bytes[cursor] !== 0xff) break;
      const marker = bytes[cursor + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        cursor += 2;
        continue;
      }
      const segmentLen = bytes.readUInt16BE(cursor + 2);
      // SOF0/1/2 hold the frame size: precision byte, then height, then width.
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        return { width: bytes.readUInt16BE(cursor + 7), height: bytes.readUInt16BE(cursor + 5) };
      }
      cursor += 2 + segmentLen;
    }
  }
  return null;
}

function fail(message: string): never {
  throw new Error(`handover refused: ${message}`);
}

// Check app/ against the gate before anything is copied.
function auditApp(appDir: string): { files: number; bytes: number } {
  if (!existsSync(appDir)) fail('app/ is missing from the repository');
  const files = listFiles(appDir);
  if (files.length > GATE.appMaxFiles) {
    fail(`app/ holds ${files.length} files, over the ${GATE.appMaxFiles} cap`);
  }
  let bytes = 0;
  let longest = 0;
  for (const rel of files) {
    const pathBytes = Buffer.byteLength(join('app', rel), 'utf8');
    if (pathBytes > GATE.appPathMaxBytes) fail(`app/${rel} path is ${pathBytes} bytes, over the 1000 cap`);
    if (pathBytes > longest) longest = pathBytes;
    bytes += statSync(join(appDir, rel)).size;
  }
  if (bytes > GATE.appMaxBytes) fail(`app/ totals ${bytes} bytes, over the ${GATE.appMaxBytes} cap`);
  if (!existsSync(join(appDir, 'index.html'))) fail('app/index.html is missing');
  console.log(`app: ${files.length} files, ${bytes} bytes, longest path ${longest} bytes`);
  return { files: files.length, bytes };
}

// Check screenshots/ against the gate: 3 or 4 images, each small enough and
// within the pixel bounds, the first by name being the cover.
function auditShots(shotDir: string): { files: number; bytes: number } {
  if (!existsSync(shotDir)) fail('screenshots/ is missing from the repository');
  const names = listFiles(shotDir).filter((name) => !name.startsWith('.'));
  if (names.length < GATE.shotMinCount || names.length > GATE.shotMaxCount) {
    fail(`screenshots/ holds ${names.length} images, need ${GATE.shotMinCount}-${GATE.shotMaxCount}`);
  }
  let bytes = 0;
  const sizes: string[] = [];
  for (const name of names) {
    const full = join(shotDir, name);
    const data = readFileSync(full);
    if (data.length > GATE.shotMaxBytes) fail(`${name} is ${data.length} bytes, over the ${GATE.shotMaxBytes} cap`);
    const size = imageSize(data);
    if (size === null) fail(`${name} is not a whole PNG or JPEG`);
    const longSide = Math.max(size.width, size.height);
    const shortSide = Math.min(size.width, size.height);
    if (longSide > GATE.shotLongSideMax || shortSide < GATE.shotShortSideMin) {
      fail(`${name} is ${size.width}x${size.height}, outside the 480-${GATE.shotLongSideMax}px bounds`);
    }
    bytes += data.length;
    sizes.push(`${name} ${size.width}x${size.height}`);
  }
  console.log(`screenshots: ${names.length} files, ${bytes} bytes — cover ${sizes[0]}`);
  for (const line of sizes.slice(1)) console.log(`  ${line}`);
  return { files: names.length, bytes };
}

const appDir = join(repoDir, 'app');
const shotDir = join(repoDir, 'screenshots');

console.log('Vice Panels handover');
const appAudit = auditApp(appDir);
const shotAudit = auditShots(shotDir);

mkdirSync(outDir, { recursive: true });
cpSync(appDir, join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(shotDir)) cpSync(shotDir, join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: GATE.textMaxBytes,
  screenshots: { max: GATE.shotMaxCount, max_bytes: GATE.shotMaxBytes },
  app_max_files: GATE.appMaxFiles,
  app_max_bytes: GATE.appMaxBytes,
  app_path_max_bytes: GATE.appPathMaxBytes,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(
  `handed in: ${appAudit.files} app files + ${shotAudit.files} screenshots, dossier.json ${dossier.length} bytes -> ${outDir}`,
);
