/** Web Audio API 音效管理 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private lastStepTime = 0;

  get initialized() { return this.ctx !== null; }

  init() {
    if (this.ctx) return; // 防止重复初始化
    this.ctx = new AudioContext();
  }

  close() {
    this.ctx?.close();
    this.ctx = null;
  }

  playStep() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (now - this.lastStepTime < 0.25) return;
    this.lastStepTime = now;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.05);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.start(now); osc.stop(now + 0.08);
  }

  playLaneChange() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.start(now); osc.stop(now + 0.12);
  }

  /** 里程碑欢呼声：三连升调 */
  playCheer() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [523, 659, 784]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.connect(gain); gain.connect(this.ctx!.destination);
      osc.type = 'square';
      const t = now + i * 0.1;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.06, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(t); osc.stop(t + 0.18);
    });
  }

  playGameOver() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const len = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++)
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    noise.connect(gain); gain.connect(this.ctx.destination);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    noise.start(now); noise.stop(now + 0.3);
  }
}
