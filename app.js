/* ===== STATE ===== */
const state = {
  currentView: 'dashboard',
  currentStep: 1,
  projectType: null,
  selections: {
    cabinets: { name: 'Shaker Gray', price: 11400 },
    countertops: { name: 'Quartz White', price: 4200 },
    flooring: { name: 'Porcelain Tile', price: 4600 },
    appliances: { name: 'KitchenAid Suite', price: 6800 }
  },
  markup: 20,
  contingency: 5,
  clientBudget: 0,
  changeOrders: [],
  coCounter: 4,
  apiKey: localStorage.getItem('renovateiq_apikey') || '',
  aiMessages: []
};

/* ===== NAVIGATION ===== */
function switchView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const el = document.getElementById('view-' + view);
  if (el) el.classList.add('active');
  const navEl = document.querySelector(`[data-view="${view}"]`);
  if (navEl) navEl.classList.add('active');
  state.currentView = view;
  document.getElementById('breadcrumb').textContent = {
    dashboard: 'Dashboard',
    estimates: 'Estimate Builder',
    proposals: 'Proposals',
    changeorders: 'Change Orders',
    'client-portal': 'Client Portal',
    'ai-advisor': 'AI Advisor'
  }[view] || view;
  window.scrollTo(0, 0);
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    switchView(item.dataset.view);
    if (window.innerWidth <= 900) {
      document.getElementById('sidebar').classList.remove('open');
    }
  });
});

document.getElementById('btnNewEstimate').addEventListener('click', () => {
  switchView('estimates');
  goToStep(1);
});

document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

/* ===== ESTIMATE STEPS ===== */
function goToStep(n) {
  if (n === 4) populateReview();
  document.querySelectorAll('.step-content').forEach(s => s.classList.add('hidden'));
  document.getElementById('step' + n).classList.remove('hidden');
  document.querySelectorAll('.step').forEach(s => {
    const sn = parseInt(s.dataset.step);
    s.classList.remove('active', 'completed');
    if (sn === n) s.classList.add('active');
    else if (sn < n) s.classList.add('completed');
  });
  const pct = { 1: 25, 2: 50, 3: 75, 4: 100 }[n];
  document.getElementById('stepFill').style.width = pct + '%';
  state.currentStep = n;
  window.scrollTo(0, 0);
}

function selectProjectType(el) {
  document.querySelectorAll('.project-type-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  state.projectType = el.dataset.type;
  document.getElementById('nextStep1').disabled = false;
}

/* ===== OPTION SELECTION ===== */
function selectOption(el) {
  const cat = el.dataset.category;
  document.querySelectorAll(`.option-card[data-category="${cat}"]`).forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  state.selections[cat] = { name: el.dataset.name, price: parseInt(el.dataset.price) };
  updateLivePanel();
}

function filterTier(btn, category, tier) {
  btn.closest('.tier-tabs').querySelectorAll('.tier-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll(`#${category}-grid .option-card`).forEach(card => {
    card.style.display = (tier === 'all' || card.dataset.tier === tier) ? '' : 'none';
  });
}

/* ===== LIVE COST PANEL ===== */
function calcSelections() {
  return Object.values(state.selections).reduce((sum, s) => sum + s.price, 0);
}

function updateLivePanel() {
  const sel = calcSelections();
  const labor = Math.round(sel * 0.15);
  const total = sel + labor;
  animateValue('lcpTotal', total, v => '$' + v.toLocaleString());
  document.getElementById('lcp-cabinets').textContent = '$' + (state.selections.cabinets?.price || 0).toLocaleString();
  document.getElementById('lcp-countertops').textContent = '$' + (state.selections.countertops?.price || 0).toLocaleString();
  document.getElementById('lcp-flooring').textContent = '$' + (state.selections.flooring?.price || 0).toLocaleString();
  document.getElementById('lcp-appliances').textContent = '$' + (state.selections.appliances?.price || 0).toLocaleString();
  document.getElementById('lcp-labor').textContent = '$' + labor.toLocaleString();
  const budget = state.clientBudget;
  const bcEl = document.getElementById('bcValue');
  if (budget > 0) {
    const diff = budget - total;
    bcEl.textContent = (diff >= 0 ? '-$' : '+$') + Math.abs(diff).toLocaleString() + (diff >= 0 ? ' under budget' : ' over budget');
    bcEl.style.color = diff >= 0 ? 'var(--green)' : 'var(--red)';
  } else {
    bcEl.textContent = 'Enter budget in step 2';
    bcEl.style.color = 'var(--text-muted)';
  }
  updateFinalTotal();
}

function animateValue(id, target, fmt) {
  const el = document.getElementById(id);
  if (!el) return;
  const current = parseInt(el.textContent.replace(/[^0-9]/g, '')) || 0;
  const diff = target - current;
  const steps = 20;
  let i = 0;
  const timer = setInterval(() => {
    i++;
    const val = Math.round(current + (diff * (i / steps)));
    el.textContent = fmt(val);
    if (i >= steps) clearInterval(timer);
  }, 16);
}

/* ===== MARKUP / CONTINGENCY ===== */
function updateMarkup(val) {
  state.markup = parseInt(val);
  document.getElementById('markupVal').textContent = val + '%';
  updateFinalTotal();
}
function updateContingency(val) {
  state.contingency = parseInt(val);
  document.getElementById('contingencyVal').textContent = val + '%';
  updateFinalTotal();
}

function updateFinalTotal() {
  const sel = calcSelections();
  const labor = Math.round(sel * 0.15);
  const markupAmt = Math.round((sel + labor) * state.markup / 100);
  const subTotal = sel + labor + markupAmt;
  const contingencyAmt = Math.round(subTotal * state.contingency / 100);
  const grand = subTotal + contingencyAmt;

  setText('ft-selections', '$' + sel.toLocaleString());
  setText('ft-labor', '$' + labor.toLocaleString());
  setText('ft-markup', '$' + markupAmt.toLocaleString());
  setText('ft-contingency', '$' + contingencyAmt.toLocaleString());
  setText('ft-total', '$' + grand.toLocaleString());

  const budgetEl = document.getElementById('ftBudgetStatus');
  if (state.clientBudget > 0 && budgetEl) {
    const diff = state.clientBudget - grand;
    budgetEl.textContent = diff >= 0
      ? `✓ $${Math.abs(diff).toLocaleString()} under client budget`
      : `⚠ $${Math.abs(diff).toLocaleString()} over client budget`;
    budgetEl.style.background = diff >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)';
    budgetEl.style.color = diff >= 0 ? 'var(--green)' : 'var(--red)';
    budgetEl.style.padding = '8px';
    budgetEl.style.borderRadius = '6px';
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ===== REVIEW ===== */
function populateReview() {
  const typeLabels = { kitchen: 'Kitchen', bathroom: 'Bathroom', fullhome: 'Full Home', basement: 'Basement', outdoor: 'Outdoor Living', addition: 'Addition' };
  setText('rv-type', typeLabels[state.projectType] || '—');
  setText('rv-client', document.getElementById('clientName')?.value || '—');
  setText('rv-address', document.getElementById('projectAddress')?.value || '—');
  setText('rv-start', document.getElementById('startDate')?.value || '—');

  const selEl = document.getElementById('rv-selections');
  if (selEl) {
    selEl.innerHTML = Object.entries(state.selections).map(([cat, sel]) =>
      `<div class="rv-category">${cap(cat)}</div><div class="rv-selection-item"><span>${sel.name}</span><span>$${sel.price.toLocaleString()}</span></div>`
    ).join('');
  }

  const sel = calcSelections();
  const labor = Math.round(sel * 0.15);
  const markupAmt = Math.round((sel + labor) * state.markup / 100);
  const subTotal = sel + labor + markupAmt;
  const contingencyAmt = Math.round(subTotal * state.contingency / 100);
  const grand = subTotal + contingencyAmt;

  const costsEl = document.getElementById('rv-costs');
  if (costsEl) {
    costsEl.innerHTML = [
      ['Materials & Selections', sel],
      ['Estimated Labor (15%)', labor],
      [`O&P Markup (${state.markup}%)`, markupAmt],
      [`Contingency (${state.contingency}%)`, contingencyAmt],
      ['Grand Total', grand]
    ].map((r, i) => `<div class="cost-summary-row${i === 4 ? ' total' : ''}"><span>${r[0]}</span><span>$${r[1].toLocaleString()}</span></div>`).join('');
  }

  updateFinalTotal();
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function generateProposal() {
  showToast('Proposal generated! Switching to Proposals view...', 'success');
  setTimeout(() => switchView('proposals'), 1200);
}

/* ===== PROPOSAL TABS ===== */
function switchProposalTab(btn, tabId) {
  document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.ptab-content').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(tabId)?.classList.add('active');
}

function loadProposal(val) {
  showToast('Proposal loaded', 'success');
}

function openProposal(name) {
  switchView('proposals');
}

/* ===== CHANGE ORDER MODAL ===== */
function openChangeOrderModal() {
  document.getElementById('coModal').classList.add('open');
}
function closeChangeOrderModal() {
  document.getElementById('coModal').classList.remove('open');
}
function closeModal(e) {
  if (e.target === e.currentTarget) closeChangeOrderModal();
}

document.getElementById('coAmount')?.addEventListener('input', function() {
  const type = document.getElementById('coType').value;
  const amt = parseFloat(this.value) || 0;
  const sign = type === 'credit' ? '-' : '+';
  document.getElementById('cipValue').textContent = sign + '$' + amt.toLocaleString();
  document.getElementById('cipValue').style.color = type === 'credit' ? 'var(--red)' : 'var(--teal)';
});

document.getElementById('coType')?.addEventListener('change', function() {
  const amt = parseFloat(document.getElementById('coAmount').value) || 0;
  const sign = this.value === 'credit' ? '-' : '+';
  document.getElementById('cipValue').textContent = sign + '$' + amt.toLocaleString();
  document.getElementById('cipValue').style.color = this.value === 'credit' ? 'var(--red)' : 'var(--teal)';
});

function submitChangeOrder() {
  const title = document.getElementById('coTitle').value.trim();
  const desc = document.getElementById('coDescription').value.trim();
  const amt = parseFloat(document.getElementById('coAmount').value) || 0;
  const type = document.getElementById('coType').value;
  if (!title) { showToast('Please enter a change order title', 'error'); return; }
  if (amt <= 0) { showToast('Please enter a valid amount', 'error'); return; }

  const sign = type === 'credit' ? '-' : '+';
  const color = type === 'credit' ? 'var(--red)' : 'var(--green)';
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const tbody = document.getElementById('coTableBody');
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>#CO-00${state.coCounter++}</td>
    <td>Lakewood Kitchen</td>
    <td>${title}</td>
    <td style="color:${color};font-weight:700">${sign}$${amt.toLocaleString()}</td>
    <td><span class="status-badge pending">Pending Signature</span></td>
    <td>${today}</td>
    <td><button class="btn-icon">→</button></td>`;
  tbody.appendChild(row);

  const coList = document.getElementById('coList');
  if (coList) {
    const item = document.createElement('div');
    item.className = 'co-item';
    item.innerHTML = `<div class="co-desc">${title}</div><div class="co-amount positive" style="color:${color}">${sign}$${amt.toLocaleString()}</div><div class="co-date">${today}</div>`;
    coList.appendChild(item);
  }

  document.getElementById('coTitle').value = '';
  document.getElementById('coDescription').value = '';
  document.getElementById('coAmount').value = '';
  closeChangeOrderModal();
  showToast('Change order created successfully!', 'success');
}

/* ===== CLIENT PORTAL ===== */
function copyPortalLink() {
  navigator.clipboard?.writeText('https://renovateiq.app/proposal/lakewood-2024-xyz').catch(() => {});
  showToast('Link copied to clipboard!', 'success');
}

document.querySelectorAll('.portal-opt-item').forEach(item => {
  item.addEventListener('click', function() {
    const radio = this.querySelector('input[type=radio]');
    const group = radio.name;
    document.querySelectorAll(`input[name="${group}"]`).forEach(r => r.closest('.portal-opt-item').classList.remove('checked'));
    this.classList.add('checked');
    radio.checked = true;
    updatePortalTotal();
  });
});

function updatePortalTotal() {
  let base = 48200;
  const ct = document.querySelector('input[name="portal-ct"]:checked');
  const fl = document.querySelector('input[name="portal-fl"]:checked');
  const ctPrices = { 0: 4200, 1: 7800, 2: 9400 };
  const flPrices = { 0: 4600, 1: 5800, 2: 9200 };
  if (ct) {
    const idx = [...document.querySelectorAll('input[name="portal-ct"]')].indexOf(ct);
    base += (ctPrices[idx] - 4200);
  }
  if (fl) {
    const idx = [...document.querySelectorAll('input[name="portal-fl"]')].indexOf(fl);
    base += (flPrices[idx] - 4600);
  }
  const el = document.getElementById('portalTotal');
  if (el) el.textContent = '$' + base.toLocaleString();
}

function acceptProposal() {
  const name = document.getElementById('sigName').value.trim();
  const agreed = document.getElementById('sigAgree').checked;
  if (!name) { showToast('Please type your legal name to sign', 'error'); return; }
  if (!agreed) { showToast('Please check the agreement checkbox', 'error'); return; }
  showToast('🎉 Proposal accepted and signed! Confirmation sent to client.', 'success');
  document.querySelector('.btn-accept').textContent = '✓ Proposal Accepted';
  document.querySelector('.btn-accept').style.background = 'var(--green)';
  document.querySelector('.btn-accept').disabled = true;
}

/* ===== AI ADVISOR ===== */
function saveApiKey() {
  const key = document.getElementById('apiKeyInput').value.trim();
  if (!key.startsWith('sk-ant-')) { showToast('Invalid API key format. Keys start with sk-ant-', 'error'); return; }
  state.apiKey = key;
  localStorage.setItem('renovateiq_apikey', key);
  document.getElementById('aiApiKeySection').style.display = 'none';
  showToast('API key connected!', 'success');
}

if (state.apiKey) {
  const section = document.getElementById('aiApiKeySection');
  if (section) section.style.display = 'none';
}

function sendQuickPrompt(btn) {
  const text = btn.textContent.replace(/^[^ ]+ /, '').trim();
  document.getElementById('aiPromptInput').value = text;
  sendAiMessage();
}

function handleAiKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAiMessage(); }
}

async function sendAiMessage() {
  const input = document.getElementById('aiPromptInput');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';

  appendAiMsg('user', msg);
  const typingId = appendTyping();

  if (!state.apiKey) {
    removeEl(typingId);
    appendAiMsg('ai', 'Please connect your Anthropic API key above to use the AI advisor. Your key is stored locally and never transmitted to our servers.');
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
        system: `You are an expert home renovation cost advisor for RenovateIQ, a professional renovation estimation platform. You help contractors and clients understand renovation costs, material comparisons, project timelines, and budget optimization. Be concise, practical, and specific. Use dollar amounts and percentages when relevant. Focus on the Detroit metro market when pricing is discussed.`,
        messages: [{ role: 'user', content: msg }]
      })
    });
    removeEl(typingId);
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      appendAiMsg('ai', `API error: ${err.error?.message || resp.statusText}. Please check your API key.`);
      return;
    }
    const data = await resp.json();
    appendAiMsg('ai', data.content?.[0]?.text || 'No response');
  } catch (e) {
    removeEl(typingId);
    appendAiMsg('ai', 'Network error connecting to Claude API. Please check your API key and network connection.');
  }
}

function appendAiMsg(role, text) {
  const msgs = document.getElementById('aiMessages');
  const div = document.createElement('div');
  div.className = `ai-message ${role}`;
  const initials = role === 'ai' ? 'AI' : 'TM';
  const formatted = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  div.innerHTML = `<div class="ai-avatar">${initials}</div><div class="ai-bubble">${formatted}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
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

function removeEl(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

/* ===== TOAST ===== */
let toastTimer;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

/* ===== BUDGET SYNC ===== */
document.getElementById('clientBudget')?.addEventListener('input', function() {
  state.clientBudget = parseFloat(this.value) || 0;
  updateLivePanel();
});

/* ===== INIT ===== */
updateLivePanel();
