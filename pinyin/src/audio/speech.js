// 预生成音频播放模块
let audioCtx = null;
let manifest = null;
let currentAudio = null;

// 播放指定路径的音频
export function playAudioFile(url) {
  if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; }
  const audio = new Audio(url);
  audio.preload = 'auto';
  currentAudio = audio;
  audio.play().catch(() => {});
  audio.addEventListener('ended', () => { currentAudio = null; });
}

// 初始化：加载 manifest
export async function initAudio() {
  try {
    const res = await fetch('/audio/manifest.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    manifest = await res.json();
  } catch (e) {
    console.warn('Audio manifest unavailable, speech disabled:', e.message);
    manifest = null;
  }
}

function playUrl(url) {
  if (!url) return;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  const audio = new Audio(url);
  audio.preload = 'auto';
  currentAudio = audio;
  audio.play().catch(() => {});
  audio.addEventListener('ended', () => { currentAudio = null; });
}

// 朗读汉字
export function speakText(text) {
  if (!manifest) return;
  // 单汉字
  if (text.length === 1 && /[一-鿿]/.test(text)) {
    return playUrl(manifest.chars?.[text]);
  }
  // 错误句 "X，拼音是Y"
  const m = text.match(/^([一-鿿])[，,]\s*拼音是\s*(.+)$/);
  if (m) {
    const char = m[1];
    if (manifest.sentences?.[char]) return playUrl(manifest.sentences[char]);
    return playUrl(manifest.chars?.[char]);
  }
  // 例句
  if (manifest.examples?.[text]) return playUrl(manifest.examples[text]);
  // 其他：尝试逐字朗读第一个汉字
  const firstChar = text.match(/[一-鿿]/);
  if (firstChar) return playUrl(manifest.chars?.[firstChar[0]]);
}

// 朗读拼音
export function speakPinyin(pinyin) {
  if (!manifest) return;
  playUrl(manifest.pinyins?.[pinyin]);
}

// 声母呼读
export function speakInitial(initial) {
  if (!manifest) return;
  playUrl(manifest.initials?.[initial]);
}

// 韵母呼读
export function speakFinal(final) {
  if (!manifest) return;
  const key = final === 'v' ? 'v' : final === 'üe' ? 'üe' : final;
  playUrl(manifest.finals?.[key]);
}

// 音效（保留 AudioContext 合成）
function getAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

export function playSoundEffect(type) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const g = ctx.createGain(); g.connect(ctx.destination);
    switch (type) {
      case 'click': { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(800, now); o.frequency.exponentialRampToValueAtTime(400, now + .08); g.gain.setValueAtTime(.15, now); g.gain.exponentialRampToValueAtTime(.001, now + .08); o.connect(g); o.start(now); o.stop(now + .08); break; }
      case 'correct': { [523, 659, 784].forEach((f, i) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; const gg = ctx.createGain(); gg.gain.setValueAtTime(.12, now + i * .1); gg.gain.exponentialRampToValueAtTime(.001, now + i * .1 + .15); gg.connect(ctx.destination); o.connect(gg); o.start(now + i * .1); o.stop(now + i * .1 + .15); }); break; }
      case 'wrong': { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(440, now); o.frequency.exponentialRampToValueAtTime(330, now + .25); g.gain.setValueAtTime(.1, now); g.gain.exponentialRampToValueAtTime(.001, now + .25); o.connect(g); o.start(now); o.stop(now + .25); break; }
      case 'firework': { for (let i = 0; i < 6; i++) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 600 + Math.random() * 1200; const gg = ctx.createGain(); const t = now + Math.random() * .3; gg.gain.setValueAtTime(.06, t); gg.gain.exponentialRampToValueAtTime(.001, t + .2 + Math.random() * .3); gg.connect(ctx.destination); o.connect(gg); o.start(t); o.stop(t + .4); } break; }
      case 'start': { [392, 523, 659].forEach((f, i) => { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; const gg = ctx.createGain(); gg.gain.setValueAtTime(.15, now + i * .15); gg.gain.exponentialRampToValueAtTime(.001, now + i * .15 + .2); gg.connect(ctx.destination); o.connect(gg); o.start(now + i * .15); o.stop(now + i * .15 + .2); }); break; }
    }
  } catch {}
}
