# Motion Runner — 架构文档

## 项目概述

基于 Web 的体感跑酷游戏。摄像头捕获玩家姿态 → MediaPipe 识别动作 → 控制 Three.js 3D 角色在跑道上前进并躲避障碍。

## 技术栈

| 层 | 技术 |
|---|------|
| 构建 | Vite 8 + TypeScript |
| 3D 渲染 | Three.js 0.184 (WebGL) |
| 姿态识别 | MediaPipe Pose Landmarker Lite (CPU delegate, XNNPACK) |
| 音效 | Web Audio API (合成，无外部文件) |
| 性能 | Rust/WASM tract-onnx (备选管线，需 ONNX 模型) |

## 目录结构

```
motion-runner/
├── public/                    # 静态资源（构建时原样复制）
│   ├── pose_landmarker_lite.task  # MediaPipe 模型 (5.6MB)
│   ├── pose_model.onnx            # 备选 MoveNet ONNX (9MB)
│   ├── favicon.svg
│   └── icons.svg
│
├── src/
│   ├── core/                  # 共享类型与常量
│   │   ├── types.ts           # GameAction, BodyLandmarks
│   │   └── constants.ts       # 游戏参数、渲染配置
│   │
│   ├── game/                  # 游戏引擎
│   │   ├── engine.ts          # Three.js 场景、渲染循环、物理、laneIndex
│   │   ├── track.ts           # 赛道纹理、车道线、滚动
│   │   ├── obstacles.ts       # 障碍物生成、动态密度、AABB 碰撞
│   │   └── scenery.ts         # InstancedMesh 路边树木（160棵，2 draw call）
│   │
│   ├── input/                 # 输入层
│   │   ├── camera.ts          # getUserMedia、视频流
│   │   └── vision.ts          # Worker 客户端（setLaneCount、帧发送）
│   │
│   ├── ui/                    # 界面
│   │   └── manager.ts         # DOM 构建、测试面板、覆盖层、骨架+分区线
│   │
│   ├── audio/                 # 音效
│   │   └── manager.ts         # Web Audio API 合成
│   │
│   ├── workers/
│   │   └── vision.worker.ts   # MediaPipe 推理 + 区域检测算法
│   │
│   ├── mediapipe-wasm/        # MediaPipe WASM 运行时（ESM 模块）
│   ├── rust-pose-wasm/        # Rust/WASM 备选管线（wasm-pack 产出）
│   ├── main.ts                # 入口：创建实例 + 连接回调 (~170 行)
│   └── style.css              # 全局样式
│
├── rust-pose/                 # Rust/WASM 项目（备选）
│   ├── Cargo.toml
│   └── pkg/                   # 编译产出 (5.3MB)
│
├── scripts/
│   └── download_pose_model.py
│
├── vite.config.ts
├── tsconfig.json
├── package.json
└── ARCHITECTURE.md
```

## 架构模式

```
main.ts (入口: 创建实例 + 连接回调)
  ├── GameEngine       — 3D 场景、渲染循环、物理
  │   ├── Track        — 路面纹理、车道线、滚动
  │   └── ObstacleManager — 障碍物、碰撞检测
  ├── CameraManager    — getUserMedia、视频流
  ├── VisionClient     — Worker 通信封装
  │   └── vision.worker.ts — MediaPipe 推理
  ├── UIManager        — DOM 构建、面板、骨架
  └── AudioManager     — 合成音效
```

每个模块通过构造函数注入依赖，通过回调向外报告事件。

## 数据流

```
摄像头 → createImageBitmap(224×224) → VisionClient.sendFrame()
  → Worker: MediaPipe.detect() → 33 个关键点
  → 区域判定: 画面均分 N 列，身体中心在哪列 → 对应哪条跑道
  → 跨列时发送 LEFT / RIGHT → 主线程: engine.handleAction()
  → laneIndex 更新 → laneCenterX() 计算目标坐标 → 3D 角色平滑到位
```

### 区域检测算法

摄像头画面水平均分为 `laneCount` 列，每列精确对应一条跑道：

```
简单 (2列):  ┌──────────┬──────────┐  左道 x=-1.5  右道 x=+1.5
             │  zone 0  │  zone 1  │
             └──────────┴──────────┘

中等 (3列):  ┌─────┬─────┬─────┐  左 x=-2  中 x=0  右 x=+2
             │  0  │  1  │  2  │
             └─────┴─────┴─────┘
```

关键机制：
- **中性位置自适应**：指数移动平均跟踪玩家自然站立位
- **信号放大**：2车道 3.5x、3车道 2.0x，小幅度侧身即可触及边界
- **滞回**：300ms 消抖 + 边界缓冲，防止来回跳
- **列内自由**：在同一列内任意晃动不触发换道
- **方向校准**：原始摄像头不镜像，`zone↑(画面右移) → LEFT(玩家实际左移)`

### 车道定位

每个车道 center X 由统一公式计算，确保角色始终站在车道正中间：

```
laneWidth = TRACK_WIDTH / laneCount
centerX   = (laneIndex - (laneCount - 1) / 2) × laneWidth
```

| 车道数 | laneIndex | 中心 X |
|--------|-----------|--------|
| 2 | 0 (左), 1 (右) | -1.5, +1.5 |
| 3 | 0, 1, 2 | -2, 0, +2 |

## 游戏难度

| 难度 | 车道数 | 单道宽度 | 障碍密度 |
|------|--------|---------|---------|
| 简单 | 2 | 3m | 1/2 |
| 中等 | 3 | 2m | 1x |
| 困难 | 3 | 2m | 1.7x |

## 关键设计决策

1. **区域换道替代阈值检测**：摄像头画面分列对应跑道，列内自由、跨列切换，消除抖动
2. **车道中心定位**：laneIndex(0..N-1) → 统一公式算 centerX，不是 hardcode -1/0/1
3. **Three.js 在主线程**：避免 OffscreenCanvas WebGL 兼容问题
4. **MediaPipe 在 Worker**：CPU + XNNPACK 推理不阻塞 UI
5. **帧跳过**：Worker 一次只处理一帧，防止队列堆积
6. **WASM 文件在 src/**：Vite dev server 作为 ESM 模块处理
7. **AudioManager 延迟初始化**：首次交互时创建 AudioContext
