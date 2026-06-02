// AI图片清单 — 供 preloader 和游戏引用
export const IMAGES = {
  bgStart:    '/images/bg-start.png',
  bgGame:     '/images/bg-game.png',
  bgResult:   '/images/bg-result.png',
  astronaut:  '/images/astronaut.png',
  btnStart:   '/images/btn-start.png',
  btnReplay:  '/images/btn-replay.png',
  starFilled: '/images/star-filled.png',
  starEmpty:  '/images/star-empty.png',
  cardHanziBg:'/images/card-hanzi-bg.png',
  cardOptBg:  '/images/card-option-bg.png',
};

export function getPlanetImage(index) {
  const n = (index % 20) + 1;
  const padded = String(n).padStart(2, '0');
  return `/images/planet-${padded}.png`;
}

export function getFireworkImage(index) {
  const n = (index % 8) + 1;
  const padded = String(n).padStart(2, '0');
  return `/images/firework-${padded}.png`;
}

// 全部图片URL（预加载用）
export function getAllImageUrls() {
  const urls = Object.values(IMAGES);
  for (let i = 0; i < 20; i++) urls.push(getPlanetImage(i));
  for (let i = 0; i < 8; i++) urls.push(getFireworkImage(i));
  return urls;
}
