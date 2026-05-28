/** 摄像头管理 — 权限、流捕获、帧提取 */
export class CameraManager {
  stream: MediaStream | null = null;
  video: HTMLVideoElement;
  ready = false;

  constructor(video: HTMLVideoElement) {
    this.video = video;
  }

  async init(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      });
      this.video.srcObject = this.stream;
      await this.video.play();
      this.ready = true;
      return true;
    } catch (err) {
      console.error('Camera error:', err);
      return false;
    }
  }

  stop() {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.ready = false;
  }
}
