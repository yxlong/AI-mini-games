// 题库校验脚本
// 运行: node scripts/validate-library.js
import { LIBRARY, INITIAL_GROUPS, FINAL_GROUPS } from '../src/data/pinyin-library.js';

const ALL_INITIALS = Object.values(INITIAL_GROUPS).flat();
const ALL_FINALS = Object.values(FINAL_GROUPS).flat();

let errors = 0;

console.log(`检查 ${LIBRARY.length} 条题库记录...\n`);

LIBRARY.forEach((q, i) => {
  const line = `[${i + 1}] ${q.char} (${q.pinyin})`;

  // 检查必填字段
  if (!q.id)    { errors++; console.log(`${line}: 缺少 id`); }
  if (!q.char)  { errors++; console.log(`${line}: 缺少 char`); }
  if (!q.pinyin){ errors++; console.log(`${line}: 缺少 pinyin`); }

  // 检查声母在白名单
  if (q.initial !== '-' && !ALL_INITIALS.includes(q.initial)) {
    errors++;
    console.log(`${line}: 声母 '${q.initial}' 不在白名单中`);
  }

  // 检查韵母在白名单
  if (!ALL_FINALS.includes(q.final) && !['er','üe','ün','iong','ueng'].includes(q.final)) {
    // er, üe, ün等特殊情况也放行
    const special = ['er','üe','ün','iong','ueng','ve','van','vn','v','ia','ie','ua','uo','iu','ui','iao','uai','ian','uan','uang','iang'];
    if (!special.includes(q.final)) {
      errors++;
      console.log(`${line}: 韵母 '${q.final}' 不在白名单中`);
    }
  }

  // 检查声调范围
  if (![1,2,3,4].includes(q.tone)) {
    errors++;
    console.log(`${line}: 声调 ${q.tone} 无效 (应为1-4)`);
  }

  // 检查难度
  if (![1,2,3].includes(q.difficulty)) {
    errors++;
    console.log(`${line}: 难度 ${q.difficulty} 无效 (应为1-3)`);
  }

  // 检查 initialGroup
  if (q.initial !== '-' && !q.initialGroup) {
    errors++;
    console.log(`${line}: 缺少 initialGroup`);
  }

  // 检查 finalGroup
  if (!q.finalGroup) {
    errors++;
    console.log(`${line}: 缺少 finalGroup`);
  }
});

// 检查重复
const chars = LIBRARY.map(q => q.char);
const dupes = chars.filter((c, i) => chars.indexOf(c) !== i);
if (dupes.length > 0) {
  errors++;
  console.log(`重复汉字: ${[...new Set(dupes)].join(', ')}`);
}

const ids = LIBRARY.map(q => q.id);
const dupIds = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupIds.length > 0) {
  errors++;
  console.log(`重复ID: ${[...new Set(dupIds)].join(', ')}`);
}

console.log(`\n${errors === 0 ? '✅ 全部通过！' : `❌ ${errors} 个错误`}`);
process.exit(errors > 0 ? 1 : 0);
