/* ===== STATE ===== */
const state = {
  currentView: 'dashboard',
  currentStep: 1,
  projectType: null,
  laborLines: [],
  markup: 20,
  contingency: 5,
  clientBudget: 0,
  defaultRate: 95,
  coCounter: 4,
  apiKey: localStorage.getItem('renovateiq_apikey') || ''
};

const TRADE_DEFAULTS = {
  demo:      { name: 'Demo & Hauling',        hours: 16, rate: 65,  crew: 2 },
  framing:   { name: 'Framing & Carpentry',   hours: 20, rate: 85,  crew: 2 },
  electrical:{ name: 'Electrical',            hours: 16, rate: 110, crew: 1 },
  plumbing:  { name: 'Plumbing',              hours: 12, rate: 115, crew: 1 },
  hvac:      { name: 'HVAC',                  hours: 10, rate: 105, crew: 1 },
  tile:      { name: 'Tile Work',             hours: 16, rate: 90,  crew: 1 },
  flooring:  { name: 'Flooring Install',      hours: 12, rate: 85,  crew: 2 },
  cabinets:  { name: 'Cabinet Install',       hours: 24, rate: 85,  crew: 2 },
  drywall:   { name: 'Drywall & Taping',      hours: 16, rate: 75,  crew: 2 },
  painting:  { name: 'Painting',              hours: 12, rate: 75,  crew: 1 },
  trim:      { name: 'Trim & Millwork',       hours: 8,  rate: 85,  crew: 1 },
  cleanup:   { name: 'Final Cleanup',         hours: 6,  rate: 65,  crew: 2 }
};

let lineIdCounter = 0;

/* ===== NAV ===== */
function switchView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('view-' + view)?.classList.add('active');
  document.querySelector(`[data-view="${view}"]`)?.classList.add('active');
  state.currentView = view;
  document.getElementById('breadcrumb').textContent = {
    dashboard: 'Dashboard', estimates: 'Estimate Builder',
    proposals: 'Proposals', changeorders: 'Change Orders',
    'client-portal': 'Client Portal', 'ai-advisor': 'AI Advisor'
  }[view] || view;
  window.scrollTo(0, 0);
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    switchView(item.dataset.view);
    if (window.innerWidth <= 900) document.getElementById('sidebar').classList.remove('open');
  });
});

document.getElementById('btnNewEstimate').addEventListener('click', () => {
  switchView('estimates');
  goToStep(1);
});

document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

/* ===== STEPS ===== */
function goToStep(n) {
  if (n === 3) populateReview();
  document.querySelectorAll('.step-content').forEach(s => s.classList.add('hidden'));
  document.getElementById('step' + n).classList.remove('hidden');
  document.querySelectorAll('.step').forEach(s => {
    const sn = parseInt(s.dataset.step);
    s.classList.remove('active', 'completed');
    if (sn === n) s.classList.add('active');
    else if (sn < n) s.classList.add('completed');
  });
  document.getElementById('stepFill').style.width = { 1: 33, 2: 66, 3: 100 }[n] + '%';
  state.currentStep = n;
  window.scrollTo(0, 0);
}

function selectProjectType(el) {
  document.querySelectorAll('.project-type-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  state.projectType = el.dataset.type;
  document.getElementById('nextStep1').disabled = false;
}

/* ===== LABOR LINES ===== */
document.getElementById('quickAddTrade').addEventListener('change', function () {
  const key = this.value;
  if (!key) return;
  const def = TRADE_DEFAULTS[key];
  if (def) addLaborLine(def.name, def.crew, def.hours, def.rate);
  this.value = '';
});

function addCustomLine() {
  addLaborLine('Custom Task', 1, 8, state.defaultRate);
}

function addLaborLine(name, crew, hours, rate) {
  const id = 'line-' + (lineIdCounter++);
  const total = crew * hours * rate;

  const container = document.getElementById('laborLines');
  document.getElementById('laborEmpty').style.display = 'none';

  const div = document.createElement('div');
  div.className = 'labor-line';
  div.id = id;
  div.innerHTML = `
    <input type="text" value="${name}" placeholder="Trade / Task" oninput="recalcLine('${id}')">
    <input type="number" value="${crew}" min="1" max="20" placeholder="Crew" class="line-crew-cell" oninput="recalcLine('${id}')">
    <input type="number" value="${hours}" min="0" placeholder="Hrs" oninput="recalcLine('${id}')">
    <input type="number" value="${rate}" min="0" placeholder="Rate" class="line-rate-cell" oninput="recalcLine('${id}')">
    <div class="labor-line-total line-total-cell" id="${id}-total">$${total.toLocaleString()}</div>
    <button class="labor-line-delete" onclick="deleteLine('${id}')" title="Remove">✕</button>`;
  container.appendChild(div);

  state.laborLines.push({ id, name, crew, hours, rate, total });
  updateLivePanel();
}

function recalcLine(id) {
  const row = document.getElementById(id);
  if (!row) return;
  const inputs = row.querySelectorAll('input');
  const crew  = parseFloat(inputs[1].value) || 0;
  const hours = parseFloat(inputs[2].value) || 0;
  const rate  = parseFloat(inputs[3].value) || 0;
  const total = crew * hours * rate;
  row.querySelector(`#${id}-total`).textContent = '$' + total.toLocaleString();

  const line = state.laborLines.find(l => l.id === id);
  if (line) { line.name = inputs[0].value; line.crew = crew; line.hours = hours; line.rate = rate; line.total = total; }
  updateLivePanel();
}

function deleteLine(id) {
  document.getElementById(id)?.remove();
  state.laborLines = state.laborLines.filter(l => l.id !== id);
  if (state.laborLines.length === 0) document.getElementById('laborEmpty').style.display = '';
  updateLivePanel();
}

function applyRatePreset(label, rate) {
  const focused = document.activeElement;
  if (focused && focused.closest('.labor-line')) {
    const row = focused.closest('.labor-line');
    const rateInput = row.querySelectorAll('input')[3];
    rateInput.value = rate;
    rateInput.dispatchEvent(new Event('input'));
    showToast(`Rate set to $${rate}/hr`, 'success');
  } else {
    state.defaultRate = rate;
    document.getElementById('defaultRate').value = rate;
    showToast(`Default rate set to $${rate}/hr (${label})`, 'success');
  }
}

/* ===== LIVE PANEL ===== */
function calcTotal() { return state.laborLines.reduce((s, l) => s + l.total, 0); }
function calcHours() { return state.laborLines.reduce((s, l) => s + (l.crew * l.hours), 0); }

function updateLivePanel() {
  const total = calcTotal();
  const hours = calcHours();
  const lines = state.laborLines.length;
  const blended = hours > 0 ? Math.round(total / hours) : 0;

  animateValue('lcpTotal', total, v => '$' + v.toLocaleString());
  setText('lcpHours', hours + ' hrs');
  setText('lcpLines', lines);
  setText('lcpBlended', hours > 0 ? '$' + blended + '/hr' : '—');

  // Breakdown
  const bd = document.getElementById('lcpBreakdown');
  if (lines === 0) {
    bd.innerHTML = '<div class="lcp-empty-msg">Add labor lines to see breakdown</div>';
  } else {
    bd.innerHTML = state.laborLines.map(l =>
      `<div class="lcp-item"><span>${l.name}</span><span>$${l.total.toLocaleString()}</span></div>`
    ).join('');
  }

  // Budget check
  const bcEl = document.getElementById('bcValue');
  if (state.clientBudget > 0) {
    const diff = state.clientBudget - total;
    bcEl.textContent = (diff >= 0 ? '-$' : '+$') + Math.abs(diff).toLocaleString() + (diff >= 0 ? ' under' : ' over');
    bcEl.style.color = diff >= 0 ? 'var(--green)' : 'var(--red)';
  } else {
    bcEl.textContent = '—';
    bcEl.style.color = 'var(--text-muted)';
  }

  updateFinalTotal();
}

/* ===== MARKUP ===== */
function updateMarkup(val) {
  state.markup = parseInt(val);
  document.getElementById('markupVal').textContent = val + '%';
  document.getElementById('ft-markup-pct').textContent = val;
  updateFinalTotal();
}
function updateContingency(val) {
  state.contingency = parseInt(val);
  document.getElementById('contingencyVal').textContent = val + '%';
  document.getElementById('ft-cont-pct').textContent = val;
  updateFinalTotal();
}

function updateFinalTotal() {
  const raw = calcTotal();
  const markupAmt = Math.round(raw * state.markup / 100);
  const sub = raw + markupAmt;
  const contAmt = Math.round(sub * state.contingency / 100);
  const grand = sub + contAmt;

  setText('ft-raw', '$' + raw.toLocaleString());
  setText('ft-markup', '$' + markupAmt.toLocaleString());
  setText('ft-contingency', '$' + contAmt.toLocaleString());
  setText('ft-total', '$' + grand.toLocaleString());

  const statusEl = document.getElementById('ftBudgetStatus');
  if (statusEl && state.clientBudget > 0) {
    const diff = state.clientBudget - grand;
    statusEl.textContent = diff >= 0
      ? `✓ $${Math.abs(diff).toLocaleString()} under client budget`
      : `⚠ $${Math.abs(diff).toLocaleString()} over client budget`;
    statusEl.style.background = diff >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)';
    statusEl.style.color = diff >= 0 ? 'var(--green)' : 'var(--red)';
    statusEl.style.padding = '8px';
    statusEl.style.borderRadius = '6px';
    statusEl.style.marginTop = '8px';
  }
}

/* ===== REVIEW ===== */
function populateReview() {
  const typeLabels = { kitchen:'Kitchen', bathroom:'Bathroom', fullhome:'Full Home', basement:'Basement', outdoor:'Outdoor', addition:'Addition' };
  setText('rv-type', typeLabels[state.projectType] || '—');
  setText('rv-client', document.getElementById('clientName')?.value || '—');
  setText('rv-address', document.getElementById('projectAddress')?.value || '—');
  setText('rv-start', document.getElementById('startDate')?.value || '—');
  const hours = calcHours();
  const total = calcTotal();
  setText('rv-hours', hours + ' hrs');
  setText('rv-rate', hours > 0 ? '$' + Math.round(total / hours) + '/hr blended' : '—');

  const linesEl = document.getElementById('rv-lines');
  if (linesEl) {
    if (state.laborLines.length === 0) {
      linesEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.875rem">No labor lines added yet.</p>';
    } else {
      linesEl.innerHTML = `
        <div class="rv-labor-head"><span>Task</span><span>Crew</span><span>Hours</span><span>Rate</span><span>Total</span></div>
        ${state.laborLines.map(l => `
          <div class="rv-labor-row">
            <span>${l.name}</span>
            <span>${l.crew}</span>
            <span>${l.crew * l.hours} hrs</span>
            <span>$${l.rate}/hr</span>
            <span class="rv-labor-total">$${l.total.toLocaleString()}</span>
          </div>`).join('')}`;
    }
  }
  updateFinalTotal();
}

function generateProposal() {
  showToast('Proposal generated! Opening Proposals view...', 'success');
  setTimeout(() => switchView('proposals'), 1200);
}

/* ===== PROPOSAL TABS ===== */
function switchProposalTab(btn, tabId) {
  document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.ptab-content').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(tabId)?.classList.add('active');
}

function openProposal() { switchView('proposals'); }

/* ===== CHANGE ORDERS ===== */
function openChangeOrderModal() { document.getElementById('coModal').classList.add('open'); }
function closeChangeOrderModal() { document.getElementById('coModal').classList.remove('open'); }
function closeModal(e) { if (e.target === e.currentTarget) closeChangeOrderModal(); }

function updateCoPreview() {
  const hours = parseFloat(document.getElementById('coHours').value) || 0;
  const rate  = parseFloat(document.getElementById('coRate').value) || 0;
  const type  = document.getElementById('coType').value;
  const cost  = hours * rate;
  const sign  = type === 'credit' ? '-' : '+';
  const color = type === 'credit' ? 'var(--red)' : 'var(--teal)';
  document.getElementById('cipHours').textContent = sign + hours + ' hrs';
  document.getElementById('cipHours').style.color = color;
  document.getElementById('cipValue').textContent = sign + '$' + cost.toLocaleString();
  document.getElementById('cipValue').style.color = color;
}

function submitChangeOrder() {
  const title = document.getElementById('coTitle').value.trim();
  const hours = parseFloat(document.getElementById('coHours').value) || 0;
  const rate  = parseFloat(document.getElementById('coRate').value) || 0;
  const type  = document.getElementById('coType').value;
  if (!title) { showToast('Enter a description', 'error'); return; }
  if (hours <= 0) { showToast('Enter hours', 'error'); return; }
  if (rate <= 0)  { showToast('Enter a rate', 'error'); return; }

  const sign = type === 'credit' ? '-' : '+';
  const cost = hours * rate;
  const color = type === 'credit' ? 'var(--red)' : 'var(--green)';
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const tbody = document.getElementById('coTableBody');
  const row = document.createElement('tr');
  row.innerHTML = `<td>#CO-00${state.coCounter++}</td><td>Active Project</td><td>${title}</td><td style="color:${color};font-weight:700">${sign}${hours} hrs</td><td style="color:${color};font-weight:700">${sign}$${cost.toLocaleString()}</td><td><span class="status-badge pending">Pending Signature</span></td><td>${today}</td>`;
  tbody.appendChild(row);

  const coList = document.getElementById('coList');
  if (coList) {
    const item = document.createElement('div');
    item.className = 'co-item';
    item.innerHTML = `<div class="co-desc">${title}</div><div class="co-amount positive" style="color:${color}">${sign}${hours}hrs / ${sign}$${cost.toLocaleString()}</div><div class="co-date">${today}</div>`;
    coList.appendChild(item);
  }

  ['coTitle','coHours','coRate'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  closeChangeOrderModal();
  showToast('Change order created!', 'success');
}

/* ===== CLIENT PORTAL ===== */
function copyPortalLink() {
  navigator.clipboard?.writeText('https://renovateiq.app/labor/lakewood-2024-xyz').catch(() => {});
  showToast('Link copied!', 'success');
}

function acceptProposal() {
  const name = document.getElementById('sigName').value.trim();
  const agreed = document.getElementById('sigAgree').checked;
  if (!name) { showToast('Type your legal name to sign', 'error'); return; }
  if (!agreed) { showToast('Please check the agreement box', 'error'); return; }
  showToast('🎉 Proposal accepted and signed! Confirmation sent.', 'success');
  const btn = document.querySelector('.btn-accept');
  btn.textContent = '✓ Accepted & Signed';
  btn.style.background = 'var(--green)';
  btn.disabled = true;
}

/* ===== AI ADVISOR ===== */
function saveApiKey() {
  const key = document.getElementById('apiKeyInput').value.trim();
  if (!key.startsWith('sk-ant-')) { showToast('Invalid key — must start with sk-ant-', 'error'); return; }
  state.apiKey = key;
  localStorage.setItem('renovateiq_apikey', key);
  document.getElementById('aiApiKeySection').style.display = 'none';
  showToast('API key connected!', 'success');
}
if (state.apiKey) { const s = document.getElementById('aiApiKeySection'); if (s) s.style.display = 'none'; }

function sendQuickPrompt(btn) {
  const text = btn.textContent.replace(/^[^\s]+\s/, '').trim();
  document.getElementById('aiPromptInput').value = text;
  sendAiMessage();
}
function handleAiKeydown(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAiMessage(); } }

async function sendAiMessage() {
  const input = document.getElementById('aiPromptInput');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  appendAiMsg('user', msg);
  const typingId = appendTyping();

  if (!state.apiKey) {
    removeEl(typingId);
    appendAiMsg('ai', 'Please connect your Anthropic API key above to enable the AI advisor.');
    return;
  }

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': state.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: 'You are an expert construction labor cost advisor for RenovateIQ. Help contractors estimate labor hours, crew sizes, and rates for home renovation projects. Be specific with dollar amounts and hours. Focus on the Detroit metro market when location-specific info is requested. Keep responses concise and actionable.',
        messages: [{ role: 'user', content: msg }]
      })
    });
    removeEl(typingId);
    if (!resp.ok) { const e = await resp.json().catch(() => ({})); appendAiMsg('ai', `API error: ${e.error?.message || resp.statusText}`); return; }
    const data = await resp.json();
    appendAiMsg('ai', data.content?.[0]?.text || 'No response');
  } catch {
    removeEl(typingId);
    appendAiMsg('ai', 'Network error. Check your API key and connection.');
  }
}

function appendAiMsg(role, text) {
  const msgs = document.getElementById('aiMessages');
  const div = document.createElement('div');
  div.className = `ai-message ${role}`;
  div.innerHTML = `<div class="ai-avatar">${role === 'ai' ? 'AI' : 'TM'}</div><div class="ai-bubble">${text.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function appendTyping() {
  const msgs = document.getElementById('aiMessages');
  const div = document.createElement('div');
  div.className = 'ai-message ai';
  div.id = 'typing-' + Date.now();
  div.innerHTML = `<div class="ai-avatar">AI</div><div class="ai-bubble"><div class="ai-typing"><span></span><span></span><span></span></div></div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div.id;
}

function removeEl(id) { document.getElementById(id)?.remove(); }

/* ===== HELPERS ===== */
let toastTimer;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function animateValue(id, target, fmt) {
  const el = document.getElementById(id);
  if (!el) return;
  const current = parseInt(el.textContent.replace(/[^0-9]/g,'')) || 0;
  const diff = target - current; let i = 0;
  const t = setInterval(() => { i++; el.textContent = fmt(Math.round(current + diff * (i/20))); if (i >= 20) clearInterval(t); }, 16);
}
