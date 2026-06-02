// 分数/连击/生命值管理
import { getState } from './game-state.js';

export function getScoreInfo() {
  const { score, combo, lives, level, levelsTotal } = getState();
  return { score, combo, lives, level, levelsTotal };
}

export function getComboMultiplier(combo) {
  if (combo >= 10) return 3;
  if (combo >= 5) return 2;
  return 1;
}
