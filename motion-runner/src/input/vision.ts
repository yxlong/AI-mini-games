/**
 * Vision 客户端 — 管理 Web Worker 生命周期、收发消息
 */
import type { GameAction, BodyLandmarks, FromWorkerMsg, ToWorkerMsg } from '../core/types';

export interface VisionCallbacks {
  onReady?: () => void;
  onError?: (msg: string) => void;
  onLandmarks?: (data: BodyLandmarks) => void;
  onAction?: (action: GameAction, latencyMs: number) => void;
}

export class VisionClient {
  private worker: Worker | null = null;
  private busy = false;
  ready = false;

  private callbacks: VisionCallbacks;
  constructor(callbacks: VisionCallbacks) { this.callbacks = callbacks; }

  init() {
    this.worker = new Worker(
      new URL('../workers/vision.worker.ts', import.meta.url),
      { type: 'module' },
    );

    this.worker.onmessage = (e: MessageEvent<FromWorkerMsg>) => {
      const msg = e.data;
      switch (msg.type) {
        case 'vision-ready':
          this.ready = true;
          this.callbacks.onReady?.();
          break;
        case 'vision-error':
          this.callbacks.onError?.(msg.error);
          break;
        case 'landmarks':
          this.busy = false;
          this.callbacks.onLandmarks?.(msg.data);
          break;
        case 'action':
          this.callbacks.onAction?.(msg.data.action, performance.now() - msg.data.timestamp);
          break;
        case 'empty':
          this.busy = false;
          break;
      }
    };

    this.worker.postMessage({ type: 'init' } satisfies ToWorkerMsg);
  }

  /** 发送一帧给 Worker（自动跳过正在处理的帧） */
  sendFrame(video: HTMLVideoElement) {
    if (!this.worker || this.busy || video.readyState < 2) return;
    this.busy = true;
    createImageBitmap(video, { resizeWidth: 256, resizeHeight: 256, resizeQuality: 'pixelated' })
      .then(bitmap => {
        this.worker!.postMessage(
          { type: 'frame', imageBitmap: bitmap, timestamp: performance.now() } satisfies ToWorkerMsg,
          [bitmap],
        );
      })
      .catch(() => { this.busy = false; });
  }

  setLaneCount(n: number) {
    this.worker?.postMessage({ type: 'set-lanes', count: n } satisfies ToWorkerMsg);
  }

  resetBaseline() {
    this.worker?.postMessage({ type: 'reset-baseline' } satisfies ToWorkerMsg);
  }

  /** 终止 Worker，释放资源 */
  terminate() {
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
  }
}
