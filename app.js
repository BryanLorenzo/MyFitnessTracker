/* ============================================================
   FitTracker — app.js
   State management, routing, Chart.js, all CRUD operations
============================================================ */

// ─── AUTH ───────────────────────────────────────────────────
const AUTH_KEY = 'ft_accounts';   // { email -> hashedPw }
const SESSION_KEY = 'ft_session';   // { email, remember }

function hashPw(pw) {
  // Simple non-cryptographic hash (app is fully local)
  let h = 0;
  for (let i = 0; i < pw.length; i++) {
    h = (Math.imul(31, h) + pw.charCodeAt(i)) | 0;
  }
  return h.toString(16);
}

function getAccounts() {
  return JSON.parse(localStorage.getItem(AUTH_KEY)) || {};
}

function saveAccounts(accounts) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(accounts));
}

function getCurrentUser() {
  const s = JSON.parse(localStorage.getItem(SESSION_KEY));
  return s ? s.email : null;
}

function userDataKey(email, type) {
  // Isolate each user's data
  const safeEmail = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `ft_${safeEmail}_${type}`;
}

function showLoginError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.add('visible');
}

function clearLoginErrors() {
  document.querySelectorAll('.login-error').forEach(e => {
    e.textContent = '';
    e.classList.remove('visible');
  });
}

function doLogin(email, remember) {
  const overlay = document.getElementById('loginOverlay');
  overlay.classList.add('hidden');

  if (remember) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email, remember: true }));
  } else {
    sessionStorage.setItem('ft_session_temp', email);
    localStorage.removeItem(SESSION_KEY);
  }

  loadUserState(email);
  updateSidebarUser(email);
  renderDashboard();
}

function doLogout() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem('ft_session_temp');
  // Reset in-memory state
  state.weights = [];
  state.mealPlans = [];
  state.workouts = [];
  state.wplans = [];
  document.getElementById('loginOverlay').classList.remove('hidden');
  document.getElementById('login-form').reset();
  document.getElementById('register-form').reset();
  clearLoginErrors();
  showLoginPanel();
}

function loadUserState(email) {
  state.weights = JSON.parse(localStorage.getItem(userDataKey(email, 'weights'))) || [];
  state.mealPlans = JSON.parse(localStorage.getItem(userDataKey(email, 'meals'))) || [];
  state.workouts = JSON.parse(localStorage.getItem(userDataKey(email, 'workouts'))) || [];
  state.wplans = JSON.parse(localStorage.getItem(userDataKey(email, 'wplans'))) || [];
}

function updateSidebarUser(email) {
  const el = document.getElementById('sidebar-user');
  if (el) el.textContent = '👤 ' + email;
}

function showLoginPanel() {
  document.getElementById('login-form').style.display = '';
  document.getElementById('register-form').style.display = 'none';
  document.querySelector('.login-title').textContent = 'Accedi al tuo account';
  document.querySelector('.login-subtitle').textContent = 'Inserisci le tue credenziali per continuare';
}

function showRegisterPanel() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('register-form').style.display = '';
  document.querySelector('.login-title').textContent = 'Crea il tuo account';
  document.querySelector('.login-subtitle').textContent = 'Registrati gratuitamente per iniziare';
}

// Login form submit
document.getElementById('login-form').addEventListener('submit', function (e) {
  e.preventDefault();
  clearLoginErrors();
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const pw = document.getElementById('login-password').value;
  const remember = document.getElementById('login-remember').checked;

  const accounts = getAccounts();
  if (!accounts[email]) {
    showLoginError('login-error', '❌ Email non trovata. Registrati prima.');
    return;
  }
  if (accounts[email] !== hashPw(pw)) {
    showLoginError('login-error', '❌ Password errata. Riprova.');
    return;
  }
  doLogin(email, remember);
});

// Register form submit
document.getElementById('register-form').addEventListener('submit', function (e) {
  e.preventDefault();
  clearLoginErrors();
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const pw = document.getElementById('reg-password').value;
  const remember = document.getElementById('reg-remember').checked;

  if (pw.length < 6) {
    showLoginError('reg-error', '❌ La password deve avere almeno 6 caratteri.');
    return;
  }
  const accounts = getAccounts();
  if (accounts[email]) {
    showLoginError('reg-error', '❌ Email già registrata. Accedi invece.');
    return;
  }
  accounts[email] = hashPw(pw);
  saveAccounts(accounts);
  doLogin(email, remember);
});

// Toggle panels
document.getElementById('goRegister').addEventListener('click', showRegisterPanel);
document.getElementById('goLogin').addEventListener('click', showLoginPanel);

// Logout
document.getElementById('logoutBtn').addEventListener('click', doLogout);

// Password visibility toggles
function setupPwToggle(btnId, inputId) {
  document.getElementById(btnId).addEventListener('click', function () {
    const inp = document.getElementById(inputId);
    if (inp.type === 'password') {
      inp.type = 'text';
      this.textContent = '🙈';
    } else {
      inp.type = 'password';
      this.textContent = '👁️';
    }
  });
}
setupPwToggle('togglePw', 'login-password');
setupPwToggle('toggleRegPw', 'reg-password');

// ─── STATE ──────────────────────────────────────────────────
const state = {
  weights: [],
  mealPlans: [],
  workouts: [],
  wplans: [],
};

function save() {
  const email = getCurrentUser() || (sessionStorage.getItem('ft_session_temp'));
  if (!email) return;
  localStorage.setItem(userDataKey(email, 'weights'), JSON.stringify(state.weights));
  localStorage.setItem(userDataKey(email, 'meals'), JSON.stringify(state.mealPlans));
  localStorage.setItem(userDataKey(email, 'workouts'), JSON.stringify(state.workouts));
  localStorage.setItem(userDataKey(email, 'wplans'), JSON.stringify(state.wplans));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ─── CHARTS ─────────────────────────────────────────────────
let weightChart = null;
let dashWeightChart = null;

// ─── ROUTING ────────────────────────────────────────────────
function navigate(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById('page-' + pageId).classList.add('active');
  document.querySelector(`.nav-item[data-page="${pageId}"]`).classList.add('active');

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');

  if (pageId === 'dashboard') renderDashboard();
  if (pageId === 'peso') renderWeightPage();
  if (pageId === 'alimentazione') renderMealPage();
  if (pageId === 'allenamento') renderWorkoutPage();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => navigate(item.dataset.page));
});

// Mobile hamburger
const hamburger = document.getElementById('hamburger');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');
hamburger.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
});
overlay.addEventListener('click', () => {
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
});

// ─── TOAST ──────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = (type === 'success' ? '✅' : '❌') + ' ' + msg;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut 0.3s forwards';
    setTimeout(() => el.remove(), 300);
  }, 2800);
}

// ─── DATE HELPERS ───────────────────────────────────────────
function today() {
  return new Date().toISOString().split('T')[0];
}
function fmtDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}
function sortByDate(arr) {
  return [...arr].sort((a, b) => a.date.localeCompare(b.date));
}

// ─── DASHBOARD ──────────────────────────────────────────────
function renderDashboard() {
  // Date
  const now = new Date();
  document.getElementById('dash-date').textContent = now.toLocaleDateString('it-IT', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // Stats
  const sorted = sortByDate(state.weights);

  // Weekly average: find Mon–Sun of current week
  const nowDate = new Date();
  const dayOfWeek = nowDate.getDay(); // 0=Sun,1=Mon,...6=Sat
  const diffToMon = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek); // days to last Monday
  const monday = new Date(nowDate);
  monday.setDate(nowDate.getDate() + diffToMon);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const monStr = monday.toISOString().split('T')[0];
  const sunStr = sunday.toISOString().split('T')[0];
  const weekWeights = state.weights.filter(w => w.date >= monStr && w.date <= sunStr);
  const weekAvg = weekWeights.length
    ? (weekWeights.reduce((s, w) => s + w.value, 0) / weekWeights.length).toFixed(1)
    : null;
  document.getElementById('dash-weight').innerHTML = weekAvg
    ? `${weekAvg}<span class="stat-unit">kg</span>`
    : `—<span class="stat-unit">kg</span>`;
  document.getElementById('dash-workouts').textContent = state.workouts.length;
  document.getElementById('dash-meals').textContent = state.mealPlans.length;
  document.getElementById('dash-entries').textContent = state.weights.length;

  // Weight list
  const wList = document.getElementById('dash-weight-list');
  const last4w = sorted.slice(-4).reverse();
  if (last4w.length === 0) {
    wList.innerHTML = `<div class="empty-state"><div class="empty-icon">⚖️</div><p>Nessuna misurazione</p></div>`;
  } else {
    wList.innerHTML = last4w.map(w => `
      <div class="recent-item">
        <div class="recent-item-icon" style="background:linear-gradient(135deg,rgba(139,92,246,0.2),rgba(99,102,241,0.1));">⚖️</div>
        <div class="recent-item-info">
          <div class="recent-item-name">${fmtDate(w.date)}</div>
          <div class="recent-item-sub">${w.notes || 'Nessuna nota'}</div>
        </div>
        <div class="recent-item-value">${w.value} kg</div>
      </div>`).join('');
  }

  // Workout list
  const wkList = document.getElementById('dash-workout-list');
  const lastWk = [...state.workouts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  if (lastWk.length === 0) {
    wkList.innerHTML = `<div class="empty-state"><div class="empty-icon">🏋️</div><p>Nessuna sessione</p></div>`;
  } else {
    wkList.innerHTML = lastWk.map(w => {
      const wtype = w.type || 'gym';
      let icon, iconBg, subText, valueText, valueColor;
      if (wtype === 'run') {
        icon = '🏃';
        iconBg = 'linear-gradient(135deg,rgba(20,184,166,0.25),rgba(13,148,136,0.12))';
        subText = `${fmtDate(w.date)} · ${w.duration} min · ${fmtPace(w.pace || (w.avgSpeed ? 60 / w.avgSpeed : 6))} /km`;
        valueText = `${w.distance} km`;
        valueColor = '#14b8a6';
      } else if (wtype === 'rest') {
        icon = '😴';
        iconBg = 'linear-gradient(135deg,rgba(139,92,246,0.15),rgba(99,102,241,0.08))';
        subText = fmtDate(w.date);
        valueText = 'Rest';
        valueColor = 'var(--text-muted)';
      } else {
        icon = '🏋️';
        iconBg = 'linear-gradient(135deg,rgba(16,185,129,0.2),rgba(5,150,105,0.1))';
        subText = `${fmtDate(w.date)} · ${(w.exercises || []).length} esercizi`;
        valueText = (w.exercises || []).length;
        valueColor = 'var(--accent-green)';
      }
      return `
      <div class="recent-item">
        <div class="recent-item-icon" style="background:${iconBg};">${icon}</div>
        <div class="recent-item-info">
          <div class="recent-item-name">${w.name}</div>
          <div class="recent-item-sub">${subText}</div>
        </div>
        <div class="recent-item-value" style="color:${valueColor};">${valueText}</div>
      </div>`;
    }).join('');
  }


  // Meal list
  const mList = document.getElementById('dash-meal-list');
  const lastM = [...state.mealPlans].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  if (lastM.length === 0) {
    mList.innerHTML = `<div class="empty-state"><div class="empty-icon">🥗</div><p>Nessun piano</p></div>`;
  } else {
    mList.innerHTML = lastM.map(m => {
      const totalCal = m.foods.reduce((s, f) => s + (parseFloat(f.cal) || 0), 0);
      return `
      <div class="recent-item">
        <div class="recent-item-icon" style="background:linear-gradient(135deg,rgba(249,115,22,0.2),rgba(239,68,68,0.1));">🥗</div>
        <div class="recent-item-info">
          <div class="recent-item-name">${m.name}</div>
          <div class="recent-item-sub">${fmtDate(m.date)} · ${m.foods.length} alimenti</div>
        </div>
        <div class="recent-item-value" style="color:var(--accent-orange);">${Math.round(totalCal)} kcal</div>
      </div>`;
    }).join('');
  }

  // Mini chart
  renderDashChart();
}

function renderDashChart() {
  const ctx = document.getElementById('dashWeightChart').getContext('2d');
  const sorted = sortByDate(state.weights).slice(-14);

  if (dashWeightChart) dashWeightChart.destroy();

  if (sorted.length < 2) {
    dashWeightChart = null;
    return;
  }

  dashWeightChart = new Chart(ctx, buildChartConfig(sorted, false));
}

// ─── WEIGHT PAGE ────────────────────────────────────────────
function renderWeightPage() {
  const sorted = sortByDate(state.weights);

  // Stats
  if (sorted.length) {
    const vals = sorted.map(w => w.value);
    document.getElementById('stat-start').textContent = sorted[0].value;
    document.getElementById('stat-current').textContent = sorted[sorted.length - 1].value;
    document.getElementById('stat-min').textContent = Math.min(...vals);
    document.getElementById('stat-max').textContent = Math.max(...vals);
  } else {
    ['stat-start', 'stat-current', 'stat-min', 'stat-max'].forEach(id => {
      document.getElementById(id).textContent = '—';
    });
  }

  // Latest value display
  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const preview = document.getElementById('weight-preview');
  const changeEl = document.getElementById('weight-change-desc');

  if (latest) {
    preview.textContent = latest.value;
    if (prev) {
      const diff = (latest.value - prev.value).toFixed(1);
      const sign = diff > 0 ? '+' : '';
      changeEl.textContent = `${sign}${diff} kg rispetto a ${fmtDate(prev.date)}`;
      changeEl.className = 'weight-change ' + (diff > 0 ? 'up' : diff < 0 ? 'down' : 'same');
    } else {
      changeEl.textContent = 'Prima misurazione';
      changeEl.className = 'weight-change same';
    }
  } else {
    preview.textContent = '—';
  }

  renderWeightChart();
  renderWeightHistory();
}

function getChartData(days) {
  const sorted = sortByDate(state.weights);
  if (!days) return sorted;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutStr = cutoff.toISOString().split('T')[0];
  return sorted.filter(w => w.date >= cutStr);
}

function buildChartConfig(data, showLegend = false) {
  const labels = data.map(w => fmtDate(w.date));
  const values = data.map(w => w.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Peso (kg)',
        data: values,
        borderColor: '#8b5cf6',
        backgroundColor: (ctx) => {
          const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
          g.addColorStop(0, 'rgba(139,92,246,0.3)');
          g.addColorStop(1, 'rgba(139,92,246,0.01)');
          return g;
        },
        borderWidth: 2.5,
        pointBackgroundColor: '#8b5cf6',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: data.length > 30 ? 2 : 4,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: showLegend },
        tooltip: {
          backgroundColor: 'rgba(17,17,24,0.95)',
          borderColor: 'rgba(139,92,246,0.4)',
          borderWidth: 1,
          titleColor: '#a0a0b8',
          bodyColor: '#f0f0f8',
          bodyFont: { weight: '700', size: 14 },
          padding: 12,
          callbacks: {
            label: ctx => ` ${ctx.parsed.y} kg`,
          }
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#606070', font: { size: 11 }, maxTicksLimit: 8 },
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#606070', font: { size: 11 }, callback: v => v + ' kg' },
          suggestedMin: min - 2,
          suggestedMax: max + 2,
        }
      }
    }
  };
}

function renderWeightChart() {
  const ctx = document.getElementById('weightChart').getContext('2d');
  const days = parseInt(document.getElementById('chart-range').value);
  const data = getChartData(days);

  if (weightChart) weightChart.destroy();

  if (data.length < 2) {
    weightChart = null;
    return;
  }
  weightChart = new Chart(ctx, buildChartConfig(data, true));
}

document.getElementById('chart-range').addEventListener('change', renderWeightChart);

function renderWeightHistory() {
  const sorted = sortByDate(state.weights).reverse();
  const container = document.getElementById('weight-history');
  document.getElementById('weight-count').textContent = sorted.length
    ? `${sorted.length} misurazione${sorted.length !== 1 ? 'i' : 'e'}`
    : '';

  if (!sorted.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon">⚖️</div>
      <p>Nessuna misurazione ancora<br>Inizia inserendo il tuo peso!</p>
    </div>`;
    return;
  }

  container.innerHTML = sorted.map((w, idx) => {
    const prev = sorted[idx + 1];
    let diffHTML = '';
    if (prev) {
      const diff = (w.value - prev.value).toFixed(1);
      const cls = diff > 0 ? 'up' : diff < 0 ? 'down' : '';
      const sign = diff > 0 ? '+' : '';
      const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
      diffHTML = `<span class="item-diff ${cls}">${arrow} ${sign}${diff}</span>`;
    }
    return `
      <div class="history-item" id="wi-${w.id}">
        <div>
          <div class="item-date">📅 ${fmtDate(w.date)}</div>
          ${w.notes ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${w.notes}</div>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          ${diffHTML}
          <div class="item-value">${w.value} kg</div>
          <button class="btn-icon" onclick="deleteWeight('${w.id}')" title="Elimina">🗑️</button>
        </div>
      </div>`;
  }).join('');
}

// Weight form
document.getElementById('weight-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const date = document.getElementById('w-date').value;
  const value = parseFloat(document.getElementById('w-value').value);
  const notes = document.getElementById('w-notes').value.trim();

  if (!date || isNaN(value)) return;

  // Check for duplicate date
  const dup = state.weights.find(w => w.date === date);
  if (dup) {
    dup.value = value;
    dup.notes = notes;
    toast('Misurazione aggiornata!');
  } else {
    state.weights.push({ id: uid(), date, value, notes });
    toast('Misurazione salvata!');
  }

  save();
  this.reset();
  document.getElementById('w-date').value = today();
  renderWeightPage();
});

function deleteWeight(id) {
  state.weights = state.weights.filter(w => w.id !== id);
  save();
  toast('Misurazione eliminata', 'error');
  renderWeightPage();
}

// Update preview live
document.getElementById('w-value').addEventListener('input', function () {
  document.getElementById('weight-preview').textContent = this.value || '—';
});

// ─── MEAL PAGE ──────────────────────────────────────────────
let foodItemCount = 0;

function renderMealPage() {
  renderMealHistory();
}

function addFoodItem() {
  foodItemCount++;
  const container = document.getElementById('food-items-container');
  const div = document.createElement('div');
  div.className = 'food-item-row';
  div.id = 'food-' + foodItemCount;
  div.innerHTML = `
    <input type="text"   class="form-input food-name"  placeholder="es. Pollo alla griglia" />
    <input type="number" class="form-input food-cal"   placeholder="0" min="0" step="1" style="text-align:center;" />
    <input type="number" class="form-input food-prot"  placeholder="0" min="0" step="0.1" style="text-align:center;" />
    <input type="number" class="form-input food-carb"  placeholder="0" min="0" step="0.1" style="text-align:center;" />
    <input type="number" class="form-input food-fat"   placeholder="0" min="0" step="0.1" style="text-align:center;" />
    <button type="button" class="btn-icon" onclick="removeFoodItem('food-${foodItemCount}')">✕</button>
  `;
  container.appendChild(div);

  // Update totals on input
  div.querySelectorAll('input[type=number]').forEach(inp => {
    inp.addEventListener('input', updateMealTotals);
  });

  updateMealTotals();
}

function removeFoodItem(id) {
  document.getElementById(id)?.remove();
  updateMealTotals();
}

function updateMealTotals() {
  const rows = document.querySelectorAll('#food-items-container .food-item-row');
  const totalsEl = document.getElementById('meal-totals');

  if (rows.length === 0) {
    totalsEl.style.display = 'none';
    return;
  }

  let cal = 0, prot = 0, carb = 0, fat = 0;
  rows.forEach(r => {
    cal += parseFloat(r.querySelector('.food-cal').value) || 0;
    prot += parseFloat(r.querySelector('.food-prot').value) || 0;
    carb += parseFloat(r.querySelector('.food-carb').value) || 0;
    fat += parseFloat(r.querySelector('.food-fat').value) || 0;
  });

  document.getElementById('total-cal').textContent = Math.round(cal);
  document.getElementById('total-prot').textContent = prot.toFixed(1);
  document.getElementById('total-carb').textContent = carb.toFixed(1);
  document.getElementById('total-fat').textContent = fat.toFixed(1);
  totalsEl.style.display = 'block';
}

document.getElementById('add-food-btn').addEventListener('click', addFoodItem);

document.getElementById('meal-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const date = document.getElementById('m-date').value;
  const name = document.getElementById('m-name').value.trim();

  const rows = document.querySelectorAll('#food-items-container .food-item-row');
  const foods = [];
  rows.forEach(r => {
    const foodName = r.querySelector('.food-name').value.trim();
    if (foodName) {
      foods.push({
        name: foodName,
        cal: parseFloat(r.querySelector('.food-cal').value) || 0,
        prot: parseFloat(r.querySelector('.food-prot').value) || 0,
        carb: parseFloat(r.querySelector('.food-carb').value) || 0,
        fat: parseFloat(r.querySelector('.food-fat').value) || 0,
      });
    }
  });

  if (!date || !name) return;

  state.mealPlans.push({ id: uid(), date, name, foods });
  save();
  toast('Piano alimentare salvato!');

  // Reset form
  this.reset();
  document.getElementById('m-date').value = today();
  document.getElementById('food-items-container').innerHTML = '';
  document.getElementById('meal-totals').style.display = 'none';
  foodItemCount = 0;

  renderMealHistory();
});

function renderMealHistory() {
  const container = document.getElementById('meal-history');
  const sorted = [...state.mealPlans].sort((a, b) => b.date.localeCompare(a.date));
  const countEl = document.getElementById('meal-count');
  countEl.textContent = sorted.length ? `${sorted.length} piano${sorted.length !== 1 ? 'i' : ''}` : '';

  if (!sorted.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🥗</div>
      <p>Nessun piano alimentare salvato<br>Inserisci il tuo primo piano!</p>
    </div>`;
    return;
  }

  container.innerHTML = sorted.map(m => {
    const totalCal = m.foods.reduce((s, f) => s + (f.cal || 0), 0);
    const totalProt = m.foods.reduce((s, f) => s + (f.prot || 0), 0);
    const totalCarb = m.foods.reduce((s, f) => s + (f.carb || 0), 0);
    const totalFat = m.foods.reduce((s, f) => s + (f.fat || 0), 0);

    const foodRows = m.foods.length
      ? `<table class="food-table">
          <thead><tr>
            <th>Alimento</th><th>Kcal</th><th>Prot</th><th>Carb</th><th>Grassi</th>
          </tr></thead>
          <tbody>
            ${m.foods.map(f => `<tr>
              <td>${f.name}</td>
              <td style="color:var(--accent-orange);">${f.cal}</td>
              <td style="color:var(--accent-green);">${f.prot}g</td>
              <td style="color:#818cf8;">${f.carb}g</td>
              <td style="color:var(--accent-pink);">${f.fat}g</td>
            </tr>`).join('')}
          </tbody>
        </table>`
      : '<p style="font-size:13px;color:var(--text-muted);">Nessun alimento inserito</p>';

    return `
      <div class="meal-plan-card" id="mp-${m.id}">
        <div class="meal-plan-header">
          <div>
            <div class="meal-plan-name">🥗 ${m.name}</div>
            <div class="meal-plan-date">📅 ${fmtDate(m.date)}</div>
          </div>
          <button class="btn btn-danger" onclick="deleteMeal('${m.id}')">🗑️ Elimina</button>
        </div>
        <div class="macros-row">
          <span class="macro-badge cal">🔥 ${Math.round(totalCal)} kcal</span>
          <span class="macro-badge prot">💪 ${totalProt.toFixed(1)}g prot</span>
          <span class="macro-badge carb">🌾 ${totalCarb.toFixed(1)}g carb</span>
          <span class="macro-badge fat">🫒 ${totalFat.toFixed(1)}g grassi</span>
        </div>
        ${foodRows}
      </div>`;
  }).join('');
}

function deleteMeal(id) {
  state.mealPlans = state.mealPlans.filter(m => m.id !== id);
  save();
  toast('Piano eliminato', 'error');
  renderMealHistory();
}

// ─── WORKOUT PAGE ────────────────────────────────────────────
let exerciseCount = 0;
let currentWorkoutType = 'gym'; // 'gym' | 'run' | 'rest'

// ── Session type toggle ──
document.querySelectorAll('.session-type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentWorkoutType = btn.dataset.type;
    document.querySelectorAll('.session-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Show/hide blocks
    document.getElementById('gym-block').style.display = currentWorkoutType === 'gym' ? '' : 'none';
    document.getElementById('run-block').style.display = currentWorkoutType === 'run' ? '' : 'none';
    document.getElementById('rest-block').style.display = currentWorkoutType === 'rest' ? '' : 'none';

    // Name field: auto-fill for run/rest
    const nameInput = document.getElementById('wo-name');
    if (currentWorkoutType === 'run') {
      nameInput.placeholder = 'es. Corsa mattutina';
    } else if (currentWorkoutType === 'rest') {
      nameInput.placeholder = 'es. Riposo attivo';
      nameInput.value = nameInput.value || 'Rest Day';
    } else {
      nameInput.placeholder = 'es. Push Day, Gambe...';
    }
  });
});

// Live distance preview for running
function parsePace(val) {
  // Accepts '5:30' -> 5.5 min/km, or plain decimal '5.5'
  if (!val) return null;
  const parts = String(val).trim().split(':');
  if (parts.length === 2) {
    const m = parseInt(parts[0]) || 0;
    const s = parseInt(parts[1]) || 0;
    if (m <= 0 && s <= 0) return null;
    return m + s / 60;
  }
  const n = parseFloat(val);
  return isNaN(n) || n <= 0 ? null : n;
}

function fmtPace(paceMinPerKm) {
  // Converts decimal minutes to 'M:SS' string
  const m = Math.floor(paceMinPerKm);
  const s = Math.round((paceMinPerKm - m) * 60);
  return m + ':' + String(s).padStart(2, '0');
}

function updateRunPreview() {
  const dur = parseFloat(document.getElementById('run-duration').value);
  const paceMin = parsePace(document.getElementById('run-speed').value);
  const preview = document.getElementById('run-stats-preview');
  if (dur > 0 && paceMin) {
    const km = (dur / paceMin).toFixed(2);
    document.getElementById('run-distance-preview').textContent = km;
    preview.style.display = 'flex';
  } else {
    preview.style.display = 'none';
  }
}
document.getElementById('run-duration').addEventListener('input', updateRunPreview);
document.getElementById('run-speed').addEventListener('input', updateRunPreview);

// ── Sub-tab switching ──

document.querySelectorAll('.subtab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.subtab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.subtab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');

    if (btn.dataset.tab === 'tracker') renderTrackerPlansPanel();
    if (btn.dataset.tab === 'piani') renderWplanHistory();
  });
});

function renderWorkoutPage() {
  renderWorkoutHistory();
  renderTrackerPlansPanel();
}

// ── Session exercise builder ──
function makeDropSetRow(exId, dropIdx, prefill = {}) {
  const isFailure = prefill.reps === 'failure';
  return `
    <div class="dropset-row" id="${exId}-drop-${dropIdx}">
      <div class="dropset-label">↘ Drop ${dropIdx}</div>
      <div class="dropset-fields">
        <div>
          <div class="exercise-field-label">Peso (kg)</div>
          <input type="number" class="form-input ds-weight" placeholder="70" min="0" step="0.5"
            value="${prefill.weight || ''}" />
        </div>
        <div>
          <div class="exercise-field-label">Ripetizioni</div>
          <input type="number" class="form-input ds-reps" placeholder="8" min="1"
            value="${isFailure ? '' : (prefill.reps || '')}" ${isFailure ? 'disabled style="display:none;"' : ''} />
          <button type="button" class="btn-failure ${isFailure ? 'active' : ''}" data-target="ds-reps"
            onclick="toggleFailure(this)">
            ${isFailure ? '⚡ Failure' : '⚡ Failure'}
          </button>
        </div>
      </div>
      <button type="button" class="btn-icon" style="margin-left:4px;"
        onclick="document.getElementById('${exId}-drop-${dropIdx}').remove()">✕</button>
    </div>`;
}

function toggleFailure(btn) {
  const wrapper = btn.closest('div');
  const inp = wrapper.querySelector('input');
  if (!inp) return;
  const active = btn.classList.toggle('active');
  if (active) {
    inp.value = '';
    inp.disabled = true;
    inp.style.display = 'none';
    btn.textContent = '⚡ Failure';
  } else {
    inp.disabled = false;
    inp.style.display = '';
    btn.textContent = '⚡ Failure';
  }
}
function togglePerSets(btn) {
  const col = btn.closest('div[data-weight-col]');
  if (!col) return;
  const single = col.querySelector('.ex-weight, .pex-weight');
  const csv = col.querySelector('.ex-weights-csv, .pex-weights-csv');
  const active = btn.classList.toggle('active');
  if (active) {
    const exRow = col.closest('.exercise-row');
    const setsInput = exRow.querySelector('.ex-sets, .pex-sets');
    const sets = parseInt(setsInput?.value) || 1;
    const w = parseFloat(single.value) || '';
    csv.value = w ? Array(sets).fill(w).join(', ') : '';
    single.style.display = 'none';
    csv.style.display = '';
  } else {
    single.style.display = '';
    csv.style.display = 'none';
  }
}

function addExercise(prefill = {}) {
  exerciseCount++;
  const id = 'ex-' + exerciseCount;
  const container = document.getElementById('exercises-container');
  const div = document.createElement('div');
  div.className = 'exercise-row';
  div.id = id;
  const isFailure = prefill.reps === 'failure';
  const isPerSets = !!(prefill.weights && prefill.weights.length);

  // Build prefill drop sets HTML
  let dropSetsHTML = '';
  let dropCounter = 0;
  if (prefill.dropSets && prefill.dropSets.length) {
    prefill.dropSets.forEach(ds => {
      dropCounter++;
      dropSetsHTML += makeDropSetRow(id, dropCounter, ds);
    });
  }

  div.innerHTML = `
    <div class="exercise-row-header">
      <input type="text" class="form-input ex-name" placeholder="Nome esercizio (es. Panca Piana)" style="font-weight:600;"
        value="${prefill.name || ''}" />
      <button type="button" class="btn-icon" onclick="removeExercise('${id}')">✕</button>
    </div>
    <div class="exercise-row-fields">
      <div>
        <div class="exercise-field-label">Serie</div>
        <input type="number" class="form-input ex-sets" placeholder="4" min="1" max="99"
          value="${prefill.sets || ''}" />
      </div>
      <div>
        <div class="exercise-field-label">Rip. per serie</div>
        <input type="number" class="form-input ex-reps" placeholder="8" min="1" max="999"
          value="${isFailure ? '' : (prefill.reps || '')}" ${isFailure ? 'disabled style="display:none;"' : ''} />
        <button type="button" class="btn-failure ${isFailure ? 'active' : ''}" data-target="ex-reps"
          onclick="toggleFailure(this)">
          ⚡ Failure
        </button>
      </div>
      <div data-weight-col>
        <div class="exercise-field-label" style="display:flex;align-items:center;gap:6px;">
          Peso (kg)
          <button type="button" class="btn-per-sets ${isPerSets ? 'active' : ''}" onclick="togglePerSets(this)" title="Pesi diversi per set">⚖️</button>
        </div>
        <input type="number" class="form-input ex-weight" placeholder="80" min="0" step="0.5"
          value="${isPerSets ? '' : (prefill.weight || '')}" ${isPerSets ? 'style="display:none;"' : ''} />
        <input type="text" class="form-input ex-weights-csv" placeholder="es. 32.5, 32.5, 35, 35" style="font-size:12px;${isPerSets ? '' : 'display:none;'}"
          value="${isPerSets ? (prefill.weights || []).join(', ') : ''}" />
      </div>
      <div>
        <div class="exercise-field-label">RIR / RPE</div>
        <input type="text" class="form-input ex-rir" placeholder="es. RIR 2"
          value="${prefill.rir || ''}" />
      </div>
    </div>
    <div style="margin-top:8px;">
      <div class="exercise-field-label">Note</div>
      <input type="text" class="form-input ex-note" placeholder="es. Drop set, pausa 2min..." style="font-size:12px;"
        value="${prefill.note || ''}" />
    </div>
    <div class="dropsets-container" id="${id}-drops" data-count="${dropCounter}">${dropSetsHTML}</div>
    <div style="margin-top:8px;">
      <button type="button" class="btn-add-dropset" onclick="addDropSet('${id}')">
        ↘ Aggiungi Drop Set
      </button>
    </div>
  `;
  container.appendChild(div);
}

function addDropSet(exId) {
  const cont = document.getElementById(exId + '-drops');
  const idx = parseInt(cont.dataset.count || 0) + 1;
  cont.dataset.count = idx;
  cont.insertAdjacentHTML('beforeend', makeDropSetRow(exId, idx, {}));
}

function removeExercise(id) {
  document.getElementById(id)?.remove();
}

document.getElementById('add-exercise-btn').addEventListener('click', () => addExercise());

document.getElementById('workout-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const date = document.getElementById('wo-date').value;
  const name = document.getElementById('wo-name').value.trim();
  const notes = document.getElementById('wo-notes').value.trim();

  if (!date) {
    toast('Inserisci la data!', 'error');
    return;
  }

  // ── REST DAY ──
  if (currentWorkoutType === 'rest') {
    const sessionName = name || 'Rest Day';
    state.workouts.push({ id: uid(), date, name: sessionName, notes, type: 'rest', exercises: [] });
    save();
    toast('Rest Day registrato! 😴');
    this.reset();
    document.getElementById('wo-date').value = today();
    renderWorkoutHistory();
    return;
  }

  // ── CORSA ──
  if (currentWorkoutType === 'run') {
    const duration = parseFloat(document.getElementById('run-duration').value);
    const paceMin = parsePace(document.getElementById('run-speed').value);
    if (!duration || !paceMin) {
      toast('Inserisci durata e passo medio (es. 5:30)!', 'error');
      return;
    }
    const distance = parseFloat((duration / paceMin).toFixed(2));
    const sessionName = name || 'Corsa';
    state.workouts.push({ id: uid(), date, name: sessionName, notes, type: 'run', duration, pace: paceMin, distance, exercises: [] });
    save();
    toast('Sessione di corsa salvata! 🏃');
    this.reset();
    document.getElementById('wo-date').value = today();
    document.getElementById('run-stats-preview').style.display = 'none';
    renderWorkoutHistory();
    return;
  }

  // ── PALESTRA ──
  const rows = document.querySelectorAll('#exercises-container .exercise-row');
  const exercises = [];
  rows.forEach(r => {
    const exName = r.querySelector('.ex-name').value.trim();
    if (exName) {
      const repsBtn = r.querySelector('.btn-failure');
      const repsIsFailure = repsBtn && repsBtn.classList.contains('active');
      // Collect drop sets
      const dropSets = [];
      r.querySelectorAll('.dropset-row').forEach(dr => {
        const dsFailBtn = dr.querySelector('.btn-failure');
        const dsFailure = dsFailBtn && dsFailBtn.classList.contains('active');
        dropSets.push({
          weight: parseFloat(dr.querySelector('.ds-weight').value) || null,
          reps: dsFailure ? 'failure' : (parseInt(dr.querySelector('.ds-reps').value) || null),
        });
      });
      // Per-set weights
      const perSetsBtn = r.querySelector('.btn-per-sets');
      const isPerSets = perSetsBtn && perSetsBtn.classList.contains('active');
      const weightsArr = isPerSets
        ? r.querySelector('.ex-weights-csv').value.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v) && v > 0)
        : null;
      exercises.push({
        name: exName,
        sets: parseInt(r.querySelector('.ex-sets').value) || null,
        reps: repsIsFailure ? 'failure' : (parseInt(r.querySelector('.ex-reps').value) || null),
        weight: isPerSets ? null : (parseFloat(r.querySelector('.ex-weight').value) || null),
        weights: weightsArr && weightsArr.length ? weightsArr : null,
        rir: r.querySelector('.ex-rir').value.trim(),
        note: r.querySelector('.ex-note').value.trim(),
        dropSets,
      });
    }
  });

  if (!name || exercises.length === 0) {
    toast('Inserisci nome sessione e almeno un esercizio!', 'error');
    return;
  }

  state.workouts.push({ id: uid(), date, name, notes, type: 'gym', exercises });
  save();
  toast('Sessione salvata!');

  // Reset
  this.reset();
  document.getElementById('wo-date').value = today();
  document.getElementById('exercises-container').innerHTML = '';
  exerciseCount = 0;
  const planTag = document.getElementById('wo-plan-tag');
  planTag.style.display = 'none';
  planTag.textContent = '';

  renderWorkoutHistory();
});


function renderWorkoutHistory() {
  const container = document.getElementById('workout-history');
  const sorted = [...state.workouts].sort((a, b) => b.date.localeCompare(a.date));
  const countEl = document.getElementById('workout-count');
  countEl.textContent = sorted.length ? `${sorted.length} sessione${sorted.length !== 1 ? 'i' : 'e'}` : '';

  if (!sorted.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🏋️</div>
      <p>Nessuna sessione registrata<br>Inizia il tuo primo allenamento!</p>
    </div>`;
    return;
  }

  // Personal records for gym sessions: exercise -> max weight ever
  const prs = {};
  state.workouts.forEach(w => {
    if (w.type === 'gym' || !w.type) {
      (w.exercises || []).forEach(ex => {
        const maxW = ex.weights ? Math.max(...ex.weights) : ex.weight;
        if (maxW && (!prs[ex.name] || maxW > prs[ex.name])) prs[ex.name] = maxW;
      });
    }
  });

  container.innerHTML = sorted.map(w => {
    const wtype = w.type || 'gym';

    // ── REST DAY card ──
    if (wtype === 'rest') {
      return `
        <div class="workout-card workout-card-rest" id="wk-${w.id}">
          <div class="workout-card-header">
            <div>
              <div class="workout-card-name">😴 ${w.name}</div>
              <div class="workout-card-meta"><span>📅 ${fmtDate(w.date)}</span></div>
              ${w.notes ? `<div style="margin-top:6px;font-size:12px;color:var(--text-muted);font-style:italic;">"${w.notes}"</div>` : ''}
            </div>
            <button class="btn btn-danger" onclick="deleteWorkout('${w.id}')">🗑️ Elimina</button>
          </div>
        </div>`;
    }

    // ── CORSA card ──
    if (wtype === 'run') {
      return `
        <div class="workout-card workout-card-run" id="wk-${w.id}">
          <div class="workout-card-header">
            <div>
              <div class="workout-card-name">🏃 ${w.name}</div>
              <div class="workout-card-meta">
                <span>📅 ${fmtDate(w.date)}</span>
                <span>⏱️ ${w.duration} min</span>
                <span>🕐 ${fmtPace(w.pace || (w.avgSpeed ? 60 / w.avgSpeed : 6))} /km</span>
                <span>📍 ${w.distance} km</span>
              </div>
              ${w.notes ? `<div style="margin-top:6px;font-size:12px;color:var(--text-muted);font-style:italic;">"${w.notes}"</div>` : ''}
            </div>
            <button class="btn btn-danger" onclick="deleteWorkout('${w.id}')">🗑️ Elimina</button>
          </div>
          <div class="run-summary-bars">
            <div class="run-bar-item">
              <div class="run-bar-label">Durata</div>
              <div class="run-bar-value">${w.duration} <span class="run-bar-unit">min</span></div>
            </div>
            <div class="run-bar-sep"></div>
            <div class="run-bar-item">
              <div class="run-bar-label">Passo medio</div>
              <div class="run-bar-value">${fmtPace(w.pace || (w.avgSpeed ? 60 / w.avgSpeed : 6))} <span class="run-bar-unit">/km</span></div>
            </div>
            <div class="run-bar-sep"></div>
            <div class="run-bar-item">
              <div class="run-bar-label">Distanza stimata</div>
              <div class="run-bar-value">${w.distance} <span class="run-bar-unit">km</span></div>
            </div>
          </div>
        </div>`;
    }

    // ── PALESTRA card (default) ──
    const totalVolume = (w.exercises || []).reduce((s, ex) => {
      if (ex.weights && ex.weights.length) {
        return s + ex.weights.reduce((ws, wt) => ws + wt * (ex.reps || 1), 0);
      }
      return s + ((ex.sets || 1) * (ex.reps || 1) * (ex.weight || 0));
    }, 0);

    const exerciseHTML = (w.exercises || []).map(ex => {
      const maxW = ex.weights ? Math.max(...ex.weights) : ex.weight;
      const isPR = maxW && prs[ex.name] === maxW;
      const prBadge = isPR ? `<span class="pr-badge">🏆 PR</span>` : '';
      const repsBadge = ex.reps === 'failure'
        ? `<span class="exercise-badge failure">⚡ Failure</span>`
        : (ex.reps ? `<span class="exercise-badge reps">${ex.reps} rep</span>` : '');
      const weightBadge = ex.weights && ex.weights.length
        ? `<span class="exercise-badge kgs per-sets-badge" title="Pesi per set">⚖️ ${ex.weights.join(' / ')} kg</span>`
        : (ex.weight ? `<span class="exercise-badge kgs">${ex.weight} kg</span>` : '');
      const dropHTML = (ex.dropSets && ex.dropSets.length)
        ? ex.dropSets.map((ds, i) => {
          const dsRep = ds.reps === 'failure'
            ? `<span class="exercise-badge failure">⚡ Failure</span>`
            : (ds.reps ? `<span class="exercise-badge reps">${ds.reps} rep</span>` : '');
          return `<div class="dropset-history-row">
              <span class="dropset-label-small">↘ Drop ${i + 1}</span>
              ${ds.weight ? `<span class="exercise-badge kgs">${ds.weight} kg</span>` : ''}
              ${dsRep}
            </div>`;
        }).join('')
        : '';
      return `
        <div class="exercise-list-item ${dropHTML ? 'has-dropsets' : ''}">
          <div class="exercise-list-name">${ex.name}${prBadge}</div>
          <div class="exercise-badges">
            ${ex.sets ? `<span class="exercise-badge sets">${ex.sets}×</span>` : ''}
            ${repsBadge}
            ${weightBadge}
            ${ex.rir ? `<span class="exercise-badge">${ex.rir}</span>` : ''}
            ${ex.note ? `<span class="exercise-badge note" title="${ex.note}">📝 ${ex.note}</span>` : ''}
          </div>
          ${dropHTML ? `<div class="dropsets-history">${dropHTML}</div>` : ''}
        </div>`;
    }).join('');

    return `
      <div class="workout-card" id="wk-${w.id}">
        <div class="workout-card-header">
          <div>
            <div class="workout-card-name">🏋️ ${w.name}</div>
            <div class="workout-card-meta">
              <span>📅 ${fmtDate(w.date)}</span>
              <span>🏃 ${(w.exercises || []).length} esercizi</span>
              ${totalVolume ? `<span>📦 ${Math.round(totalVolume).toLocaleString('it-IT')} kg vol.</span>` : ''}
            </div>
            ${w.notes ? `<div style="margin-top:6px;font-size:12px;color:var(--text-muted);font-style:italic;">"${w.notes}"</div>` : ''}
          </div>
          <button class="btn btn-danger" onclick="deleteWorkout('${w.id}')">🗑️ Elimina</button>
        </div>
        ${exerciseHTML}
      </div>`;
  }).join('');
}


function deleteWorkout(id) {
  state.workouts = state.workouts.filter(w => w.id !== id);
  save();
  toast('Sessione eliminata', 'error');
  renderWorkoutHistory();
}

// ── USE PLAN → pre-fill session tracker ──
function usePlan(planId) {
  const plan = state.wplans.find(p => p.id === planId);
  if (!plan) return;

  // Switch to tracker tab
  document.querySelectorAll('.subtab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.subtab-content').forEach(c => c.classList.remove('active'));
  document.querySelector('.subtab[data-tab="tracker"]').classList.add('active');
  document.getElementById('tab-tracker').classList.add('active');

  // Pre-fill session name
  document.getElementById('wo-name').value = plan.name;
  document.getElementById('wo-date').value = today();

  // Show plan tag
  const planTag = document.getElementById('wo-plan-tag');
  planTag.textContent = `📅 ${plan.name}`;
  planTag.style.display = 'inline-block';

  // Clear and pre-fill exercises
  document.getElementById('exercises-container').innerHTML = '';
  exerciseCount = 0;
  plan.exercises.forEach(ex => addExercise({ ...ex }));

  toast(`Piano "${plan.name}" caricato nel tracker!`);

  // Scroll form into view
  document.getElementById('exercises-container').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ─── WORKOUT PLANS ────────────────────────────────────────────
let planExerciseCount = 0;
let editingPlanId = null;

function makePlanDropSetRow(pexId, dropIdx, prefill = {}) {
  const isFailure = prefill.reps === 'failure';
  return `
    <div class="dropset-row" id="${pexId}-drop-${dropIdx}">
      <div class="dropset-label">↘ Drop ${dropIdx}</div>
      <div class="dropset-fields">
        <div>
          <div class="exercise-field-label">Peso prev. (kg)</div>
          <input type="number" class="form-input ds-weight" placeholder="70" min="0" step="0.5"
            value="${prefill.weight || ''}" />
        </div>
        <div>
          <div class="exercise-field-label">Ripetizioni</div>
          <input type="number" class="form-input ds-reps" placeholder="8" min="1"
            value="${isFailure ? '' : (prefill.reps || '')}" ${isFailure ? 'disabled style="display:none;"' : ''} />
          <button type="button" class="btn-failure ${isFailure ? 'active' : ''}" onclick="toggleFailure(this)">
            ⚡ Failure
          </button>
        </div>
      </div>
      <button type="button" class="btn-icon" style="margin-left:4px;"
        onclick="document.getElementById('${pexId}-drop-${dropIdx}').remove()">✕</button>
    </div>`;
}

function addPlanExercise(prefill = {}) {
  planExerciseCount++;
  const id = 'pex-' + planExerciseCount;
  const container = document.getElementById('plan-exercises-container');
  const div = document.createElement('div');
  div.className = 'exercise-row';
  div.id = id;
  const isFailure = prefill.reps === 'failure';
  const isPlanPerSets = !!(prefill.weights && prefill.weights.length);

  let dropSetsHTML = '';
  let dropCounter = 0;
  if (prefill.dropSets && prefill.dropSets.length) {
    prefill.dropSets.forEach(ds => {
      dropCounter++;
      dropSetsHTML += makePlanDropSetRow(id, dropCounter, ds);
    });
  }

  div.innerHTML = `
    <div class="exercise-row-header">
      <input type="text" class="form-input pex-name" placeholder="Nome esercizio (es. Squat)" style="font-weight:600;"
        value="${prefill.name || ''}" />
      <button type="button" class="btn-icon" onclick="removePlanExercise('${id}')">✕</button>
    </div>
    <div class="exercise-row-fields">
      <div>
        <div class="exercise-field-label">Serie target</div>
        <input type="number" class="form-input pex-sets" placeholder="4" min="1" max="99"
          value="${prefill.sets || ''}" />
      </div>
      <div>
        <div class="exercise-field-label">Rip. target</div>
        <input type="number" class="form-input pex-reps" placeholder="8-12" min="1" max="999"
          value="${isFailure ? '' : (prefill.reps || '')}" ${isFailure ? 'disabled style="display:none;"' : ''} />
        <button type="button" class="btn-failure ${isFailure ? 'active' : ''}" onclick="toggleFailure(this)">
          ⚡ Failure
        </button>
      </div>
      <div data-weight-col>
        <div class="exercise-field-label" style="display:flex;align-items:center;gap:6px;">
          Peso prev. (kg)
          <button type="button" class="btn-per-sets ${isPlanPerSets ? 'active' : ''}" onclick="togglePerSets(this)" title="Pesi diversi per set">⚖️</button>
        </div>
        <input type="number" class="form-input pex-weight" placeholder="80" min="0" step="0.5"
          value="${isPlanPerSets ? '' : (prefill.weight || '')}" ${isPlanPerSets ? 'style="display:none;"' : ''} />
        <input type="text" class="form-input pex-weights-csv" placeholder="es. 32.5, 32.5, 35, 35" style="font-size:12px;${isPlanPerSets ? '' : 'display:none;'}"
          value="${isPlanPerSets ? (prefill.weights || []).join(', ') : ''}" />
      </div>
      <div>
        <div class="exercise-field-label">RIR / RPE</div>
        <input type="text" class="form-input pex-rir" placeholder="es. RIR 2"
          value="${prefill.rir || ''}" />
      </div>
    </div>
    <div style="margin-top:8px;">
      <div class="exercise-field-label">Note</div>
      <input type="text" class="form-input pex-note" placeholder="es. Pausa 3min, caduta controllata..." style="font-size:12px;"
        value="${prefill.note || ''}" />
    </div>
    <div class="dropsets-container" id="${id}-drops" data-count="${dropCounter}">${dropSetsHTML}</div>
    <div style="margin-top:8px;">
      <button type="button" class="btn-add-dropset" onclick="addPlanDropSet('${id}')">
        ↘ Aggiungi Drop Set
      </button>
    </div>
  `;
  container.appendChild(div);
}

function addPlanDropSet(pexId) {
  const cont = document.getElementById(pexId + '-drops');
  const idx = parseInt(cont.dataset.count || 0) + 1;
  cont.dataset.count = idx;
  cont.insertAdjacentHTML('beforeend', makePlanDropSetRow(pexId, idx, {}));
}

function removePlanExercise(id) {
  document.getElementById(id)?.remove();
}

document.getElementById('add-plan-exercise-btn').addEventListener('click', () => addPlanExercise());

document.getElementById('wplan-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const name = document.getElementById('wp-name').value.trim();
  const desc = document.getElementById('wp-desc').value.trim();

  const rows = document.querySelectorAll('#plan-exercises-container .exercise-row');
  const exercises = [];
  rows.forEach(r => {
    const exName = r.querySelector('.pex-name').value.trim();
    if (exName) {
      const repsBtn = r.querySelector('.btn-failure');
      const repsIsFailure = repsBtn && repsBtn.classList.contains('active');
      const dropSets = [];
      r.querySelectorAll('.dropset-row').forEach(dr => {
        const dsFailBtn = dr.querySelector('.btn-failure');
        const dsFailure = dsFailBtn && dsFailBtn.classList.contains('active');
        dropSets.push({
          weight: parseFloat(dr.querySelector('.ds-weight').value) || null,
          reps: dsFailure ? 'failure' : (parseInt(dr.querySelector('.ds-reps').value) || null),
        });
      });
      // Per-set weights
      const perSetsBtn = r.querySelector('.btn-per-sets');
      const isPerSets = perSetsBtn && perSetsBtn.classList.contains('active');
      const weightsArr = isPerSets
        ? r.querySelector('.pex-weights-csv').value.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v) && v > 0)
        : null;
      exercises.push({
        name: exName,
        sets: parseInt(r.querySelector('.pex-sets').value) || null,
        reps: repsIsFailure ? 'failure' : (parseInt(r.querySelector('.pex-reps').value) || null),
        weight: isPerSets ? null : (parseFloat(r.querySelector('.pex-weight').value) || null),
        weights: weightsArr && weightsArr.length ? weightsArr : null,
        rir: r.querySelector('.pex-rir').value.trim(),
        note: r.querySelector('.pex-note').value.trim(),
        dropSets,
      });
    }
  });

  if (!name || exercises.length === 0) {
    toast('Inserisci il nome del piano e almeno un esercizio!', 'error');
    return;
  }

  if (editingPlanId) {
    // UPDATE existing plan
    const idx = state.wplans.findIndex(p => p.id === editingPlanId);
    if (idx !== -1) {
      state.wplans[idx] = { ...state.wplans[idx], name, desc, exercises };
    }
    toast(`Piano "${name}" aggiornato!`);
    cancelEditWplan();
  } else {
    // CREATE new plan
    state.wplans.push({ id: uid(), name, desc, exercises });
    toast(`Piano "${name}" salvato!`);
    this.reset();
    document.getElementById('plan-exercises-container').innerHTML = '';
    planExerciseCount = 0;
  }

  save();
  renderWplanHistory();
  renderTrackerPlansPanel();
});

function editWplan(id) {
  const plan = state.wplans.find(p => p.id === id);
  if (!plan) return;

  editingPlanId = id;

  // Populate name & desc
  document.getElementById('wp-name').value = plan.name;
  document.getElementById('wp-desc').value = plan.desc || '';

  // Clear and re-add exercises from the plan (with prefill)
  document.getElementById('plan-exercises-container').innerHTML = '';
  planExerciseCount = 0;
  plan.exercises.forEach(ex => addPlanExercise({ ...ex }));

  // Update button label & show cancel
  document.getElementById('wplan-save-btn').textContent = '✏️ Aggiorna Piano';
  document.getElementById('wplan-cancel-btn').style.display = '';

  // Scroll the form into view
  document.getElementById('wplan-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  toast(`Modifica piano "${plan.name}" in corso…`);
}

function cancelEditWplan() {
  editingPlanId = null;
  document.getElementById('wplan-form').reset();
  document.getElementById('plan-exercises-container').innerHTML = '';
  planExerciseCount = 0;
  document.getElementById('wplan-save-btn').textContent = '💾 Salva Piano';
  document.getElementById('wplan-cancel-btn').style.display = 'none';
}


function renderWplanHistory() {
  const container = document.getElementById('wplan-history');
  const countEl = document.getElementById('wplan-count');
  const plans = state.wplans;
  countEl.textContent = plans.length ? `${plans.length} piano${plans.length !== 1 ? 'i' : ''}` : '';

  if (!plans.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📅</div>
      <p>Nessun piano creato<br>Crea il tuo primo piano di allenamento!</p>
    </div>`;
    return;
  }

  container.innerHTML = plans.map(p => {
    const exRows = p.exercises.map(ex => {
      const repsBadge = ex.reps === 'failure'
        ? `<span class="exercise-badge failure">⚡ Failure</span>`
        : (ex.reps ? `<span class="exercise-badge reps">${ex.reps} rep</span>` : '');
      const dropHTML = (ex.dropSets && ex.dropSets.length)
        ? ex.dropSets.map((ds, i) => {
          const dsRep = ds.reps === 'failure'
            ? `<span class="exercise-badge failure">⚡ Failure</span>`
            : (ds.reps ? `<span class="exercise-badge reps">${ds.reps} rep</span>` : '');
          return `<div class="dropset-history-row">
              <span class="dropset-label-small">↘ Drop ${i + 1}</span>
              ${ds.weight ? `<span class="exercise-badge kgs">${ds.weight} kg</span>` : ''}
              ${dsRep}
            </div>`;
        }).join('')
        : '';
      return `
      <div class="plan-ex-row ${dropHTML ? 'has-dropsets' : ''}">
        <div>
          <div class="plan-ex-name">${ex.name}</div>
          ${dropHTML ? `<div class="dropsets-history" style="margin-top:4px;">${dropHTML}</div>` : ''}
        </div>
        <div class="exercise-badges">
          ${ex.sets ? `<span class="exercise-badge sets">${ex.sets} serie</span>` : ''}
          ${repsBadge}
          ${(() => { const wb = ex.weights && ex.weights.length ? `<span class="exercise-badge kgs per-sets-badge" title="Pesi per set">⚖️ ${ex.weights.join(' / ')} kg</span>` : (ex.weight ? `<span class="exercise-badge kgs">${ex.weight} kg</span>` : ''); return wb; })()}
          ${ex.rir ? `<span class="exercise-badge">${ex.rir}</span>` : ''}
          ${ex.note ? `<span class="exercise-badge note" title="${ex.note}">📝 ${ex.note}</span>` : ''}
        </div>
      </div>`;
    }).join('');

    return `
      <div class="wplan-card" id="wp-${p.id}">
        <div class="wplan-card-header">
          <div>
            <div class="wplan-card-name">📅 ${p.name}</div>
            ${p.desc ? `<div class="wplan-card-desc">${p.desc}</div>` : ''}
            <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">
              🏃 ${p.exercises.length} esercizi
            </div>
          </div>
          <div class="wplan-card-actions">
            <button class="btn-use-plan" onclick="usePlan('${p.id}')">▶ Usa Piano</button>
            <button class="btn btn-ghost btn-sm" onclick="editWplan('${p.id}')" title="Modifica piano" style="font-size:12px;">✏️ Modifica</button>
            <button class="btn-icon" onclick="deleteWplan('${p.id}')" title="Elimina piano">🗑️</button>
          </div>
        </div>
        ${exRows}
      </div>`;
  }).join('');
}

function deleteWplan(id) {
  state.wplans = state.wplans.filter(p => p.id !== id);
  save();
  toast('Piano eliminato', 'error');
  renderWplanHistory();
  renderTrackerPlansPanel();
}

// Quick-use panel in tracker tab
function renderTrackerPlansPanel() {
  const container = document.getElementById('tracker-plans-list');
  if (!state.wplans.length) {
    container.innerHTML = `<div class="empty-state" style="padding:24px;">
      <div class="empty-icon" style="font-size:32px;">📅</div>
      <p>Crea prima un piano nella tab "Piani di Allenamento"</p>
    </div>`;
    return;
  }

  container.innerHTML = state.wplans.map(p => `
    <div class="plan-quick-card">
      <div class="plan-quick-info">
        <div class="plan-quick-name">📅 ${p.name}</div>
        <div class="plan-quick-sub">🏃 ${p.exercises.length} esercizi${p.desc ? ' · ' + p.desc : ''}</div>
      </div>
      <button class="btn-use-plan" onclick="usePlan('${p.id}')">▶ Usa Piano</button>
    </div>`).join('');
}


// ─── INIT ───────────────────────────────────────────────────
(function init() {
  // Set today's date on all date inputs
  ['w-date', 'm-date', 'wo-date'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = today();
  });

  // Check for existing session (remember me)
  const remembered = JSON.parse(localStorage.getItem(SESSION_KEY));
  if (remembered && remembered.email) {
    // Auto-login: load user data and hide overlay
    loadUserState(remembered.email);
    updateSidebarUser(remembered.email);
    document.getElementById('loginOverlay').classList.add('hidden');
    renderDashboard();
  } else {
    // Show login screen — don't render dashboard yet
    document.getElementById('loginOverlay').classList.remove('hidden');
  }
})();
