
// ── State ──
let rowId = 0;
let scheme = loadScheme();
let history = loadHistory();

const DEFAULT_SCHEME = [
  { min: 90, grade: 'A+', pts: 4.0 },
  { min: 85, grade: 'A',  pts: 3.7 },
  { min: 80, grade: 'B+', pts: 3.3 },
  { min: 75, grade: 'B',  pts: 3.0 },
  { min: 70, grade: 'C+', pts: 2.7 },
  { min: 65, grade: 'C',  pts: 2.3 },
  { min: 60, grade: 'D+', pts: 2.0 },
  { min: 50, grade: 'D',  pts: 1.0 },
  { min: 0,  grade: 'F',  pts: 0.0 },
];

function loadScheme() {
  try { return JSON.parse(localStorage.getItem('gpa_scheme')) || null; } catch(e) { return null; }
}
function saveSchemeData(s) { localStorage.setItem('gpa_scheme', JSON.stringify(s)); }
function loadHistory() {
  try { return JSON.parse(localStorage.getItem('gpa_history')) || []; } catch(e) { return []; }
}
function saveHistoryData(h) { localStorage.setItem('gpa_history', JSON.stringify(h)); }

// ── Theme ──
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('gpa_theme', t);
  const icon = document.getElementById('theme-icon');
  const label = document.getElementById('theme-label');
  if (t === 'dark') {
    icon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
    label.textContent = 'Light mode';
  } else {
    icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    label.textContent = 'Dark mode';
  }
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  applyTheme(cur === 'dark' ? 'light' : 'dark');
}

// ── Sidebar ──
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

// ── Navigation ──
const pageTitles = {
  calculator: 'Current semester',
  history: 'History',
  grading: 'Grading scheme',
  about: 'About',
};
function goPage(id, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  el.classList.add('active');
  document.getElementById('topbar-title').textContent = pageTitles[id];
  closeSidebar();
  if (id === 'grading') renderSchemeEditor();
  if (id === 'history') renderHistory();
}

// ── Toast ──
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ── Grade lookup ──
function getGrade(marks) {
  const s = scheme || DEFAULT_SCHEME;
  const sorted = [...s].sort((a, b) => b.min - a.min);
  for (const r of sorted) {
    if (marks >= r.min) return r;
  }
  return { grade: 'F', pts: 0 };
}

function pillClass(g) {
  if (!g || g === '—') return 'pn';
  if (g === 'F') return 'pf';
  if (g.startsWith('C') || g.startsWith('D')) return 'po';
  return 'pg';
}

// ── Calculator rows ──
function addRow() {
  const id = 'r' + (rowId++);
  const tr = document.createElement('tr');
  tr.id = id;
  tr.innerHTML = `
    <td><input placeholder="e.g. Calculus" aria-label="Subject name"></td>
    <td><input type="number" class="cr" min="0" placeholder="3" aria-label="Credit hours"></td>
    <td><input type="number" class="mk" min="0" max="100" placeholder="75" aria-label="Marks"></td>
    <td class="tc"><span class="pill pn" id="g_${id}">—</span></td>
    <td class="tc pts" id="p_${id}">—</td>
    <td class="tc"><button class="rm-btn" onclick="document.getElementById('${id}').remove()" aria-label="Remove row">&#x2715;</button></td>
  `;
  document.getElementById('tbody').appendChild(tr);
}

function calculate() {
  const rows = document.querySelectorAll('#tbody tr');
  let tc = 0, tp = 0, any = false;

  rows.forEach(row => {
    const c = parseFloat(row.querySelector('.cr').value) || 0;
    const m = parseFloat(row.querySelector('.mk').value);
    const id = row.id;
    if (c > 0 && !isNaN(m) && m >= 0) {
      any = true;
      const r = getGrade(m);
      const b = document.getElementById('g_' + id);
      b.textContent = r.grade;
      b.className = 'pill ' + pillClass(r.grade);
      document.getElementById('p_' + id).textContent = r.pts.toFixed(2);
      tc += c; tp += c * r.pts;
    }
  });

  if (!any) { toast('Add at least one subject with credits and marks.'); return; }

  const sg = tc ? tp / tc : 0;
  const prev = parseFloat(document.getElementById('prevCGPA').value);
  const pastC = parseFloat(document.getElementById('pastCredits').value);

  let cg;
  if (!isNaN(prev) && prev > 0 && !isNaN(pastC) && pastC > 0) {
    cg = (prev * pastC + tp) / (pastC + tc);
  } else if (!isNaN(prev) && prev > 0) {
    cg = (sg + prev) / 2;
  } else {
    cg = sg;
  }

  document.getElementById('rC').textContent = tc;
  document.getElementById('rG').textContent = sg.toFixed(2);
  document.getElementById('rP').textContent = cg.toFixed(2);
}

function resetAll() {
  if (!confirm('Reset all subjects?')) return;
  document.getElementById('tbody').innerHTML = '';
  document.getElementById('prevCGPA').value = '';
  document.getElementById('pastCredits').value = '';
  document.getElementById('rC').textContent = '—';
  document.getElementById('rG').textContent = '—';
  document.getElementById('rP').textContent = '—';
  rowId = 0;
  addRow(); addRow(); addRow();
}

// ── History ──
function saveToHistory() {
  const gpa = document.getElementById('rG').textContent;
  const cgpa = document.getElementById('rP').textContent;
  const credits = document.getElementById('rC').textContent;
  if (gpa === '—') { toast('Calculate first before saving.'); return; }

  const rows = [];
  document.querySelectorAll('#tbody tr').forEach(row => {
    const name = row.querySelector('td input').value || 'Subject';
    const c = row.querySelector('.cr').value;
    const m = row.querySelector('.mk').value;
    const g = document.getElementById('g_' + row.id).textContent;
    if (c && m) rows.push({ name, credits: c, marks: m, grade: g });
  });

  const entry = {
    id: Date.now(),
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    gpa, cgpa, credits,
    label: 'Semester ' + (history.length + 1),
    subjects: rows,
  };
  history.unshift(entry);
  saveHistoryData(history);
  toast('Saved to history.');
}

function renderHistory() {
  const el = document.getElementById('history-list');
  if (!history.length) {
    el.innerHTML = '<div class="history-empty">No saved semesters yet.<br>Calculate and save your results.</div>';
    return;
  }
  el.innerHTML = history.map(h => `
    <div class="history-item">
      <div>
        <div style="font-weight:600;font-size:14px;color:var(--text)">${h.label}</div>
        <div class="hi-meta">${h.date} &nbsp;·&nbsp; ${h.credits} credits &nbsp;·&nbsp; ${h.subjects.length} subjects</div>
        <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:5px">
          ${h.subjects.map(s => `<span class="pill ${pillClass(s.grade)}" style="font-size:11px">${s.name} · ${s.grade}</span>`).join('')}
        </div>
      </div>
      <div class="hi-scores">
        <div class="hi-score">
          <div class="hs-v">${h.gpa}</div>
          <div class="hs-l">GPA</div>
        </div>
        <div class="hi-score">
          <div class="hs-v">${h.cgpa}</div>
          <div class="hs-l">CGPA</div>
        </div>
        <button class="rm-btn" onclick="deleteHistory(${h.id})" aria-label="Delete">&#x2715;</button>
      </div>
    </div>
  `).join('');
}

function deleteHistory(id) {
  history = history.filter(h => h.id !== id);
  saveHistoryData(history);
  renderHistory();
}

function clearHistory() {
  if (!history.length) return;
  if (!confirm('Delete all history?')) return;
  history = [];
  saveHistoryData(history);
  renderHistory();
  toast('History cleared.');
}

// ── Grading scheme ──
function renderSchemeEditor() {
  const s = scheme || DEFAULT_SCHEME;
  const el = document.getElementById('scheme-rows');
  el.innerHTML = s.map((r, i) => `
    <div class="scheme-row" id="sr_${i}">
      <input type="number" value="${r.min}" min="0" max="100" placeholder="Min %" onchange="updateSchemeRow(${i},'min',this.value)" aria-label="Minimum marks">
      <input type="text" value="${r.grade}" placeholder="Grade" maxlength="4" onchange="updateSchemeRow(${i},'grade',this.value)" aria-label="Grade letter">
      <input type="number" value="${r.pts}" min="0" max="4" step="0.1" placeholder="GPA" onchange="updateSchemeRow(${i},'pts',this.value)" aria-label="GPA points">
      <button class="rm-s" onclick="removeSchemeRow(${i})" aria-label="Remove grade">&#x2715;</button>
    </div>
  `).join('');
}

function updateSchemeRow(i, key, val) {
  const s = scheme || [...DEFAULT_SCHEME];
  if (!scheme) scheme = s;
  if (key === 'min' || key === 'pts') scheme[i][key] = parseFloat(val) || 0;
  else scheme[i][key] = val;
}

function addSchemeRow() {
  if (!scheme) scheme = [...DEFAULT_SCHEME];
  scheme.push({ min: 0, grade: 'X', pts: 0.0 });
  renderSchemeEditor();
}

function removeSchemeRow(i) {
  if (!scheme) scheme = [...DEFAULT_SCHEME];
  if (scheme.length <= 1) { toast('Need at least one grade.'); return; }
  scheme.splice(i, 1);
  renderSchemeEditor();
}

function saveScheme() {
  if (!scheme) scheme = [...DEFAULT_SCHEME];
  scheme.sort((a, b) => b.min - a.min);
  saveSchemeData(scheme);
  renderSchemeEditor();
  toast('Grading scheme saved.');
}

function resetScheme() {
  if (!confirm('Reset to default grading scheme?')) return;
  scheme = [...DEFAULT_SCHEME];
  saveSchemeData(scheme);
  renderSchemeEditor();
  toast('Reset to default scheme.');
}

// ── Init ──
(function init() {
  const saved = localStorage.getItem('gpa_theme') || 'light';
  applyTheme(saved);

  const now = new Date();
  document.getElementById('topbar-date').textContent =
    now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  addRow(); addRow(); addRow();
})();
