/**
 * 排行榜 — localStorage 持久化，支持玩家名称
 */
const STORAGE_KEY = 'motion_runner_scores';
const NAME_KEY = 'motion_runner_name';
const MAX_ENTRIES = 10;

interface Entry { name: string; score: number; date: string }

export class Leaderboard {
  private scores: Entry[];
  private listEl!: HTMLElement;
  private nameInput!: HTMLInputElement;
  playerName = '';

  constructor() {
    this.scores = this.load();
    this.playerName = localStorage.getItem(NAME_KEY) || '';
  }

  /** 注入 DOM 并渲染 */
  mount(parent: HTMLElement) {
    parent.insertAdjacentHTML('beforeend', `
      <div id="leaderboard-panel">
        <div id="lb-header">🏆 排行榜 <button id="lb-clear-btn">清空</button></div>
        <ol id="lb-list"></ol>
      </div>
    `);
    this.listEl = document.getElementById('lb-list')!;
    document.getElementById('lb-clear-btn')!.addEventListener('click', () => this.clear());
    this.render();
  }

  /** 绑定外部昵称输入框 */
  bindNameInput(input: HTMLInputElement) {
    this.nameInput = input;
    input.value = this.playerName;
    input.addEventListener('input', () => {
      this.playerName = input.value.trim() || '无名';
      localStorage.setItem(NAME_KEY, this.playerName);
    });
  }

  /** 提交分数，返回排名（1-based），未上榜返回 0 */
  submit(score: number): number {
    if (score <= 0) return 0;
    const name = this.playerName || '无名';
    const now = new Date();
    const date = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    const entry: Entry = { name, score, date };
    this.scores.push(entry);
    this.scores.sort((a, b) => b.score - a.score);
    this.scores.splice(MAX_ENTRIES);
    this.save();
    this.render();
    return this.scores.findIndex(e => e === entry) + 1 || 0;
  }

  private render() {
    if (!this.listEl) return;
    this.listEl.innerHTML = this.scores.length === 0
      ? '<li class="lb-empty">暂无记录</li>'
      : this.scores.map((e, i) => {
          const cls = i < 3 ? `lb-rank-${i + 1}` : '';
          return `<li class="${cls}"><span class="lb-num">${i + 1}.</span> <span class="lb-name">${esc(e.name)}</span> <span class="lb-score">${e.score}<span class="lb-unit">m</span></span> <span class="lb-date">${e.date}</span></li>`;
        }).join('');
  }

  private load(): Entry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  clear() {
    this.scores = [];
    this.save();
    this.render();
  }

  private save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.scores));
  }
}

function esc(s: string) { return s.replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'})[c] || c); }

