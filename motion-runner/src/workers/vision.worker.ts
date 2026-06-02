/**
 * Vision Worker - 处理摄像头帧 + MediaPipe Pose 推理
 * 运行在独立线程中，避免阻塞主线程
 *
 * 优化项：
 * 1. VIDEO 模式 — 帧间追踪，内置时序一致性
 * 2. Heavy 模型 — 更高精度关键点定位
 * 3. 全关键点 EMA 平滑 — 抑制逐帧抖动
 * 4. 骨骼长度约束 — 拒绝异常帧，防止漂移
 */
import { PoseLandmarker, FilesetResolver, type NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { BodyLandmarks, GameAction, LandmarkPoint, ToWorkerMsg, FromWorkerMsg } from '../core/types';
import { ZONE, SMOOTHING } from '../core/constants';

let poseLandmarker: PoseLandmarker | null = null;
let isInitialized = false;

// 区域检测状态
let laneCount = 3;
let currentZone = 1;
let zoneStableCount = 0;
let neutralX = 0.5;
let handsUpCount = 0;

// ---- 时序平滑状态 ----

/** 上一帧平滑后的关键点 (33 个) */
let prevLandmarks: LandmarkPoint[] | null = null;

/** 首次标定：记录站立时的参考骨骼长度 */
let referenceBoneLengths: Map<string, number> | null = null;

/** EMA 平滑单帧所有关键点 */
function smoothLandmarks(raw: LandmarkPoint[], alpha: number): LandmarkPoint[] {
  if (!prevLandmarks || prevLandmarks.length < raw.length) return raw;

  const smoothed: LandmarkPoint[] = [];
  for (let i = 0; i < raw.length; i++) {
    const p = prevLandmarks[i];
    if (p) {
      smoothed[i] = {
        x: p.x * (1 - alpha) + raw[i].x * alpha,
        y: p.y * (1 - alpha) + raw[i].y * alpha,
        z: (p.z || 0) * (1 - alpha) + (raw[i].z || 0) * alpha,
      };
    } else {
      smoothed[i] = raw[i];
    }
  }
  return smoothed;
}

// 关键骨骼段定义 [起点索引, 终点索引]
const BONE_SEGMENTS: [number, number][] = [
  [11, 12], // 肩宽
  [11, 13], [13, 15], // 左臂: 肩→肘, 肘→腕
  [12, 14], [14, 16], // 右臂: 肩→肘, 肘→腕
  [11, 23], [12, 24], // 躯干: 肩→髋
  [23, 24], // 髋宽
  [23, 25], [25, 27], // 左腿: 髋→膝, 膝→踝
  [24, 26], [26, 28], // 右腿: 髋→膝, 膝→踝
];

function boneKey(i: number, j: number): string {
  return `${Math.min(i, j)}-${Math.max(i, j)}`;
}

/** 计算两点之间的欧几里得距离（归一化坐标空间） */
function dist2d(a: LandmarkPoint, b: LandmarkPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** 标定参考骨骼长度（取前若干有效帧的均值） */
let calibrationFrames = 0;
const calibrationSums = new Map<string, number>();

function accumulateCalibration(lm: LandmarkPoint[]) {
  if (calibrationFrames >= 60) return; // 标定 60 帧 (~2s)
  for (const [i, j] of BONE_SEGMENTS) {
    if (lm[i] && lm[j] && lm[i].x > 0 && lm[j].x > 0) {
      const d = dist2d(lm[i], lm[j]);
      const key = boneKey(i, j);
      calibrationSums.set(key, (calibrationSums.get(key) || 0) + d);
    }
  }
  calibrationFrames++;
  if (calibrationFrames === 60) {
    referenceBoneLengths = new Map();
    for (const [k, sum] of calibrationSums) {
      referenceBoneLengths.set(k, sum / 60);
    }
  }
}

/** 验证骨骼长度是否在容忍范围内 */
function validateBoneLengths(lm: LandmarkPoint[]): boolean {
  if (!referenceBoneLengths) return true; // 尚未标定完成，通过
  let violations = 0;
  for (const [i, j] of BONE_SEGMENTS) {
    if (!lm[i] || !lm[j]) continue;
    const current = dist2d(lm[i], lm[j]);
    const ref = referenceBoneLengths.get(boneKey(i, j));
    if (!ref || ref < 0.001) continue;
    const ratio = Math.abs(current - ref) / ref;
    if (ratio > SMOOTHING.BONE_LENGTH_TOLERANCE) violations++;
  }
  return violations <= 3; // 允许少量段失败（部分关键点可能被遮挡）
}

// ---- 初始化 ----

async function initPoseLandmarker() {
  try {
    const wasmPath = '/src/mediapipe-wasm';
    const vision = await FilesetResolver.forVisionTasks(wasmPath, true);

    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: '/pose_landmarker_heavy.task',
        delegate: 'CPU',
      },
      runningMode: 'VIDEO',
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

// ---- 帧处理 ----

function processFrame(imageBitmap: ImageBitmap, capturedAt: number) {
  if (!poseLandmarker || !isInitialized) return;

  try {
    // VIDEO 模式：使用 detectForVideo，传入毫秒级时间戳做帧间追踪
    const result = poseLandmarker.detectForVideo(imageBitmap as any, capturedAt);

    if (result.landmarks && result.landmarks.length > 0) {
      const landmarks = result.landmarks[0];
      const raw = landmarks.map((l: NormalizedLandmark) => ({
        x: l.x,
        y: l.y,
        z: l.z || 0,
      }));

      // 时序平滑
      const smoothed = smoothLandmarks(raw, SMOOTHING.LANDMARK_ALPHA);

      // 骨骼长度约束验证
      if (!validateBoneLengths(smoothed)) {
        // 异常帧：使用上一帧平滑结果替代（如果存在）
        if (prevLandmarks) {
          self.postMessage({
            type: 'landmarks',
            data: { landmarks: prevLandmarks, timestamp: capturedAt },
          });
          const action = detectActionLocal(prevLandmarks);
          self.postMessage({
            type: 'action',
            data: { action, timestamp: capturedAt },
          });
          return;
        }
      }

      // 标定参考骨骼长度
      accumulateCalibration(smoothed);
      prevLandmarks = smoothed;

      // 发送平滑后地标
      self.postMessage({
        type: 'landmarks',
        data: { landmarks: smoothed, timestamp: capturedAt },
      });

      // 动作判定
      const action = detectActionLocal(smoothed);
      self.postMessage({
        type: 'action',
        data: { action, timestamp: capturedAt },
      });

    } else {
      self.postMessage({ type: 'empty', timestamp: capturedAt });
    }
  } catch (err) {
    self.postMessage({ type: 'empty', timestamp: capturedAt });
  }
}

// ---- 动作检测 ----

function detectActionLocal(lm: LandmarkPoint[]): GameAction {
  if (lm.length < 33) return 'RUN';

  // 双手举过头顶 → RESTART
  const nose = lm[0];
  const leftWrist = lm[15];
  const rightWrist = lm[16];
  if (leftWrist.y < nose.y && rightWrist.y < nose.y) {
    handsUpCount++;
    if (handsUpCount >= 8) return 'RESTART';
  } else {
    handsUpCount = 0;
  }

  const centerX = (lm[11].x + lm[12].x) / 2;

  // EMA 更新中立位置
  neutralX = neutralX * (1 - ZONE.EMA_ALPHA) + centerX * ZONE.EMA_ALPHA;

  // 信号放大
  const sensitivity = laneCount === 2 ? ZONE.SENSITIVITY_2 : ZONE.SENSITIVITY_3;
  const deviation = (centerX - neutralX) * sensitivity;
  const mappedX = Math.max(0, Math.min(1, 0.5 + deviation));

  // 区域计算
  const zoneW = 1.0 / laneCount;
  const rawZone = mappedX / zoneW;

  // 滞回
  let targetZone = currentZone;
  if (currentZone < laneCount - 1 && mappedX > (currentZone + 1) * zoneW * ZONE.HYSTERESIS_ENTER) {
    targetZone = Math.min(laneCount - 1, Math.floor(rawZone + 0.3));
  } else if (currentZone > 0 && mappedX < currentZone * zoneW * ZONE.HYSTERESIS_EXIT) {
    targetZone = Math.max(0, Math.floor(rawZone - 0.3));
  }

  // 消抖
  if (targetZone !== currentZone) {
    zoneStableCount++;
    if (zoneStableCount >= ZONE.DEBOUNCE) {
      const oldZone = currentZone;
      currentZone = targetZone;
      zoneStableCount = 0;
      return targetZone > oldZone ? 'LEFT' : 'RIGHT';
    }
  } else {
    zoneStableCount = 0;
  }

  return 'RUN';
}

// ---- 消息处理 ----

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
      currentZone = Math.floor(laneCount / 2);
      zoneStableCount = 0;
      break;
    case 'reset-baseline':
      currentZone = Math.floor(laneCount / 2);
      zoneStableCount = 0;
      handsUpCount = 0;
      // 重置平滑状态，避免静止时残留漂移
      prevLandmarks = null;
      break;
  }
};
