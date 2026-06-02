// 游戏状态机
// LOADING → START → PLAYING → LEVEL_COMPLETE → CELEBRATION → PLAYING
//                               → GAME_OVER → RESULT
//                               → VICTORY → RESULT

import { LIBRARY } from '../data/pinyin-library.js';

const INITIAL_STATE = {
  screen: 'loading',
  level: 0,
  score: 0,
  lives: 3,
  maxLives: 5,
  combo: 0,
  levelsTotal: LIBRARY.length,
  answeredIds: [],
  currentQuestion: null,
};

let state = { ...INITIAL_STATE };

const listeners = [];

export function getState() {
  return { ...state };
}

export function subscribe(fn) {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

function notify() {
  listeners.forEach(fn => fn(getState()));
}

export function transition(action, payload = {}) {
  const prev = state.screen;

  switch (action) {
    case 'IMAGES_LOADED':
      if (state.screen === 'loading') {
        state.screen = 'start';
      }
      break;

    case 'START_GAME':
      if (state.screen === 'start') {
        Object.assign(state, { ...INITIAL_STATE, screen: 'playing' });
      }
      break;

    case 'SET_QUESTION':
      state.currentQuestion = payload.question;
      // 不触发通知，避免死循环（loadQuestion 会反复调用自己）
      return getState();

    case 'ANSWER_CORRECT':
      state.score += 10 * Math.max(1, state.combo);
      state.combo += 1;
      state.answeredIds.push(state.currentQuestion.id);
      state.screen = 'level_complete';
      break;

    case 'ANSWER_WRONG':
      state.combo = 0;
      state.lives -= 1;
      return getState(); // 不触发通知，由外部 setTimeout 控制流程

    case 'LEVEL_COMPLETE_DONE':
      // 检查是否通关
      if (state.answeredIds.length >= state.levelsTotal) {
        state.screen = 'victory';
      } else if (state.level > 0 && state.level % 10 === 0) {
        // 每10关庆祝
        if (state.lives < state.maxLives) state.lives += 1;
        state.screen = 'celebration';
      } else {
        state.level += 1;
        state.screen = 'playing';
      }
      break;

    case 'CELEBRATION_DONE':
      state.level += 1;
      state.screen = 'playing';
      break;

    case 'GAME_OVER':
      state.screen = 'result';
      break;

    case 'RESTART':
      state = { ...INITIAL_STATE, screen: 'start' };
      break;
  }

  notify();
  return getState();
}
