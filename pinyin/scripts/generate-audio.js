// 预生成 TTS 音频 — 使用 Edge TTS (Microsoft Neural Voice)
// 依赖: pip3 install edge-tts
// 用法: node scripts/generate-audio.js [--dry-run] [--initials|--finals|--chars|--sentences]

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { LIBRARY } from '../src/data/pinyin-library.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = resolve(__dirname, '..', 'public', 'audio');
const MANIFEST_FILE = resolve(AUDIO_DIR, 'manifest.json');
const VOICE = process.env.TTS_VOICE || 'zh-CN-XiaoxiaoNeural';

// 声母呼读音
const INITIAL_READINGS = {
  'b':'bō','p':'pō','m':'mō','f':'fō',
  'd':'dē','t':'tē','n':'nē','l':'lē',
  'g':'gē','k':'kē','h':'hē',
  'j':'jī','q':'qī','x':'xī',
  'zh':'zhī','ch':'chī','sh':'shī','r':'rì',
  'z':'zī','c':'cī','s':'sī',
  'y':'yī','w':'wū',
};

// 韵母呼读音
const FINAL_READINGS = {
  'a':'ā','o':'ō','e':'ē','i':'yī','u':'wū','v':'yǖ',
  'ai':'āi','ei':'ēi','ao':'āo','ou':'ōu',
  'an':'ān','en':'ēn','in':'yīn','un':'wēn',
  'ang':'āng','eng':'ēng','ing':'yīng','ong':'ōng',
  'ia':'yā','ie':'yē','iu':'yōu','ui':'wēi',
  'ua':'wā','uo':'wō','ue':'yuē',
  'iao':'yāo','ian':'yān','uan':'wān','uang':'wāng',
  'iong':'yōng','uai':'wāi',
};

// 去声调符号 -> 数字文件名
function stripTone(py) {
  const m = { 'ā':'a','á':'a','ǎ':'a','à':'a','ē':'e','é':'e','ě':'e','è':'e','ī':'i','í':'i','ǐ':'i','ì':'i','ō':'o','ó':'o','ǒ':'o','ò':'o','ū':'u','ú':'u','ǔ':'u','ù':'u','ǖ':'v','ǘ':'v','ǚ':'v','ǜ':'v' };
  let r = '', t = '';
  for (const ch of py) {
    if (m[ch]) { r += m[ch]; t = '1234'['āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ'.indexOf(ch) % 4 + 1]; }
    else r += ch;
  }
  return t ? r + t : r;
}

function collectItems() {
  const items = [];
  const seenChars = {};

  // 声母
  for (const [k, v] of Object.entries(INITIAL_READINGS)) {
    items.push({ type:'initials', key:k, text:v, path: `${AUDIO_DIR}/initials/${k}.mp3` });
  }

  // 韵母（从题库提取实际使用的）
  const usedFinals = [...new Set(LIBRARY.map(q => q.final))];
  for (const f of usedFinals) {
    const reading = FINAL_READINGS[f] || f;
    items.push({ type:'finals', key:f, text:reading, path: `${AUDIO_DIR}/finals/${f}.mp3` });
  }

  // 汉字 + 例句
  for (const q of LIBRARY) {
    if (!seenChars[q.char]) {
      const fn = stripTone(q.pinyin);
      seenChars[q.char] = { pinyin: q.pinyin, fn };

      items.push({ type:'chars', key:q.char, text:q.char, path: `${AUDIO_DIR}/chars/${fn}.mp3` });

      // 错误提示句
      const sentence = `${q.char}，拼音是${q.pinyin}`;
      items.push({ type:'sentences', key:q.char, text:sentence, path: `${AUDIO_DIR}/sentences/${fn}.mp3` });
    }
  }

  return items;
}

function buildManifest(items) {
  const m = { version:1, voice:VOICE, chars:{}, sentences:{}, initials:{}, finals:{} };
  for (const item of items) {
    const rel = item.path.replace(AUDIO_DIR + '/', 'audio/');
    if (item.type === 'chars') m.chars[item.key] = rel;
    else if (item.type === 'sentences') m.sentences[item.key] = rel;
    else if (item.type === 'initials') m.initials[item.key] = rel;
    else if (item.type === 'finals') m.finals[item.key] = rel;
  }
  return m;
}

function escapeShell(text) {
  return text.replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const filter = args.find(a => a.startsWith('--') && !a.startsWith('--dry'));

  console.log('Collecting audio content...');
  let items = collectItems();

  if (filter) {
    const cat = filter.replace('--', '');
    items = items.filter(i => i.type === cat);
    console.log(`Filtered to ${cat}: ${items.length} items`);
  }

  console.log(`Total: ${items.length} items`);
  console.log(`Voice: ${VOICE}\n`);

  if (dryRun) {
    for (const item of items) {
      console.log(`  [${item.type}] ${item.key} → ${item.text}  (${item.path})`);
    }
    console.log('\nDry run complete. Use without --dry-run to generate.');
    return;
  }

  // 检查 edge-tts
  try {
    execSync('edge-tts --version 2>&1 || python3 -m edge_tts --version 2>&1 || python -m edge_tts --version 2>&1', { stdio:'pipe' });
  } catch {
    console.error('ERROR: edge-tts not found. Install: pip3 install edge-tts');
    process.exit(1);
  }

  // 创建目录
  for (const dir of ['initials','finals','chars','sentences']) {
    mkdirSync(resolve(AUDIO_DIR, dir), { recursive: true });
  }

  let success = 0, skipped = 0, failed = 0;
  const total = items.length;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const progress = `[${i+1}/${total}]`;

    if (existsSync(item.path)) {
      console.log(`  ${progress} SKIP ${item.type}/${item.key}`);
      skipped++;
      success++; // 已存在算成功
      continue;
    }

    console.log(`  ${progress} GEN  ${item.type}/${item.key}: "${item.text}"`);
    try {
      mkdirSync(dirname(item.path), { recursive: true });
      execSync(
        `edge-tts --text "${escapeShell(item.text)}" --voice ${VOICE} --write-media "${item.path}"`,
        { timeout: 30000, stdio: 'pipe' }
      );
      success++;
    } catch (e) {
      console.error(`  ${progress} FAIL ${item.path}: ${e.stderr?.toString() || e.message}`);
      failed++;
    }
  }

  // 写 manifest
  const manifest = buildManifest(items);
  writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
  console.log(`\nDone: ${success} ok, ${failed} failed, ${skipped} skipped`);
  console.log(`Manifest: ${MANIFEST_FILE}`);
  console.log(`Audio dir: ${AUDIO_DIR}`);
}

main();
