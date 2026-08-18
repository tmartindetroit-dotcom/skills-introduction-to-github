/* ===== DEFAULT RATES ===== */
var DEFAULT_RATES = {
  demo:       { name: 'Demo & Hauling',      unit: 'hr',   rate: 65,   minCharge: 400, notes: 'Includes dumpster coordination' },
  electrical: { name: 'Electrical',           unit: 'hr',   rate: 110,  minCharge: 250, notes: 'Licensed electrician' },
  plumbing:   { name: 'Plumbing',             unit: 'hr',   rate: 105,  minCharge: 200, notes: 'Licensed plumber' },
  framing:    { name: 'Framing / Carpentry',  unit: 'hr',   rate: 85,   minCharge: 300, notes: '' },
  drywall:    { name: 'Drywall',              unit: 'sqft', rate: 3.50, minCharge: 200, notes: 'Hang, tape, mud, sand' },
  painting:   { name: 'Painting',             unit: 'sqft', rate: 2.25, minCharge: 150, notes: 'Labor only, 2 coats' },
  flooring:   { name: 'Flooring Install',     unit: 'sqft', rate: 4.00, minCharge: 300, notes: 'Hardwood / LVP' },
  tile:       { name: 'Tile Work',            unit: 'sqft', rate: 12,   minCharge: 400, notes: 'Floor or wall tile' },
  hvac:       { name: 'HVAC',                 unit: 'hr',   rate: 95,   minCharge: 300, notes: '' },
  cabinets:   { name: 'Cabinet Install',      unit: 'hr',   rate: 85,   minCharge: 300, notes: '' },
  trim:       { name: 'Trim & Millwork',      unit: 'hr',   rate: 80,   minCharge: 200, notes: '' },
  cleanup:    { name: 'Final Cleanup',        unit: 'hr',   rate: 45,   minCharge: 150, notes: '' },
};

var state = {
  currentView: 'dashboard',
  currentStep: 1,
  projectType: null,
  laborLines: [],
  markup: 20,
  contingency: 5,
  clientBudget: 0,
  defaultRate: 95,
  coCounter: 3,
  apiKey: localStorage.getItem('renovateiq_apikey') || '',
  rates: JSON.parse(localStorage.getItem('renovateiq_rates') || 'null') || JSON.parse(JSON.stringify(DEFAULT_RATES)),
};

/* ===== NAVIGATION ===== */
function switchView(view) {
  state.currentView = view;
  document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });

  var el = document.getElementById('view-' + view);
  if (el) el.classList.add('active');
  var navEl = document.querySelector('.nav-item[data-view="' + view + '"]');
  if (navEl) navEl.classList.add('active');

  var titles = {
    dashboard: 'Dashboard', estimates: 'New Estimate', rates: 'My Rates',
    proposals: 'Proposals', changeorders: 'Change Orders',
    'client-portal': 'Client Portal', 'ai-advisor': 'AI Advisor'
  };
  var bc = document.getElementById('breadcrumb');
  if (bc) bc.textContent = titles[view] || view;

  if (view === 'rates') renderRatesTable();
  document.getElementById('sidebar').classList.remove('open');
}

document.querySelectorAll('.nav-item').forEach(function(item) {
  item.addEventListener('click', function(e) {
    e.preventDefault();
    switchView(this.dataset.view);
  });
});

var menuToggle = document.getElementById('menuToggle');
if (menuToggle) {
  menuToggle.addEventListener('click', function() {
    document.getElementById('sidebar').classList.toggle('open');
  });
}

var btnNew = document.getElementById('btnNewEstimate');
if (btnNew) {
  btnNew.addEventListener('click', function() { switchView('estimates'); });
}

/* ===== ESTIMATES — STEP MANAGEMENT ===== */
function selectProjectType(el) {
  state.projectType = el.dataset.type;
  document.querySelectorAll('.project-type-card').forEach(function(c) { c.classList.remove('selected'); });
  el.classList.add('selected');
  var btn = document.getElementById('nextStep1');
  if (btn) btn.removeAttribute('disabled');
}

function goToStep(step) {
  if (step === 2 && !state.projectType) {
    showToast('Please pick a project type first 🐒');
    return;
  }
  state.currentStep = step;

  // Hide all step contents
  document.querySelectorAll('.step-content').forEach(function(sc) {
    sc.classList.add('hidden');
    sc.classList.remove('active-step');
  });
  var sc = document.getElementById('step' + step);
  if (sc) { sc.classList.remove('hidden'); sc.classList.add('active-step'); }

  // Update step indicator
  var pct = step === 1 ? 33 : step === 2 ? 66 : 100;
  var fill = document.getElementById('stepFill');
  if (fill) fill.style.width = pct + '%';
  document.querySelectorAll('.step').forEach(function(s) {
    var n = parseInt(s.dataset.step);
    s.classList.toggle('active', n === step);
    s.classList.toggle('done', n < step);
  });

  if (step === 2) { renderLaborLines(); renderMiniPresets(); updateLivePanel(); }
  if (step === 3) renderReview();
}

/* ===== LABOR LINES ===== */
function getTradeDefaults(key) {
  return state.rates[key] || { name: 'Custom Trade', unit: 'hr', rate: state.defaultRate || 85 };
}

function addLaborLineByKey(key) {
  var td = getTradeDefaults(key);
  var isHr = td.unit === 'hr';
  state.laborLines.push({
    id: Date.now() + Math.random(),
    name: td.name,
    unit: td.unit,
    crew: isHr ? 1 : 0,
    hours: isHr ? 8 : 0,
    sqft: !isHr ? 500 : 0,
    rate: td.rate,
  });
  renderLaborLines();
  updateLivePanel();
}

function addCustomLine() {
  state.laborLines.push({
    id: Date.now() + Math.random(),
    name: 'Custom Trade',
    unit: 'hr',
    crew: 1, hours: 8, sqft: 0,
    rate: state.defaultRate || 85,
  });
  renderLaborLines();
  updateLivePanel();
}

function removeLaborLine(id) {
  state.laborLines = state.laborLines.filter(function(l) { return l.id !== id; });
  renderLaborLines();
  updateLivePanel();
}

function updateLaborLine(id, field, value) {
  var line = state.laborLines.find(function(l) { return l.id === id; });
  if (!line) return;
  if (field === 'name' || field === 'unit') {
    line[field] = value;
  } else {
    line[field] = parseFloat(value) || 0;
  }
  updateLivePanel();
}

function calcLineTotal(line) {
  if (line.unit === 'sqft') return (line.sqft || 0) * (line.rate || 0);
  if (line.unit === 'flat') return line.rate || 0;
  return (line.crew || 0) * (line.hours || 0) * (line.rate || 0);
}

function renderLaborLines() {
  var container = document.getElementById('laborLines');
  var emptyMsg = document.getElementById('laborEmpty');
  if (!container) return;

  if (state.laborLines.length === 0) {
    container.innerHTML = '';
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }
  if (emptyMsg) emptyMsg.style.display = 'none';

  container.innerHTML = state.laborLines.map(function(line) {
    var sub = calcLineTotal(line);
    var isHr = line.unit === 'hr';
    var isSqft = line.unit === 'sqft';

    var qtyInput = isHr
      ? '<div class="ll-qty-pair"><input type="number" min="1" value="' + (line.crew||1) + '" oninput="updateLaborLine(' + line.id + ',\'crew\',this.value)" title="Crew"><input type="number" min="0" value="' + (line.hours||0) + '" oninput="updateLaborLine(' + line.id + ',\'hours\',this.value)" title="Hours"></div>'
      : '<input type="number" min="0" value="' + (line.sqft||0) + '" oninput="updateLaborLine(' + line.id + ',\'sqft\',this.value)" title="Sq Ft">';

    return '<div class="ll-row" data-id="' + line.id + '">'
      + '<input type="text" class="ll-name" value="' + escHtml(line.name) + '" oninput="updateLaborLine(' + line.id + ',\'name\',this.value)">'
      + '<select class="ll-unit" onchange="updateLaborLine(' + line.id + ',\'unit\',this.value);renderLaborLines();updateLivePanel()">'
      + '<option value="hr"' + (line.unit==='hr'?' selected':'') + '>$/hr</option>'
      + '<option value="sqft"' + (line.unit==='sqft'?' selected':'') + '>$/sqft</option>'
      + '<option value="flat"' + (line.unit==='flat'?' selected':'') + '>Flat</option>'
      + '</select>'
      + '<div class="ll-qty">' + qtyInput + '</div>'
      + '<input type="number" class="ll-rate" min="0" step="0.5" value="' + (line.rate||0) + '" oninput="updateLaborLine(' + line.id + ',\'rate\',this.value)">'
      + '<div class="ll-sub">' + fmt(sub) + '</div>'
      + '<button class="ll-del" onclick="removeLaborLine(' + line.id + ')">&#x2715;</button>'
      + '</div>';
  }).join('');
}

function renderMiniPresets() {
  var container = document.getElementById('miniPresetGrid');
  if (!container) return;
  container.innerHTML = Object.entries(state.rates).map(function(e) {
    return '<span class="preset-chip" onclick="addLaborLineByKey(\'' + e[0] + '\')">' + escHtml(e[1].name) + '</span>';
  }).join('');
}

function updateLivePanel() {
  var base = state.laborLines.reduce(function(s, l) { return s + calcLineTotal(l); }, 0);
  var totalHours = state.laborLines.reduce(function(s, l) {
    return s + (l.unit === 'hr' ? (l.crew||0)*(l.hours||0) : 0);
  }, 0);
  var blended = totalHours > 0
    ? (state.laborLines.reduce(function(s,l){ return s + (l.unit==='hr'?(l.crew||0)*(l.hours||0)*(l.rate||0):0); },0) / totalHours)
    : 0;

  function set(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
  set('lcpTotal', fmt(base));
  set('lcpHours', totalHours);
  set('lcpLines', state.laborLines.length);
  set('lcpBlended', blended > 0 ? '$' + Math.round(blended) + '/hr' : '—');

  // Breakdown
  var bd = document.getElementById('lcpBreakdown');
  if (bd) {
    if (state.laborLines.length === 0) {
      bd.innerHTML = '<div class="lcp-empty-msg">Add lines to see breakdown</div>';
    } else {
      bd.innerHTML = state.laborLines.map(function(l) {
        return '<div class="lcp-bd-row"><span>' + escHtml(l.name) + '</span><span>' + fmt(calcLineTotal(l)) + '</span></div>';
      }).join('');
    }
  }

  // Budget comparison
  var bv = document.getElementById('bcValue');
  if (bv) {
    if (state.clientBudget > 0) {
      var diff = base - state.clientBudget;
      bv.textContent = (diff > 0 ? '+' : '') + fmt(diff);
      bv.style.color = diff > 0 ? 'var(--red)' : 'var(--green)';
    } else {
      bv.textContent = '—';
      bv.style.color = '';
    }
  }

  // Also update review panel if on step 3
  if (state.currentStep === 3) updateReviewTotals();
}

/* ===== MARKUP / CONTINGENCY ===== */
function updateMarkup(val) {
  state.markup = parseInt(val) || 0;
  var el = document.getElementById('markupVal');
  if (el) el.textContent = val + '%';
  var pct = document.getElementById('ft-markup-pct');
  if (pct) pct.textContent = val;
  updateReviewTotals();
}

function updateContingency(val) {
  state.contingency = parseInt(val) || 0;
  var el = document.getElementById('contingencyVal');
  if (el) el.textContent = val + '%';
  var pct = document.getElementById('ft-cont-pct');
  if (pct) pct.textContent = val;
  updateReviewTotals();
}

function renderReview() {
  // Project overview
  function set(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
  var typeNames = { kitchen:'Kitchen',bathroom:'Bathroom',fullhome:'Full Home',basement:'Basement',outdoor:'Outdoor',addition:'Addition' };
  set('rv-type', typeNames[state.projectType] || '—');
  set('rv-client', (document.getElementById('clientName') || {}).value || '—');
  set('rv-address', (document.getElementById('projectAddress') || {}).value || '—');
  set('rv-start', (document.getElementById('startDate') || {}).value || '—');

  var totalHours = state.laborLines.reduce(function(s,l){ return s+(l.unit==='hr'?(l.crew||0)*(l.hours||0):0); },0);
  var base = state.laborLines.reduce(function(s,l){ return s+calcLineTotal(l); },0);
  var blended = totalHours > 0 ? (base / totalHours) : 0;
  set('rv-hours', totalHours + ' hrs');
  set('rv-rate', blended > 0 ? '$' + Math.round(blended) + '/hr' : '—');

  // Line items
  var rv = document.getElementById('rv-lines');
  if (rv) {
    rv.innerHTML = state.laborLines.length === 0
      ? '<p style="color:var(--text-muted);font-size:0.85rem">No labor lines added.</p>'
      : '<div class="rv-line-head"><span>Trade</span><span>Detail</span><span>Total</span></div>'
        + state.laborLines.map(function(l) {
          var detail = l.unit==='sqft'
            ? l.sqft+'sqft × $'+l.rate
            : l.crew+' crew × '+l.hours+' hrs @ $'+l.rate+'/hr';
          return '<div class="rv-line-row"><span>'+escHtml(l.name)+'</span><span style="color:var(--text-muted);font-size:0.8rem">'+detail+'</span><span>'+fmt(calcLineTotal(l))+'</span></div>';
        }).join('');
  }

  updateReviewTotals();
}

function updateReviewTotals() {
  var base = state.laborLines.reduce(function(s,l){ return s+calcLineTotal(l); },0);
  var mu = base * (state.markup/100);
  var ct = (base+mu) * (state.contingency/100);
  var total = base+mu+ct;
  function set(id,v){ var el=document.getElementById(id); if(el) el.textContent=v; }
  set('ft-raw', fmt(base));
  set('ft-markup', fmt(mu));
  set('ft-contingency', fmt(ct));
  set('ft-total', fmt(total));

  var bs = document.getElementById('ftBudgetStatus');
  if (bs) {
    if (state.clientBudget > 0) {
      var diff = total - state.clientBudget;
      bs.innerHTML = '<div style="margin-top:10px;padding:8px 12px;border-radius:8px;font-weight:700;font-size:0.82rem;background:'
        + (diff>0?'var(--red-light)':'var(--green-light)')
        + ';color:'+(diff>0?'var(--red)':'var(--green-dark)')
        + '">' + (diff>0?'⚠️ Over budget by ':'✅ Under budget by ') + fmt(Math.abs(diff)) + '</div>';
    } else { bs.innerHTML = ''; }
  }
}

function generateProposal() {
  showToast('Proposal generated! 🎉');
  switchView('proposals');
}

/* ===== MY RATES ===== */
function setRateUnit(unit, btn) {
  state.rateUnit = unit;
  document.querySelectorAll('.unit-btn').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  var header = document.getElementById('rateColHeader');
  if (header) header.textContent = unit === 'sqft' ? 'Rate ($/sqft)' : 'Rate ($/hr)';
  renderRatesTable();
}

function renderRatesTable() {
  var container = document.getElementById('ratesTableBody');
  if (!container) return;
  container.innerHTML = Object.entries(state.rates).map(function(e) {
    var key = e[0], r = e[1];
    return '<div class="rate-row">'
      + '<div class="rate-trade-name">' + escHtml(r.name) + '</div>'
      + '<div><select onchange="updateRate(\''+key+'\',\'unit\',this.value)" class="rate-select">'
      + '<option value="hr"'+(r.unit==='hr'?' selected':'')+'>$/hr</option>'
      + '<option value="sqft"'+(r.unit==='sqft'?' selected':'')+'>$/sqft</option>'
      + '<option value="flat"'+(r.unit==='flat'?' selected':'')+'>Flat</option>'
      + '</select></div>'
      + '<div><input type="number" min="0" step="0.25" value="'+r.rate+'" class="rate-input" onchange="updateRate(\''+key+'\',\'rate\',this.value)"></div>'
      + '<div><input type="number" min="0" value="'+r.minCharge+'" class="rate-input" onchange="updateRate(\''+key+'\',\'minCharge\',this.value)"></div>'
      + '<div><input type="text" value="'+escHtml(r.notes)+'" class="rate-input" onchange="updateRate(\''+key+'\',\'notes\',this.value)" placeholder="Notes..."></div>'
      + '</div>';
  }).join('');
}

function updateRate(key, field, value) {
  if (!state.rates[key]) return;
  state.rates[key][field] = (field==='rate'||field==='minCharge') ? (parseFloat(value)||0) : value;
}

function saveRates() {
  localStorage.setItem('renovateiq_rates', JSON.stringify(state.rates));
  showToast('Rates saved! 💾');
}

function resetRates() {
  if (!confirm('Reset all rates to defaults?')) return;
  state.rates = JSON.parse(JSON.stringify(DEFAULT_RATES));
  localStorage.removeItem('renovateiq_rates');
  renderRatesTable();
  showToast('Rates reset to defaults 🐒');
}

function addCustomTrade() {
  var name = (document.getElementById('newTradeName') || {}).value;
  var unit = (document.getElementById('newTradeUnit') || {}).value || 'hr';
  var rate = parseFloat((document.getElementById('newTradeRate') || {}).value) || 0;
  if (!name || !name.trim()) { showToast('Enter a trade name first 🐒'); return; }
  var key = name.trim().toLowerCase().replace(/\s+/g,'_') + '_' + Date.now();
  state.rates[key] = { name: name.trim(), unit: unit, rate: rate, minCharge: 0, notes: '' };
  saveRates();
  renderRatesTable();
  document.getElementById('newTradeName').value = '';
  document.getElementById('newTradeRate').value = '';
  showToast('"' + name.trim() + '" added! 🐒');
}

/* ===== PROPOSALS ===== */
function switchProposalTab(btn, tabId) {
  document.querySelectorAll('.ptab').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.ptab-content').forEach(function(p) { p.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  var panel = document.getElementById(tabId);
  if (panel) panel.classList.add('active');
}

/* ===== CHANGE ORDERS ===== */
function openChangeOrderModal() {
  document.getElementById('coModal').classList.add('open');
}
function closeChangeOrderModal() {
  document.getElementById('coModal').classList.remove('open');
}
function closeModal(event) {
  if (event.target === event.currentTarget) closeChangeOrderModal();
}

function updateCoPreview() {
  var hours = parseFloat((document.getElementById('coHours') || {}).value) || 0;
  var rate  = parseFloat((document.getElementById('coRate')  || {}).value) || 0;
  var type  = (document.getElementById('coType') || {}).value || 'addition';
  var impact = hours * rate * (type === 'credit' ? -1 : 1);
  var h = document.getElementById('cipHours');
  var v = document.getElementById('cipValue');
  if (h) h.textContent = (type==='credit'?'-':'+') + hours + ' hrs';
  if (v) { v.textContent = (impact>=0?'+':'') + fmt(impact); v.style.color = impact>=0 ? 'var(--green-dark)' : 'var(--red)'; }
}

function submitChangeOrder() {
  var title = (document.getElementById('coTitle') || {}).value;
  var hours = parseFloat((document.getElementById('coHours') || {}).value) || 0;
  var rate  = parseFloat((document.getElementById('coRate')  || {}).value) || 0;
  var type  = (document.getElementById('coType') || {}).value || 'addition';
  if (!title || !title.trim()) { showToast('Please describe the change 🐒'); return; }
  state.coCounter++;
  var impact = hours * rate * (type==='credit' ? -1 : 1);
  var row = document.createElement('tr');
  row.innerHTML = '<td>#CO-00'+state.coCounter+'</td>'
    + '<td>Lakewood Kitchen</td>'
    + '<td>'+escHtml(title)+'</td>'
    + '<td>'+(type==='credit'?'-':'+')+hours+' hrs</td>'
    + '<td class="'+(impact>=0?'positive':'negative')+'">'+(impact>=0?'+':'')+fmt(impact)+'</td>'
    + '<td><span class="status-badge yellow">Pending</span></td>'
    + '<td>Today</td>';
  var tbody = document.getElementById('coTableBody');
  if (tbody) tbody.prepend(row);
  closeChangeOrderModal();
  document.getElementById('coTitle').value = '';
  document.getElementById('coHours').value = '';
  document.getElementById('coRate').value = '';
  showToast('Change order #CO-00'+state.coCounter+' created! ✏️');
}

/* ===== CLIENT PORTAL ===== */
function copyPortalLink() {
  var url = 'renovateiq.app/labor/lakewood-2024-xyz';
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(function(){ showToast('Link copied! 🔗'); });
  } else { showToast('Link: ' + url); }
}

function acceptProposal() {
  var name = (document.getElementById('sigName') || {}).value;
  var agreed = (document.getElementById('sigAgree') || {}).checked;
  if (!name || !name.trim()) { showToast('Please type your full legal name 🐒'); return; }
  if (!agreed) { showToast('Please check the agreement box 🐒'); return; }
  var btn = document.querySelector('.btn-accept');
  if (btn) { btn.textContent = '✅ Signed — ' + name.trim(); btn.disabled = true; btn.style.background = 'var(--green-dark)'; }
  showToast('Proposal accepted & signed! 🎉');
}

/* ===== AI ADVISOR ===== */
function saveApiKey() {
  var val = (document.getElementById('apiKeyInput') || {}).value;
  if (val) val = val.trim();
  state.apiKey = val || '';
  localStorage.setItem('renovateiq_apikey', state.apiKey);
  showToast('API key saved 🔐');
  var section = document.getElementById('aiApiKeySection');
  if (section && state.apiKey) section.style.display = 'none';
}

function sendQuickPrompt(btn) {
  sendAiMessageText(btn.textContent.replace(/^[^\s]+\s/, ''));
}

function handleAiKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendAiMessage();
  }
}

function sendAiMessage() {
  var input = document.getElementById('aiPromptInput');
  var msg = input ? input.value.trim() : '';
  if (!msg) return;
  if (input) input.value = '';
  sendAiMessageText(msg);
}

function sendAiMessageText(msg) {
  if (!msg) return;
  appendAiMessage('user', msg);
  if (!state.apiKey) {
    appendAiMessage('ai', '🐒 Remy here! Connect your Anthropic API key above to chat with me.');
    return;
  }
  appendAiMessage('ai', '🐒 Thinking...');
  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': state.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: 'You are Remy, a friendly construction cost advisor monkey mascot for RenovateIQ, a labor-only estimation app for contractors. Keep answers short, practical, and focused on labor costs, crew sizing, and scheduling. Detroit metro market expertise.',
      messages: [{ role: 'user', content: msg }],
    }),
  }).then(function(r){ return r.json(); }).then(function(data) {
    var msgs = document.querySelectorAll('#aiMessages .ai-message.ai');
    var last = msgs[msgs.length-1];
    if (last) {
      var bubble = last.querySelector('.ai-bubble');
      if (bubble) bubble.innerHTML = '<p>' + escHtml((data.content&&data.content[0]&&data.content[0].text)||'No response.') + '</p>';
    }
  }).catch(function() {
    var msgs = document.querySelectorAll('#aiMessages .ai-message.ai');
    var last = msgs[msgs.length-1];
    if (last) {
      var bubble = last.querySelector('.ai-bubble');
      if (bubble) bubble.innerHTML = '<p>⚠️ Connection error. Check your API key.</p>';
    }
  });
}

function appendAiMessage(role, text) {
  var container = document.getElementById('aiMessages');
  if (!container) return;
  var div = document.createElement('div');
  div.className = 'ai-message ' + role;
  if (role === 'ai') {
    div.innerHTML = '<div class="ai-avatar">🐒</div><div class="ai-bubble"><p>'+escHtml(text)+'</p></div>';
  } else {
    div.innerHTML = '<div class="ai-bubble user-bubble"><p>'+escHtml(text)+'</p></div>';
  }
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

/* ===== HELPERS ===== */
function fmt(n) {
  return '$' + (n||0).toLocaleString('en-US', { minimumFractionDigits:0, maximumFractionDigits:0 });
}
function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function showToast(msg) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(function(){ t.classList.remove('show'); }, 2800);
}

/* ===== QUICK-ADD SELECT WIRING ===== */
var quickAddSel = document.getElementById('quickAddTrade');
if (quickAddSel) {
  quickAddSel.addEventListener('change', function() {
    var key = this.value;
    if (key) { addLaborLineByKey(key); this.value = ''; }
  });
}

/* ===== INIT ===== */
switchView('dashboard');
if (state.apiKey) {
  var keySection = document.getElementById('aiApiKeySection');
  if (keySection) keySection.style.display = 'none';
}
