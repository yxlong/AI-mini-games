/**
 * Vision Worker - 专门处理摄像头帧 + MediaPipe Pose 推理
 * 运行在独立线程中，避免阻塞主线程
 */
import { PoseLandmarker, FilesetResolver, type NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { BodyLandmarks, GameAction, LandmarkPoint, ToWorkerMsg, FromWorkerMsg } from '../core/types';
import { ZONE } from '../core/constants';

let poseLandmarker: PoseLandmarker | null = null;
let isInitialized = false;

// 区域检测：摄像头画面均分为 N 列，每列对应一个跑道
let laneCount = 3;
let currentZone = 1;
let zoneStableCount = 0;
let neutralX = 0.5; // 玩家自然站立时身体中心的 x 坐标（0-1）

// 初始化 MediaPipe Pose
async function initPoseLandmarker() {
  try {
    const wasmPath = '/src/mediapipe-wasm';
    // useModule: true 强制使用 ESM 版本的 WASM module，避免 CommonJS 在 Worker 中失败
    const vision = await FilesetResolver.forVisionTasks(wasmPath, true);

    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: '/pose_landmarker_lite.task',
        delegate: 'CPU',
      },
      runningMode: 'IMAGE',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    isInitialized = true;
    self.postMessage({ type: 'vision-ready' });
  } catch (err) {
    console.error('[Vision Worker] Init failed:', err);
    self.postMessage({ type: 'vision-error', error: String(err) });
  }
}

// 处理视频帧
function processFrame(imageBitmap: ImageBitmap, capturedAt: number) {
  if (!poseLandmarker || !isInitialized) return;

  try {
    // 使用 IMAGE 模式避免 timestamp 问题
    const result = poseLandmarker.detect(imageBitmap as any);

    if (result.landmarks && result.landmarks.length > 0) {
      const landmarks = result.landmarks[0];
      // 提取关键点坐标 (归一化 0-1)
      const lm = landmarks.map((l: NormalizedLandmark) => ({
        x: l.x,
        y: l.y,
        z: l.z || 0,
      }));

      // 发送原始地标到主线程
      self.postMessage({
        type: 'landmarks',
        data: { landmarks: lm, timestamp: capturedAt },
      });

      // 可选：直接在 Worker 里做动作判定（降低延迟）
      const action = detectActionLocal(lm);
      self.postMessage({
        type: 'action',
        data: { action, timestamp: capturedAt },
      });

    } else {
      self.postMessage({ type: 'empty', timestamp: capturedAt });
    }
  } catch (err) {
    // 静默忽略 intermittent 错误
	    self.postMessage({ type: 'empty', timestamp: capturedAt });
  }
}

/**
 * 区域检测：摄像头画面水平均分为 laneCount 列，每列对应一个跑道。
 *
 *   ┌──────────┬──────────┐
 *   │  zone 0  │  zone 1  │  2 车道
 *   └──────────┴──────────┘
 *   ┌─────┬─────┬─────┐
 *   │  0  │  1  │  2  │      3 车道
 *   └─────┴─────┴─────┘
 *
 * 关键设计：
 * 1. 信号放大 — 玩家实际可偏移范围只有画面 30-40%，通过放大系数
 *    映射到全画面，确保可以到达两侧区域
 * 2. 方向校正 — 摄像头原始画面不镜像，身体左移 = 画面右移，需翻转
 * 3. 滞回 — 跨区后在边界附近不会来回抖
 */
let handsUpCount = 0;
function detectActionLocal(lm: LandmarkPoint[]): GameAction {
  if (lm.length < 33) return 'RUN';

  // 检测双手举过头顶（欢呼姿势）：左右手腕高于鼻子
  const nose = lm[0];
  const leftWrist = lm[15];
  const rightWrist = lm[16];
  if (leftWrist.y < nose.y && rightWrist.y < nose.y) {
    handsUpCount++;
    if (handsUpCount >= 8) return 'RESTART'; // ~0.3s 连续举起触发
  } else {
    handsUpCount = 0;
  }

  const centerX = (lm[11].x + lm[12].x) / 2;

  // 平滑更新中性位置
  neutralX = neutralX * (1 - ZONE.EMA_ALPHA) + centerX * ZONE.EMA_ALPHA;

  // 信号放大
  const sensitivity = laneCount === 2 ? ZONE.SENSITIVITY_2 : ZONE.SENSITIVITY_3;
  const deviation = (centerX - neutralX) * sensitivity;
  const mappedX = Math.max(0, Math.min(1, 0.5 + deviation));

  // 计算当前映射后的区域
  const zoneW = 1.0 / laneCount;
  const rawZone = mappedX / zoneW;

  // 滞回：防止在边界来回抖
  // 只有明显进入邻区才切换
  let targetZone = currentZone;

  if (currentZone < laneCount - 1 && mappedX > (currentZone + 1) * zoneW * ZONE.HYSTERESIS_ENTER) {
    targetZone = Math.min(laneCount - 1, Math.floor(rawZone + 0.3));
  } else if (currentZone > 0 && mappedX < currentZone * zoneW * ZONE.HYSTERESIS_EXIT) {
    targetZone = Math.max(0, Math.floor(rawZone - 0.3));
  }

  // 消抖计数
  if (targetZone !== currentZone) {
    zoneStableCount++;
    if (zoneStableCount >= ZONE.DEBOUNCE) {
      const oldZone = currentZone;
      currentZone = targetZone;
      zoneStableCount = 0;
      // 方向翻转：画面中身体右移(zone增加) = 玩家实际左移，所以 zone↑ → LEFT
      return targetZone > oldZone ? 'LEFT' : 'RIGHT';
    }
  } else {
    zoneStableCount = 0;
  }

  return 'RUN';
}

// 监听主线程消息
self.onmessage = async (e: MessageEvent<ToWorkerMsg>) => {
  const msg = e.data;

  switch (msg.type) {
    case 'init':
      await initPoseLandmarker();
      break;
    case 'frame':
      if (msg.imageBitmap) {
        processFrame(msg.imageBitmap, msg.timestamp);
        msg.imageBitmap.close();
      }
      break;
    case 'set-lanes':
      laneCount = msg.count || 3;
      currentZone = Math.floor(laneCount / 2); // 默认中间
      zoneStableCount = 0;
      break;
    case 'reset-baseline':
      currentZone = Math.floor(laneCount / 2);
      zoneStableCount = 0;
      handsUpCount = 0;
      break;
  }
};
