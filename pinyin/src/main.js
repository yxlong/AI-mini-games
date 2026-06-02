// 拼音太空冒险 — Three.js 真3D
import * as THREE from 'three';
import { getState, transition } from './core/game-state.js';
import { generateQuestion } from './core/quiz-engine.js';
import { renderModeA, bindModeA } from './ui/mode-a-renderer.js';
import { renderModeB, bindModeB } from './ui/mode-b-renderer.js';
import { getSentence } from './data/pinyin-library.js';
import { playSoundEffect, speakText, initAudio } from './audio/speech.js';
import './styles.css';

// === Sci-Fi HUD (顶部常驻) ===
const hud = document.createElement('div');
hud.id = 'sci-fi-hud';
hud.innerHTML = `
  <div class="hud-left">
    <span class="hud-avatar">🧑‍🚀</span>
    <span id="hud-name"></span>
    <span class="hud-sep">|</span>
    <span>🪐 已点亮 <span id="hud-lit">0</span> 颗</span>
  </div>
  <div class="hud-center">
    <span class="hud-title">拼 音 宇 宙</span>
  </div>
  <div class="hud-right">
    <button id="hud-home" class="hud-btn">🏠 回星群</button>
    <button id="hud-restart" class="hud-btn">⟳ 重启</button>
  </div>
`;
document.body.appendChild(hud);

// === Quiz Overlay ===
const quizOverlay = document.getElementById('quiz-overlay');
const quizQuestion = document.createElement('div');
quizQuestion.id = 'quiz-question';
quizOverlay.appendChild(quizQuestion);

let quizActive = false;
let currentPlanet = null;
let transitioningPlanets = [];
let planetStates = {};
// 从 localStorage 恢复已点亮的星球
try { const saved = localStorage.getItem('pinyin_planet_states'); if (saved) planetStates = JSON.parse(saved); } catch {}
const LS_KEY = 'pinyin_planet_states';

function savePlanetStates() { try { localStorage.setItem(LS_KEY, JSON.stringify(planetStates)); } catch {} }

function restoreSavedPlanets() {
  Object.entries(planetStates).forEach(([idx, st]) => {
    if (!st.passed) return;
    const i = parseInt(idx);
    const p = planets[i];
    if (!p || p.userData.activated) return;
    p.userData.activated = true;
    transitioningPlanets.push({ mesh: p, progress: 0 });
    addGlowHalo(p);
  });
}
let preFlyPosition = null;
let flyBackAnim = null;
let releaseCooldown = 0;
let clickBlocked = true; // 启动时屏蔽点击，防止昵称界面冒泡

// === Three.js Setup ===
const container = document.getElementById('game-container');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0a30, 0.000003);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 20000);
camera.position.set(0, 0, 400);
window.addEventListener('wheel', (e) => {
  if (quizActive || targetPosition) return;
  e.preventDefault();
  const fwd = new THREE.Vector3(0, 0, 1);
  fwd.applyAxisAngle(new THREE.Vector3(1, 0, 0), cameraPitch);
  fwd.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
  camera.position.addScaledVector(fwd, e.deltaY * 0.5);
}, { passive: false });

scene.add(new THREE.AmbientLight(0x555577, 2.5));
const sunLight = new THREE.DirectionalLight(0xffffff, 4);
sunLight.position.set(500, 300, 200);
scene.add(sunLight);
// 补光
const fillLight = new THREE.DirectionalLight(0x8888ff, 1.5);
fillLight.position.set(-300, -100, -200);
scene.add(fillLight);

// === Sci-Fi Space Background (Soft Glow Particle Nebulae + Stars) ===

// 圆形柔光粒子纹理
function createGlowTexture(innerColor, outerColor) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, innerColor || 'rgba(255,255,255,1)');
  grad.addColorStop(0.15, innerColor || 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.4)');
  grad.addColorStop(0.7, 'rgba(255,255,255,0.05)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

const glowTex = createGlowTexture();

// 深色天球
const skyGeo = new THREE.SphereGeometry(5000, 32, 16);
const skyMat = new THREE.MeshBasicMaterial({ color: 0x0a0a30, side: THREE.BackSide });
scene.add(new THREE.Mesh(skyGeo, skyMat));

// 通用粒子材质
function glowMaterial(opacity, size) {
  return new THREE.PointsMaterial({
    size: size || 6, map: glowTex, vertexColors: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
    transparent: true, opacity: opacity || 0.7,
  });
}

// 星云粒子 — 多团彩色粒子云
function createNebulaParticles(cx, cy, cz, count, colorBase, spread) {
  const geo = new THREE.BufferGeometry();
  const p = new Float32Array(count * 3), c = new Float32Array(count * 3);
  const base = new THREE.Color(colorBase);
  const clusters = 3 + Math.floor(Math.random() * 4); // 3-6个子团
  for (let i = 0; i < count; i++) {
    // 随机选一个子团中心，加噪声偏移
    const ci = Math.floor(Math.random() * clusters);
    const angle = ci * Math.PI * 2 / clusters + Math.random() * 0.5;
    const dist = spread * 0.15 + Math.random() * spread * 0.6;
    const scx = cx + Math.cos(angle) * dist;
    const scy = cy + Math.sin(angle * 0.7) * dist * 0.5;
    const scz = cz + Math.sin(angle) * dist;
    // Gaussian-like falloff
    const gauss = () => { let u = 0, v = 0; while (u === 0) u = Math.random(); while (v === 0) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    p[i * 3] = scx + gauss() * spread * 0.25;
    p[i * 3 + 1] = scy + gauss() * spread * 0.15;
    p[i * 3 + 2] = scz + gauss() * spread * 0.25;
    const cl = base.clone();
    cl.offsetHSL((Math.random() - 0.5) * 0.12, Math.random() * 0.1, (Math.random() - 0.5) * 0.4);
    c[i * 3] = cl.r; c[i * 3 + 1] = cl.g; c[i * 3 + 2] = cl.b;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  scene.add(new THREE.Points(geo, glowMaterial(0.5 + Math.random() * 0.4, 10 + Math.random() * 12)));
}


// 粉紫星云（外层空间，不规则子团分布）
createNebulaParticles(-2500, 800, -2000, 2000, '#cc3388', 1800);
createNebulaParticles(-1800, 500, -1600, 1000, '#dd55aa', 900);
// 蓝青
createNebulaParticles(2800, -500, -2500, 1800, '#2288dd', 1700);
createNebulaParticles(2200, 200, -2000, 900, '#33aacc', 800);
// 金橙
createNebulaParticles(800, 1200, -1500, 1500, '#ee8833', 1200);
createNebulaParticles(-500, 1000, -1200, 800, '#dd7722', 700);
// 翠绿
createNebulaParticles(-1500, -900, 1200, 1200, '#33aa66', 900);
// 紫罗兰
createNebulaParticles(2000, -800, 1500, 900, '#8844cc', 700);
// 深红
createNebulaParticles(-3000, -300, -2800, 1500, '#992244', 1100);

// 银河螺旋臂
function createGalaxyArm(startAngle, armCount, armParticles) {
  const geo = new THREE.BufferGeometry();
  const p = new Float32Array(armParticles * 3), c = new Float32Array(armParticles * 3);
  for (let i = 0; i < armParticles; i++) {
    const t = i / armParticles;
    const angle = startAngle + t * Math.PI * 1.5;
    const radius = 200 + t * 1400;
    const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 200;
    const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 200;
    const y = (Math.random() - 0.5) * 80 * (1 - t * 0.8);
    p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z - 2000;
    const cl = new THREE.Color().setHSL(0.55 + t * 0.15, 0.3, 0.5 + t * 0.4);
    c[i * 3] = cl.r; c[i * 3 + 1] = cl.g; c[i * 3 + 2] = cl.b;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  scene.add(new THREE.Points(geo, glowMaterial(0.7, 5)));
}
for (let a = 0; a < 3; a++) {
  createGalaxyArm(a * Math.PI * 2 / 3, 3, 1200);
}

// 亮星星 — 前景点缀
const brightStarGeo = new THREE.BufferGeometry();
const BSC = 2000;
const bpA = new Float32Array(BSC * 3), bcA = new Float32Array(BSC * 3);
for (let i = 0; i < BSC; i++) {
  bpA[i * 3] = (Math.random() - 0.5) * 4000;
  bpA[i * 3 + 1] = (Math.random() - 0.5) * 3000;
  bpA[i * 3 + 2] = (Math.random() - 0.5) * 2000;
  const hue = Math.random() < 0.05 ? Math.random() * 0.15 : Math.random() < 0.15 ? 0.08 + Math.random() * 0.07 : 0.55 + Math.random() * 0.2;
  const cl = new THREE.Color().setHSL(hue, 0.15, 0.65 + Math.random() * 0.35);
  bcA[i * 3] = cl.r; bcA[i * 3 + 1] = cl.g; bcA[i * 3 + 2] = cl.b;
}
brightStarGeo.setAttribute('position', new THREE.BufferAttribute(bpA, 3));
brightStarGeo.setAttribute('color', new THREE.BufferAttribute(bcA, 3));
scene.add(new THREE.Points(brightStarGeo, glowMaterial(0.9, 3)));


// === Planet Creation ===
const planets = [];
const placedPositions = [];
const GREY_COLOR = new THREE.Color(0x556677);
const TOTAL = 158;

function planetTexture(type) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#888899';
  ctx.fillRect(0, 0, 128, 128);
  if (type === 'striped') {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.04 + Math.random() * 0.08})`;
      ctx.fillRect(0, i * 18 + Math.random() * 10, 128, 3 + Math.random() * 8);
    }
  } else if (type === 'spotted') {
    for (let i = 0; i < 15; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.08})`;
      ctx.beginPath();
      ctx.arc(20 + Math.random() * 88, 20 + Math.random() * 88, 3 + Math.random() * 10, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 'craters') {
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.08 + Math.random() * 0.1})`;
      ctx.beginPath();
      ctx.arc(20 + Math.random() * 88, 20 + Math.random() * 88, 4 + Math.random() * 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return new THREE.CanvasTexture(c);
}

function createLabelTexture(text) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, 64, 40);
  return new THREE.CanvasTexture(c);
}

// 光晕
function addGlowHalo(planetMesh) {
  const size = planetMesh.userData.size;
  // 更大更亮的光晕
  const haloGeo = new THREE.SphereGeometry(size * 2.5, 32, 32);
  const haloMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: planetMesh.userData.targetColor } },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vNormal;
      uniform float uTime;
      uniform vec3 uColor;
      void main() {
        float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 4.0);
        float pulse = 0.85 + 0.15 * sin(uTime * 2.5);
        gl_FragColor = vec4(uColor, fresnel * 0.7 * pulse);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.userData.isHalo = true;
  planetMesh.add(halo);

  // 星球本身也加 emissive
  planetMesh.material.emissive = planetMesh.userData.targetColor.clone();
  planetMesh.material.emissiveIntensity = 0.4;
}



function findPosition(index) {
  const t = index / Math.max(TOTAL - 1, 1);
  for (let at = 0; at < 50; at++) {
    const a = t * Math.PI * 5 + (Math.random() - 0.5) * 2;
    const r = 400 + t * 3500 + (Math.random() - 0.5) * 600;
    const x = Math.cos(a) * r, z = Math.sin(a) * r, y = (Math.random() - 0.5) * 1500;
    const sz = 10 + Math.random() * 30;
    let ok = true;
    for (const pp of placedPositions) {
      const d = Math.sqrt((x - pp.x) ** 2 + (y - pp.y) ** 2 + (z - pp.z) ** 2);
      if (d < pp.size + sz + 15) { ok = false; break; }
    }
    if (ok) { placedPositions.push({ x, y, z, size: sz }); return { x, y, z, size: sz }; }
  }
  const sz = 15;
  placedPositions.push({ x: Math.random() * 2000, y: Math.random() * 500, z: Math.random() * 1500, size: sz });
  return { x: Math.random() * 2000, y: Math.random() * 500, z: Math.random() * 1500, size: sz };
}

function createPlanet(index) {
  const { x, y, z, size } = findPosition(index);

  // 目标颜色（答对后才会显示）
  const hue = (index * 0.12 + Math.random() * 0.3) % 1;
  const targetColor = new THREE.Color().setHSL(hue, 0.7 + Math.random() * 0.3, 0.55 + Math.random() * 0.35);

  const geo = new THREE.SphereGeometry(size, 32, 32);
  const texType = ['striped', 'spotted', 'craters', 'plain'][Math.floor(Math.random() * 4)];
  const tex = texType !== 'plain' ? planetTexture(texType) : null;

  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x888899), // 初始银灰色
    roughness: 0.5 + Math.random() * 0.3,
    metalness: 0.02 + Math.random() * 0.08,
    ...(tex && { map: tex }),
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.userData = {
    index, size,
    targetColor: targetColor.clone(),
    activated: false,
    rotSpeed: (0.2 + Math.random() * 2) * (Math.random() > 0.5 ? 1 : -1),
    hasRing: Math.random() < 0.3,
  };
  scene.add(mesh);

  // 光环（初始暗色）
  if (mesh.userData.hasRing) {
    const ringGeo = new THREE.TorusGeometry(size * 1.6, 0.8 + Math.random() * 2, 16, 48);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      color: 0x666677, transparent: true, opacity: 0.15, depthWrite: false,
    }));
    ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
    ring.userData.targetColor = new THREE.Color().setHSL((hue + 0.3) % 1, 0.6, 0.7);
    ring.userData.targetOpacity = 0.35;
    mesh.add(ring);
  }

  // 标签
  const label = new THREE.Sprite(new THREE.SpriteMaterial({
    map: createLabelTexture(`${index + 1}`), transparent: true, depthTest: false,
  }));
  label.scale.set(size * 0.8, size * 0.8, 1);
  label.position.y = size + 10;
  label.userData.isLabel = true;
  mesh.add(label);

  // 卫星（35%概率）
  if (Math.random() < 0.35) {
    const moonGeo = new THREE.SphereGeometry(size * 0.2, 8, 8);
    const moon = new THREE.Mesh(moonGeo, new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 }));
    moon.position.set(size * 1.8, 0, 0);
    moon.userData = { moonOrbit: size * 1.8, moonSpeed: 1 + Math.random() * 2, moonAngle: Math.random() * Math.PI * 2, isMoon: true };
    mesh.add(moon);
  }

  planets.push(mesh);
  return mesh;
}

for (let i = 0; i < TOTAL; i++) createPlanet(i);
restoreSavedPlanets();

// === Bottom Nav Bar ===
function buildNavBar() {
  let bar = document.getElementById('planet-nav');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'planet-nav';
    bar.innerHTML = '<div class="nav-scroll" id="nav-scroll"></div>';
    document.body.appendChild(bar);
    // 鼠标滚轮横向滚动
    const scroll = bar.querySelector('#nav-scroll');
    bar.addEventListener('wheel', (e) => {
      e.preventDefault();
      scroll.scrollLeft += e.deltaY;
    }, { passive: false });
  }
  const scroll = bar.querySelector('#nav-scroll');
  scroll.innerHTML = '';

  for (let i = 0; i < planets.length; i++) {
    const dot = document.createElement('div');
    dot.className = 'nav-dot';
    if (planetStates[i] && planetStates[i].passed) dot.classList.add('passed');
    dot.textContent = i + 1;
    dot.title = `星球 ${i + 1}`;
    dot.addEventListener('click', () => {
      if (quizActive) return;
      playSoundEffect('click');
      flyToPlanet(planets[i]);
    });
    scroll.appendChild(dot);
  }
}

// === Camera Control ===
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredPlanet = null;
let targetPosition = null;
let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let dragDistance = 0;
let cameraYaw = 0, cameraPitch = 0;

function updateMouse(e) {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
}

window.addEventListener('pointerdown', (e) => {
  if (clickBlocked || quizActive) return;
  if (e.button !== 0) return;
  isDragging = true;
  dragStartX = e.clientX; dragStartY = e.clientY;
  dragDistance = 0;
  updateMouse(e);
});

window.addEventListener('pointermove', (e) => {
  updateMouse(e);
  if (!isDragging) return;
  const dx = e.clientX - dragStartX, dy = e.clientY - dragStartY;
  dragDistance = Math.sqrt(dx * dx + dy * dy);
  if (dragDistance > 5 && !targetPosition) {
    cameraYaw += dx * 0.004;
    cameraPitch -= dy * 0.004;
    cameraPitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, cameraPitch));
    dragStartX = e.clientX; dragStartY = e.clientY;
  }
});

window.addEventListener('pointerup', () => {
  if (clickBlocked) return;
  if (!isDragging) return;
  isDragging = false;
  if (dragDistance < 8 && !targetPosition && !quizActive) trySelectPlanet();
});

window.addEventListener('click', (e) => {
  if (clickBlocked) return;
  if (!isDragging && !quizActive && !targetPosition && !flyBackAnim) {
    updateMouse(e);
    trySelectPlanet();
  }
});

function trySelectPlanet() {
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(planets, true);
  for (const hit of hits) {
    let obj = hit.object;
    while (obj) {
      if (obj.userData && typeof obj.userData.index === 'number') break;
      obj = obj.parent;
    }
    if (obj && typeof obj.userData.index === 'number') {
      playSoundEffect('click');
      flyToPlanet(planets[obj.userData.index]);
      return;
    }
  }
}

// === Fly ===
function flyToPlanet(planetMesh) {
  if (targetPosition) return;
  preFlyPosition = camera.position.clone();
  currentPlanet = planetMesh;
  const pos = planetMesh.position.clone();
  const size = planetMesh.userData.size;
  // 从相机方向飞到星球前面（不穿透）
  const camToPlanet = pos.clone().sub(camera.position).normalize();
  targetPosition = pos.clone().addScaledVector(camToPlanet, -(size * 3));
}

function enterQuiz() {
  quizActive = true;
  const idx = currentPlanet.userData.index;
  const ps = planetStates[idx];

  // 已通过的星球 → 展示回顾
  if (ps && ps.passed && ps.char) {
    showReviewCard(ps.char, ps.pinyin);
    updateQuizTopBar();
    quizOverlay.style.display = 'flex';
    quizOverlay.style.pointerEvents = 'auto';
    setTimeout(() => exitQuiz(), 3000);
    return;
  }

  // 新星球或之前答错的 → 出新题
  const q = generateQuestion();
  if (!q) { quizActive = false; return; }
  transition('SET_QUESTION', { question: q });
  quizQuestion.innerHTML = '';
  if (q.mode === 'A') {
    renderModeA(quizQuestion, q);
    bindModeA(quizQuestion, q, handleAnswer);
  } else {
    renderModeB(quizQuestion, q);
    bindModeB(quizQuestion, q, handleAnswer);
  }
  updateQuizTopBar();
  quizOverlay.style.display = 'flex';
  quizOverlay.style.pointerEvents = 'auto';
}

function showReviewCard(char, pinyin) {
  quizQuestion.innerHTML = `
    <div style="text-align:center;padding:20px;">
      <div style="font-size:4rem;color:#ffd700;font-family:'Microsoft YaHei',sans-serif;text-shadow:0 0 20px rgba(255,215,0,0.5);">${char}</div>
      <div style="font-size:2.5rem;color:#40c4ff;font-family:'Microsoft YaHei',sans-serif;margin-top:8px;">${pinyin}</div>
      <div style="color:rgba(100,255,180,0.7);font-size:1rem;margin-top:12px;">✨ 已点亮 ✨</div>
    </div>
  `;
}

// === Sci-Fi 恭喜提示 ===
function showCongrats(char, pinyin) {
  const el = document.createElement('div');
  el.className = 'congrats-overlay';
  const sentence = getSentence(char);
  el.innerHTML = `
    <div class="congrats-text">恭喜你点亮一颗新的星球</div>
    <div class="congrats-char">${char} <span class="congrats-pinyin">${pinyin}</span></div>
    <div class="congrats-sentence">${sentence}</div>
    <button class="congrats-btn">继续探索 →</button>
  `;
  el.style.pointerEvents = 'auto';
  document.body.appendChild(el);
  // 朗读例句
  setTimeout(() => speakText(sentence), 600);

  el.querySelector('.congrats-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    answerLocked = false;
    quizOverlay.style.display = 'none';
    quizActive = false;
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 500);
    currentPlanet = null;
    targetPosition = null;
    // 启动独立的归位动画，主循环在此期间冻结
    const endPos = preFlyPosition ? preFlyPosition.clone() : new THREE.Vector3(0, 0, 400);
    flyBackAnim = { startPos: camera.position.clone(), endPos, t: 0 };
  });
}

// === Answer Handling ===
let answerLocked = false;

function handleAnswer(isCorrect, selectedEl, correctEl) {
  if (answerLocked) return;
  answerLocked = true;

  const state = getState();
  const idx = currentPlanet.userData.index;

  if (isCorrect) {
    const q = state.currentQuestion;
    playSoundEffect('correct');
    transition('ANSWER_CORRECT');
    if (q?.question?.char) speakText(q.question.char);

    planetStates[idx] = {
      passed: true,
      char: q?.question?.char || '',
      pinyin: q?.question?.pinyin || '',
    };
    savePlanetStates();

    // 星球颜色过渡 + 光晕
    if (currentPlanet && !currentPlanet.userData.activated) {
      currentPlanet.userData.activated = true;
      transitioningPlanets.push({ mesh: currentPlanet, progress: 0 });
      currentPlanet.children.forEach(c => {
        if (c.userData && c.userData.targetColor && c.geometry.type === 'TorusGeometry') {
          c.userData.transitioning = true;
        }
      });
      // 添加光晕球
      addGlowHalo(currentPlanet);
    }

    updateQuizTopBar();
    buildNavBar();
    showCongrats(q.question.char, q.question.pinyin);
    // 等待用户点击继续
  } else {
    playSoundEffect('wrong');
    transition('ANSWER_WRONG');
    if (state.currentQuestion?.question) speakText(`${state.currentQuestion.question.char}，拼音是${state.currentQuestion.question.pinyin}`);

    // 记录状态（未通过，下次出新题）
    planetStates[idx] = { passed: false };

    updateQuizTopBar();

    setTimeout(() => { answerLocked = false; exitQuiz(); }, 2500);
  }
}

function exitQuiz() {
  quizOverlay.style.display = 'none';
  quizActive = false;

  if (currentPlanet) {
    const planetPos = currentPlanet.position.clone();
    const size = currentPlanet.userData.size;
    // 反向：从当前位置飞到星球后方远处（与flyToPlanet相反）
    const camToPlanet = planetPos.clone().sub(camera.position).normalize();
    const backPos = camera.position.clone().addScaledVector(camToPlanet, -size * 20);
    const startPos = camera.position.clone();

    let progress = 0;
    const animId = { id: null };
    const doAnim = () => {
      progress += 0.008;
      if (progress >= 1) {
        cancelAnimationFrame(animId.id);
        targetPosition = null;
        currentPlanet = null;
        return;
      }
      const t = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      camera.position.lerpVectors(startPos, backPos, t);
      camera.lookAt(planetPos);
      animId.id = requestAnimationFrame(doAnim);
    };
    animId.id = requestAnimationFrame(doAnim);
  } else {
    targetPosition = null;
    currentPlanet = null;
  }
}

function updateHUD() {
  const passed = Object.values(planetStates).filter(s => s.passed).length;
  document.getElementById('hud-name').textContent = playerName;
  document.getElementById('hud-lit').textContent = passed;
}

function updateQuizTopBar() { updateHUD(); }

// === Animate ===
const clock = new THREE.Clock();
const velocity = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);

  // 星球颜色过渡
  for (let i = transitioningPlanets.length - 1; i >= 0; i--) {
    const tp = transitioningPlanets[i];
    tp.progress += dt * 0.5;
    if (tp.progress >= 1) {
      tp.mesh.material.color.copy(tp.mesh.userData.targetColor);
      transitioningPlanets.splice(i, 1);
    } else {
      tp.mesh.material.color.copy(GREY_COLOR.clone().lerp(tp.mesh.userData.targetColor, tp.progress));
    }
    // 光环过渡
    tp.mesh.children.forEach(c => {
      if (c.userData && c.userData.transitioning) {
        c.material.color.copy(new THREE.Color(0x666677).lerp(c.userData.targetColor, tp.progress));
        c.material.opacity = 0.15 + (c.userData.targetOpacity - 0.15) * tp.progress;
        if (tp.progress >= 1) c.userData.transitioning = false;
      }
    });
  }

  // 悬停
  if (!quizActive && !targetPosition && !isDragging) {
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(planets, true);
    if (hoveredPlanet) { hoveredPlanet.material.emissiveIntensity = 0; hoveredPlanet = null; }
    renderer.domElement.style.cursor = 'grab';
    for (const hit of hits) {
      let obj = hit.object;
      while (obj) {
        if (obj.userData && typeof obj.userData.index === 'number') break;
        obj = obj.parent;
      }
      if (obj && typeof obj.userData.index === 'number') {
        const idx = obj.userData.index;
        const st = getState();
        if (idx === st.answeredIds.length || idx < st.answeredIds.length) {
          hoveredPlanet = obj;
          obj.material.emissive = new THREE.Color(0xffff00);
          obj.material.emissiveIntensity = 0.4;
          renderer.domElement.style.cursor = 'pointer';
        }
        break;
      }
    }
  } else if (isDragging) renderer.domElement.style.cursor = 'grabbing';

  // 归位动画（独立运行，期间主循环冻结）
  if (flyBackAnim) {
    flyBackAnim.t += dt * 1.2;
    if (flyBackAnim.t >= 1) {
      camera.position.copy(flyBackAnim.endPos);
      // 不重置朝向，从当前位置计算yaw/pitch，保持视角连贯
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      cameraYaw = Math.atan2(fwd.x, fwd.z);
      cameraPitch = -Math.asin(fwd.y);
      velocity.set(0, 0, 0);
      flyBackAnim = null;
      releaseCooldown = 0.5;
    } else {
      const e = 1 - Math.pow(1 - flyBackAnim.t, 3);
      camera.position.lerpVectors(flyBackAnim.startPos, flyBackAnim.endPos, e);
    }
  }
  // 飞向星球
  else if (targetPosition) {
    camera.position.lerp(targetPosition, 0.04);
    if (currentPlanet) camera.lookAt(currentPlanet.position);
    if (camera.position.distanceTo(targetPosition) < 5) {
      targetPosition = null;
      enterQuiz();
    }
  }
  // 冷却中：减速到零
  else if (releaseCooldown > 0) {
    releaseCooldown -= dt;
    if (releaseCooldown <= 0) velocity.set(0, 0, 0);
  }
  // 自由飞行
  else if (!quizActive) {
    const fwd = new THREE.Vector3(0, 0, 1);
    fwd.applyAxisAngle(new THREE.Vector3(1, 0, 0), cameraPitch);
    fwd.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
    velocity.lerp(fwd.clone().multiplyScalar(3), 0.02);
    camera.position.add(velocity.clone().multiplyScalar(dt * 15));
    camera.lookAt(camera.position.clone().add(fwd.clone().multiplyScalar(100)));
  }

  // 自转 + 卫星公转+自转 + 光晕
  const time = clock.elapsedTime;
  planets.forEach(p => {
    p.rotation.y += dt * p.userData.rotSpeed;
    p.children.forEach(c => {
      if (c.isSprite && c.userData.isLabel) { c.quaternion.copy(camera.quaternion); return; }
      if (c.userData && c.userData.isMoon) {
        c.userData.moonAngle += dt * c.userData.moonSpeed;
        c.position.x = Math.cos(c.userData.moonAngle) * c.userData.moonOrbit;
        c.position.z = Math.sin(c.userData.moonAngle) * c.userData.moonOrbit;
        c.rotation.y += dt * 0.5;
      }
      if (c.userData?.isHalo && c.material?.uniforms) {
        c.material.uniforms.uTime.value = time;
      }
    });
  });

  updateEvents(dt);
  renderer.render(scene, camera);
}

// === Nickname + Restart ===
let playerName = '';

function showNicknamePrompt(callback) {
  const mask = document.createElement('div');
  mask.id = 'nickname-mask';
  Object.assign(mask.style, {
    position:'fixed', inset:0, zIndex:200,
    background:'rgba(0,0,0,0.85)',
    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
  });
  const box = document.createElement('div');
  Object.assign(box.style, {
    background:'linear-gradient(135deg, #1a1a4e, #0d0d3d)', padding:'30px 40px', borderRadius:'16px',
    textAlign:'center', border:'2px solid rgba(124,77,255,0.5)',
  });
  box.innerHTML = `
    <div style="font-family:'Microsoft YaHei',sans-serif;font-size:24px;color:#ffd700;margin-bottom:12px;">拼音太空冒险</div>
    <div style="font-family:'Microsoft YaHei',sans-serif;font-size:14px;color:#aaaacc;margin-bottom:20px;">输入你的昵称，开始探索宇宙！</div>
    <input id="nickname-input" placeholder="你的名字" maxlength="10"
      style="width:200px;padding:10px 16px;font-size:18px;font-family:'Microsoft YaHei',sans-serif;
             border-radius:8px;border:2px solid rgba(124,77,255,0.5);background:rgba(255,255,255,0.1);
             color:#fff;text-align:center;outline:none;margin-bottom:16px;" />
    <br/>
    <button id="nickname-go"
      style="padding:10px 40px;font-size:18px;font-family:'Microsoft YaHei',sans-serif;
             background:linear-gradient(135deg,#7c4dff,#448aff);color:#fff;border:none;
             border-radius:24px;cursor:pointer;">出发！</button>
  `;
  mask.appendChild(box);
  document.body.appendChild(mask);

  const input = document.getElementById('nickname-input');
  input.focus();
  const go = (e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    playerName = input.value.trim() || '小小宇航员';
    mask.remove();
    callback();
  };
  document.getElementById('nickname-go').addEventListener('click', go);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
}

// === Random Space Events (流星/飞船/卫星) ===
const events = [];

function spawnMeteor() {
  const startX = (Math.random() - 0.5) * 3000;
  const startY = 500 + Math.random() * 1000;
  const startZ = (Math.random() - 0.5) * 2000;
  const speed = 3 + Math.random() * 6;

  const geo = new THREE.BufferGeometry();
  const pts = [];
  for (let i = 0; i < 30; i++) pts.push(startX + i * speed * 10, startY - i * speed * 8, startZ + i * speed * 5);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const mat = new THREE.PointsMaterial({
    size: 1.5, map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false,
    color: new THREE.Color().setHSL(0.08 + Math.random() * 0.1, 0.8, 0.7 + Math.random() * 0.3),
    transparent: true, opacity: 0.9,
  });
  const meteor = new THREE.Points(geo, mat);
  scene.add(meteor);
  events.push({ mesh: meteor, life: 1.0, decay: 0.008 + Math.random() * 0.01 });
}

function spawnShip() {
  const ship = new THREE.Group();
  // 船体
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(4, 12, 6, 1),
    new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.4, metalness: 0.8 })
  );
  body.rotation.x = Math.PI / 2;
  ship.add(body);
  // 引擎光
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(2.5, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x44aaff })
  );
  glow.position.z = 8;
  ship.add(glow);
  // 机翼
  const wing = new THREE.Mesh(
    new THREE.BoxGeometry(14, 0.5, 3),
    new THREE.MeshStandardMaterial({ color: 0x667788, roughness: 0.3, metalness: 0.7 })
  );
  wing.position.z = -2;
  ship.add(wing);

  ship.position.set((Math.random() - 0.5) * 3000, (Math.random() - 0.5) * 1500, (Math.random() - 0.5) * 2000);
  ship.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
  ship.userData = { velocity: new THREE.Vector3((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 30) };
  scene.add(ship);
  events.push({ mesh: ship, life: 5 + Math.random() * 10, decay: 0.003 });
}

function spawnSatellite() {
  const size = 2 + Math.random() * 4;
  const sat = new THREE.Group();
  sat.add(new THREE.Mesh(new THREE.BoxGeometry(size * 3, size, size), new THREE.MeshStandardMaterial({ color: 0xccccdd, roughness: 0.2, metalness: 0.9 })));
  const panel = new THREE.Mesh(new THREE.BoxGeometry(size * 5, 0.2, size * 2), new THREE.MeshStandardMaterial({ color: 0x3344aa, roughness: 0.1, metalness: 0.5 }));
  sat.add(panel);
  // 天线
  sat.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, size * 2, 6), new THREE.MeshStandardMaterial({ color: 0x888888 })));

  const orbitRadius = 80 + Math.random() * 200;
  const orbitSpeed = 0.3 + Math.random() * 1;
  const center = new THREE.Vector3((Math.random() - 0.5) * 2000, (Math.random() - 0.5) * 1000, (Math.random() - 0.5) * 1500);
  sat.position.copy(center).add(new THREE.Vector3(orbitRadius, 0, 0));
  sat.userData = { center, orbitRadius, orbitSpeed, orbitAngle: Math.random() * Math.PI * 2 };
  scene.add(sat);
  events.push({ mesh: sat, life: 15 + Math.random() * 30, decay: 0.001 });
}

// 定时触发
let eventTimer = 0;
function updateEvents(dt) {
  eventTimer += dt;
  if (eventTimer > 2 + Math.random() * 5) {
    eventTimer = 0;
    if (Math.random() < 0.1) {
      const r = Math.random();
      if (r < 0.4) spawnMeteor();
      else if (r < 0.7) spawnShip();
      else spawnSatellite();
    }
  }

  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    ev.life -= ev.decay;
    if (ev.life <= 0) {
      scene.remove(ev.mesh);
      events.splice(i, 1);
      continue;
    }
    ev.mesh.material?.opacity !== undefined && (ev.mesh.material.opacity = ev.life);
    if (ev.mesh.userData.velocity) {
      ev.mesh.position.add(ev.mesh.userData.velocity.clone().multiplyScalar(dt));
    }
    if (ev.mesh.userData.center) {
      const ud = ev.mesh.userData;
      ud.orbitAngle += dt * ud.orbitSpeed;
      ev.mesh.position.x = ud.center.x + Math.cos(ud.orbitAngle) * ud.orbitRadius;
      ev.mesh.position.z = ud.center.z + Math.sin(ud.orbitAngle) * ud.orbitRadius;
      ev.mesh.position.y = ud.center.y + Math.sin(ud.orbitAngle * 0.7) * ud.orbitRadius * 0.5;
    }
  }
}

// === Init ===
initAudio();

showNicknamePrompt(() => {
  transition('IMAGES_LOADED');
  transition('START_GAME');
  buildNavBar();
  updateHUD();
  animate();
  setTimeout(() => { clickBlocked = false; }, 500);
});

document.getElementById('hud-restart').addEventListener('click', () => {
  localStorage.removeItem(LS_KEY);
  location.reload();
});

document.getElementById('hud-home').addEventListener('click', () => {
  targetPosition = null;
  camera.position.set(0, 0, 400);
  cameraYaw = 0;
  cameraPitch = 0;
  velocity.set(0, 0, 0);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
