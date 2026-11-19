import { pnl, risk, rMultiple, stats, byDate, sampleTrades, validateTrade } from './src/journal.js';

/* ---------- storage ---------- */
const KEY = 'tradelog.trades.v1';
const store = {
  load() {
    try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  },
  save(trades) {
    try { localStorage.setItem(KEY, JSON.stringify(trades)); } catch { /* private mode: keep in memory */ }
  }
};

/* ---------- state ---------- */
let trades = store.load() || sampleTrades();
let view = 'dashboard';

const $ = s => document.querySelector(s);
const money = v => (v < 0 ? '−$' : '$') + Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
const signedMoney = v => (v > 0 ? '+' : '') + money(v);
const fmtR = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2) + 'R';
const cls = v => (v > 0 ? 'up' : v < 0 ? 'down' : '');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function inRange(list) {
  const days = $('#rangeSel').value;
  if (days === 'all') return list;
  const from = new Date(); from.setDate(from.getDate() - +days);
  const iso = from.toISOString().slice(0, 10);
  return list.filter(t => t.date >= iso);
}

/* ---------- rendering ---------- */
function render() {
  const list = inRange(trades);
  if (view === 'dashboard') renderDashboard(list); else renderTrades(list);
  $('#setups').innerHTML = [...new Set(trades.map(t => t.setup))].map(s => `<option value="${esc(s)}">`).join('');
}

function renderDashboard(list) {
  const s = stats(list);
  const pf = s.profitFactor === Infinity ? '∞' : s.profitFactor.toFixed(2);
  $('#kpis').innerHTML = [
    ['Net P&L', `<b class="${cls(s.net)}">${signedMoney(s.net)}</b>`, `${s.count} trades`],
    ['Win rate', `<b>${(s.winRate * 100).toFixed(0)}%</b>`, `${Math.round(s.winRate * s.count)} winners`],
    ['Average R', `<b class="${cls(s.avgR)}">${fmtR(s.avgR)}</b>`, 'per trade'],
    ['Profit factor', `<b>${pf}</b>`, 'gross win ÷ gross loss'],
    ['Max drawdown', `<b class="down">${money(s.maxDrawdown)}</b>`, 'peak to trough']
  ].map(([k, v, n]) => `<div class="kpi"><span>${k}</span>${v}<small>${n}</small></div>`).join('');

  drawEquity(byDate(list));
  drawHistogram(list.map(rMultiple));

  const groups = {};
  list.forEach(t => (groups[t.setup] = groups[t.setup] || []).push(t));
  const rows = Object.entries(groups).map(([k, a]) => [k, stats(a)]).sort((a, b) => b[1].net - a[1].net);
  $('#setupTable').innerHTML = '<thead><tr><th>Setup</th><th class="num">Trades</th><th class="num">Win rate</th><th class="num">Avg R</th><th class="num">Net</th></tr></thead><tbody>' +
    (rows.map(([k, st]) => `<tr><td>${esc(k)}</td><td class="num">${st.count}</td><td class="num">${(st.winRate * 100).toFixed(0)}%</td><td class="num ${cls(st.avgR)}">${fmtR(st.avgR)}</td><td class="num ${cls(st.net)}">${signedMoney(st.net)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">No trades in this range</td></tr>') + '</tbody>';

  const recent = byDate(list).reverse().slice(0, 6);
  $('#recentTable').innerHTML = '<thead><tr><th>Date</th><th>Symbol</th><th>Side</th><th class="num">R</th><th class="num">P&L</th></tr></thead><tbody>' +
    (recent.map(t => `<tr><td>${t.date}</td><td>${esc(t.symbol)}</td><td><span class="pill pill--${t.side.toLowerCase()}">${t.side}</span></td><td class="num ${cls(rMultiple(t))}">${fmtR(rMultiple(t))}</td><td class="num ${cls(pnl(t))}">${signedMoney(pnl(t))}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">No trades yet</td></tr>') + '</tbody>';
}

function renderTrades(list) {
  const q = $('#search').value.trim().toLowerCase();
  const side = $('#sideFilter').value, res = $('#resultFilter').value;
  const rows = byDate(list).reverse().filter(t =>
    (!q || [t.symbol, t.setup, t.notes].join(' ').toLowerCase().includes(q)) &&
    (!side || t.side === side) &&
    (!res || (res === 'win' ? pnl(t) > 0 : pnl(t) <= 0)));
  $('#tradeTable').innerHTML = '<thead><tr><th>Date</th><th>Symbol</th><th>Side</th><th>Setup</th><th class="num">Entry</th><th class="num">Stop</th><th class="num">Exit</th><th class="num">Qty</th><th class="num">R</th><th class="num">P&L</th><th>Notes</th><th></th></tr></thead><tbody>' +
    (rows.map(t => `<tr><td>${t.date}</td><td>${esc(t.symbol)}</td><td><span class="pill pill--${t.side.toLowerCase()}">${t.side}</span></td><td>${esc(t.setup)}</td><td class="num">${t.entry}</td><td class="num">${t.stop}</td><td class="num">${t.exit}</td><td class="num">${t.qty}</td><td class="num ${cls(rMultiple(t))}">${fmtR(rMultiple(t))}</td><td class="num ${cls(pnl(t))}">${signedMoney(pnl(t))}</td><td class="notes" title="${esc(t.notes)}">${esc(t.notes)}</td><td><button class="del" data-del="${t.id}" aria-label="Delete trade ${t.id}">Delete</button></td></tr>`).join('') ||
      '<tr><td colspan="12" class="empty">No trades match these filters</td></tr>') + '</tbody>';
}

/* ---------- charts (plain canvas, no library) ---------- */
function setupCanvas(c) {
  const dpr = window.devicePixelRatio || 1, w = c.clientWidth, h = +c.getAttribute('height');
  c.width = w * dpr; c.height = h * dpr; c.style.height = h + 'px';
  const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
  return { ctx, w, h };
}
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

function drawEquity(list) {
  const { ctx, w, h } = setupCanvas($('#equity'));
  const pad = { l: 56, r: 12, t: 10, b: 24 };
  let eq = 0; const pts = [0, ...list.map(t => (eq += pnl(t)))];
  const min = Math.min(0, ...pts), max = Math.max(0, ...pts), span = max - min || 1;
  const x = i => pad.l + (i / Math.max(1, pts.length - 1)) * (w - pad.l - pad.r);
  const y = v => pad.t + (1 - (v - min) / span) * (h - pad.t - pad.b);
  ctx.font = '11px Inter, sans-serif'; ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) {
    const v = min + (span * i) / 4, yy = y(v);
    ctx.strokeStyle = css('--line'); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke();
    ctx.fillStyle = css('--muted'); ctx.textAlign = 'right'; ctx.fillText(money(v), pad.l - 8, yy);
  }
  const up = pts[pts.length - 1] >= 0, col = up ? css('--up') : css('--down');
  const g = ctx.createLinearGradient(0, pad.t, 0, h - pad.b);
  g.addColorStop(0, up ? 'rgba(34,197,94,.28)' : 'rgba(239,68,68,.28)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath(); pts.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))));
  ctx.lineTo(x(pts.length - 1), y(min)); ctx.lineTo(x(0), y(min)); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
  ctx.beginPath(); pts.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))));
  ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
  const lx = x(pts.length - 1), ly = y(pts[pts.length - 1]);
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(lx, ly, 3.5, 0, Math.PI * 2); ctx.fill();
  if (list.length) {
    ctx.fillStyle = css('--muted'); ctx.textAlign = 'left'; ctx.fillText(list[0].date, pad.l, h - 8);
    ctx.textAlign = 'right'; ctx.fillText(list[list.length - 1].date, w - pad.r, h - 8);
  }
  $('#equityNote').textContent = list.length ? `${signedMoney(pts[pts.length - 1])} over ${list.length} trades` : '';
}

function drawHistogram(rs) {
  const { ctx, w, h } = setupCanvas($('#hist'));
  const bins = [-1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5];
  const counts = bins.slice(0, -1).map((b, i) => rs.filter(r => r >= b && r < bins[i + 1]).length);
  const pad = { l: 10, r: 10, t: 22, b: 24 }, max = Math.max(1, ...counts);
  const bw = (w - pad.l - pad.r) / counts.length;
  ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
  counts.forEach((c, i) => {
    const bh = (c / max) * (h - pad.t - pad.b), xx = pad.l + i * bw;
    ctx.fillStyle = bins[i] < 0 ? css('--down') : css('--up');
    ctx.globalAlpha = 0.85; ctx.fillRect(xx + 3, h - pad.b - bh, bw - 6, bh); ctx.globalAlpha = 1;
    if (c) { ctx.fillStyle = css('--ink'); ctx.fillText(c, xx + bw / 2, h - pad.b - bh - 8); }
    ctx.fillStyle = css('--muted'); ctx.fillText(bins[i] + 'R', xx + bw / 2, h - 8);
  });
}

/* ---------- new trade form ---------- */
const dialog = $('#tradeDialog'), form = $('#tradeForm');
function readForm() {
  const f = Object.fromEntries(new FormData(form));
  ['entry', 'stop', 'exit', 'qty'].forEach(k => (f[k] = parseFloat(f[k])));
  f.symbol = (f.symbol || '').trim().toUpperCase(); f.setup = (f.setup || '').trim();
  return f;
}
form.addEventListener('input', () => {
  const t = readForm();
  $('#preview').textContent = validateTrade(t) || !t.symbol ? 'Fill in entry, stop, exit and quantity to see the result.'
    : `Risk ${money(risk(t))} · Result ${signedMoney(pnl(t))} · ${fmtR(rMultiple(t))}`;
});
form.addEventListener('submit', e => {
  const t = readForm(), err = validateTrade(t);
  if (err) { e.preventDefault(); $('#formError').textContent = err; return; }
  t.id = Math.max(0, ...trades.map(x => x.id)) + 1;
  trades.push(t); store.save(trades); render(); toast('Trade saved');
});
$('#newTradeBtn').addEventListener('click', () => {
  form.reset(); $('#formError').textContent = ''; form.date.value = new Date().toISOString().slice(0, 10);
  $('#preview').textContent = 'Fill in entry, stop, exit and quantity to see the result.';
  dialog.showModal();
});
$('#cancelBtn').addEventListener('click', () => dialog.close());

/* ---------- navigation, filters, actions ---------- */
function setView(v) {
  view = v;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('on', b.dataset.view === v));
  $('#view-dashboard').hidden = v !== 'dashboard'; $('#view-trades').hidden = v !== 'trades';
  $('#viewTitle').textContent = v === 'dashboard' ? 'Dashboard' : 'Trades';
  $('#viewSub').textContent = v === 'dashboard' ? 'Performance across all logged trades' : 'Every trade you have logged';
  render();
}
document.addEventListener('click', e => {
  const nav = e.target.closest('[data-view]'); if (nav) setView(nav.dataset.view);
  const del = e.target.closest('[data-del]');
  if (del) { trades = trades.filter(t => t.id !== +del.dataset.del); store.save(trades); render(); toast('Trade deleted'); }
});
['#search', '#sideFilter', '#resultFilter', '#rangeSel'].forEach(s => $(s).addEventListener('input', render));
$('#resetBtn').addEventListener('click', () => { trades = sampleTrades(); store.save(trades); render(); toast('Sample data restored'); });
$('#exportBtn').addEventListener('click', () => {
  const head = ['date', 'symbol', 'side', 'setup', 'entry', 'stop', 'exit', 'qty', 'pnl', 'r', 'notes'];
  const rows = byDate(trades).map(t => [t.date, t.symbol, t.side, t.setup, t.entry, t.stop, t.exit, t.qty, pnl(t).toFixed(2), rMultiple(t).toFixed(2), '"' + String(t.notes || '').replace(/"/g, '""') + '"'].join(','));
  const url = URL.createObjectURL(new Blob([head.join(',') + '\n' + rows.join('\n')], { type: 'text/csv' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'tradelog.csv' }); a.click(); URL.revokeObjectURL(url);
});
let tt;
function toast(m) { const el = $('#toast'); el.textContent = m; el.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('show'), 1800); }
let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(render, 120); });

store.save(trades);
render();
