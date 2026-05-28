/**
 * 音量触发 — Web Audio API 检测响度，超过阈值触发重启
 * 游戏结束时监听麦克风，大声说话或拍手即可重开，无需联网
 */
export class VoiceControl {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private running = false;
  private onRestart: () => void;
  private loudFrames = 0;

  // 触发参数
  private readonly THRESHOLD = 0.3;   // 音量阈值 (0-1)
  private readonly FRAMES = 15;       // 连续多少帧算触发 (~0.3s)

  constructor(onRestart: () => void) { this.onRestart = onRestart; }

  get supported() {
    return !!(window.AudioContext || (window as any).webkitAudioContext);
  }

  async start() {
    if (!this.supported || this.running) return;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.ctx = new AudioContext();
      this.source = this.ctx.createMediaStreamSource(this.stream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.source.connect(this.analyser);
      this.running = true;
      this.loudFrames = 0;
      this.loop();
    } catch { /* 权限被拒，静默 */ }
  }

  private loop = () => {
    if (!this.running || !this.analyser) return;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    const avg = data.reduce((a, b) => a + b, 0) / data.length / 255;

    if (avg > this.THRESHOLD) {
      this.loudFrames++;
      if (this.loudFrames >= this.FRAMES) {
        this.running = false;
        this.stop();
        this.onRestart();
        return;
      }
    } else {
      this.loudFrames = Math.max(0, this.loudFrames - 2);
    }

    requestAnimationFrame(this.loop);
  };

  stop() {
    this.running = false;
    this.source?.disconnect();
    this.analyser = null;
    this.source = null;
    this.ctx?.close();
    this.ctx = null;
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
  }
}
