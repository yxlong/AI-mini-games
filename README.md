# YYZ 游戏合集

AI 生成的手绘风格小游戏合集，纯 Web 实现，浏览器打开即玩。

## 游戏列表

| 游戏 | 类型 | 说明 |
|------|------|------|
| 宇宙标尺投篮挑战 | 物理 / 休闲 | 按住蓄力投篮，抛物线飞越宇宙标尺塔，连击加分 |
| 双人弹珠迷宫对决 | 双人 / 物理 | 轮流发射弹珠穿越锯齿迷宫，8 回合后高分获胜 |
| 成语接龙 · 亲子版 | 文字 / 益智 | 亲子互动成语接龙，首尾字音匹配，寓教于乐 |
| Motion Runner | 体感 / 3D 跑酷 | 摄像头体感控制，身体左右移动躲避障碍物 |

## 快速开始

### 方式一：直接打开（推荐）

大多数游戏无需安装，用浏览器打开对应 HTML 文件即可：

1. 用浏览器打开 `index.html`，进入游戏合集首页
2. 点击任意游戏卡片即可开始
3. 按 **Esc** 键返回合集

也可以直接打开单个游戏文件：
- `cosmic_basketball.html` — 宇宙标尺投篮
- `pachinko_duel.html` — 双人弹珠对决
- `chengyujielong/index.html` — 成语接龙

### 方式二：启动体感跑酷

Motion Runner 需要本地服务器（摄像头权限要求 HTTPS 或 localhost）：

```bash
cd motion-runner
npm install
npm run dev
```

浏览器访问 `http://localhost:3000`，允许摄像头权限后即可通过身体左右移动控制角色。

或者从合集首页进入（index.html 中已配置 Motion Runner 卡片指向 localhost:3000）。

## 系统要求

- 现代浏览器（Chrome / Edge / Firefox 最新版）
- Motion Runner 需要 **摄像头** 和 **Node.js 18+**

## 项目结构

```
yyz_games/
├── index.html                # 游戏合集入口
├── cosmic_basketball.html    # 宇宙标尺投篮
├── pachinko_duel.html        # 双人弹珠对决
├── chengyujielong/
│   └── index.html            # 成语接龙
└── motion-runner/            # 体感跑酷 (Vite + Three.js)
    ├── src/
    ├── package.json
    └── vite.config.ts
```
