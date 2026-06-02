// 玩法B：看声母/韵母选字 — 4卡片，点击即提交
import { speakText, speakInitial, speakFinal } from '../audio/speech.js';
import { playSoundEffect } from '../audio/speech.js';

function speakerBtn(label, onClick) {
  const btn = document.createElement('span');
  btn.className = 'speaker-btn';
  btn.textContent = '🔊';
  btn.title = `听${label}发音`;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    playSoundEffect('click');
    onClick();
  });
  return btn;
}

export function renderModeB(container, question) {
  const { prompt, promptType, options } = question;

  const wrap = document.createElement('div');
  wrap.className = 'mode-b-container';

  // 声母/韵母展示 + 喇叭
  const promptRow = document.createElement('div');
  promptRow.className = 'prompt-display';
  const promptLabel = document.createElement('span');
  promptLabel.textContent = `${promptType === 'initial' ? '声母' : '韵母'}：`;
  const promptStrong = document.createElement('strong');
  promptStrong.textContent = prompt;
  promptRow.appendChild(promptLabel);
  promptRow.appendChild(promptStrong);
  const promptSpeaker = speakerBtn(prompt, () => {
    if (promptType === 'initial') speakInitial(prompt);
    else speakFinal(prompt);
  });
  promptRow.appendChild(promptSpeaker);
  wrap.appendChild(promptRow);

  // 卡片选项
  const cardsEl = document.createElement('div');
  cardsEl.className = 'char-options';
  options.forEach((opt, i) => {
    const card = document.createElement('div');
    card.className = 'char-card';
    card.dataset.id = opt.id;
    card.dataset.index = i;

    const hanzi = document.createElement('span');
    hanzi.className = 'card-hanzi';
    hanzi.textContent = opt.char;

    const pinyin = document.createElement('span');
    pinyin.className = 'card-pinyin';
    pinyin.textContent = opt.pinyin;

    // 每张卡片上的喇叭
    const cardSpeaker = speakerBtn(opt.char, () => speakText(opt.char));

    card.appendChild(hanzi);
    card.appendChild(pinyin);
    card.appendChild(cardSpeaker);
    cardsEl.appendChild(card);
  });
  wrap.appendChild(cardsEl);
  container.appendChild(wrap);
}

export function bindModeB(container, question, onAnswer) {
  const { promptField, promptValue, options } = question;
  let answered = false;

  container.addEventListener('click', (e) => {
    if (answered) return;

    const card = e.target.closest('.char-card');
    if (!card) return;

    answered = true;
    const selectedId = card.dataset.id;
    const selectedOpt = options.find(o => o.id === selectedId);
    const isCorrect = selectedOpt && selectedOpt[promptField] === promptValue;

    // 标记所有卡片
    const cards = container.querySelectorAll('.char-card');
    cards.forEach(c => {
      const opt = options.find(o => o.id === c.dataset.id);
      if (opt && opt[promptField] === promptValue) {
        c.classList.add('correct-highlight');
      }
    });

    if (!isCorrect) {
      card.classList.add('wrong-highlight');
    }

    const correctCard = container.querySelector('.char-card.correct-highlight');
    onAnswer(isCorrect, card, correctCard || card);

    // 朗读
    const st = getState();
    const q = st.currentQuestion;
    if (isCorrect) {
      speakText(selectedOpt.char);
    } else {
      const correctOpt = options.find(o => o[promptField] === promptValue && o.id !== selectedId) || options.find(o => o[promptField] === promptValue);
      if (correctOpt) speakText(`${correctOpt.char}，拼音是${correctOpt.pinyin}`);
    }

    cards.forEach(c => c.style.pointerEvents = 'none');
  });
}
