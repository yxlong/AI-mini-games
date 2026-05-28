/**
 * 赛道模块 — 创建跑道、路面纹理、滚动动画
 */
import * as THREE from 'three';
import { GAME_CONFIG, RENDER_CONFIG } from '../core/constants';

export class Track {
  segments: THREE.Mesh[] = [];
  private texture: THREE.CanvasTexture | null = null;
  private scene: THREE.Scene;
  private laneCount = 3;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.build();
  }

  setLaneCount(n: number) {
    this.laneCount = n;
    this.rebuild();
  }

  getLaneCount() { return this.laneCount; }

  /** 把 lane index (0..n-1) 转为世界坐标 */
  laneToX(idx: number): number {
    const laneW = GAME_CONFIG.TRACK_WIDTH / this.laneCount;
    return (idx - (this.laneCount - 1) / 2) * laneW;
  }

  private rebuild() {
    for (const seg of this.segments) {
      seg.geometry.dispose();
      if (Array.isArray(seg.material)) seg.material.forEach(m => m.dispose());
      else seg.material.dispose();
      this.scene.remove(seg);
    }
    if (this.texture) this.texture.dispose();
    this.segments = [];
    this.build();
  }

  private build() {
    const w = GAME_CONFIG.TRACK_WIDTH;
    const len = GAME_CONFIG.SEGMENT_LENGTH;
    const mat = new THREE.MeshStandardMaterial({
      map: this.createTexture(w, len),
      roughness: 0.7,
      metalness: 0.1,
    });

    for (let i = 0; i < GAME_CONFIG.VISIBLE_SEGMENTS; i++) {
      const z = -i * len;
      const seg = new THREE.Mesh(new THREE.PlaneGeometry(w, len), mat);
      seg.rotation.x = -Math.PI / 2;
      seg.position.set(0, 0.01, z);
      seg.receiveShadow = true;
      this.scene.add(seg);
      this.segments.push(seg);
    }
  }

  /** 生成带车道线的路面纹理 */
  private createTexture(w: number, len: number): THREE.CanvasTexture {
    const scale = 32;
    const canvas = document.createElement('canvas');
    canvas.width = w * scale;
    canvas.height = len * scale;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 沥青噪点
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 20;
      img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);

    // 虚线车道分隔
    const lw = (w / this.laneCount) * scale;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([canvas.height / 4, canvas.height / 6]);
    for (let l = 1; l < this.laneCount; l++) {
      ctx.beginPath();
      ctx.moveTo(l * lw, 0);
      ctx.lineTo(l * lw, canvas.height);
      ctx.stroke();
    }

    // 边线
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 0, canvas.width - 4, canvas.height);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    this.texture = tex;
    return tex;
  }

  dispose() {
    for (const seg of this.segments) {
      seg.geometry.dispose();
      if (Array.isArray(seg.material)) seg.material.forEach(m => m.dispose());
      else seg.material.dispose();
    }
    if (this.texture) this.texture.dispose();
  }

  /** 每帧调用，滚动路面纹理 + 移动段 */
  update(scrollSpeed: number, delta: number) {
    // 纹理偏移
    for (const seg of this.segments) {
      const mat = seg.material as THREE.MeshStandardMaterial;
      if (mat?.map) {
        mat.map.offset.y += scrollSpeed * 0.05;
      }
      seg.position.z += scrollSpeed;
      if (seg.position.z > GAME_CONFIG.SEGMENT_LENGTH) {
        seg.position.z -= GAME_CONFIG.VISIBLE_SEGMENTS * GAME_CONFIG.SEGMENT_LENGTH;
      }
    }
  }
}
