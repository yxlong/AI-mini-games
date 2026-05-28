/** 游戏动作指令 */
export type GameAction = 'IDLE' | 'RUN' | 'JUMP' | 'SLIDE' | 'LEFT' | 'RIGHT' | 'RESTART';

/** 单个关键点（归一化坐标） */
export interface LandmarkPoint { x: number; y: number; z: number }

/** MediaPipe 身体关键点帧 */
export interface BodyLandmarks {
  landmarks: LandmarkPoint[];
  timestamp: number;
}

// ---- Worker 消息协议 ----

/** 主线程 → Vision Worker */
export type ToWorkerMsg =
  | { type: 'init' }
  | { type: 'frame'; imageBitmap: ImageBitmap; timestamp: number }
  | { type: 'set-lanes'; count: number }
  | { type: 'reset-baseline' };

/** Vision Worker → 主线程 */
export type FromWorkerMsg =
  | { type: 'vision-ready' }
  | { type: 'vision-error'; error: string }
  | { type: 'landmarks'; data: BodyLandmarks }
  | { type: 'action'; data: { action: GameAction; timestamp: number } }
  | { type: 'empty'; timestamp: number };
