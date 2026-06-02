// 出题引擎：随机选题 + 音系分组混淆项生成
import { LIBRARY, getAllInitials, getAllFinals, getRandomDistractors } from '../data/pinyin-library.js';
import { getState } from './game-state.js';

// 随机决定模式 A 或 B
function randomMode() {
  return Math.random() < 0.5 ? 'A' : 'B';
}

// 从题库随机抽取未答过的题目
function pickQuestion(answeredIds) {
  const available = LIBRARY.filter(q => !answeredIds.includes(q.id));
  if (available.length === 0) return null;
  const idx = Math.floor(Math.random() * available.length);
  return available[idx];
}

// 生成玩法A题目：看字选拼音
function generateModeA(question) {
  const { char, initial, final, tone } = question;

  const initialDistractors = getRandomDistractors(question, 'initial', 3, initial);
  const finalDistractors = getRandomDistractors(question, 'final', 3, final);
  const toneDistractors = getRandomDistractors(question, 'tone', 3, tone);

  // 每行选项 = 正确答案 + 混淆项，打乱顺序
  const initials = shuffle([initial, ...initialDistractors]);
  const finals = shuffle([final, ...finalDistractors]);
  const tones = shuffle([tone, ...toneDistractors]);

  return {
    mode: 'A',
    char,
    correct: { initial, final, tone },
    rows: [
      { type: 'initial', label: '声母', options: initials },
      { type: 'final',   label: '韵母', options: finals },
      { type: 'tone',    label: '声调', options: tones },
    ],
    question,
  };
}

// 生成玩法B题目：看声母/韵母选字
function generateModeB(question) {
  const showType = Math.random() < 0.5 ? 'initial' : 'final';
  const prompt = showType === 'initial' ? question.initial : question.final;
  const promptField = showType; // 'initial' or 'final'

  // 混淆项：必须不同声母/韵母
  let distractors = getRandomDistractors(question, 'char', 6); // 多取几个供筛选
  distractors = distractors
    .filter(d => d[promptField] !== question[promptField])
    .slice(0, 3);

  // 如果不够3个，放宽到不同难度级别
  if (distractors.length < 3) {
    distractors = getRandomDistractors(question, 'char', 10)
      .filter(d => d[promptField] !== question[promptField])
      .slice(0, 3);
  }

  const options = shuffle([question, ...distractors]);

  return {
    mode: 'B',
    prompt,
    promptType: showType,
    promptField,
    promptValue: question[promptField],
    options,
    question,
  };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 主入口：生成一道题目
export function generateQuestion() {
  const st = getState();
  const question = pickQuestion(st.answeredIds);
  if (!question) return null; // 全部答完

  const mode = randomMode();
  if (mode === 'A') {
    return generateModeA(question);
  }
  return generateModeB(question);
}
