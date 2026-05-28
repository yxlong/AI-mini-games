/**
 * 赛道两侧景物 — InstancedMesh，200 棵树仅 2 个 draw call
 */
import * as THREE from 'three';
import { GAME_CONFIG } from '../core/constants';

interface Tree { side: number; z: number; xOff: number }

export class Scenery {
  private trunks: THREE.InstancedMesh;
  private canopies: THREE.InstancedMesh;
  private trees: Tree[] = [];
  private readonly count = 160;
  private readonly resetZ = -130;
  private readonly cullZ = 30;

  private scene: THREE.Scene;
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    const trunkGeo = new THREE.CylinderGeometry(0.1, 0.16, 1.2, 4);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.9 });
    this.trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, this.count);
    this.trunks.castShadow = true;
    scene.add(this.trunks);

    const canopyGeo = new THREE.ConeGeometry(0.45, 1.6, 5);
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x2D7D2D, roughness: 0.8 });
    this.canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, this.count);
    this.canopies.castShadow = true;
    scene.add(this.canopies);

    const dummy = new THREE.Matrix4();
    for (let i = 0; i < this.count; i++) {
      const side = Math.random() > 0.5 ? 1 : -1;
      const xOff = GAME_CONFIG.TRACK_WIDTH / 2 + 2 + Math.random() * 10;
      const z = -(Math.random() * 130);
      this.trees.push({ side, z, xOff });
      this.setTreeMatrix(i, dummy);
    }
    this.trunks.instanceMatrix.needsUpdate = true;
    this.canopies.instanceMatrix.needsUpdate = true;
  }

  private setTreeMatrix(i: number, dummy: THREE.Matrix4) {
    const t = this.trees[i];
    const x = t.xOff * t.side;
    dummy.compose(new THREE.Vector3(x, 0, t.z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    this.trunks.setMatrixAt(i, dummy);
    dummy.compose(new THREE.Vector3(x, 0.6, t.z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    this.canopies.setMatrixAt(i, dummy);
  }

  private _mat4 = new THREE.Matrix4(); // 复用，避免每帧分配

  /** 每帧：滚动 + 回收远处树木 */
  update(scrollSpeed: number) {
    if (scrollSpeed <= 0) return;
    const dummy = this._mat4;

    for (let i = 0; i < this.trees.length; i++) {
      this.trees[i].z += scrollSpeed;
      if (this.trees[i].z > this.cullZ) {
        this.trees[i].z = this.resetZ + Math.random() * 5;
        this.trees[i].side = Math.random() > 0.5 ? 1 : -1;
        this.trees[i].xOff = GAME_CONFIG.TRACK_WIDTH / 2 + 2 + Math.random() * 10;
      }
      this.setTreeMatrix(i, dummy);
    }
    this.trunks.instanceMatrix.needsUpdate = true;
    this.canopies.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.trunks.geometry.dispose();
    (this.trunks.material as THREE.Material).dispose();
    this.canopies.geometry.dispose();
    (this.canopies.material as THREE.Material).dispose();
  }
}
