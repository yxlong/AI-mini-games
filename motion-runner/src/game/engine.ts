/**
 * 游戏引擎 — Three.js 初始化、渲染循环、物理、游戏状态
 */
import * as THREE from 'three';
import { GAME_CONFIG, RENDER_CONFIG, COLLISION } from '../core/constants';
import type { GameAction } from '../core/types';
import { Track } from './track';
import { ObstacleManager } from './obstacles';
import { Scenery } from './scenery';

export type Difficulty = 'easy' | 'medium' | 'hard';

export class GameEngine {
  // Three.js
  scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  player!: THREE.Group;
  private playerParts!: { body: THREE.Mesh; leftLeg: THREE.Mesh; rightLeg: THREE.Mesh; leftArm: THREE.Mesh; rightArm: THREE.Mesh };
  private animTime = 0;

  // 模块
  track!: Track;
  obstacles!: ObstacleManager;
  scenery!: Scenery;

  // 游戏状态
  speed = GAME_CONFIG.INITIAL_SPEED;
  laneIndex = 1;
  laneCount = 3;
  private densityMult = 1.0; // 当前密度倍率，reset/setLaneCount 后保持
  private playerY = 0;
  private playerVy = 0;
  private isJumping = false;
  isSliding = false;
  private slideTimer: ReturnType<typeof setTimeout> | null = null;
  distance = 0;
  score = 0;
  isOver = false;
  private lastTime = 0;
  private loopId: number | null = null;
  noObstacle = false;
  difficulty: Difficulty = 'medium';

  // 回调
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (score: number) => void;
  onStep?: () => void;
  onLaneChange?: () => void;
  onMilestone?: (m: number) => void;
  private lastMilestone = 0;

  private canvas: HTMLCanvasElement;
  constructor(canvas: HTMLCanvasElement) { this.canvas = canvas; }

  init() {
    const w = this.canvas.clientWidth || 800;
    const h = this.canvas.clientHeight || 600;
    this.canvas.width = w; this.canvas.height = h;

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(RENDER_CONFIG.BG_COLOR);
    this.scene.fog = new THREE.Fog(RENDER_CONFIG.BG_COLOR, RENDER_CONFIG.FOG_NEAR, RENDER_CONFIG.FOG_FAR);

    this.camera = new THREE.PerspectiveCamera(70, w / h, 0.1, 100);
    this.camera.position.set(0, 5, 10);
    this.camera.lookAt(0, 0, 0);

    // 灯光
    this.scene.add(new THREE.AmbientLight(0x404060, 0.5));
    const dir = new THREE.DirectionalLight(0xffeedd, 1.5);
    dir.position.set(5, 15, 5);
    dir.castShadow = true;
    dir.shadow.mapSize.width = 2048;
    dir.shadow.mapSize.height = 2048;
    dir.shadow.camera.near = 0.5; dir.shadow.camera.far = 50;
    dir.shadow.camera.left = -15; dir.shadow.camera.right = 15;
    this.scene.add(dir);
    const fill = new THREE.DirectionalLight(0x8888ff, 0.3);
    fill.position.set(-5, 5, -5);
    this.scene.add(fill);

    this.track = new Track(this.scene);
    this.scenery = new Scenery(this.scene);
    this.createPlayer();
    this.obstacles = new ObstacleManager(this.scene, this.laneCount);
  }

  private createPlayer() {
    const group = new THREE.Group();

    // 身体：绿色胶囊
    const bodyMat = new THREE.MeshStandardMaterial({
      color: RENDER_CONFIG.PLAYER_COLOR, roughness: 0.25, metalness: 0.5,
      emissive: RENDER_CONFIG.PLAYER_COLOR, emissiveIntensity: 0.08,
    });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.55, 4, 8), bodyMat);
    body.position.y = 0.75;
    body.castShadow = true;
    group.add(body);

    // 眼睛：白色球 + 黑色瞳孔
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });
    for (let s = -1; s <= 1; s += 2) {
      const eyeW = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), eyeWhiteMat);
      eyeW.position.set(s * 0.09, 1.03, -0.18);
      group.add(eyeW);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), pupilMat);
      pupil.position.set(s * 0.09, 1.02, -0.22);
      group.add(pupil);
    }

    // 腿：深色小方块
    const legMat = new THREE.MeshStandardMaterial({ color: 0x2D5F2D, roughness: 0.5 });
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.4, 0.14), legMat);
    leftLeg.position.set(-0.12, 0.2, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.4, 0.14), legMat);
    rightLeg.position.set(0.12, 0.2, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);

    // 手臂：细胶囊
    const armMat = new THREE.MeshStandardMaterial({ color: RENDER_CONFIG.PLAYER_COLOR, roughness: 0.3, metalness: 0.4 });
    const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.3, 2, 4), armMat);
    leftArm.position.set(-0.28, 0.75, 0);
    leftArm.rotation.z = 0.4;
    leftArm.castShadow = true;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.3, 2, 4), armMat);
    rightArm.position.set(0.28, 0.75, 0);
    rightArm.rotation.z = -0.4;
    rightArm.castShadow = true;
    group.add(rightArm);

    this.playerParts = { body, leftLeg, rightLeg, leftArm, rightArm };
    this.player = group;
    this.player.position.set(0, 0, GAME_CONFIG.PLAYER_Z);
    this.scene.add(group);
  }

  /** 角色动画：跑步踏步 + 身体弹跳 + 摆臂 */
  private animateCharacter(delta: number) {
    if (!this.playerParts) return;
    this.animTime += delta;

    const p = this.playerParts;
    const freq = this.speed * 0.8; // 步频随速度变化
    const swing = Math.sin(this.animTime * freq);

    // 腿交替摆动
    const legAngle = swing * 0.6;
    p.leftLeg.rotation.x = legAngle;
    p.rightLeg.rotation.x = -legAngle;

    // 手臂反向摆动
    p.leftArm.rotation.x = -legAngle * 0.7;
    p.rightArm.rotation.x = legAngle * 0.7;

    // 身体弹跳
    const bob = Math.abs(Math.sin(this.animTime * freq * 2)) * 0.08;
    p.body.position.y = 0.75 + bob;

    // 跳跃时腿收起
    if (this.isJumping) {
      p.leftLeg.rotation.x = -0.8;
      p.rightLeg.rotation.x = -0.8;
      p.body.position.y = 0.75 + 0.15;
    }

    // 滑铲时身体压低
    if (this.isSliding) {
      p.body.position.y = 0.3;
    }
  }

  /** 返回当前 laneIndex 对应的 X 坐标（该车道正中间） */
  private laneCenterX(): number {
    const w = GAME_CONFIG.TRACK_WIDTH / this.laneCount; // 每条道宽度
    return (this.laneIndex - (this.laneCount - 1) / 2) * w;
  }

  handleAction(action: GameAction) {
    if (this.isOver) return;
    switch (action) {
      case 'JUMP':
        if (!this.isJumping && !this.isSliding) {
          this.isJumping = true; this.playerVy = GAME_CONFIG.JUMP_FORCE; this.playerY = 0.1;
        }
        break;
      case 'SLIDE':
        if (!this.isJumping) {
          this.isSliding = true;
          if (this.slideTimer) clearTimeout(this.slideTimer);
          this.slideTimer = setTimeout(() => { this.isSliding = false; }, 500);
        }
        break;
      case 'LEFT':
        this.laneIndex = Math.max(0, this.laneIndex - 1);
        this.onLaneChange?.();
        break;
      case 'RIGHT':
        this.laneIndex = Math.min(this.laneCount - 1, this.laneIndex + 1);
        this.onLaneChange?.();
        break;
    }
  }

  private gameLoop = () => {
    this.loopId = requestAnimationFrame(this.gameLoop);
    if (this.isOver) { this.renderer.render(this.scene, this.camera); return; }

    const now = performance.now();
    const delta = Math.min(this.lastTime ? (now - this.lastTime) / 1000 : GAME_CONFIG.FALLBACK_DELTA, GAME_CONFIG.MAX_DELTA);
    this.lastTime = now;

    this.speed = Math.min(GAME_CONFIG.MAX_SPEED, this.speed + GAME_CONFIG.ACCELERATION * delta);
    if (this.isJumping) {
      this.playerVy += GAME_CONFIG.GRAVITY * delta;
      this.playerY += this.playerVy * delta;
      if (this.playerY <= 0) { this.playerY = 0; this.playerVy = 0; this.isJumping = false; }
    }
    const targetX = this.laneCenterX();
    this.player.position.x += (targetX - this.player.position.x) * delta * GAME_CONFIG.LANE_SMOOTH;
    this.player.position.y = this.playerY;
    if (this.isSliding) { this.player.scale.y = 0.5; this.player.position.y = this.playerY + 0.3; }
    else this.player.scale.y = 1;

    // 角色动画
    this.animateCharacter(delta);

    const scrollSpeed = this.speed * delta;
    this.distance += scrollSpeed;
    this.track.update(scrollSpeed, delta);
    this.scenery.update(scrollSpeed);

    if (!this.noObstacle) {
      if (this.obstacles.update(scrollSpeed, this.player.position.x, this.player.position.y, this.player.position.z, this.isSliding)) {
        this.gameOver();
        return;
      }
    }

    this.score = Math.floor(this.distance);
    this.onScoreUpdate?.(this.score);
    // 每 50m 里程碑
    const milestone = Math.floor(this.score / 50) * 50;
    if (milestone > this.lastMilestone) {
      this.lastMilestone = milestone;
      this.onMilestone?.(milestone);
    }

    // 跑步音效
    if (Math.floor(this.distance) > Math.floor(this.distance - scrollSpeed))
      this.onStep?.();

    this.camera.position.z = GAME_CONFIG.PLAYER_Z + 10;
    this.renderer.render(this.scene, this.camera);
  };

  start() {
    this.lastTime = performance.now();
    if (this.loopId) cancelAnimationFrame(this.loopId);
    this.loopId = requestAnimationFrame(this.gameLoop);
  }

  stop() {
    if (this.loopId) { cancelAnimationFrame(this.loopId); this.loopId = null; }
  }

  private gameOver() {
    this.isOver = true;
    this.onGameOver?.(Math.floor(this.distance));
  }

  setLaneCount(n: number) {
    this.laneCount = n;
    this.track.setLaneCount(n);
    this.obstacles.setLaneCount(n);
    // 只在首次或难度切换时用预设密度，后续由滑块独立控制
    this.obstacles.setDensity(this.densityMult);
  }

  /** 设置障碍密度倍率（滑块调用），reset 后保持 */
  setDensity(mult: number) {
    this.densityMult = mult;
    this.obstacles.setDensity(mult);
  }

  reset() {
    if (this.slideTimer) { clearTimeout(this.slideTimer); this.slideTimer = null; }
    this.laneIndex = Math.floor(this.laneCount / 2); this.playerY = 0; this.playerVy = 0;
    this.isJumping = false; this.isSliding = false;
    this.isOver = false; this.distance = 0; this.score = 0;
    this.lastMilestone = 0;
    this.speed = GAME_CONFIG.INITIAL_SPEED;
    this.player.position.set(this.laneCenterX(), 0, GAME_CONFIG.PLAYER_Z);
    this.player.scale.y = 1;
    this.obstacles.clear();
    this.obstacles = new ObstacleManager(this.scene, this.laneCount, this.densityMult);
  }

  resize(w: number, h: number) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    cancelAnimationFrame(this.loopId!);
    this.renderer.dispose();
    this.scenery.dispose();
    this.obstacles.dispose();
    this.track.dispose?.();
    this.scene.clear();
  }
}
