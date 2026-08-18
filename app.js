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

var DEFAULT_CONTRACTOR = {
  companyName: 'T. Martin Renovations', handle: 'tmartinreno',
  tagline: "Detroit's trusted renovation specialists",
  logo: null, phone: '(313) 555-0100', email: 'info@martin-reno.com',
  address: 'Detroit, MI 48201', website: '', license: 'MI-RB-123456', insurance: ''
};
var DEFAULT_JOB_RATES = {
  kitchen:  { min: 80,  max: 140 },
  bathroom: { min: 90,  max: 150 },
  fullhome: { min: 65,  max: 110 },
  basement: { min: 55,  max: 95  },
  outdoor:  { min: 45,  max: 80  },
  addition: { min: 85,  max: 135 }
};
var ONSITE_SCOPE_OPTIONS = [
  { key:'demo',       label:'🗑️ Demo & Hauling',     selected:true  },
  { key:'electrical', label:'⚡ Electrical',          selected:true  },
  { key:'plumbing',   label:'🔧 Plumbing',            selected:false },
  { key:'hvac',       label:'❄️ HVAC',                selected:false },
  { key:'drywall',    label:'🧱 Drywall',             selected:true  },
  { key:'tile',       label:'🪟 Tile Work',           selected:false },
  { key:'flooring',   label:'🪵 Flooring',            selected:true  },
  { key:'cabinets',   label:'🗄️ Cabinets',            selected:true  },
  { key:'painting',   label:'🎨 Painting',            selected:true  },
  { key:'cleanup',    label:'🧹 Cleanup',             selected:true  }
];

var state = {
  currentView: 'dashboard',
  currentStep: 1,
  setupStep: 1,
  projectType: null,
  laborLines: [],
  markup: 20,
  contingency: 5,
  clientBudget: 0,
  defaultRate: 95,
  coCounter: 3,
  apiKey: localStorage.getItem('renovateiq_apikey') || '',
  rates: JSON.parse(localStorage.getItem('renovateiq_rates') || 'null') || JSON.parse(JSON.stringify(DEFAULT_RATES)),
  contractor: JSON.parse(localStorage.getItem('renovateiq_contractor') || 'null') || JSON.parse(JSON.stringify(DEFAULT_CONTRACTOR)),
  jobRates: JSON.parse(localStorage.getItem('renovateiq_jobrates') || 'null') || JSON.parse(JSON.stringify(DEFAULT_JOB_RATES)),
  onsite: {
    clientKey: null, clientSqft: 0, actualSqft: 0,
    projectType: 'kitchen', scopeItems: JSON.parse(JSON.stringify(ONSITE_SCOPE_OPTIONS)),
    finalPrice: 0, locked: false, notes: ''
  },
  conceptPhoto: null,
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
    'client-portal': 'Client Portal', 'ai-advisor': 'AI Advisor',
    onsite: 'On-Site Verification', setup: 'Contractor Setup'
  };
  var bc = document.getElementById('breadcrumb');
  if (bc) bc.textContent = titles[view] || view;

  if (view === 'rates') renderRatesTable();
  if (view === 'setup') { populateSetupForm(); setupGoToStep(1); }
  if (view === 'client-portal') updateLetterhead();
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

/* ===== SETUP / CONTRACTOR PROFILE ===== */
function setupGoToStep(step) {
  state.setupStep = step;
  document.querySelectorAll('.step-content[id^="setup-step"]').forEach(function(s) { s.classList.add('hidden'); });
  var sc = document.getElementById('setup-step' + step);
  if (sc) sc.classList.remove('hidden');
  var pct = step === 1 ? 33 : step === 2 ? 66 : 100;
  var fill = document.getElementById('setupStepFill');
  if (fill) fill.style.width = pct + '%';
  document.querySelectorAll('[data-setup-step]').forEach(function(s) {
    var n = parseInt(s.dataset.setupStep);
    s.classList.toggle('active', n === step);
    s.classList.toggle('done', n < step);
  });
}

function previewHandle(companyName) {
  var handle = document.getElementById('setupHandle');
  if (handle && !handle._userEdited) {
    handle.value = companyName.toLowerCase().replace(/\s+/g,'').replace(/[^a-z0-9]/g,'').substring(0,20);
  }
}

function handleLogoUpload(input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    state.contractor.logo = e.target.result;
    var wrap = document.getElementById('logoPreviewWrap');
    if (wrap) wrap.innerHTML = '<img src="'+e.target.result+'" style="max-height:120px;max-width:200px;border-radius:8px;object-fit:contain">';
    updateLetterhead();
  };
  reader.readAsDataURL(file);
}

function saveContractorSetup() {
  var c = state.contractor;
  c.companyName = (document.getElementById('setupCompanyName') || {}).value || c.companyName;
  c.handle      = (document.getElementById('setupHandle')      || {}).value || c.handle;
  c.tagline     = (document.getElementById('setupTagline')     || {}).value || c.tagline;
  c.license     = (document.getElementById('setupLicense')     || {}).value || c.license;
  c.insurance   = (document.getElementById('setupInsurance')   || {}).value || '';
  c.phone       = (document.getElementById('setupPhone')       || {}).value || c.phone;
  c.email       = (document.getElementById('setupEmail')       || {}).value || c.email;
  c.address     = (document.getElementById('setupAddress')     || {}).value || c.address;
  c.website     = (document.getElementById('setupWebsite')     || {}).value || '';

  var types = ['kitchen','bathroom','fullhome','basement','outdoor','addition'];
  types.forEach(function(t) {
    var mn = parseFloat((document.getElementById('jr-'+t+'-min')||{}).value)||state.jobRates[t].min;
    var mx = parseFloat((document.getElementById('jr-'+t+'-max')||{}).value)||state.jobRates[t].max;
    state.jobRates[t] = { min: mn, max: mx };
  });

  localStorage.setItem('renovateiq_contractor', JSON.stringify(c));
  localStorage.setItem('renovateiq_jobrates', JSON.stringify(state.jobRates));
  updateLetterhead();
  updateSidebarProfile();
  showToast('Profile saved! 🐒 Your branding is live.');
  switchView('dashboard');
}

function updateLetterhead() {
  var c = state.contractor;
  var logoEl = document.getElementById('portalLogoDisplay');
  if (logoEl) {
    logoEl.innerHTML = c.logo
      ? '<img src="'+c.logo+'" style="max-height:60px;max-width:120px;object-fit:contain">'
      : '🐒';
  }
  function setText(id, v) { var el=document.getElementById(id); if(el) el.textContent=v; }
  setText('portalCompanyDisplay', c.companyName);
  setText('portalTaglineDisplay', c.tagline);
  setText('portalContactDisplay', '📞 '+c.phone+' · ✉️ '+c.email+' · 📍 '+c.address+(c.website?' · 🌐 '+c.website:''));
  setText('portalLicenseDisplay', c.license ? 'License: '+c.license : '');
  var dateEl = document.getElementById('portalDate');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US', {month:'long',day:'numeric',year:'numeric'});
  var sigDate = document.getElementById('sigDateDisplay');
  if (sigDate) sigDate.textContent = new Date().toLocaleDateString('en-US', {month:'long',day:'numeric',year:'numeric'});
}

function updateSidebarProfile() {
  var c = state.contractor;
  var nameEl = document.getElementById('sidebarCompanyName');
  if (nameEl) nameEl.textContent = c.companyName;
  var avatarWrap = document.getElementById('sidebarAvatarWrap');
  if (avatarWrap) {
    if (c.logo) {
      avatarWrap.innerHTML = '<img src="'+c.logo+'" style="width:36px;height:36px;border-radius:50%;object-fit:cover">';
    } else {
      var initials = c.companyName.split(' ').map(function(w){return w[0];}).join('').toUpperCase().substring(0,2);
      avatarWrap.innerHTML = '<span id="sidebarAvatarText">'+initials+'</span>';
    }
  }
}

function populateSetupForm() {
  var c = state.contractor;
  function setVal(id, v) { var el=document.getElementById(id); if(el) el.value=v||''; }
  setVal('setupCompanyName', c.companyName);
  setVal('setupHandle', c.handle);
  setVal('setupTagline', c.tagline);
  setVal('setupLicense', c.license);
  setVal('setupInsurance', c.insurance);
  setVal('setupPhone', c.phone);
  setVal('setupEmail', c.email);
  setVal('setupAddress', c.address);
  setVal('setupWebsite', c.website);
  if (c.logo) {
    var wrap = document.getElementById('logoPreviewWrap');
    if (wrap) wrap.innerHTML = '<img src="'+c.logo+'" style="max-height:120px;max-width:200px;border-radius:8px;object-fit:contain">';
  }
  var types = ['kitchen','bathroom','fullhome','basement','outdoor','addition'];
  types.forEach(function(t) {
    setVal('jr-'+t+'-min', state.jobRates[t].min);
    setVal('jr-'+t+'-max', state.jobRates[t].max);
  });
}

/* ===== ON-SITE VERIFICATION ===== */
var DEMO_CLIENTS = {
  lakewood: { name:'Sarah Johnson', type:'kitchen', sqft:280, items:['demo','electrical','cabinets','tile','flooring','painting','cleanup'] },
  riverside:{ name:'Mike Chen',     type:'bathroom', sqft:85,  items:['demo','plumbing','tile','painting','cleanup'] },
  sample:   { name:'Demo Client',   type:'fullhome', sqft:1800,items:['demo','electrical','plumbing','drywall','flooring','painting','cleanup'] }
};

function loadOnsiteClient(key) {
  if (!key) { document.getElementById('onsitePanel').style.display='none'; return; }
  var client = DEMO_CLIENTS[key];
  if (!client) return;
  state.onsite.clientKey = key;
  state.onsite.clientSqft = client.sqft;
  state.onsite.projectType = client.type;
  state.onsite.locked = false;
  state.onsite.scopeItems = JSON.parse(JSON.stringify(ONSITE_SCOPE_OPTIONS)).map(function(s) {
    s.selected = client.items.indexOf(s.key) !== -1;
    return s;
  });
  document.getElementById('onsitePanel').style.display = 'block';
  document.getElementById('onsiteClientSqft').textContent = client.sqft;
  document.getElementById('onsiteActualSqft').value = client.sqft;
  document.getElementById('lockedConfirm').style.display = 'none';
  document.getElementById('lockPriceBtn').style.display = 'block';
  document.getElementById('lockPriceBtn').disabled = true;
  renderScopeChips();
  recalcOnSite();
}

function renderScopeChips() {
  var container = document.getElementById('onsiteScopeChips');
  if (!container) return;
  container.innerHTML = state.onsite.scopeItems.map(function(s) {
    return '<button class="scope-chip'+(s.selected?' scope-chip-on':'')+'" onclick="toggleScopeItem(\''+s.key+'\')">'
      + s.label + '</button>';
  }).join('');
}

function toggleScopeItem(key) {
  state.onsite.scopeItems.forEach(function(s) {
    if (s.key === key) { s.selected = !s.selected; s.adjusted = true; }
  });
  renderScopeChips();
  renderScopeAdjustments();
  recalcOnSite();
}

function renderScopeAdjustments() {
  var container = document.getElementById('onsiteAdjustments');
  if (!container) return;
  var adjusted = state.onsite.scopeItems.filter(function(s) { return s.adjusted; });
  if (!adjusted.length) { container.innerHTML = ''; return; }
  container.innerHTML = '<div class="adj-header">📋 Scope Changes vs. Client Submission:</div>'
    + adjusted.map(function(s) {
      return '<div class="adj-item">'
        + (s.selected ? '<span class="adj-add">+ Added</span>' : '<span class="adj-remove">- Removed</span>')
        + ' ' + s.label + '</div>';
    }).join('');
}

function recalcOnSite() {
  var actual = parseFloat(document.getElementById('onsiteActualSqft').value) || state.onsite.clientSqft;
  state.onsite.actualSqft = actual;
  var clientSqft = state.onsite.clientSqft;
  var flag = document.getElementById('sqftAdjustFlag');
  if (flag) {
    if (actual !== clientSqft && actual > 0) {
      var diff = actual - clientSqft;
      flag.style.display = 'block';
      flag.innerHTML = '<span class="flag-icon">⚠️</span> Adjusted from client\'s '
        + clientSqft + ' sqft ('+(diff>0?'+':'')+diff+' sqft — will be flagged on estimate)';
    } else {
      flag.style.display = 'none';
    }
  }
  var jr = state.jobRates[state.onsite.projectType] || { min:65, max:110 };
  var scopeMultiplier = 1.0;
  var selectedCount = state.onsite.scopeItems.filter(function(s){return s.selected;}).length;
  scopeMultiplier = 0.5 + (selectedCount / ONSITE_SCOPE_OPTIONS.length) * 0.8;
  var rangeMin = Math.round(actual * jr.min * scopeMultiplier);
  var rangeMax = Math.round(actual * jr.max * scopeMultiplier);
  document.getElementById('onsiteRangeMin').textContent = fmt(rangeMin);
  document.getElementById('onsiteRangeMax').textContent = fmt(rangeMax);
  document.getElementById('onsiteRangeBasis').textContent =
    actual + ' sqft × $' + jr.min + '–$' + jr.max + '/sqft ('+selectedCount+' trades)';
  checkFinalPrice();
}

function checkFinalPrice() {
  var val = parseFloat(document.getElementById('onsiteFinalPrice').value) || 0;
  state.onsite.finalPrice = val;
  var btn = document.getElementById('lockPriceBtn');
  if (btn) btn.disabled = val < 100;
  var flag = document.getElementById('finalPriceFlag');
  if (flag && val > 0) {
    var actual = state.onsite.actualSqft || state.onsite.clientSqft;
    var jr = state.jobRates[state.onsite.projectType] || { min:65, max:110 };
    var selectedCount = state.onsite.scopeItems.filter(function(s){return s.selected;}).length;
    var mult = 0.5 + (selectedCount / ONSITE_SCOPE_OPTIONS.length) * 0.8;
    var rangeMin = Math.round(actual * jr.min * mult);
    var rangeMax = Math.round(actual * jr.max * mult);
    if (val < rangeMin * 0.8) {
      flag.style.display = 'block';
      flag.textContent = '⚠️ Price is significantly below estimated range — double check';
      flag.className = 'final-price-flag flag-warn';
    } else if (val > rangeMax * 1.3) {
      flag.style.display = 'block';
      flag.textContent = '⚠️ Price is well above estimated range';
      flag.className = 'final-price-flag flag-warn';
    } else {
      flag.style.display = 'none';
    }
  } else if (flag) { flag.style.display = 'none'; }
}

function lockFinalPrice() {
  var price = state.onsite.finalPrice;
  if (price < 100) { showToast('Enter a final price first'); return; }
  state.onsite.locked = true;
  document.getElementById('lockPriceBtn').style.display = 'none';
  var confirm = document.getElementById('lockedConfirm');
  if (confirm) {
    confirm.style.display = 'block';
    document.getElementById('lockedAmount').textContent = fmt(price);
  }
  showToast('Price locked at ' + fmt(price) + ' — client notified! 🔒');
}

function draftContract() {
  var client = DEMO_CLIENTS[state.onsite.clientKey] || { name: 'Client', type:'kitchen', sqft:0 };
  var scope = state.onsite.scopeItems.filter(function(s){return s.selected;}).map(function(s){return s.label;});
  var price = state.onsite.finalPrice;
  var deposit = Math.round(price * 0.30);
  var mi2    = Math.round(price * 0.20);
  var mi3    = Math.round(price * 0.25);
  var final  = price - deposit - mi2 - mi3;
  var c = state.contractor;
  var today = new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  var logoHtml = c.logo
    ? '<img src="'+c.logo+'" style="height:60px;object-fit:contain;margin-bottom:8px">'
    : '<div style="font-size:2rem;margin-bottom:6px">🐒</div>';

  var html = '<div class="contract-doc">'
    + '<div class="contract-header">'
    + logoHtml
    + '<div class="ch-company">'+escHtml(c.companyName)+'</div>'
    + '<div class="ch-contact">'+escHtml(c.phone)+' · '+escHtml(c.email)+'</div>'
    + '<div class="ch-contact">'+escHtml(c.address)+(c.license?' · License: '+escHtml(c.license):'')+' </div>'
    + '</div>'
    + '<div class="contract-title">RESIDENTIAL LABOR CONTRACT</div>'
    + '<div class="contract-parties">'
    + '<div><strong>Contractor:</strong> '+escHtml(c.companyName)+(c.handle?' (@'+escHtml(c.handle)+')':'')+'</div>'
    + '<div><strong>Homeowner:</strong> '+escHtml(client.name)+'</div>'
    + '<div><strong>Date:</strong> '+today+'</div>'
    + '</div>'
    + '<div class="contract-section"><h3>1. SCOPE OF WORK</h3>'
    + '<p>Contractor agrees to furnish all labor for a <strong>'+escHtml(client.type.replace('fullhome','Full Home'))+' renovation</strong> '
    + '('+escHtml(String(state.onsite.actualSqft||client.sqft))+' sqft verified on-site).</p>'
    + '<p>Included labor trades:</p><ul>'
    + scope.map(function(s){return '<li>'+escHtml(s)+'</li>';}).join('')
    + '</ul></div>'
    + '<div class="contract-section"><h3>2. LABOR-ONLY PRICE</h3>'
    + '<p>Total Labor Price: <strong>'+fmt(price)+'</strong></p>'
    + '<p><em>This is a labor-only contract. Materials, permits, and equipment rentals are excluded and billed separately unless otherwise agreed in writing.</em></p>'
    + '</div>'
    + '<div class="contract-section"><h3>3. PAYMENT SCHEDULE</h3>'
    + '<table class="contract-table">'
    + '<tr><th>Milestone</th><th>Amount</th><th>Due</th></tr>'
    + '<tr><td>Deposit — Contract Signed</td><td>'+fmt(deposit)+'</td><td>Before work begins</td></tr>'
    + '<tr><td>Milestone 2 — Rough-In Complete</td><td>'+fmt(mi2)+'</td><td>After electrical/plumbing inspection</td></tr>'
    + '<tr><td>Milestone 3 — Finish Work Complete</td><td>'+fmt(mi3)+'</td><td>After cabinets, tile, flooring done</td></tr>'
    + '<tr><td>Final — Punch List Clear</td><td>'+fmt(final)+'</td><td>Upon client walkthrough approval</td></tr>'
    + '</table></div>'
    + '<div class="contract-section"><h3>4. TIMELINE</h3>'
    + '<p>Contractor will commence work within 14 days of deposit receipt and estimates substantial completion within the agreed project schedule. Timelines are estimates and may be extended due to weather, material delays, or homeowner-requested changes.</p>'
    + '</div>'
    + '<div class="contract-section"><h3>5. CHANGE ORDERS</h3>'
    + '<p>Any work beyond the defined scope requires a written Change Order signed by both parties before work proceeds. Change orders may adjust the contract price and timeline accordingly.</p>'
    + '</div>'
    + '<div class="contract-section"><h3>6. WORKMANSHIP WARRANTY</h3>'
    + '<p>Contractor warrants all labor against defects in workmanship for a period of <strong>one (1) year</strong> from the date of substantial completion. This warranty covers labor only and does not cover damage caused by homeowner actions, third-party contractors, or normal wear and tear.</p>'
    + '</div>'
    + '<div class="contract-section"><h3>7. CANCELLATION / RIGHT TO CANCEL</h3>'
    + '<p>Homeowner may cancel this contract within <strong>3 business days</strong> of signing without penalty, per Michigan Residential Builder requirements. After 3 business days, cancellation may be subject to costs incurred. Contractor may terminate if homeowner fails to make payment within 10 business days of a due milestone.</p>'
    + '<p><em>⚠️ Note: Michigan residential builder contracts have specific statutory requirements including license number disclosure and right-to-cancel language. This template is provided for informational purposes — have a licensed Michigan attorney review before use with real clients.</em></p>'
    + '</div>'
    + '<div class="contract-section"><h3>8. DISPUTE RESOLUTION</h3>'
    + '<p>Parties agree to attempt good-faith mediation before pursuing legal action. Michigan law governs this agreement.</p>'
    + '</div>'
    + '<div class="contract-signatures">'
    + '<div class="sig-block"><div class="sig-line">________________________________</div><div>Contractor: '+escHtml(c.companyName)+'</div><div>Date: ___________</div></div>'
    + '<div class="sig-block"><div class="sig-line">________________________________</div><div>Homeowner: '+escHtml(client.name)+'</div><div>Date: ___________</div></div>'
    + '</div>'
    + '</div>';

  openPrintModal(html);
}

/* ===== HOMEOWNER ESTIMATE PRINT ===== */
function printEstimate() {
  var c = state.contractor;
  var today = new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  var logoHtml = c.logo
    ? '<img src="'+c.logo+'" style="height:60px;object-fit:contain">'
    : '<div style="font-size:2.5rem">🐒</div>';

  var html = '<div class="estimate-doc">'
    + '<div class="contract-header">'
    + logoHtml
    + '<div class="ch-company">'+escHtml(c.companyName)+'</div>'
    + '<div class="ch-contact">'+escHtml(c.phone)+' · '+escHtml(c.email)+'</div>'
    + '<div class="ch-contact">'+escHtml(c.address)+(c.website?' · '+escHtml(c.website):'')+' </div>'
    + (c.license?'<div class="ch-contact">License: '+escHtml(c.license)+'</div>':'')
    + '</div>'
    + '<div class="contract-title">PRELIMINARY LABOR ESTIMATE</div>'
    + '<div class="contract-parties">'
    + '<div><strong>Prepared for:</strong> Sarah Johnson · 4821 Lakewood Dr, Detroit, MI</div>'
    + '<div><strong>Project Type:</strong> Kitchen Renovation</div>'
    + '<div><strong>Date:</strong> '+today+'</div>'
    + '</div>'
    + '<div class="contract-section"><h3>SCOPE SUMMARY</h3>'
    + '<ul>'
    + '<li>Demo &amp; Hauling</li><li>Electrical</li><li>Plumbing</li>'
    + '<li>Cabinet Installation</li><li>Tile Work</li><li>Flooring</li>'
    + '<li>Painting &amp; Trim</li><li>Final Cleanup</li>'
    + '</ul></div>'
    + '<div class="contract-section est-range-block">'
    + '<h3>LABOR ESTIMATE RANGE</h3>'
    + '<div class="est-range-display"><span class="est-range-min">$14,560</span><span class="est-range-dash">—</span><span class="est-range-max">$25,480</span></div>'
    + '<div class="est-range-basis">Based on ~280 sqft · Kitchen rates $80–$140/sqft labor</div>'
    + '</div>'
    + '<div class="contract-section">'
    + '<div class="estimate-disclaimer">'
    + '<strong>⚠️ Important — Please Read</strong>'
    + '<p>This is a preliminary estimate range based on your project answers and this contractor\'s labor rates. '
    + 'It is <em>not</em> a final price or binding contract. The actual locked price is determined after an in-person '
    + 'site visit where your contractor verifies square footage and scope in person. '
    + 'If this range fits your budget, the next step is scheduling your no-obligation site visit.</p>'
    + '</div></div>'
    + '<div class="contract-section">'
    + '<p><strong>Next Step:</strong> Contact us to schedule your free on-site visit.</p>'
    + '<p>📞 '+escHtml(c.phone)+'&nbsp;&nbsp;✉️ '+escHtml(c.email)+'</p>'
    + '</div>'
    + '</div>';

  openPrintModal(html);
}

function openPrintModal(html) {
  var overlay = document.getElementById('printModal');
  var content = document.getElementById('printContent');
  if (!overlay || !content) return;
  content.innerHTML = html;
  overlay.style.display = 'flex';
}

function closePrintModal() {
  var overlay = document.getElementById('printModal');
  if (overlay) overlay.style.display = 'none';
}

/* ===== CONCEPT PHOTO / AI ===== */
function handleConceptPhoto(input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    state.conceptPhoto = e.target.result;
    var preview = document.getElementById('conceptPhotoPreview');
    if (preview) {
      preview.innerHTML = '<img src="'+e.target.result+'" style="max-width:100%;max-height:200px;border-radius:10px;object-fit:cover;display:block;margin:0 auto 12px">'
        + '<button class="btn-primary btn-sm" onclick="generateConceptVision()">🤖 Generate AI Vision</button>'
        + ' <button class="btn-secondary btn-sm" onclick="document.getElementById(\'conceptPhotoInput\').click()">Change Photo</button>';
    }
  };
  reader.readAsDataURL(file);
}

function generateConceptVision() {
  if (!state.apiKey) {
    showToast('Connect your API key in AI Advisor first 🐒');
    return;
  }
  var visionBox = document.getElementById('conceptVisionBox');
  var visionText = document.getElementById('conceptVisionText');
  if (visionBox) visionBox.style.display = 'block';
  if (visionText) visionText.textContent = '🐒 Analyzing your space and generating the vision...';

  var prompt = 'You are Remy, a renovation concept designer. The homeowner has uploaded a photo of their current '
    + 'kitchen and is getting a renovation estimate. Write a vivid, specific 2-3 paragraph "after the renovation" '
    + 'concept description imagining what their space will look and feel like after the work is complete. '
    + 'Be specific about lighting, flow, finishes, and lifestyle impact. Write in second person ("Your kitchen will..."). '
    + 'Be enthusiastic but grounded.';

  var messages = [{ role: 'user', content: [
    { type: 'image', source: { type: 'base64', media_type: file.type || 'image/jpeg', data: state.conceptPhoto.split(',')[1] } },
    { type: 'text', text: prompt }
  ]}];

  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': state.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 500, messages: messages })
  }).then(function(r){ return r.json(); }).then(function(data) {
    var text = (data.content && data.content[0] && data.content[0].text) || 'Unable to generate concept.';
    if (visionText) visionText.textContent = text;
  }).catch(function() {
    if (visionText) visionText.textContent = 'Unable to analyze photo. Check your API key and try again.';
  });
}

function scheduleVisit() {
  showToast('📅 Scheduling request sent to contractor! They\'ll contact you within 24 hours. 🐒');
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
var handleInputInit = document.getElementById('setupHandle');
if (handleInputInit) {
  handleInputInit.addEventListener('input', function() { this._userEdited = true; });
}
updateLetterhead();
updateSidebarProfile();
