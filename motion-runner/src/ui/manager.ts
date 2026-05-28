/**
 * UI 管理 — DOM 构建、测试面板、覆盖层、状态显示
 */
import type { GameAction, BodyLandmarks } from '../core/types';

export interface UICallbacks {
  onStart: () => void;
  onReset: () => void;
  onRestart: () => void;
  onConfirmTest: () => void;
  onDifficultyChange: (d: 'easy' | 'medium' | 'hard') => void;
  onNoObstacleToggle: (v: boolean) => void;
  onDensityChange: (pct: number) => void;
}

export class UIManager {
  // 公共元素
  canvas!: HTMLCanvasElement;
  videoEl!: HTMLVideoElement;
  overlay!: HTMLCanvasElement;
  scoreEl!: HTMLElement;
  statusEl!: HTMLElement;
  startBtn!: HTMLButtonElement;
  actionIndicator!: HTMLElement;
  latencyEl!: HTMLElement;
  distValueEl!: HTMLElement;
  testActionEl!: HTMLElement;
  nameInput!: HTMLInputElement;

  // 测试 checklist
  private testedActions = new Set<string>();
  private zoneLaneCount = 3;

  private callbacks: UICallbacks;
  constructor(callbacks: UICallbacks) { this.callbacks = callbacks; }

  build(root: HTMLElement) {
    root.innerHTML = `
    <div id="game-container">
      <div id="game-header">
        <div id="action-display"><span id="action-indicator">等待...</span></div>
        <div id="score-display" style="display:none"><span id="score">0</span></div>
      </div>
      <div id="canvas-wrapper">
        <canvas id="game-canvas"></canvas>
        <div id="distance-hud">
          <span class="dist-label">距 离</span>
          <span class="dist-value" id="dist-value">0</span>
          <span class="dist-unit">m</span>
        </div>
        <div id="webcam-overlay-container">
          <div id="webcam-drag-handle"></div>
          <div id="webcam-resize-handle"></div>
          <video id="webcam-video" autoplay playsinline></video>
          <canvas id="pose-overlay"></canvas>
        </div>
      </div>

      <div id="camera-test-panel" style="display:none">
        <div id="test-backdrop"></div>
        <div id="test-content">
          <h2>📷 摄像头姿态测试</h2>
          <p class="test-desc">请站在摄像头前，依次尝试左右移动</p>
          <div id="test-name-row">
            <input id="test-name-input" type="text" maxlength="8" placeholder="输入你的昵称">
          </div>
          <div id="test-webcam-area">
            <div id="test-webcam-placeholder"></div>
            <div id="test-action-overlay">
              <span id="test-action-emoji">🧍</span>
              <span id="test-action-text">等待识别...</span>
            </div>
          </div>
          <div id="test-checklist">
            <div class="test-item"><span class="test-icon">🏃</span><span class="test-label">自动跑步</span><span class="test-status" id="check-RUN">●</span></div>
            <div class="test-item"><span class="test-icon">⬅️</span><span class="test-label">左移</span><span class="test-status" id="check-LEFT">○</span></div>
            <div class="test-item"><span class="test-icon">➡️</span><span class="test-label">右移</span><span class="test-status" id="check-RIGHT">○</span></div>
          </div>
          <div id="test-instructions">
            <p>⬅ 身体向左倾斜 → 角色左移</p>
            <p>➡ 身体向右倾斜 → 角色右移</p>
            <p>🧍 站直不动 → 自动跑步前进</p>
          </div>
          <button id="confirm-test-btn">✅ 确认无误，开始游戏</button>
        </div>
      </div>

      <div id="game-controls">
        <button id="start-btn">▶ 开始游戏</button>
        <button id="reset-btn" style="display:none">⟳ 重置</button>
        <select id="difficulty-select" class="diff-select">
          <option value="easy">🟢 简单 (2道)</option>
          <option value="medium" selected>🟡 中等 (3道)</option>
          <option value="hard">🔴 困难 (3道密集)</option>
        </select>
        <label class="toggle-label">
          <input type="checkbox" id="no-obstacle-check"> 🏃 无障碍
        </label>
        <span id="latency-display" style="display:none"></span>
        <label class="density-label">
          🚧 <input type="range" id="density-slider" min="10" max="400" value="100">
          <span id="density-value">100%</span>
        </label>
      </div>
      <span id="status-text">▶ 准备就绪</span>
      <div id="game-over-overlay" style="display:none">
        <h1>💀 游戏结束</h1>
        <p id="final-rank" style="display:none"></p>
        <p>跑了 <span id="final-score">0</span> 米</p>
        <p class="restart-hint">🙌 举起双手重新开始</p>
        <button id="restart-btn">🔄 再来一次</button>
      </div>
    </div>`;

    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.videoEl = document.getElementById('webcam-video') as HTMLVideoElement;
    this.overlay = document.getElementById('pose-overlay') as HTMLCanvasElement;
    this.scoreEl = document.getElementById('score') as HTMLElement;
    this.statusEl = document.getElementById('status-text') as HTMLElement; // now inline in controls
    this.startBtn = document.getElementById('start-btn') as HTMLButtonElement;
    this.actionIndicator = document.getElementById('action-indicator') as HTMLElement;
    this.latencyEl = document.getElementById('latency-display') as HTMLElement;
    this.distValueEl = document.getElementById('dist-value') as HTMLElement;
    this.testActionEl = document.getElementById('test-action-text') as HTMLElement;
    this.nameInput = document.getElementById('test-name-input') as HTMLInputElement;

    // 拖拽缩放摄像头窗口
    const webcam = document.getElementById('webcam-overlay-container')!;
    const handle = document.getElementById('webcam-drag-handle')!;
    let dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;
    handle.addEventListener('pointerdown', (e: PointerEvent) => {
      dragging = true; handle.setPointerCapture(e.pointerId);
      const rect = webcam.getBoundingClientRect();
      startX = e.clientX; startY = e.clientY;
      startLeft = rect.left; startTop = rect.top;
    });
    window.addEventListener('pointermove', (e: PointerEvent) => {
      if (!dragging) return;
      const parent = webcam.parentElement!;
      const pr = parent.getBoundingClientRect();
      webcam.style.left = (startLeft - pr.left + e.clientX - startX) + 'px';
      webcam.style.top  = (startTop  - pr.top  + e.clientY - startY) + 'px';
      webcam.style.bottom = 'auto'; webcam.style.right = 'auto';
    });
    window.addEventListener('pointerup', () => { dragging = false; });

    // 缩放摄像头窗口（右下角手柄）
    const resizeHandle = document.getElementById('webcam-resize-handle')!;
    let resizing = false, rsW = 0, rsH = 0, rsX = 0, rsY = 0;
    resizeHandle.addEventListener('pointerdown', (e: PointerEvent) => {
      resizing = true; resizeHandle.setPointerCapture(e.pointerId);
      rsW = webcam.offsetWidth; rsH = webcam.offsetHeight;
      rsX = e.clientX; rsY = e.clientY;
      e.stopPropagation();
    });
    window.addEventListener('pointermove', (e: PointerEvent) => {
      if (!resizing) return;
      const nw = Math.max(80, rsW + e.clientX - rsX);
      const nh = Math.max(60, rsH + e.clientY - rsY);
      webcam.style.width = nw + 'px';
      webcam.style.height = nh + 'px';
    });
    window.addEventListener('pointerup', () => { resizing = false; });

    this.startBtn.addEventListener('click', this.callbacks.onStart);
    document.getElementById('reset-btn')?.addEventListener('click', this.callbacks.onReset);
    document.getElementById('restart-btn')?.addEventListener('click', this.callbacks.onRestart);
    document.getElementById('confirm-test-btn')?.addEventListener('click', this.callbacks.onConfirmTest);
    document.getElementById('difficulty-select')?.addEventListener('change', e => {
      this.callbacks.onDifficultyChange((e.target as HTMLSelectElement).value as 'easy' | 'medium' | 'hard');
    });
    document.getElementById('no-obstacle-check')?.addEventListener('change', e => {
      this.callbacks.onNoObstacleToggle((e.target as HTMLInputElement).checked);
    });
    const densitySlider = document.getElementById('density-slider') as HTMLInputElement;
    densitySlider?.addEventListener('input', () => {
      const pct = parseInt(densitySlider.value);
      document.getElementById('density-value')!.textContent = pct + '%';
      this.callbacks.onDensityChange(pct);
    });
  }

  setStatus(msg: string) { if (this.statusEl) this.statusEl.textContent = msg; }

  setAction(action: GameAction) {
    const emojis: Record<string, string> = { IDLE: '🧍', RUN: '🏃', JUMP: '⬆️', SLIDE: '⬇️', LEFT: '⬅️', RIGHT: '➡️', RESTART: '🙌' };
    this.actionIndicator.textContent = `${emojis[action] || '🧍'} ${action}`;
  }

  updateScore(s: number) {
    this.scoreEl.textContent = String(s);
    this.distValueEl.textContent = String(s);
  }

  /** 里程碑动画：数字放大再恢复 */
  triggerMilestone() {
    this.distValueEl.classList.remove('dist-milestone');
    void this.distValueEl.offsetWidth; // reflow
    this.distValueEl.classList.add('dist-milestone');
  }
  showLatency(ms: number) { this.latencyEl.style.display = ''; this.latencyEl.textContent = `⏱ ${ms.toFixed(0)}ms`; }

  enterTestMode() {
    const panel = document.getElementById('camera-test-panel')!;
    const webcam = document.getElementById('webcam-overlay-container')!;
    document.getElementById('test-webcam-placeholder')!.appendChild(webcam);
    panel.style.display = 'flex';
    document.getElementById('game-controls')!.style.display = 'none';
  }

  exitTestMode() {
    const panel = document.getElementById('camera-test-panel')!;
    const webcam = document.getElementById('webcam-overlay-container')!;
    document.getElementById('canvas-wrapper')!.appendChild(webcam);
    panel.style.display = 'none';
    document.getElementById('game-controls')!.style.display = '';
  }

  updateTestAction(action: GameAction) {
    const emojis: Record<string, string> = { IDLE: '🧍', RUN: '🏃', JUMP: '⬆️', SLIDE: '⬇️', LEFT: '⬅️', RIGHT: '➡️', RESTART: '🙌' };
    const emojiEl = document.getElementById('test-action-emoji');
    if (emojiEl) emojiEl.textContent = emojis[action] || '🧍';
    this.testActionEl.textContent = `检测到: ${action}`;
    if (action !== 'IDLE' && action !== 'RUN') {
      this.testedActions.add(action);
      const el = document.getElementById(`check-${action}`);
      if (el) { el.textContent = '●'; el.classList.add('checked'); }
    }
  }

  showGameOver(s: number, rank = 0) {
    const overlay = document.getElementById('game-over-overlay')!;
    document.getElementById('final-score')!.textContent = String(s);
    const rankEl = document.getElementById('final-rank');
    if (rankEl && rank > 0) {
      rankEl.textContent = `🏆 排行榜第 ${rank} 名！`;
      rankEl.style.display = '';
    } else if (rankEl) {
      rankEl.style.display = 'none';
    }
    overlay.style.display = 'flex';
    this.startBtn.textContent = '▶ 开始游戏';
  }

  hideGameOver() { document.getElementById('game-over-overlay')!.style.display = 'none'; }

  setRunningUI(running: boolean) {
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) resetBtn.style.display = running ? 'inline-block' : 'none';
    this.startBtn.textContent = running ? '⏸ 游戏中' : '▶ 开始游戏';
  }

  setZoneLaneCount(n: number) { this.zoneLaneCount = n; }

  /** 在 overlay canvas 上绘制骨架 + 区域分界线 */
  drawSkeleton(data: BodyLandmarks | null) {
    if (!this.videoEl?.videoWidth) return;
    const ctx = this.overlay.getContext('2d');
    if (!ctx) return;
    const w = this.videoEl.videoWidth;
    const h = this.videoEl.videoHeight;
    this.overlay.width = w;
    this.overlay.height = h;
    ctx.clearRect(0, 0, w, h);

    // 画区域分界线（醒目黄色实线 + 半透明遮罩标识各区域）
    for (let i = 1; i < this.zoneLaneCount; i++) {
      const x = (i / this.zoneLaneCount) * w;
      // 加粗实线
      ctx.strokeStyle = 'rgba(255, 220, 0, 0.85)';
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      // 外发光效果
      ctx.strokeStyle = 'rgba(255, 220, 0, 0.25)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // 区域底部标签
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    const labels = this.zoneLaneCount === 2 ? ['左道', '右道'] : ['左道', '中道', '右道'];
    for (let i = 0; i < this.zoneLaneCount; i++) {
      const cx = (i + 0.5) / this.zoneLaneCount * w;
      ctx.fillStyle = 'rgba(255, 220, 0, 0.7)';
      ctx.fillText(labels[i], cx, h - 10);
    }

    // 画骨架
    const lm = data?.landmarks;
    if (!lm) return;
    ctx.fillStyle = '#00ff88'; ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2;
    for (const p of lm) {
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    const pairs = [[11,12],[11,23],[12,24],[23,24],[23,25],[24,26],[25,27],[26,28],[11,7],[12,7],[7,5],[8,6]];
    ctx.strokeStyle = 'rgba(0,255,136,0.6)';
    for (const [i, j] of pairs) {
      if (lm[i] && lm[j]) {
        ctx.beginPath();
        ctx.moveTo(lm[i].x * w, lm[i].y * h);
        ctx.lineTo(lm[j].x * w, lm[j].y * h);
        ctx.stroke();
      }
    }
  }
}
