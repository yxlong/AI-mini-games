/**
 * 障碍物管理 — 生成、移动、碰撞检测
 * 所有障碍物共享一个材质实例，几何体在清除时 dispose
 */
import * as THREE from 'three';
import { GAME_CONFIG, RENDER_CONFIG, OBSTACLE } from '../core/constants';

interface Obstacle {
  mesh: THREE.Mesh;
  x: number; y: number; z: number;
  width: number; height: number; depth: number;
  passed: boolean;
}

export class ObstacleManager {
  private obstacles: Obstacle[] = [];
  private scene: THREE.Scene;
  private gapMin: number;
  private gapMax: number;
  private laneCount: number;
  private sharedMat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene, laneCount: number, gapMult = 1) {
    this.scene = scene;
    this.laneCount = laneCount;
    this.gapMin = GAME_CONFIG.OBSTACLE_GAP_MIN * gapMult;
    this.gapMax = GAME_CONFIG.OBSTACLE_GAP_MAX * gapMult;
    this.sharedMat = new THREE.MeshStandardMaterial({
      color: RENDER_CONFIG.OBSTACLE_COLOR, roughness: 0.5, metalness: 0.3,
      emissive: RENDER_CONFIG.OBSTACLE_COLOR, emissiveIntensity: 0.2,
    });
    this.spawnInitial();
  }

  setLaneCount(n: number) { this.laneCount = n; }
  setDensity(mult: number) {
    this.gapMin = GAME_CONFIG.OBSTACLE_GAP_MIN * mult;
    this.gapMax = GAME_CONFIG.OBSTACLE_GAP_MAX * mult;
  }

  private spawnInitial() {
    let z = -this.gapMin;
    for (let i = 0; i < OBSTACLE.INITIAL_COUNT; i++) {
      z -= this.gapMin + Math.random() * (this.gapMax - this.gapMin);
      this.spawn(z);
    }
  }

  spawn(z: number) {
    const laneIdx = Math.floor(Math.random() * this.laneCount);
    const laneW = GAME_CONFIG.TRACK_WIDTH / this.laneCount;
    const x = (laneIdx - (this.laneCount - 1) / 2) * laneW;

    const type = ['box', 'low', 'high'][Math.floor(Math.random() * 3)];
    let h: number, y: number;
    if (type === 'low') { h = 0.5; y = 0.25; }
    else if (type === 'high') { h = 1.8; y = 0.9; }
    else { h = 1.2; y = 0.6; }

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, h, 0.9), this.sharedMat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.obstacles.push({ mesh, x, y, z, width: 0.9, height: h, depth: 0.9, passed: false });
  }

  checkCollision(px: number, py: number, pz: number, isSliding: boolean): boolean {
    const ph = isSliding ? 0.6 : 1.8;
    for (const obs of this.obstacles) {
      if (obs.passed) continue;
      const dx = Math.abs(px - obs.x);
      const dz = Math.abs(pz - obs.z);
      const dy = Math.abs(py + ph / 2 - obs.y);
      if (dx < (0.8 + obs.width) / 2 && dz < (0.6 + obs.depth) / 2 && dy < (ph + obs.height) / 2)
        return true;
      if (obs.z > pz + 2) obs.passed = true;
    }
    return false;
  }

  update(scrollSpeed: number, px: number, py: number, pz: number, isSliding: boolean): boolean {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      this.obstacles[i].z += scrollSpeed;
      this.obstacles[i].mesh.position.z += scrollSpeed;
      if (this.obstacles[i].z > OBSTACLE.CULL_Z) {
        this.obstacles[i].mesh.geometry.dispose();
        this.scene.remove(this.obstacles[i].mesh);
        this.obstacles.splice(i, 1);
      }
    }

    // 始终保持至少 INITIAL_COUNT 个障碍物在路上
    while (this.obstacles.length < OBSTACLE.INITIAL_COUNT) {
      const lastZ = this.obstacles.length > 0
        ? this.obstacles.reduce((min, o) => o.z < min ? o.z : min, Infinity)
        : -50;
      this.spawn(lastZ - (this.gapMin + Math.random() * (this.gapMax - this.gapMin)));
    }
    return this.checkCollision(px, py, pz, isSliding);
  }

  clear() {
    for (const obs of this.obstacles) {
      obs.mesh.geometry.dispose();
      this.scene.remove(obs.mesh);
    }
    this.obstacles = [];
  }

  dispose() {
    this.clear();
    this.sharedMat.dispose();
  }
}
