// AI 图片生成脚本
// 使用 OpenAI DALL-E 3 API
// 运行: OPENAI_API_KEY=sk-xxx node scripts/generate-images.js [--image name]
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGE_DIR = resolve(__dirname, '..', 'public', 'images');
const MANIFEST_FILE = resolve(IMAGE_DIR, '.generated');

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error('请设置 OPENAI_API_KEY 环境变量');
  process.exit(1);
}

const IMAGE_SPECS = [
  { name: 'bg-start.png',    prompt: 'Space nebula with colorful stars, cartoon style, child-friendly, bright colors, cute, 2D flat illustration, game background', size: '1792x1024' },
  { name: 'bg-game.png',     prompt: 'Deep space background with cute cartoon planets, soft pastel nebula, child-friendly, 2D flat illustration style, game background', size: '1792x1024' },
  { name: 'bg-result.png',   prompt: 'Celebration space scene with sparkles and rainbow colors, cute cartoon style, child-friendly, 2D flat illustration, game background', size: '1792x1024' },
  { name: 'astronaut.png',   prompt: 'Cute cartoon astronaut in white spacesuit, big round eyes, child-friendly character design, floating pose, isolated on transparent background, 2D flat illustration', size: '1024x1024' },
  { name: 'btn-start.png',   prompt: 'A cute cartoon button with Chinese text "开始冒险" in child-friendly font, glowing, space theme, star decorations, 2D flat illustration, isolated', size: '1024x1024' },
  { name: 'btn-replay.png',  prompt: 'A cute cartoon button with Chinese text "再来一次" and a small rocket icon, space theme, 2D flat illustration, child-friendly, isolated', size: '1024x1024' },
  { name: 'star-filled.png', prompt: 'A single gold shiny 3D cartoon star, bright yellow, child-friendly, isolated on transparent background, simple', size: '1024x1024' },
  { name: 'star-empty.png',  prompt: 'A single grey empty star outline, cartoon style, simple, isolated on transparent background', size: '1024x1024' },
  { name: 'card-hanzi-bg.png', prompt: 'A rounded card with soft gradient background, cartoon space theme, child-friendly, 2D flat illustration, isolated', size: '1024x1024' },
  { name: 'card-option-bg.png', prompt: 'A small rounded card with soft pastel gradient, cartoon space theme, child-friendly, 2D flat illustration, isolated', size: '1024x1024' },
];

// 生成20个不同颜色星球
const PLANET_COLORS = [
  'red and orange', 'blue and cyan', 'green and teal', 'purple and pink', 'yellow and gold',
  'pink and magenta', 'orange and coral', 'cyan and blue', 'lime and green', 'lavender and purple',
  'peach and cream', 'mint and teal', 'coral and salmon', 'sky blue and white', 'rose and blush',
  'amber and gold', 'indigo and violet', 'turquoise and aqua', 'crimson and scarlet', 'emerald and jade',
];

for (let i = 0; i < 20; i++) {
  const n = String(i + 1).padStart(2, '0');
  IMAGE_SPECS.push({
    name: `planet-${n}.png`,
    prompt: `A single cute cartoon planet, ${PLANET_COLORS[i]} pastel colors, round, with simple craters or rings, child-friendly, 2D flat illustration, isolated on transparent background`,
    size: '1024x1024',
  });
}

// 生成8个烟花粒子
for (let i = 0; i < 8; i++) {
  const n = String(i + 1).padStart(2, '0');
  IMAGE_SPECS.push({
    name: `firework-${n}.png`,
    prompt: `A colorful firework burst particle, bright ${['red','gold','blue','green','purple','pink','cyan','orange'][i]}, cartoon style, transparent background, isolated`,
    size: '1024x1024',
  });
}

async function generateImage(spec) {
  const outputPath = resolve(IMAGE_DIR, spec.name);

  if (existsSync(outputPath)) {
    console.log(`  ✓ ${spec.name} 已存在，跳过`);
    return true;
  }

  console.log(`  🎨 生成 ${spec.name}...`);

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: `${spec.prompt} --no text, no watermark, no signature`,
        n: 1,
        size: spec.size,
        quality: 'standard',
        response_format: 'b64_json',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.log(`  ❌ ${spec.name}: API 错误 ${response.status} - ${err}`);
      return false;
    }

    const data = await response.json();
    const b64 = data.data[0].b64_json;
    const buffer = Buffer.from(b64, 'base64');

    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, buffer);
    console.log(`  ✅ ${spec.name} 已保存`);
    return true;
  } catch (e) {
    console.log(`  ❌ ${spec.name}: ${e.message}`);
    return false;
  }
}

async function main() {
  mkdirSync(IMAGE_DIR, { recursive: true });

  // 检查 --image 参数只生成单张
  const imageArg = process.argv.find(a => a.startsWith('--image='));
  let specs = IMAGE_SPECS;

  if (imageArg) {
    const name = imageArg.split('=')[1];
    specs = IMAGE_SPECS.filter(s => s.name === name || s.name.startsWith(name));
    if (specs.length === 0) {
      console.log(`未找到匹配 "${name}" 的图片`);
      process.exit(1);
    }
    console.log(`只生成: ${specs.map(s => s.name).join(', ')}`);
  }

  console.log(`共 ${specs.length} 张图片待生成\n`);

  let success = 0;
  for (const spec of specs) {
    const ok = await generateImage(spec);
    if (ok) success++;
  }

  // 记录已生成
  const generated = specs.filter(s => existsSync(resolve(IMAGE_DIR, s.name))).map(s => s.name);
  writeFileSync(MANIFEST_FILE, JSON.stringify({ generated, date: new Date().toISOString() }, null, 2));

  console.log(`\n完成: ${success}/${specs.length}`);
  console.log(`图片目录: ${IMAGE_DIR}`);
}

main();
