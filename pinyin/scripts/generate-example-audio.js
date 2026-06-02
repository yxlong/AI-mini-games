// 生成例句音频
import { LIBRARY, SENTENCES } from '../src/data/pinyin-library.js';
import { execSync } from 'child_process';
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { resolve } from 'path';

const manifestPath = resolve(import.meta.dirname, '../public/audio/manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
manifest.examples = manifest.examples || {};
mkdirSync(resolve(import.meta.dirname, '../public/audio/examples'), { recursive: true });

const chars = [...new Set(LIBRARY.map(q => q.char))];
let count = 0;
for (const char of chars) {
  const sentence = SENTENCES[char];
  if (!sentence || manifest.examples[sentence]) continue;
  const fn = char.codePointAt(0).toString(16);
  const path = resolve(import.meta.dirname, '../public/audio/examples', fn + '.mp3');
  if (existsSync(path)) {
    manifest.examples[sentence] = 'audio/examples/' + fn + '.mp3';
    continue;
  }
  try {
    execSync(`edge-tts --text "${sentence}" --voice zh-CN-XiaoxiaoNeural --write-media "${path}"`, { timeout: 15000, stdio: 'pipe' });
    manifest.examples[sentence] = 'audio/examples/' + fn + '.mp3';
    count++;
    if (count % 10 === 0) console.log(`  ${count} done...`);
  } catch(e) {
    console.error(`  FAIL: ${char} "${sentence}"`);
  }
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`Generated ${count} example sentences`);
