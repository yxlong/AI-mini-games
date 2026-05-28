/**
 * Game — 顶层编排器，拥有所有模块实例和状态，提供清晰的生命周期
 */
import type { GameAction } from '../core/types';
import { GameEngine, type Difficulty } from './engine';
import { CameraManager } from '../input/camera';
import { VisionClient } from '../input/vision';
import { UIManager } from '../ui/manager';
import { AudioManager } from '../audio/manager';
import { Leaderboard } from '../ui/leaderboard';

export class Game {
  private engine!: GameEngine;
  private camera!: CameraManager;
  private vision!: VisionClient;
  private ui!: UIManager;
  private audio = new AudioManager();
  private leaderboard = new Leaderboard();
  private isRunning = false;
  private isTesting = false;
  private isOver = false;
  private keyboardFallback = false;
  private captureLoopId: number | null = null;
  private onResize: (() => void) | null = null;

  async start() {
    this.buildUI();
    this.engine = new GameEngine(this.ui.canvas);
    this.engine.init();
    this.engine.onScoreUpdate = (s) => this.ui.updateScore(s);
    this.engine.onGameOver = (s) => this.gameOver(s);
    this.engine.onStep = () => this.audio.playStep();
    this.engine.onLaneChange = () => this.audio.playLaneChange();
    this.engine.onMilestone = () => { this.ui.triggerMilestone(); this.audio.playCheer(); };

    this.camera = new CameraManager(this.ui.videoEl);
    const camOk = await this.camera.init();
    if (!camOk) this.ui.setStatus('⌨️ 摄像头不可用，使用键盘模式');

    this.initVision();

    if (!camOk) {
      this.enableKeyboardFallback();
      this.vision.ready = true;
      this.ui.setStatus('⌨️ 键盘模式就绪！点击"开始游戏"');
      this.ui.startBtn.disabled = false;
    } else {
      await new Promise(r => setTimeout(r, 500));
      this.startFrameCapture();
    }

    this.onResize = () => {
      const wrapper = document.getElementById('canvas-wrapper');
      if (wrapper && this.engine) this.engine.resize(wrapper.clientWidth, wrapper.clientHeight);
    };
    window.addEventListener('resize', this.onResize);

    window.addEventListener('beforeunload', () => this.dispose());
  }

  private buildUI() {
    this.ui = new UIManager({
      onStart: () => this.startGame(),
      onReset: () => this.resetGame(),
      onRestart: () => { this.resetGame(); this.startGame(); },
      onConfirmTest: () => { this.exitTestMode(); this.startGame(); },
      onDifficultyChange: (d) => this.setDifficulty(d),
      onNoObstacleToggle: (v) => {
        if (this.engine) this.engine.noObstacle = v;
        this.ui.setStatus(v ? '🏃 无障碍模式' : '🎮 正常模式');
      },
      onDensityChange: (pct) => {
        if (this.engine) this.engine.setDensity(100 / pct);
      },
    });
    this.ui.build(document.getElementById('app')!);
    this.leaderboard.mount(document.getElementById('game-container')!);
    this.leaderboard.bindNameInput(this.ui.nameInput);
  }

  private initVision() {
    this.vision = new VisionClient({
      onReady: () => {
        if (!this.keyboardFallback) {
          this.ui.setStatus('✅ 全部就绪！进入姿态测试');
          this.enterTestMode();
        }
      },
      onError: (msg) => {
        this.ui.setStatus('❌ 姿态识别失败: ' + msg);
        this.enableKeyboardFallback();
      },
      onLandmarks: (data) => this.ui.drawSkeleton(data),
      onAction: (action, latencyMs) => {
        this.ui.showLatency(latencyMs);
        if (this.isTesting) {
          this.ui.setAction(action);
          this.ui.updateTestAction(action);
        } else if (this.isRunning) {
          this.ui.setAction(action);
          this.engine.handleAction(action);
        } else if (this.isOver && action === 'RESTART') {
          this.resetGame();
          this.startGame();
        }
      },
    });
    this.vision.init();
    this.vision.setLaneCount(3);
    this.ui.setZoneLaneCount(3);
  }

  private setDifficulty(d: Difficulty) {
    const lanes = d === 'easy' ? 2 : 3;
    const densityMap = { easy: 2.5, medium: 1.0, hard: 0.6 };
    this.engine.difficulty = d;
    this.engine.setLaneCount(lanes);
    this.engine.setDensity(densityMap[d]);
    this.vision.setLaneCount(lanes);
    this.ui.setZoneLaneCount(lanes);
    this.engine.reset();
    const slider = document.getElementById('density-slider') as HTMLInputElement;
    if (slider) { slider.value = String(Math.round(100 / densityMap[d])); document.getElementById('density-value')!.textContent = Math.round(100 / densityMap[d]) + '%'; }
  }

  // ---- 帧捕获 ----

  private startFrameCapture() {
    const loop = () => {
      if (!this.isRunning && !this.isTesting && !this.isOver) { this.captureLoopId = null; return; }
      this.vision.sendFrame(this.camera.video);
      this.captureLoopId = requestAnimationFrame(loop);
    };
    loop();
  }

  private stopFrameCapture() {
    if (this.captureLoopId) { cancelAnimationFrame(this.captureLoopId); this.captureLoopId = null; }
  }

  // ---- 键盘降级 ----

  private enableKeyboardFallback() {
    this.ui.setStatus('⌨️ 键盘模式');
    this.keyboardFallback = true;
    document.addEventListener('keydown', (e) => {
      if (!this.isRunning) return;
      let action: GameAction | null = null;
      if (e.key === 'ArrowLeft' || e.key === 'a') action = 'LEFT';
      else if (e.key === 'ArrowRight' || e.key === 'd') action = 'RIGHT';
      else return;
      e.preventDefault();
      this.ui.setAction(action);
      this.engine.handleAction(action);
    });
  }

  // ---- 测试模式 ----

  private enterTestMode() { this.isTesting = true; this.ui.enterTestMode(); this.ui.setStatus('📷 测试模式：尝试左右移动'); }
  private exitTestMode() { this.isTesting = false; this.ui.exitTestMode(); }

  // ---- 游戏流程 ----

  private async startGame() {
    if (this.isRunning) return;
    if (!this.keyboardFallback) this.vision.resetBaseline();
    this.engine.reset();
    this.isRunning = true;
    this.isOver = false;
    this.ui.setRunningUI(true);
    this.ui.hideGameOver();
    this.ui.setStatus('🎮 游戏中...');
    this.ui.setAction('RUN');
    if (!this.audio.initialized) this.audio.init();
    if (!this.captureLoopId) this.startFrameCapture();
    this.engine.start();
  }

  private resetGame() {
    this.isRunning = false;
    this.isOver = false;
    this.stopFrameCapture();
    this.engine.stop();
    this.vision.resetBaseline();
    this.engine.reset();
    this.ui.updateScore(0);
    this.ui.setAction('IDLE');
    this.ui.setRunningUI(false);
    this.ui.hideGameOver();
    this.ui.setStatus('已重置');
  }

  private gameOver(score: number) {
    this.isRunning = false;
    this.isOver = true;
    this.engine.stop();
    this.audio.playGameOver();
    const rank = this.leaderboard.submit(score);
    this.ui.showGameOver(score, rank);
    this.ui.setStatus(rank > 0
      ? `🏆 第 ${rank} 名！举起双手重新开始`
      : '💀 游戏结束 — 举起双手重新开始');
    // 不停帧捕获，继续检测姿态
  }

  // ---- 生命周期 ----

  dispose() {
    this.stopFrameCapture();
    if (this.onResize) window.removeEventListener('resize', this.onResize);
    this.camera?.stop();
    this.vision?.terminate();
    this.audio?.close();
    this.engine?.dispose();
  }
}
