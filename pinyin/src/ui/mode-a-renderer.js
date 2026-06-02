// 玩法A：看字选拼音 — 3行×4选项，第三行点击自动验证
import { speakText, speakInitial, speakFinal, playAudioFile } from '../audio/speech.js';
import { getState } from '../core/game-state.js';
import { playSoundEffect } from '../audio/speech.js';

const TONE_MARKS = { 1: 'ˉ', 2: 'ˊ', 3: 'ˇ', 4: 'ˋ' };

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

export function renderModeA(container, question) {
  const { char, rows } = question;

  const wrap = document.createElement('div');
  wrap.className = 'mode-a-container';

  // 汉字区 + 喇叭
  const hanziRow = document.createElement('div');
  hanziRow.className = 'hanzi-row';
  const hanziEl = document.createElement('span');
  hanziEl.className = 'hanzi-display';
  hanziEl.textContent = char;
  const hanziSpeaker = speakerBtn(char, () => speakText(char));
  hanziRow.appendChild(hanziEl);
  hanziRow.appendChild(hanziSpeaker);
  wrap.appendChild(hanziRow);

  // 选择行
  const rowsEl = document.createElement('div');
  rowsEl.className = 'selection-rows';
  rows.forEach((row, ri) => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'selection-row';
    rowDiv.dataset.row = ri;

    const label = document.createElement('div');
    label.className = 'row-label';
    const icon = document.createElement('span');
    icon.className = 'row-label-icon';
    icon.textContent = {initial:'🎤', final:'👄', tone:'🔢'}[row.type];
    const labelText = document.createElement('span');
    labelText.textContent = row.label;
    label.appendChild(icon);
    label.appendChild(labelText);
    rowDiv.appendChild(label);

    const optsEl = document.createElement('div');
    optsEl.className = 'row-options';
    row.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.dataset.row = ri;
      btn.dataset.value = opt;
      btn.dataset.type = row.type;
      if (row.type === 'tone') {
        btn.textContent = `${opt} ${TONE_MARKS[opt]}`;
      } else {
        btn.textContent = opt;
      }
      optsEl.appendChild(btn);
    });
    rowDiv.appendChild(optsEl);
    rowsEl.appendChild(rowDiv);
  });
  wrap.appendChild(rowsEl);
  container.appendChild(wrap);
}

export function bindModeA(container, question, onAnswer) {
  const { correct, rows } = question;
  const correctVals = { initial: correct.initial, final: correct.final, tone: correct.tone };
  let selections = { initial: null, final: null, tone: null };
  let validated = false;

  container.addEventListener('click', (e) => {
    if (validated) return;

    const btn = e.target.closest('.option-btn');
    if (!btn) return;

    const row = parseInt(btn.dataset.row);
    const type = btn.dataset.type;
    const val = type === 'tone' ? parseInt(btn.dataset.value) : btn.dataset.value;

    // 更新选中状态
    const rowBtns = container.querySelectorAll(`.option-btn[data-row="${row}"]`);
    rowBtns.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    selections[type] = val;

    // 点击声母/韵母选项时自动朗读
    if (type === 'initial') speakInitial(val);
    else if (type === 'final') speakFinal(val);

    if (type === 'tone') {
      validated = true;
      checkAnswer();
    }
  });

  function checkAnswer() {
    const st = getState();
    const q = st.currentQuestion;

    let allCorrect = true;
    let firstWrongEl = null;

    ['initial', 'final', 'tone'].forEach(type => {
      const correctVal = correctVals[type];
      const selectedVal = selections[type];
      const typeBtns = container.querySelectorAll(`.option-btn[data-type="${type}"]`);

      if (selectedVal === correctVal) {
        typeBtns.forEach(b => {
          if (String(b.dataset.value) === String(correctVal)) {
            b.classList.add('correct-highlight');
          }
        });
      } else {
        allCorrect = false;
        typeBtns.forEach(b => {
          if (String(b.dataset.value) === String(selectedVal)) {
            b.classList.add('wrong-highlight');
            if (!firstWrongEl) firstWrongEl = b;
          }
          if (String(b.dataset.value) === String(correctVal)) {
            b.classList.add('correct-highlight');
          }
        });
      }
    });

    if (allCorrect) {
      const firstBtn = container.querySelector('.option-btn.selected');
      onAnswer(true, firstBtn || container.querySelector('.hanzi-display'), null);
      speakText(q.question.char);
    } else {
      const correctEl = container.querySelector('.option-btn.correct-highlight');
      onAnswer(false, firstWrongEl, correctEl);
      speakText(`${q.question.char}，拼音是${q.question.pinyin}`);
    }

    container.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
  }
}
