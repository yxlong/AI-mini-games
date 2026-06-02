# 拼音宇宙 (Pinyin Universe)

一款给 6 岁小朋友的 Web 端 3D 拼音学习游戏。在浩瀚太空中探索星球，答对拼音题目点亮星球。

## 技术栈

- **Three.js** — 真 3D 渲染，星空/星球/星云/宇航员
- **Vite** — 开发构建
- **Vanilla JS** — 无框架，纯原生
- **Edge TTS (Microsoft Neural Voice)** — 仅构建时一次性生成 MP3，运行时不需要

## 纯前端 — 零后端服务

游戏是**纯静态页面**，不需要数据库、API、后台进程。但需要一个**静态 HTTP 服务器**（浏览器 CORS 策略禁止 `file://` 协议加载模块，与后端无关）。

- **音频** — 所有 MP3 由 Edge TTS 预生成，浏览器 `<audio>` 直接播放
- **数据** — 词库/例句全部硬编码在 JS 文件中
- **Edge TTS** — 只在 `npm run generate-all` 时调用一次，上线后不需要
- **持久化** — 点亮的星球保存到浏览器 `localStorage`

## 快速开始

```bash
# 安装依赖
npm install

# 一键生成全部音频（需要 Python 3 + edge-tts）
pip3 install edge-tts
npm run generate-all

# 开发模式（热更新）
npm run dev
```

浏览器打开 `http://localhost:3001`。

### 只要玩（不需要开发环境）

```bash
npm install
npm run build

# 任选一种本地服务器启动
npx serve dist              # Node.js（推荐）
cd dist && python -m http.server 3000  # Python
```

浏览器访问 `http://localhost:3000`。

> **不能直接双击 `index.html`**：Chrome 会因 CORS 阻止 `file://` 加载 JS 模块，这是浏览器安全策略，不是游戏需要后端。

### 部署到线上

`dist/` 目录是纯静态文件，可部署到：

- **GitHub Pages** — `dist/` 设为发布目录
- **Netlify / Vercel** — 构建命令 `npm run build`，发布目录 `dist`
- **Nginx** — 指向 `dist/` 即可
- **任意静态托管** — 丢上去就行

## 操作方式

| 操作 | 效果 |
|------|------|
| 左键按住拖拽 | 旋转视角 |
| 滚轮 | 前进/后退 |
| 点击星球 / 底部导航栏 | 飞向星球 → 进入答题 |

## 玩法

1. **玩法A — 看字选拼音**：显示一个汉字，从声母/韵母/声调三行中分别选择正确的
2. **玩法B — 看声母选字**：显示一个声母或韵母，从四个选项中选正确的汉字

答对 → 星球从暗灰色渐变为彩色并点亮光晕  
答错 → 显示正确答案并朗读  
每答对一个星球，弹出恭喜提示 + 例句

## 题库

- 163 个汉字，覆盖 23 个声母 + 33 个韵母 + 4 个声调
- 156 条例句
- 3 个难度等级，均匀分布

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发模式（热更新） |
| `npm run build` | 生产构建 → `dist/` |
| `npm run generate-all` | 一键生成全部音频（声母 + 韵母 + 汉字 + 错误句 + 例句） |
| `npm run generate-audio` | 同 generate-all |
| `node scripts/validate-library.js` | 校验题库数据 |

## 项目结构

```
pinyin/
├── index.html
├── src/
│   ├── main.js                # Three.js 场景 + 游戏逻辑
│   ├── styles.css             # UI 样式 + HUD + 导航栏
│   ├── audio/speech.js        # 音频播放模块
│   ├── core/
│   │   ├── game-state.js      # 状态机
│   │   ├── quiz-engine.js     # 出题引擎
│   │   └── score-manager.js   # 分数管理
│   ├── data/
│   │   ├── pinyin-library.js  # 题库 + 例句
│   │   └── image-manifest.js  # 图片清单
│   └── ui/
│       ├── mode-a-renderer.js # 玩法A 渲染
│       └── mode-b-renderer.js # 玩法B 渲染
├── scripts/
│   ├── generate-audio.js      # 音频生成（声母/韵母/汉字/错误句）
│   ├── generate-example-audio.js # 例句音频生成
│   └── validate-library.js    # 题库校验
└── public/
    └── audio/                 # 预生成的 MP3 音频文件
```

## Windows / WSL 注意事项

如果项目放在 Windows 挂载盘（`/mnt/d/...`），WSL 有文件权限限制：

- **`npm run dev`** — 完全正常，Vite 直接服务 `public/audio/`，无需复制
- **`npm run build`** — JS/CSS/HTML 构建成功，但 `public/audio/` 不会自动复制到 `dist/`（WSL EPERM 限制）
- **部署带音频** — 在 Windows 资源管理器中手动复制 `public\audio\` → `dist\audio\`，或在非挂载盘上构建

不带音频也能玩——只是朗读功能不可用，游戏核心玩法不受影响。

## 许可

MIT
