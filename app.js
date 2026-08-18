/* ===== SCHEDULE DEFAULTS ===== */
var DEFAULT_SCHEDULE = {
  visitDays: [1,2,3,4,5],
  visitSlots: ['morning','afternoon','late'],
  visitLeadDays: 1,
  visitBlockedDates: [],
  workDays: [1,2,3,4,5],
  workLeadDays: 14,
  workBlockedDates: [],
};
var scheduleData = JSON.parse(JSON.stringify(DEFAULT_SCHEDULE));

/* ===== DEFAULT DATA ===== */
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
  companyName: 'T. Martin Renovations', ownerName: 'James Rivera',
  tagline: "Detroit's trusted renovation specialists",
  logo: null, phone: '(313) 555-0100', email: 'info@martin-reno.com',
  address: 'Detroit, MI 48201', website: '', license: 'MI-RB-123456'
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
  { key:'demo',       label:'Demo & Hauling',     selected:true  },
  { key:'electrical', label:'Electrical',          selected:true  },
  { key:'plumbing',   label:'Plumbing',            selected:false },
  { key:'hvac',       label:'HVAC',                selected:false },
  { key:'drywall',    label:'Drywall',             selected:true  },
  { key:'tile',       label:'Tile Work',           selected:false },
  { key:'flooring',   label:'Flooring',            selected:true  },
  { key:'cabinets',   label:'Cabinets',            selected:true  },
  { key:'painting',   label:'Painting',            selected:true  },
  { key:'cleanup',    label:'Cleanup',             selected:true  }
];

/* ===== STATE ===== */
var state = {
  currentView: 'dashboard',
  currentStep: 1,
  projectType: null,
  laborLines: [],
  markup: 20,
  contingency: 5,
  clientBudget: 0,
  defaultRate: 95,
  selectedTemplate: 'classic',
  apiKey: '',
  conceptImageBase64: null,
  onsiteScope: JSON.parse(JSON.stringify(ONSITE_SCOPE_OPTIONS)),
  onsiteClient: null,
  lockedPrice: null,
};

var contractor = JSON.parse(JSON.stringify(DEFAULT_CONTRACTOR));
var rates = {};
var jobRates = JSON.parse(JSON.stringify(DEFAULT_JOB_RATES));

/* ===== INIT ===== */
(function init() {
  var savedRates = localStorage.getItem('renovateiq_rates');
  rates = savedRates ? JSON.parse(savedRates) : JSON.parse(JSON.stringify(DEFAULT_RATES));

  var savedContractor = localStorage.getItem('renovateiq_contractor');
  if (savedContractor) contractor = JSON.parse(savedContractor);

  var savedJR = localStorage.getItem('renovateiq_jobrates');
  if (savedJR) jobRates = JSON.parse(savedJR);

  var savedKey = localStorage.getItem('renovateiq_apikey');
  if (savedKey) { state.apiKey = savedKey; hideApiKeySection(); }

  var savedTpl = localStorage.getItem('renovateiq_template');
  if (savedTpl) state.selectedTemplate = savedTpl;

  var savedSched = localStorage.getItem('renovateiq_schedule');
  if (savedSched) scheduleData = JSON.parse(savedSched);

  document.getElementById('sigDateDisplay').value = new Date().toLocaleDateString();

  if (window.location.search.includes('intake=1')) {
    document.getElementById('loginScreen').style.display = 'none';
    var intake = document.getElementById('customerIntake');
    if (intake) { intake.style.display = 'flex'; }
    customerStep(1);
    setText('ciContractorName', contractor.companyName || 'RenovateIQ');
    renderDatePicker();
  }

  updateRequestsBadge();

  document.getElementById('quickAddTrade').addEventListener('change', function() {
    if (this.value) { addLaborLineByKey(this.value); this.value = ''; }
  });

  document.querySelectorAll('.nav-item').forEach(function(item) {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      var v = this.dataset.view;
      if (v) switchView(v);
      if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open');
    });
  });
})();

/* ===== AUTH / PORTAL ===== */
function showContractorLogin() {
  document.getElementById('contractorLoginForm').style.display = 'block';
  document.getElementById('homeownerLoginForm').style.display = 'none';
  document.getElementById('contractorCard').style.borderColor = 'var(--indigo)';
  document.getElementById('homeownerCard').style.borderColor = '';
}

function showClientLogin() {
  document.getElementById('homeownerLoginForm').style.display = 'block';
  document.getElementById('contractorLoginForm').style.display = 'none';
  document.getElementById('homeownerCard').style.borderColor = 'var(--emerald)';
  document.getElementById('contractorCard').style.borderColor = '';
}

function backToPortals() {
  document.getElementById('contractorLoginForm').style.display = 'none';
  document.getElementById('homeownerLoginForm').style.display = 'none';
  document.getElementById('contractorCard').style.borderColor = '';
  document.getElementById('homeownerCard').style.borderColor = '';
  document.getElementById('signupFlow').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
}

function contractorLogin() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appShell').style.display = 'flex';
  updateSidebarProfile();
  renderRatesTable();
  renderMiniPresets();
  switchView('dashboard');
}

function clientLogin() {
  showIntakeFlow();
}

function showIntakeFlow() {
  document.getElementById('loginScreen').style.display = 'none';
  var intake = document.getElementById('customerIntake');
  intake.style.display = 'flex';
  customerStep(1);
  setText('ciContractorName', contractor.companyName || 'RenovateIQ');
  renderDatePicker();
}

function signOut() {
  document.getElementById('appShell').style.display = 'none';
  document.getElementById('customerIntake').style.display = 'none';
  document.getElementById('signupFlow').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('contractorLoginForm').style.display = 'none';
  document.getElementById('homeownerLoginForm').style.display = 'none';
}

function showSignup() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('signupFlow').style.display = 'flex';
  signupStep(1);
}

/* ===== SIGNUP FLOW ===== */
var signupData = { pricingMode: 'hr', signupRates: null, logoData: null };

function signupStep(n) {
  for (var i = 1; i <= 3; i++) {
    var el = document.getElementById('signup-step' + i);
    if (el) el.style.display = i === n ? 'block' : 'none';
    var ss = document.getElementById('sss-' + i);
    if (ss) {
      ss.classList.remove('active', 'done');
      if (i < n) ss.classList.add('done');
      else if (i === n) ss.classList.add('active');
    }
  }
  if (n === 2 && !signupData.signupRates) {
    signupData.signupRates = JSON.parse(JSON.stringify(DEFAULT_RATES));
    renderSignupPricingTable();
  }
  if (n === 3) {
    selectTemplate(state.selectedTemplate || 'classic');
  }
}

function setPricingMode(mode) {
  signupData.pricingMode = mode;
  document.getElementById('pmtHr').classList.toggle('pmt-active', mode === 'hr');
  document.getElementById('pmtSqft').classList.toggle('pmt-active', mode === 'sqft');
  document.getElementById('pmtMixed').classList.toggle('pmt-active', mode === 'mixed');
  renderSignupPricingTable();
}

function renderSignupPricingTable() {
  var body = document.getElementById('pricingTableBody');
  if (!body) return;
  var r = signupData.signupRates || rates;
  var html = '';
  Object.keys(r).forEach(function(key) {
    var tr = r[key];
    var unitVal = signupData.pricingMode === 'hr' ? 'hr' : signupData.pricingMode === 'sqft' ? 'sqft' : tr.unit;
    html += '<div class="pricing-row">' +
      '<span>' + escHtml(tr.name) + '</span>' +
      '<select onchange="signupData.signupRates[\'' + key + '\'].unit=this.value">' +
        '<option value="hr"' + (unitVal==='hr'?' selected':'') + '>$/hr</option>' +
        '<option value="sqft"' + (unitVal==='sqft'?' selected':'') + '>$/sqft</option>' +
        '<option value="flat"' + (unitVal==='flat'?' selected':'') + '>Flat</option>' +
      '</select>' +
      '<input type="number" value="' + tr.rate + '" step="0.50" onchange="signupData.signupRates[\'' + key + '\'].rate=parseFloat(this.value)||0">' +
      '<input type="number" value="' + tr.minCharge + '" onchange="signupData.signupRates[\'' + key + '\'].minCharge=parseFloat(this.value)||0">' +
      '</div>';
  });
  body.innerHTML = html;
}

function previewSignupLogo(input) {
  if (!input.files || !input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    signupData.logoData = e.target.result;
    var box = document.getElementById('suLogoPreview');
    box.innerHTML = '<img src="' + e.target.result + '" style="width:100%;height:100%;object-fit:contain;">';
  };
  reader.readAsDataURL(input.files[0]);
}

function selectTemplate(name) {
  state.selectedTemplate = name;
  localStorage.setItem('renovateiq_template', name);
  var prefixes = ['check-', 'inv-check-', 'set-check-'];
  var names = ['classic', 'modern', 'minimal'];
  names.forEach(function(n) {
    prefixes.forEach(function(p) {
      var el = document.getElementById(p + n);
      if (el) el.style.display = 'none';
    });
    ['tpl-' + n, 'inv-tpl-' + n, 'set-tpl-' + n].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.classList.remove('selected');
    });
  });
  prefixes.forEach(function(p) {
    var el = document.getElementById(p + name);
    if (el) el.style.display = 'flex';
  });
  ['tpl-' + name, 'inv-tpl-' + name, 'set-tpl-' + name].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('selected');
  });
}

function completeSignup() {
  if (signupData.signupRates) {
    rates = signupData.signupRates;
    localStorage.setItem('renovateiq_rates', JSON.stringify(rates));
  }
  if (signupData.logoData) contractor.logo = signupData.logoData;

  var first = document.getElementById('suFirstName').value;
  var last = document.getElementById('suLastName').value;
  if (first) contractor.ownerName = first + (last ? ' ' + last : '');
  var co = document.getElementById('suCompany').value;
  if (co) contractor.companyName = co;
  var email = document.getElementById('suEmail').value;
  if (email) contractor.email = email;
  var phone = document.getElementById('suPhone').value;
  if (phone) contractor.phone = phone;
  var lic = document.getElementById('suLicense').value;
  if (lic) contractor.license = lic;
  var addr = document.getElementById('suAddress').value;
  if (addr) contractor.address = addr;
  localStorage.setItem('renovateiq_contractor', JSON.stringify(contractor));

  document.getElementById('signupFlow').style.display = 'none';
  document.getElementById('appShell').style.display = 'flex';
  updateSidebarProfile();
  renderRatesTable();
  renderMiniPresets();
  switchView('dashboard');
  showToast('Account created! Welcome to RenovateIQ.');
}

/* ===== VIEW SWITCHING ===== */
function switchView(viewName) {
  document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('active'); });
  var el = document.getElementById('view-' + viewName);
  if (el) el.classList.add('active');
  state.currentView = viewName;

  document.querySelectorAll('.nav-item').forEach(function(item) {
    item.classList.toggle('active', item.dataset.view === viewName);
  });

  var labels = {
    'dashboard': 'Dashboard', 'estimates': 'New Estimate', 'rates': 'My Rates',
    'proposals': 'Proposals', 'changeorders': 'Change Orders', 'onsite': 'On-Site',
    'client-portal': 'Client Portal', 'invoices': 'Invoices', 'ai-advisor': 'AI Advisor',
    'setup': 'Settings', 'requests': 'Requests', 'schedule': 'Schedule'
  };
  var bc = document.getElementById('breadcrumb');
  if (bc) bc.textContent = labels[viewName] || viewName;

  if (viewName === 'setup') populateSetupForm();
  if (viewName === 'rates') renderRatesTable();
  if (viewName === 'client-portal') updateLetterhead();
  if (viewName === 'estimates') { goToStep(1); }
  if (viewName === 'proposals') updateProposalHero();
  if (viewName === 'requests') renderRequestsList();
  if (viewName === 'onsite') populateOnsiteSelect();
  if (viewName === 'schedule') renderScheduleView();
}

/* ===== ESTIMATE STEPS ===== */
function goToStep(n) {
  state.currentStep = n;
  for (var i = 1; i <= 3; i++) {
    var el = document.getElementById('step' + i);
    if (el) {
      el.classList.toggle('hidden', i !== n);
    }
    var pill = document.querySelector('.step-pill[data-step="' + i + '"]');
    if (pill) {
      pill.classList.remove('active', 'done');
      if (i < n) pill.classList.add('done');
      else if (i === n) pill.classList.add('active');
    }
  }
  var fill = document.getElementById('stepFill');
  if (fill) fill.style.width = (n === 1 ? '33' : n === 2 ? '66' : '100') + '%';

  if (n === 3) renderReview();
  updateLivePanel();
}

function selectProjectType(el) {
  document.querySelectorAll('.pt-btn').forEach(function(b) { b.classList.remove('selected'); });
  el.classList.add('selected');
  state.projectType = el.dataset.type;
  document.getElementById('nextStep1').disabled = false;
  renderMiniPresets();
}

/* ===== LABOR LINES ===== */
function addLaborLineByKey(key) {
  var r = rates[key] || DEFAULT_RATES[key];
  if (!r) return;
  state.laborLines.push({
    id: Date.now() + Math.random(),
    trade: r.name,
    unit: r.unit,
    qty: r.unit === 'hr' ? 8 : 100,
    crew: 1,
    rate: r.rate,
  });
  renderLaborLines();
  updateLivePanel();
}

function addCustomLine() {
  state.laborLines.push({
    id: Date.now(),
    trade: 'Custom Task',
    unit: 'hr',
    qty: 8,
    crew: 1,
    rate: state.defaultRate || 95,
  });
  renderLaborLines();
  updateLivePanel();
}

function removeLine(id) {
  state.laborLines = state.laborLines.filter(function(l) { return l.id !== id; });
  renderLaborLines();
  updateLivePanel();
}

function renderLaborLines() {
  var el = document.getElementById('laborLines');
  var emptyEl = document.getElementById('laborEmpty');
  if (!el) return;
  if (state.laborLines.length === 0) {
    el.innerHTML = '<div class="lt-empty" id="laborEmpty">No labor lines yet — quick add a trade above or click + Custom</div>';
    return;
  }
  el.innerHTML = state.laborLines.map(function(line, i) {
    var total = lineTotal(line);
    var unitLabel = line.unit === 'hr' ? 'hrs' : line.unit === 'sqft' ? 'sqft' : 'flat';
    return '<div class="labor-row">' +
      '<input class="labor-row-name" value="' + escHtml(line.trade) + '" onchange="state.laborLines[' + i + '].trade=this.value;updateLivePanel()">' +
      '<select onchange="state.laborLines[' + i + '].unit=this.value;renderLaborLines();updateLivePanel()">' +
        '<option value="hr"' + (line.unit==='hr'?' selected':'') + '>$/hr</option>' +
        '<option value="sqft"' + (line.unit==='sqft'?' selected':'') + '>$/sqft</option>' +
        '<option value="flat"' + (line.unit==='flat'?' selected':'') + '>Flat</option>' +
      '</select>' +
      '<div style="display:flex;gap:4px;align-items:center">' +
        '<input type="number" value="' + line.qty + '" style="width:60px" onchange="state.laborLines[' + i + '].qty=parseFloat(this.value)||0;renderLaborLines();updateLivePanel()">' +
        '<span style="font-size:.72rem;color:var(--text-muted)">' + unitLabel + '</span>' +
        (line.unit === 'hr' ? '<input type="number" value="' + line.crew + '" style="width:40px" title="Crew size" onchange="state.laborLines[' + i + '].crew=parseFloat(this.value)||1;updateLivePanel()">' : '') +
      '</div>' +
      '<input type="number" value="' + line.rate + '" step="0.50" onchange="state.laborLines[' + i + '].rate=parseFloat(this.value)||0;renderLaborLines();updateLivePanel()">' +
      '<span class="labor-row-total">' + fmt(total) + '</span>' +
      '<button class="labor-del" onclick="removeLine(' + line.id + ')">✕</button>' +
      '</div>';
  }).join('');
}

function lineTotal(line) {
  if (line.unit === 'flat') return line.rate;
  return line.qty * line.crew * line.rate;
}

function rawTotal() {
  return state.laborLines.reduce(function(s, l) { return s + lineTotal(l); }, 0);
}

function updateLivePanel() {
  var raw = rawTotal();
  var hrs = state.laborLines.reduce(function(s, l) { return s + (l.unit === 'hr' ? l.qty * l.crew : 0); }, 0);
  var el = document.getElementById('lcpTotal');
  if (el) el.textContent = fmt(raw);
  var hEl = document.getElementById('lcpHours');
  if (hEl) hEl.textContent = hrs.toFixed(0);
  var lEl = document.getElementById('lcpLines');
  if (lEl) lEl.textContent = state.laborLines.length;
  var bEl = document.getElementById('lcpBlended');
  if (bEl) bEl.textContent = hrs > 0 ? fmt(raw / hrs) + '/hr' : '—';

  var bd = document.getElementById('lcpBreakdown');
  if (bd) {
    if (state.laborLines.length === 0) {
      bd.innerHTML = '<div class="lp-empty">Add lines to see breakdown</div>';
    } else {
      bd.innerHTML = state.laborLines.map(function(l) {
        return '<div class="lp-breakdown-row"><span>' + escHtml(l.trade) + '</span><span>' + fmt(lineTotal(l)) + '</span></div>';
      }).join('');
    }
  }

  var bc = document.getElementById('bcValue');
  if (bc) {
    if (state.clientBudget > 0) {
      var diff = state.clientBudget - raw;
      bc.textContent = (diff >= 0 ? '+' : '') + fmt(diff);
      bc.style.color = diff >= 0 ? 'var(--emerald)' : 'var(--red)';
    } else {
      bc.textContent = '—';
      bc.style.color = '';
    }
  }
}

function renderMiniPresets() {
  var el = document.getElementById('miniPresetGrid');
  if (!el) return;
  el.innerHTML = Object.keys(rates).map(function(key) {
    var r = rates[key];
    return '<button class="srp-chip" onclick="addLaborLineByKey(\'' + key + '\')">' + escHtml(r.name) + '</button>';
  }).join('');
}

/* ===== REVIEW / STEP 3 ===== */
function renderReview() {
  var raw = rawTotal();
  var markup = raw * (state.markup / 100);
  var contingency = (raw + markup) * (state.contingency / 100);
  var grand = raw + markup + contingency;
  var hrs = state.laborLines.reduce(function(s, l) { return s + (l.unit === 'hr' ? l.qty * l.crew : 0); }, 0);

  setText('rv-type', state.projectType ? (state.projectType.charAt(0).toUpperCase() + state.projectType.slice(1)) : '—');
  setText('rv-client', document.getElementById('clientName') ? document.getElementById('clientName').value || '—' : '—');
  setText('rv-address', document.getElementById('projectAddress') ? document.getElementById('projectAddress').value || '—' : '—');
  setText('rv-start', document.getElementById('startDate') ? document.getElementById('startDate').value || '—' : '—');
  setText('rv-hours', hrs > 0 ? hrs + ' hrs' : '—');
  setText('rv-rate', hrs > 0 ? fmt(raw / hrs) + '/hr' : '—');

  var rvLines = document.getElementById('rv-lines');
  if (rvLines) {
    rvLines.innerHTML = state.laborLines.map(function(l) {
      return '<div class="rv-line"><span>' + escHtml(l.trade) + '</span><span>' + fmt(lineTotal(l)) + '</span></div>';
    }).join('') || '<p style="color:var(--text-muted);font-size:.82rem">No lines added</p>';
  }

  setText('ft-raw', fmt(raw));
  setText('ft-markup-pct', state.markup);
  setText('ft-markup', fmt(markup));
  setText('ft-cont-pct', state.contingency);
  setText('ft-contingency', fmt(contingency));
  setText('ft-total', fmt(grand));

  var bs = document.getElementById('ftBudgetStatus');
  if (bs && state.clientBudget > 0) {
    var diff = state.clientBudget - grand;
    bs.innerHTML = '<div style="margin-top:12px;font-size:.8rem;padding:8px 10px;border-radius:6px;background:' +
      (diff >= 0 ? 'var(--emerald-light);color:#065F46' : 'var(--red-light);color:#991B1B') + '">' +
      (diff >= 0 ? '✓ Within budget by ' + fmt(Math.abs(diff)) : '⚠ Over budget by ' + fmt(Math.abs(diff))) + '</div>';
  }
}

function updateMarkup(val) {
  state.markup = parseInt(val);
  var el = document.getElementById('markupVal');
  if (el) el.textContent = val + '%';
  renderReview();
}

function updateContingency(val) {
  state.contingency = parseInt(val);
  var el = document.getElementById('contingencyVal');
  if (el) el.textContent = val + '%';
  renderReview();
}

function generateProposal() {
  switchView('proposals');
  showToast('Proposal generated from estimate');
}

/* ===== MY RATES ===== */
function renderRatesTable() {
  var body = document.getElementById('ratesTableBody');
  if (!body) return;
  body.innerHTML = Object.keys(rates).map(function(key) {
    var r = rates[key];
    return '<div class="rate-row">' +
      '<input value="' + escHtml(r.name) + '" onchange="rates[\'' + key + '\'].name=this.value">' +
      '<select onchange="rates[\'' + key + '\'].unit=this.value">' +
        '<option value="hr"' + (r.unit==='hr'?' selected':'') + '>$/hr</option>' +
        '<option value="sqft"' + (r.unit==='sqft'?' selected':'') + '>$/sqft</option>' +
        '<option value="flat"' + (r.unit==='flat'?' selected':'') + '>Flat</option>' +
      '</select>' +
      '<input type="number" value="' + r.rate + '" step="0.50" onchange="rates[\'' + key + '\'].rate=parseFloat(this.value)||0">' +
      '<input type="number" value="' + r.minCharge + '" onchange="rates[\'' + key + '\'].minCharge=parseFloat(this.value)||0">' +
      '<input value="' + escHtml(r.notes || '') + '" placeholder="Notes..." onchange="rates[\'' + key + '\'].notes=this.value">' +
      '</div>';
  }).join('');
}

function saveRates() {
  localStorage.setItem('renovateiq_rates', JSON.stringify(rates));
  renderMiniPresets();
  showToast('Rates saved!');
}

function resetRates() {
  rates = JSON.parse(JSON.stringify(DEFAULT_RATES));
  renderRatesTable();
  showToast('Rates reset to defaults');
}

function addCustomTrade() {
  var name = document.getElementById('newTradeName').value.trim();
  var unit = document.getElementById('newTradeUnit').value;
  var rate = parseFloat(document.getElementById('newTradeRate').value) || 0;
  if (!name) { showToast('Enter a trade name'); return; }
  var key = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  rates[key] = { name: name, unit: unit, rate: rate, minCharge: 0, notes: '' };
  renderRatesTable();
  document.getElementById('newTradeName').value = '';
  document.getElementById('newTradeRate').value = '';
  showToast(name + ' added');
}

/* ===== PIPELINE TABS ===== */
function switchPipelineTab(btn, tabId) {
  document.querySelectorAll('.ptab').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.pipeline-tab-panel').forEach(function(p) { p.style.display = 'none'; });
  btn.classList.add('active');
  var panel = document.getElementById(tabId);
  if (panel) panel.style.display = 'block';
}

/* ===== PROPOSALS ===== */
function switchProposalTab(btn, tabId) {
  document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
  btn.classList.add('active');
  var panel = document.getElementById(tabId);
  if (panel) panel.classList.add('active');
}

/* ===== CHANGE ORDER MODAL ===== */
function openChangeOrderModal() {
  var modal = document.getElementById('coModal');
  if (modal) modal.classList.add('open');
}

function closeChangeOrderModal() {
  var modal = document.getElementById('coModal');
  if (modal) modal.classList.remove('open');
}

function closeModal(e) {
  if (e.target === e.currentTarget) closeChangeOrderModal();
}

function updateCoPreview() {
  var hrs = parseFloat(document.getElementById('coHours').value) || 0;
  var rate = parseFloat(document.getElementById('coRate').value) || 0;
  var type = document.getElementById('coType').value;
  var total = hrs * rate;
  setText('cipHours', hrs + ' hrs');
  setText('cipValue', (type === 'credit' ? '-' : '+') + fmt(total));
  var cipVal = document.getElementById('cipValue');
  if (cipVal) cipVal.style.color = type === 'credit' ? 'var(--red)' : 'var(--emerald)';
}

function submitChangeOrder() {
  var title = document.getElementById('coTitle').value.trim();
  if (!title) { showToast('Enter a description'); return; }
  var hrs = parseFloat(document.getElementById('coHours').value) || 0;
  var rate = parseFloat(document.getElementById('coRate').value) || 0;
  var type = document.getElementById('coType').value;
  var impact = type === 'credit' ? -hrs * rate : hrs * rate;
  var body = document.getElementById('coTableBody');
  if (body) {
    var num = '#CO-00' + (body.children.length + 4);
    body.insertAdjacentHTML('afterbegin',
      '<tr><td>' + escHtml(num) + '</td><td>Active Project</td><td>' + escHtml(title) + '</td>' +
      '<td>' + (type === 'credit' ? '-' : '+') + hrs + ' hrs</td>' +
      '<td class="td-pos">' + (impact >= 0 ? '+' : '') + fmt(impact) + '</td>' +
      '<td><span class="status-pill status-pending">Pending</span></td>' +
      '<td>Today</td></tr>');
  }
  closeChangeOrderModal();
  showToast('Change order created');
}

/* ===== PROPOSAL HERO ===== */
function updateProposalHero() {
  var c = contractor;
  setText('heroCompany', c.companyName || 'Your Company');
  setText('heroPresenter', c.companyName || 'Your Company');
  setText('heroContact', [c.phone, c.email].filter(Boolean).join(' · '));
  setText('heroPhone', '📞 ' + (c.phone || '(313) 555-0100'));
}

/* ===== CLIENT PORTAL / LETTERHEAD ===== */
function updateLetterhead() {
  setText('portalCompanyDisplay', contractor.companyName || 'Your Company');
  setText('portalContactDisplay', [contractor.phone, contractor.email, contractor.address].filter(Boolean).join(' · '));
  setText('portalLicenseDisplay', contractor.license ? 'License: ' + contractor.license : '');
  var logoEl = document.getElementById('portalLogoDisplay');
  if (logoEl && contractor.logo) {
    logoEl.innerHTML = '<img src="' + contractor.logo + '" style="max-width:60px;max-height:48px;object-fit:contain">';
  }
}

function copyPortalLink() {
  var url = window.location.href.split('#')[0] + '#client';
  navigator.clipboard.writeText(url).then(function() { showToast('Portal link copied!'); }).catch(function() { showToast('Copy the URL from the address bar'); });
}

function acceptProposal() {
  var name = document.getElementById('sigName').value.trim();
  var agreed = document.getElementById('sigAgree').checked;
  if (!name) { showToast('Enter your full legal name to sign'); return; }
  if (!agreed) { showToast('Check the agreement box to proceed'); return; }
  showToast('Proposal accepted! Your contractor has been notified.');
}

function scheduleVisit() {
  showToast('Scheduling request sent! Your contractor will contact you within 24 hours.');
}

/* ===== CONCEPT PHOTO / AI VISION ===== */
function handleConceptPhoto(input) {
  if (!input.files || !input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    state.conceptImageBase64 = e.target.result.split(',')[1];
    var zone = document.getElementById('conceptPhotoPreview');
    if (zone) {
      zone.innerHTML = '<img src="' + e.target.result + '" style="max-width:100%;max-height:200px;border-radius:8px;object-fit:cover;margin-bottom:10px"><br>' +
        '<button class="btn-primary btn-sm" onclick="generateConceptVision()">Generate AI Concept</button>' +
        '<input type="file" id="conceptPhotoInput" accept="image/*" style="display:none" onchange="handleConceptPhoto(this)">';
    }
  };
  reader.readAsDataURL(input.files[0]);
}

function generateConceptVision() {
  if (!state.apiKey) { showToast('Add your API key in the AI Advisor tab'); return; }
  if (!state.conceptImageBase64) { showToast('Upload a photo first'); return; }
  var box = document.getElementById('conceptVisionBox');
  var textEl = document.getElementById('conceptVisionText');
  if (box) { box.style.display = 'block'; }
  if (textEl) textEl.textContent = 'Analyzing your space...';

  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': state.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: state.conceptImageBase64 } },
          { type: 'text', text: 'Describe in 3–4 sentences how this space could look after a professional renovation. Focus on materials, finishes, and the feeling of the transformed space. Be specific and inspiring.' }
        ]
      }]
    })
  }).then(function(r) { return r.json(); })
    .then(function(data) {
      var text = data.content && data.content[0] ? data.content[0].text : 'Could not generate concept.';
      if (textEl) textEl.textContent = text;
    })
    .catch(function() { if (textEl) textEl.textContent = 'Error connecting to AI. Check your API key.'; });
}

/* ===== ON-SITE ===== */
function loadOnsiteClient(val) {
  var panel = document.getElementById('onsitePanel');
  if (!val) { if (panel) panel.style.display = 'none'; return; }
  if (panel) panel.style.display = 'block';
  state.onsiteClient = val;

  var clients = {
    lakewood:  { name: 'Sarah Johnson', type: 'kitchen',  sqft: 280 },
    riverside: { name: 'Mike Chen',     type: 'bathroom', sqft: 85  },
    sample:    { name: 'Demo Client',   type: 'kitchen',  sqft: 200 },
  };
  var client = clients[val] || clients.sample;
  setText('onsiteClientSqft', client.sqft);
  renderScopeChips();
  recalcOnSite();
}

function renderScopeChips() {
  var el = document.getElementById('onsiteScopeChips');
  if (!el) return;
  el.innerHTML = state.onsiteScope.map(function(item, i) {
    return '<button class="scope-chip' + (item.selected ? ' active' : '') + '" onclick="toggleScopeItem(' + i + ')">' + item.label + '</button>';
  }).join('');
}

function toggleScopeItem(i) {
  state.onsiteScope[i].selected = !state.onsiteScope[i].selected;
  renderScopeChips();
  recalcOnSite();
}

function recalcOnSite() {
  if (!state.onsiteClient) return;
  var actSqft = parseFloat(document.getElementById('onsiteActualSqft').value) || 0;
  var clientSqft = parseFloat(document.getElementById('onsiteClientSqft').textContent) || 0;
  var jr = jobRates[state.onsiteClient === 'riverside' ? 'bathroom' : 'kitchen'] || jobRates.kitchen;
  var adjFactor = actSqft > 0 ? actSqft / Math.max(clientSqft, 1) : 1;
  var selectedCount = state.onsiteScope.filter(function(s) { return s.selected; }).length;
  var scopeFactor = selectedCount / Math.max(state.onsiteScope.length, 1);
  var sqft = actSqft > 0 ? actSqft : clientSqft;
  var rawMin = sqft * jr.min * scopeFactor * adjFactor;
  var rawMax = sqft * jr.max * scopeFactor * adjFactor;

  setText('onsiteRangeMin', fmt(rawMin));
  setText('onsiteRangeMax', fmt(rawMax));
  setText('onsiteRangeBasis', sqft + ' sqft · ' + selectedCount + ' trades · ' + jr.min + '–' + jr.max + '$/sqft');

  var flag = document.getElementById('sqftAdjustFlag');
  if (actSqft > 0 && flag) {
    if (Math.abs(actSqft - clientSqft) > clientSqft * 0.1) {
      flag.style.display = 'block';
      flag.textContent = actSqft > clientSqft
        ? 'Your measurement is ' + (actSqft - clientSqft).toFixed(0) + ' sqft larger than client stated'
        : 'Your measurement is ' + (clientSqft - actSqft).toFixed(0) + ' sqft smaller than client stated';
    } else {
      flag.style.display = 'none';
    }
  }
}

function checkFinalPrice() {
  var btn = document.getElementById('lockPriceBtn');
  var val = parseFloat(document.getElementById('onsiteFinalPrice').value) || 0;
  if (btn) btn.disabled = val <= 0;
}

function lockFinalPrice() {
  var val = parseFloat(document.getElementById('onsiteFinalPrice').value) || 0;
  if (val <= 0) return;
  state.lockedPrice = val;
  var conf = document.getElementById('lockedConfirm');
  var btn = document.getElementById('lockPriceBtn');
  if (conf) conf.style.display = 'block';
  if (btn) btn.style.display = 'none';
  setText('lockedAmount', fmt(val));
  showToast('Price locked at ' + fmt(val));
}

function draftContract() {
  if (!state.lockedPrice) { showToast('Lock a price first'); return; }
  var client = document.getElementById('onsiteClientSelect');
  var clientName = client ? client.options[client.selectedIndex].text.split('—')[1].trim() : 'Client';
  openPrintModal(buildContract(clientName, state.lockedPrice));
}

function buildContract(clientName, amount) {
  var c = contractor;
  var today = new Date().toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'});
  return '<div class="print-letterhead">' +
    '<div style="font-size:1.2rem;font-weight:800">' + escHtml(c.companyName) + '</div>' +
    '<div style="margin-left:auto;text-align:right;font-size:.78rem;color:var(--text-muted)">' + escHtml(c.phone) + '<br>' + escHtml(c.email) + '<br>Lic: ' + escHtml(c.license) + '</div>' +
    '</div>' +
    '<h2 style="font-size:1.1rem;font-weight:800;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">Labor Services Agreement</h2>' +
    '<p style="font-size:.75rem;color:var(--text-muted);margin-bottom:20px">Date: ' + today + '</p>' +
    '<p style="font-size:.85rem;margin-bottom:14px"><strong>Contractor:</strong> ' + escHtml(c.companyName) + ' · ' + escHtml(c.address) + '</p>' +
    '<p style="font-size:.85rem;margin-bottom:20px"><strong>Client:</strong> ' + escHtml(clientName) + '</p>' +
    '<h3 style="margin-bottom:8px">1. Scope of Work</h3>' +
    '<p style="font-size:.82rem;margin-bottom:16px">Contractor agrees to furnish labor for the renovation project described and confirmed on-site. Scope includes: ' + state.onsiteScope.filter(function(s){return s.selected;}).map(function(s){return s.label;}).join(', ') + '.</p>' +
    '<h3 style="margin-bottom:8px">2. Locked Contract Price</h3>' +
    '<p style="font-size:.82rem;margin-bottom:16px">Total labor price, confirmed after on-site measurement: <strong>' + fmt(amount) + '</strong>. This price is fixed and will not increase unless a signed change order is executed.</p>' +
    '<h3 style="margin-bottom:8px">3. Payment Terms</h3>' +
    '<p style="font-size:.82rem;margin-bottom:16px">30% deposit upon signing. 40% at project midpoint. 30% upon completion and client approval. Payments due within 3 business days of each milestone.</p>' +
    '<h3 style="margin-bottom:8px">4. Change Orders</h3>' +
    '<p style="font-size:.82rem;margin-bottom:16px">Any changes to scope must be documented in a written change order signed by both parties before additional work begins.</p>' +
    '<h3 style="margin-bottom:8px">5. Warranty</h3>' +
    '<p style="font-size:.82rem;margin-bottom:16px">Contractor warrants workmanship for one (1) year from project completion. Warranty covers defects in labor; material warranties are governed by manufacturer terms.</p>' +
    '<h3 style="margin-bottom:8px">6. Dispute Resolution</h3>' +
    '<p style="font-size:.82rem;margin-bottom:24px">Disputes shall be resolved through binding arbitration in Wayne County, Michigan.</p>' +
    '<div style="border:1px solid var(--border);border-radius:8px;padding:16px;background:var(--amber-light)">' +
    '<p style="font-size:.72rem;color:#92400E"><strong>Disclaimer:</strong> This agreement is a template and may not meet all requirements for your jurisdiction. Consult a licensed Michigan attorney before use.</p></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:40px">' +
    '<div><div style="border-top:2px solid var(--text);padding-top:6px;font-size:.78rem;margin-top:60px">Contractor Signature &amp; Date</div></div>' +
    '<div><div style="border-top:2px solid var(--text);padding-top:6px;font-size:.78rem;margin-top:60px">Client Signature &amp; Date</div></div>' +
    '</div>';
}

/* ===== INVOICE GENERATION ===== */
function generateInvoice() {
  var c = contractor;
  var today = new Date().toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'});
  var html = '<div class="print-letterhead">' +
    '<div><div style="font-size:1rem;font-weight:800">' + escHtml(c.companyName) + '</div>' +
    '<div style="font-size:.75rem;color:var(--text-muted)">' + escHtml(c.phone) + ' · ' + escHtml(c.email) + '</div></div>' +
    '<div style="margin-left:auto;text-align:right"><div class="print-title">INVOICE</div>' +
    '<div style="font-size:.75rem;color:var(--text-muted)">' + today + '</div></div></div>' +
    '<div class="print-meta"><div class="pm-item"><div class="pm-label">Bill To</div><div class="pm-val">Sarah Johnson</div></div>' +
    '<div class="pm-item"><div class="pm-label">Project</div><div class="pm-val">Lakewood Kitchen</div></div>' +
    '<div class="pm-item"><div class="pm-label">Due Date</div><div class="pm-val">Net 30</div></div></div>' +
    '<div class="print-lines">' +
    '<div class="pl-head"><span>Description</span><span>Hrs</span><span>Rate</span><span>Crew</span><span>Total</span></div>' +
    '<div class="pl-row"><span>Demo &amp; Hauling</span><span>16</span><span>$65/hr</span><span>2</span><span>$2,080</span></div>' +
    '<div class="pl-row"><span>Electrical Rough-In</span><span>16</span><span>$110/hr</span><span>1</span><span>$1,760</span></div>' +
    '<div class="pl-row"><span>Cabinet Installation</span><span>24</span><span>$85/hr</span><span>2</span><span>$4,080</span></div>' +
    '<div class="pl-row"><span>Tile Work</span><span>10</span><span>$90/hr</span><span>1</span><span>$900</span></div>' +
    '</div>' +
    '<div class="print-totals">' +
    '<div class="pt-row"><span>Subtotal</span><span>$8,820</span></div>' +
    '<div class="pt-row"><span>O&amp;P (20%)</span><span>$1,764</span></div>' +
    '<div class="pt-row pt-final"><span>Total Due</span><span>$10,584</span></div>' +
    '</div>' +
    '<div class="print-footer">Payment due within 30 days. Make checks payable to ' + escHtml(c.companyName) + ' · License: ' + escHtml(c.license) + '</div>';
  openPrintModal(html);
}

/* ===== PRINT ===== */
function printEstimate() {
  var c = contractor;
  var raw = rawTotal();
  var markup = raw * (state.markup / 100);
  var contingency = (raw + markup) * (state.contingency / 100);
  var grand = raw + markup + contingency;
  var hrs = state.laborLines.reduce(function(s, l) { return s + (l.unit === 'hr' ? l.qty * l.crew : 0); }, 0);
  var today = new Date().toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'});
  var clientName = document.getElementById('clientName') ? document.getElementById('clientName').value || 'Client' : 'Client';

  var html = '<div class="print-letterhead">' +
    (c.logo ? '<img src="' + c.logo + '" style="max-height:48px;object-fit:contain">' : '') +
    '<div><div style="font-size:1rem;font-weight:800">' + escHtml(c.companyName) + '</div>' +
    '<div style="font-size:.75rem;color:var(--text-muted)">' + escHtml(c.phone) + ' · ' + escHtml(c.email) + ' · Lic: ' + escHtml(c.license) + '</div></div>' +
    '<div style="margin-left:auto;text-align:right"><div class="print-title">LABOR ESTIMATE</div><div style="font-size:.75rem;color:var(--text-muted)">' + today + '</div></div></div>' +
    '<div class="print-meta">' +
    '<div class="pm-item"><div class="pm-label">Client</div><div class="pm-val">' + escHtml(clientName) + '</div></div>' +
    '<div class="pm-item"><div class="pm-label">Project Type</div><div class="pm-val">' + (state.projectType || '—') + '</div></div>' +
    '<div class="pm-item"><div class="pm-label">Date</div><div class="pm-val">' + today + '</div></div>' +
    '</div>' +
    '<div class="print-lines"><div class="pl-head"><span>Trade / Task</span><span>Qty</span><span>Rate</span><span>Crew</span><span>Total</span></div>' +
    (state.laborLines.length > 0 ? state.laborLines.map(function(l) {
      return '<div class="pl-row"><span>' + escHtml(l.trade) + '</span><span>' + l.qty + ' ' + l.unit + '</span><span>' + fmt(l.rate) + '/' + l.unit + '</span><span>' + l.crew + '</span><span>' + fmt(lineTotal(l)) + '</span></div>';
    }).join('') : '<div style="padding:12px 0;color:var(--text-muted);font-size:.82rem">No lines added</div>') +
    '</div>' +
    '<div class="print-totals">' +
    '<div class="pt-row"><span>Raw Labor</span><span>' + fmt(raw) + '</span></div>' +
    '<div class="pt-row"><span>O&amp;P (' + state.markup + '%)</span><span>' + fmt(markup) + '</span></div>' +
    '<div class="pt-row"><span>Contingency (' + state.contingency + '%)</span><span>' + fmt(contingency) + '</span></div>' +
    '<div class="pt-row pt-final"><span>Grand Total</span><span>' + fmt(grand) + '</span></div>' +
    '</div>' +
    '<div class="print-footer">This estimate covers labor costs only. Material costs are not included. Valid for 30 days. ' + escHtml(c.companyName) + ' · ' + escHtml(c.address) + '</div>';

  openPrintModal(html);
}

function openPrintModal(html) {
  var modal = document.getElementById('printModal');
  var content = document.getElementById('printContent');
  if (modal && content) {
    content.innerHTML = html;
    modal.classList.add('open');
  }
}

function closePrintModal() {
  var modal = document.getElementById('printModal');
  if (modal) modal.classList.remove('open');
}

/* ===== SETTINGS ===== */
function populateSetupForm() {
  var fields = {
    'setupCompanyName': contractor.companyName,
    'setupOwnerName': contractor.ownerName,
    'setupPhone': contractor.phone,
    'setupEmail': contractor.email,
    'setupAddress': contractor.address,
    'setupWebsite': contractor.website,
    'setupLicense': contractor.license,
    'setupTagline': contractor.tagline
  };
  Object.keys(fields).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = fields[id] || '';
  });
  if (contractor.logo) {
    var prev = document.getElementById('settingsLogoPreview');
    if (prev) prev.innerHTML = '<img src="' + contractor.logo + '" style="width:100%;height:100%;object-fit:contain">';
  }
  ['kitchen','bathroom','fullhome','basement','outdoor','addition'].forEach(function(type) {
    var mn = document.getElementById('jr-' + type + '-min');
    var mx = document.getElementById('jr-' + type + '-max');
    if (mn && jobRates[type]) mn.value = jobRates[type].min;
    if (mx && jobRates[type]) mx.value = jobRates[type].max;
  });
  selectTemplate(state.selectedTemplate);
}

function saveContractorSetup() {
  contractor.companyName = val('setupCompanyName') || contractor.companyName;
  contractor.ownerName = val('setupOwnerName') || contractor.ownerName;
  contractor.phone = val('setupPhone');
  contractor.email = val('setupEmail');
  contractor.address = val('setupAddress');
  contractor.website = val('setupWebsite');
  contractor.license = val('setupLicense');
  contractor.tagline = val('setupTagline');
  ['kitchen','bathroom','fullhome','basement','outdoor','addition'].forEach(function(type) {
    if (!jobRates[type]) jobRates[type] = {};
    jobRates[type].min = parseFloat(document.getElementById('jr-' + type + '-min').value) || 0;
    jobRates[type].max = parseFloat(document.getElementById('jr-' + type + '-max').value) || 0;
  });
  localStorage.setItem('renovateiq_contractor', JSON.stringify(contractor));
  localStorage.setItem('renovateiq_jobrates', JSON.stringify(jobRates));
  updateSidebarProfile();
  updateLetterhead();
  showToast('Settings saved!');
}

function handleLogoUpload(input) {
  if (!input.files || !input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    contractor.logo = e.target.result;
    var prev = document.getElementById('settingsLogoPreview');
    if (prev) prev.innerHTML = '<img src="' + e.target.result + '" style="width:100%;height:100%;object-fit:contain">';
    updateLetterhead();
  };
  reader.readAsDataURL(input.files[0]);
}

function updateSidebarProfile() {
  var name = contractor.ownerName || 'James Rivera';
  var company = contractor.companyName || 'Your Company';
  setText('sidebarName', name);
  setText('sidebarCompany', company);
  var avatar = document.getElementById('sidebarAvatar');
  if (avatar) {
    var parts = name.trim().split(' ');
    avatar.textContent = parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0,2).toUpperCase();
  }
  setText('dashGreeting', 'Good morning, ' + name.split(' ')[0]);
}

/* ===== AI ADVISOR ===== */
function saveApiKey() {
  var key = document.getElementById('apiKeyInput').value.trim();
  if (!key.startsWith('sk-ant-')) { showToast('Invalid API key format'); return; }
  state.apiKey = key;
  localStorage.setItem('renovateiq_apikey', key);
  hideApiKeySection();
  showToast('API key connected!');
}

function hideApiKeySection() {
  var el = document.getElementById('aiApiKeySection');
  if (el) el.style.display = 'none';
}

function sendQuickPrompt(btn) {
  var text = btn.textContent.trim();
  document.getElementById('aiPromptInput').value = text;
  sendAiMessage();
}

function handleAiKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAiMessage(); }
}

function sendAiMessage() {
  var input = document.getElementById('aiPromptInput');
  var text = input.value.trim();
  if (!text) return;
  input.value = '';

  appendAiMsg('user', text);

  if (!state.apiKey) {
    setTimeout(function() {
      appendAiMsg('ai', 'Please add your Anthropic API key above to enable AI responses. In the meantime, check the Detroit Metro Rates sidebar for current benchmarks.');
    }, 400);
    return;
  }

  appendAiMsg('ai', '⏳ Thinking...');

  var msgs = document.getElementById('aiMessages');
  var loadingEl = msgs ? msgs.lastElementChild : null;

  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': state.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: 'You are an expert labor cost advisor for residential renovation contractors in Detroit, Michigan. Give concise, practical answers about labor rates, crew sizes, and hours estimation. Focus on Detroit metro market rates. Keep responses under 200 words.',
      messages: [{ role: 'user', content: text }]
    })
  }).then(function(r) { return r.json(); })
    .then(function(data) {
      var reply = data.content && data.content[0] ? data.content[0].text : 'No response received.';
      if (loadingEl) loadingEl.remove();
      appendAiMsg('ai', reply);
    })
    .catch(function() {
      if (loadingEl) loadingEl.remove();
      appendAiMsg('ai', 'Connection error. Check your API key and try again.');
    });
}

function appendAiMsg(role, text) {
  var msgs = document.getElementById('aiMessages');
  if (!msgs) return;
  var isUser = role === 'user';
  var div = document.createElement('div');
  div.className = 'ai-msg' + (isUser ? ' ai-msg-user' : '');
  div.innerHTML =
    '<div class="ai-avatar">' + (isUser ? 'ME' : 'AI') + '</div>' +
    '<div class="ai-bubble">' + escHtml(text).replace(/\n/g, '<br>') + '</div>';
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

/* ===== SCHEDULE MANAGEMENT ===== */
function renderScheduleView() {
  populateScheduleForm();
  renderBlockCal('visit', 'visitBlockCal', 'visitBlockedList', scheduleData.visitBlockedDates, scheduleData.visitLeadDays || 1, 35);
  renderBlockCal('work', 'workBlockCal', 'workBlockedList', scheduleData.workBlockedDates, scheduleData.workLeadDays || 14, 63);
}

function populateScheduleForm() {
  var s = scheduleData;

  var visitDow = document.getElementById('visitDowRow');
  if (visitDow) visitDow.querySelectorAll('input').forEach(function(cb) {
    cb.checked = s.visitDays.indexOf(parseInt(cb.value)) !== -1;
  });

  var visitSlot = document.getElementById('visitSlotRow');
  if (visitSlot) visitSlot.querySelectorAll('input').forEach(function(cb) {
    cb.checked = s.visitSlots.indexOf(cb.value) !== -1;
  });

  var vLead = document.getElementById('visitLeadDays');
  if (vLead) vLead.value = s.visitLeadDays;

  var workDow = document.getElementById('workDowRow');
  if (workDow) workDow.querySelectorAll('input').forEach(function(cb) {
    cb.checked = s.workDays.indexOf(parseInt(cb.value)) !== -1;
  });

  var wLead = document.getElementById('workLeadDays');
  if (wLead) wLead.value = s.workLeadDays;
}

function renderBlockCal(type, calId, listId, blocked, leadDays, totalDays) {
  var cal = document.getElementById(calId);
  if (!cal) return;
  blocked = blocked || [];
  leadDays = leadDays || 1;
  totalDays = totalDays || 42;

  var today = new Date();
  var start = new Date(today);
  start.setDate(today.getDate() + 1);
  var startDow = start.getDay();

  var html = '<div class="sched-cal-grid">';
  var dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  html += dayNames.map(function(d){ return '<div class="sched-cal-dow">' + d + '</div>'; }).join('');
  for (var pad = 0; pad < startDow; pad++) html += '<div></div>';

  for (var i = 0; i < totalDays; i++) {
    var d = new Date(start);
    d.setDate(start.getDate() + i);
    var iso = d.toISOString().split('T')[0];
    var isBlocked = blocked.indexOf(iso) !== -1;
    var isPast = i < leadDays - 1;
    html += '<button class="sched-cal-day' + (isBlocked ? ' sched-day-blocked' : '') + (isPast ? ' sched-day-past' : '') + '"' +
      ' data-date="' + iso + '" onclick="toggleBlockDate(\'' + type + '\',\'' + iso + '\')">' + d.getDate() + '</button>';
  }
  html += '</div>';
  cal.innerHTML = html;

  renderBlockedList(listId, blocked, type);
}

function renderBlockedList(listId, blocked, type) {
  var el = document.getElementById(listId);
  if (!el) return;
  if (!blocked || blocked.length === 0) { el.innerHTML = '<div style="font-size:.78rem;color:var(--text-muted)">No dates blocked</div>'; return; }
  el.innerHTML = '<div style="font-size:.75rem;color:var(--text-muted);margin-bottom:6px;font-weight:600">Blocked dates:</div>' +
    blocked.map(function(iso) {
      var d = new Date(iso + 'T12:00:00');
      return '<span class="sched-blocked-tag">' + d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) +
        ' <button onclick="toggleBlockDate(\'' + type + '\',\'' + iso + '\')" style="background:none;border:none;cursor:pointer;font-size:.8rem;line-height:1">✕</button></span>';
    }).join('');
}

function toggleBlockDate(type, iso) {
  var arr = type === 'visit' ? scheduleData.visitBlockedDates : scheduleData.workBlockedDates;
  var idx = arr.indexOf(iso);
  if (idx !== -1) arr.splice(idx, 1);
  else arr.push(iso);

  var leadDays = type === 'visit' ? (scheduleData.visitLeadDays || 1) : (scheduleData.workLeadDays || 14);
  var totalDays = type === 'visit' ? 35 : 63;
  renderBlockCal(type, type + 'BlockCal', type + 'BlockedList', arr, leadDays, totalDays);
}

function saveSchedule() {
  var visitDow = document.getElementById('visitDowRow');
  scheduleData.visitDays = visitDow ? Array.from(visitDow.querySelectorAll('input:checked')).map(function(cb){ return parseInt(cb.value); }) : [1,2,3,4,5];

  var visitSlot = document.getElementById('visitSlotRow');
  scheduleData.visitSlots = visitSlot ? Array.from(visitSlot.querySelectorAll('input:checked')).map(function(cb){ return cb.value; }) : ['morning','afternoon','late'];

  var vLead = document.getElementById('visitLeadDays');
  scheduleData.visitLeadDays = vLead ? parseInt(vLead.value) : 1;

  var workDow = document.getElementById('workDowRow');
  scheduleData.workDays = workDow ? Array.from(workDow.querySelectorAll('input:checked')).map(function(cb){ return parseInt(cb.value); }) : [1,2,3,4,5];

  var wLead = document.getElementById('workLeadDays');
  scheduleData.workLeadDays = wLead ? parseInt(wLead.value) : 14;

  localStorage.setItem('renovateiq_schedule', JSON.stringify(scheduleData));
  showToast('Schedule saved!');
}

/* ===== CUSTOMER INTAKE ===== */
var ciState = {
  projectType: null,
  photos: [],
  aiConcept: null,
  selectedDate: null,
  selectedTime: null,
  selectedWorkDate: null,
};

function customerStep(n) {
  for (var i = 1; i <= 4; i++) {
    var el = document.getElementById('cist-' + i);
    if (el) el.style.display = i === n ? 'block' : 'none';
    var pill = document.getElementById('csp-' + i);
    if (pill) {
      pill.classList.remove('active', 'done');
      if (i < n) pill.classList.add('done');
      else if (i === n) pill.classList.add('active');
    }
  }
  var confirm = document.getElementById('cist-confirm');
  if (confirm) confirm.style.display = 'none';
  if (n === 4) calculateInstantEstimate();
}

function ciSelectType(el) {
  document.querySelectorAll('.ci-type-btn').forEach(function(b) { b.classList.remove('selected'); });
  el.classList.add('selected');
  ciState.projectType = el.dataset.type;
}

function addCustomerPhotos(input) {
  if (!input.files) return;
  var grid = document.getElementById('ciPhotoPreviewGrid');
  var aiSection = document.getElementById('ciAiSection');
  Array.from(input.files).slice(0, 6 - ciState.photos.length).forEach(function(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      ciState.photos.push(e.target.result);
      var img = document.createElement('div');
      img.className = 'ci-photo-thumb';
      img.innerHTML = '<img src="' + e.target.result + '" alt="Before photo">';
      grid.appendChild(img);
      if (ciState.photos.length > 0 && aiSection) aiSection.style.display = 'block';
    };
    reader.readAsDataURL(file);
  });
  document.getElementById('ciPhotoPlaceholder').style.display = ciState.photos.length >= 6 ? 'none' : 'flex';
}

function generateCustomerConcept() {
  if (!state.apiKey) {
    showToast('AI concept requires an API key — contact your contractor to enable this feature');
    return;
  }
  var photoData = ciState.photos[0];
  if (!photoData) { showToast('Upload at least one photo first'); return; }
  var desc = document.getElementById('ciDescription').value.trim();
  var type = ciState.projectType || 'renovation';
  var btn = document.querySelector('#ciAiSection .btn-outline');
  if (btn) btn.textContent = 'Generating...';

  var base64 = photoData.split(',')[1];
  var mediaType = photoData.split(';')[0].split(':')[1] || 'image/jpeg';

  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': state.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: 'This is a BEFORE photo of a ' + type + ' that will be renovated. ' + (desc ? 'Customer says: "' + desc + '". ' : '') + 'Write a vivid 3-4 sentence "After Renovation" concept description. Describe the transformed space using specific materials, finishes, colors, and the atmosphere it will create. Be inspiring and specific.' }
        ]
      }]
    })
  }).then(function(r) { return r.json(); })
    .then(function(data) {
      var text = data.content && data.content[0] ? data.content[0].text : 'Could not generate concept.';
      ciState.aiConcept = text;
      var result = document.getElementById('ciAiResult');
      var textEl = document.getElementById('ciAiText');
      if (result) result.style.display = 'block';
      if (textEl) textEl.textContent = text;
      if (btn) btn.textContent = 'Regenerate Concept';
    })
    .catch(function() {
      if (btn) btn.textContent = 'Generate AI Concept →';
      showToast('AI error — try again');
    });
}

function calculateInstantEstimate() {
  var type = ciState.projectType;
  var sqft = parseFloat(document.getElementById('ciSqft').value) || 0;
  var jr = jobRates[type] || jobRates.kitchen;
  var scopes = document.querySelectorAll('#ciScopeGrid input:checked');
  var scopeFactor = scopes.length > 0 ? 0.5 + (scopes.length / 12) * 0.5 : 0.8;
  var minEst = sqft > 0 ? sqft * jr.min * scopeFactor : jr.min * 150 * scopeFactor;
  var maxEst = sqft > 0 ? sqft * jr.max * scopeFactor : jr.max * 150 * scopeFactor;

  var typeLabels = { kitchen:'Kitchen', bathroom:'Bathroom', fullhome:'Full Home', basement:'Basement', outdoor:'Outdoor', addition:'Addition' };
  setText('ciEstMin', fmt(minEst));
  setText('ciEstMax', fmt(maxEst));
  setText('ciEstBasis', (sqft > 0 ? sqft + ' sqft · ' : '') + (type ? typeLabels[type] : 'Renovation') + ' · ' + scopes.length + ' trades selected');
  setText('ciConfirmRange', fmt(minEst) + ' – ' + fmt(maxEst));
  ciState._minEst = minEst;
  ciState._maxEst = maxEst;
}

function renderDatePicker() {
  var cal = document.getElementById('ciCalendar');
  if (!cal) return;
  var sched = scheduleData;
  var allowedDays = sched.visitDays || [1,2,3,4,5];
  var blockedDates = sched.visitBlockedDates || [];
  var leadDays = sched.visitLeadDays !== undefined ? sched.visitLeadDays : 1;

  var today = new Date();
  var firstAvail = new Date(today);
  firstAvail.setDate(today.getDate() + Math.max(leadDays, 1));

  var html = '<div class="ci-cal-grid">';
  var dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  html += dayNames.map(function(d){ return '<div class="ci-cal-dow">' + d + '</div>'; }).join('');

  var startDow = firstAvail.getDay();
  for (var pad = 0; pad < startDow; pad++) html += '<div></div>';

  for (var i = 0; i < 21; i++) {
    var d = new Date(firstAvail);
    d.setDate(firstAvail.getDate() + i);
    var dow = d.getDay();
    var iso = d.toISOString().split('T')[0];
    var isUnavailable = allowedDays.indexOf(dow) === -1 || blockedDates.indexOf(iso) !== -1;
    html += '<button class="ci-cal-day' + (isUnavailable ? ' ci-cal-weekend' : '') + '" data-date="' + iso + '"' +
      (isUnavailable ? ' disabled' : ' onclick="selectDate(this,\'' + iso + '\')"') + '>' + d.getDate() + '</button>';
  }
  html += '</div>';
  cal.innerHTML = html;

  // Also filter time slots
  var slotEl = document.getElementById('ciTimeSlots');
  if (slotEl) {
    var slots = sched.visitSlots || ['morning','afternoon','late'];
    var slotLabels = { morning: 'Morning (8–11am)', afternoon: 'Afternoon (12–3pm)', late: 'Late Afternoon (3–6pm)' };
    var allSlots = ['morning','afternoon','late'];
    slotEl.querySelector('.ci-slots-row').innerHTML = allSlots
      .filter(function(s){ return slots.indexOf(s) !== -1; })
      .map(function(s){
        return '<button class="ci-slot" onclick="selectTimeSlot(this,\'' + s + '\')">' + slotLabels[s] + '</button>';
      }).join('');
  }
}

function ciSwitchSchedTab(tab) {
  document.getElementById('ciSchedVisit').style.display = tab === 'visit' ? 'block' : 'none';
  document.getElementById('ciSchedWork').style.display = tab === 'work' ? 'block' : 'none';
  document.getElementById('ciTabVisit').classList.toggle('active', tab === 'visit');
  document.getElementById('ciTabWork').classList.toggle('active', tab === 'work');
  if (tab === 'work') renderWorkDatePicker();
}

function renderWorkDatePicker() {
  var cal = document.getElementById('ciWorkCalendar');
  if (!cal) return;
  var sched = scheduleData;
  var allowedDays = sched.workDays || [1,2,3,4,5];
  var blockedDates = sched.workBlockedDates || [];
  var leadDays = sched.workLeadDays !== undefined ? sched.workLeadDays : 14;

  var today = new Date();
  var firstAvail = new Date(today);
  firstAvail.setDate(today.getDate() + leadDays);

  var html = '<div class="ci-cal-grid">';
  var dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  html += dayNames.map(function(d){ return '<div class="ci-cal-dow">' + d + '</div>'; }).join('');
  var startDow = firstAvail.getDay();
  for (var pad = 0; pad < startDow; pad++) html += '<div></div>';
  for (var i = 0; i < 42; i++) {
    var d = new Date(firstAvail);
    d.setDate(firstAvail.getDate() + i);
    var dow = d.getDay();
    var iso = d.toISOString().split('T')[0];
    var isUnavail = allowedDays.indexOf(dow) === -1 || blockedDates.indexOf(iso) !== -1;
    html += '<button class="ci-cal-day' + (isUnavail ? ' ci-cal-weekend' : '') + (ciState.selectedWorkDate === iso ? ' selected' : '') + '"' +
      (isUnavail ? ' disabled' : ' onclick="selectWorkDate(this,\'' + iso + '\')"') + '>' + d.getDate() + '</button>';
  }
  html += '</div>';
  cal.innerHTML = html;
}

function selectWorkDate(el, date) {
  var allDays = document.querySelectorAll('#ciWorkCalendar .ci-cal-day');
  allDays.forEach(function(b) { b.classList.remove('selected'); });
  el.classList.add('selected');
  ciState.selectedWorkDate = date;
  var d = new Date(date + 'T12:00:00');
  var label = document.getElementById('ciWorkSelectedLabel');
  if (label) {
    label.style.display = 'block';
    label.textContent = 'Preferred start: ' + d.toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric'});
  }
}

function selectDate(el, date) {
  document.querySelectorAll('#ciCalendar .ci-cal-day').forEach(function(b) { b.classList.remove('selected'); });
  el.classList.add('selected');
  ciState.selectedDate = date;
  ciState.selectedTime = null;
  var slotsRow = document.querySelector('#ciTimeSlots .ci-slots-row');
  if (slotsRow) slotsRow.querySelectorAll('.ci-slot').forEach(function(s) { s.classList.remove('selected'); });
  var slots = document.getElementById('ciTimeSlots');
  if (slots) slots.style.display = 'block';
  updateSubmitBtn();
}

function selectTimeSlot(el, time) {
  document.querySelectorAll('.ci-slot').forEach(function(s) { s.classList.remove('selected'); });
  el.classList.add('selected');
  ciState.selectedTime = time;
  updateSubmitBtn();
}

function updateSubmitBtn() {
  var btn = document.getElementById('ciSubmitBtn');
  if (btn) btn.disabled = !(ciState.selectedDate && ciState.selectedTime);
}

function submitCustomerRequest() {
  var first = document.getElementById('ciFirstName').value.trim();
  var last = document.getElementById('ciLastName').value.trim();
  if (!first || !last) { showToast('Enter your full name'); customerStep(1); return; }
  if (!ciState.projectType) { showToast('Select a project type'); customerStep(1); return; }
  if (!document.getElementById('ciSqft').value) { showToast('Enter approximate square footage'); customerStep(2); return; }
  if (!ciState.selectedDate || !ciState.selectedTime) { showToast('Select a date and time'); return; }

  var lastName = last.toUpperCase();
  var year = new Date().getFullYear();
  var requests = JSON.parse(localStorage.getItem('renovateiq_requests') || '[]');
  var num = String(requests.length + 1).padStart(3, '0');
  var code = lastName + '-' + year + '-' + num;

  var scopes = [];
  document.querySelectorAll('#ciScopeGrid input:checked').forEach(function(cb) { scopes.push(cb.value); });
  var timeLabels = { morning: 'Morning (8–11am)', afternoon: 'Afternoon (12–3pm)', late: 'Late Afternoon (3–6pm)' };

  var request = {
    code: code,
    name: first + ' ' + last,
    phone: document.getElementById('ciPhone').value,
    email: document.getElementById('ciEmail').value,
    address: document.getElementById('ciAddress').value,
    projectType: ciState.projectType,
    sqft: parseFloat(document.getElementById('ciSqft').value) || 0,
    budget: document.getElementById('ciBudget').value,
    scope: scopes,
    description: document.getElementById('ciDescription').value,
    photos: ciState.photos,
    aiConcept: ciState.aiConcept,
    scheduledDate: ciState.selectedDate,
    scheduledTime: ciState.selectedTime,
    preferredWorkDate: ciState.selectedWorkDate,
    estMin: ciState._minEst || 0,
    estMax: ciState._maxEst || 0,
    submittedAt: new Date().toISOString(),
    status: 'pending',
  };

  requests.push(request);
  localStorage.setItem('renovateiq_requests', JSON.stringify(requests));

  var d = new Date(ciState.selectedDate + 'T12:00:00');
  var dateStr = d.toLocaleDateString('en-US', {weekday:'long',month:'long',day:'numeric'}) + ' · ' + timeLabels[ciState.selectedTime];

  setText('ciConfirmCode', code);
  setText('ciConfirmDate', dateStr);
  setText('ciConfirmEmail', document.getElementById('ciEmail').value || 'your email');
  var workDateEl = document.getElementById('ciConfirmWorkDate');
  if (workDateEl) {
    if (ciState.selectedWorkDate) {
      var wd = new Date(ciState.selectedWorkDate + 'T12:00:00');
      workDateEl.parentElement.style.display = 'flex';
      workDateEl.textContent = wd.toLocaleDateString('en-US', {weekday:'short', month:'long', day:'numeric'});
    } else {
      workDateEl.parentElement.style.display = 'none';
    }
  }

  for (var i = 1; i <= 4; i++) {
    var el = document.getElementById('cist-' + i);
    if (el) el.style.display = 'none';
  }
  var conf = document.getElementById('cist-confirm');
  if (conf) conf.style.display = 'block';
  for (var j = 1; j <= 4; j++) {
    var pill = document.getElementById('csp-' + j);
    if (pill) { pill.classList.remove('active'); pill.classList.add('done'); }
  }

  updateRequestsBadge();
}

/* ===== REQUESTS VIEW ===== */
function renderRequestsList() {
  var requests = JSON.parse(localStorage.getItem('renovateiq_requests') || '[]');
  var emptyEl = document.getElementById('requestsEmpty');
  var listEl = document.getElementById('requestsList');
  if (!listEl) return;

  if (requests.length === 0) {
    if (emptyEl) emptyEl.style.display = 'block';
    listEl.style.display = 'none';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';
  listEl.style.display = 'grid';

  var typeLabels = { kitchen:'Kitchen', bathroom:'Bathroom', fullhome:'Full Home', basement:'Basement', outdoor:'Outdoor', addition:'Addition' };
  var timeLabels = { morning: 'Morning (8–11am)', afternoon: 'Afternoon (12–3pm)', late: 'Late Afternoon (3–6pm)' };

  listEl.innerHTML = requests.slice().reverse().map(function(r) {
    var d = new Date(r.submittedAt);
    var submitted = d.toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'});
    var visit = r.scheduledDate ? new Date(r.scheduledDate + 'T12:00:00').toLocaleDateString('en-US', {month:'short',day:'numeric'}) + ' · ' + (timeLabels[r.scheduledTime] || '') : '—';
    return '<div class="req-card card">' +
      '<div class="req-card-head">' +
        '<div>' +
          '<div class="req-name">' + escHtml(r.name) + '</div>' +
          '<div class="req-code">' + escHtml(r.code) + '</div>' +
        '</div>' +
        '<span class="status-pill status-pending">Pending</span>' +
      '</div>' +
      '<div class="req-meta">' +
        '<span>📍 ' + escHtml(r.address || '—') + '</span>' +
        '<span>🔧 ' + escHtml(typeLabels[r.projectType] || r.projectType || '—') + '</span>' +
        '<span>📐 ' + (r.sqft || '—') + ' sqft</span>' +
        '<span>📅 Visit: ' + visit + '</span>' +
      '</div>' +
      '<div class="req-range">' + fmt(r.estMin) + ' – ' + fmt(r.estMax) + ' estimate range</div>' +
      (r.description ? '<div class="req-desc">"' + escHtml(r.description.slice(0, 120)) + (r.description.length > 120 ? '…' : '') + '"</div>' : '') +
      '<div class="req-actions">' +
        '<button class="btn-primary btn-sm" onclick="loadRequestToOnsite(\'' + r.code + '\')">Verify On-Site →</button>' +
        '<button class="btn-outline btn-sm" onclick="copyIntakeLink()">Copy Link</button>' +
      '</div>' +
    '</div>';
  }).join('');

  updateRequestsBadge();
}

function updateRequestsBadge() {
  var requests = JSON.parse(localStorage.getItem('renovateiq_requests') || '[]');
  var pending = requests.filter(function(r){ return r.status === 'pending'; }).length;
  var badge = document.getElementById('requestsBadge');
  if (badge) {
    if (pending > 0) { badge.style.display = 'inline-flex'; badge.textContent = pending; }
    else badge.style.display = 'none';
  }
}

function copyIntakeLink() {
  var url = window.location.href.split('?')[0].split('#')[0] + '?intake=1';
  navigator.clipboard.writeText(url)
    .then(function() { showToast('Customer intake link copied!'); })
    .catch(function() { showToast('Copy the URL from your address bar'); });
}

function loadRequestToOnsite(code) {
  switchView('onsite');
  setTimeout(function() {
    var sel = document.getElementById('onsiteClientSelect');
    if (sel) {
      sel.value = code;
      loadOnsiteRequest(code);
    }
  }, 100);
}

/* ===== ON-SITE VERIFICATION (NEW) ===== */
var osvState = {
  request: null,
  lines: [],
};

function populateOnsiteSelect() {
  var sel = document.getElementById('onsiteClientSelect');
  if (!sel) return;
  var requests = JSON.parse(localStorage.getItem('renovateiq_requests') || '[]');
  sel.innerHTML = '<option value="">— Select a pending request —</option>';
  requests.forEach(function(r) {
    var opt = document.createElement('option');
    opt.value = r.code;
    opt.textContent = r.code + ' — ' + r.name;
    sel.appendChild(opt);
  });
  if (requests.length === 0) {
    var opt = document.createElement('option');
    opt.value = '__demo__';
    opt.textContent = 'JOHNSON-2025-001 — Sarah Johnson (Demo)';
    sel.appendChild(opt);
  }
}

function loadOnsiteRequest(code) {
  var panel = document.getElementById('onsitePanel');
  if (!code) { if (panel) panel.style.display = 'none'; return; }

  var requests = JSON.parse(localStorage.getItem('renovateiq_requests') || '[]');
  var request = requests.find(function(r) { return r.code === code; });

  if (!request && code === '__demo__') {
    request = {
      code: 'JOHNSON-2025-001', name: 'Sarah Johnson', phone: '(313) 555-0100',
      email: 'sarah@email.com', address: '1847 Lakewood Dr, Detroit, MI 48215',
      projectType: 'kitchen', sqft: 280, budget: '$20,000–$30,000',
      scope: ['demo','electrical','drywall','flooring','cabinets','painting','cleanup'],
      description: 'Full kitchen gut renovation. Remove all existing cabinets and flooring. New island layout, open to dining area. Want quartz countertops and hardwood floors.',
      photos: [], estMin: 18000, estMax: 31500,
      scheduledDate: new Date(Date.now() + 3*86400000).toISOString().split('T')[0],
      scheduledTime: 'morning', submittedAt: new Date().toISOString(), status: 'pending',
    };
  }

  if (!request) { showToast('Request not found'); return; }
  osvState.request = request;

  if (panel) panel.style.display = 'block';

  setText('osvName', request.name);
  setText('osvPhone', request.phone || '—');
  setText('osvEmail', request.email || '—');
  setText('osvAddress', request.address || '—');
  var typeLabels = { kitchen:'Kitchen', bathroom:'Bathroom', fullhome:'Full Home', basement:'Basement', outdoor:'Outdoor', addition:'Addition' };
  setText('osvProjectType', typeLabels[request.projectType] || request.projectType || '—');
  setText('osvBudget', request.budget || 'Not specified');
  setText('osvDescription', request.description || 'No description provided.');
  setText('onsiteClientSqft', request.sqft || '—');
  setText('osvCustMin', fmt(request.estMin || 0));
  setText('osvCustMax', fmt(request.estMax || 0));

  var photoCard = document.getElementById('osvPhotoCard');
  var photoGrid = document.getElementById('osvPhotoGrid');
  if (request.photos && request.photos.length > 0) {
    if (photoCard) photoCard.style.display = 'block';
    setText('osvPhotoCount', '(' + request.photos.length + ')');
    if (photoGrid) {
      photoGrid.innerHTML = request.photos.map(function(p) {
        return '<div class="osv-photo-thumb"><img src="' + p + '" alt="Before photo"></div>';
      }).join('');
    }
  } else {
    if (photoCard) photoCard.style.display = 'none';
  }

  osvState.lines = (request.scope || []).map(function(key) {
    var r = rates[key] || DEFAULT_RATES[key] || { name: key, unit: 'hr', rate: 85 };
    return { key: key, trade: r.name, unit: r.unit, qty: r.unit === 'hr' ? 8 : 100, rate: r.rate, included: true };
  });

  var lockBtn = document.getElementById('lockPriceBtn');
  var lockedConf = document.getElementById('lockedConfirm');
  var fp = document.getElementById('onsiteFinalPrice');
  if (lockBtn) { lockBtn.disabled = true; lockBtn.style.display = 'block'; }
  if (lockedConf) lockedConf.style.display = 'none';
  if (fp) fp.value = '';
  var sqftInput = document.getElementById('onsiteActualSqft');
  if (sqftInput) sqftInput.value = '';

  renderOnsiteScopeTable();
  recalcOnsiteVerify();
}

function renderOnsiteScopeTable() {
  var el = document.getElementById('osvScopeTable');
  if (!el) return;
  el.innerHTML = osvState.lines.map(function(line, i) {
    return '<div class="osv-scope-row' + (line.included ? '' : ' osv-row-excluded') + '">' +
      '<div style="display:flex;align-items:center;gap:8px">' +
        '<input type="checkbox"' + (line.included ? ' checked' : '') + ' onchange="osvState.lines[' + i + '].included=this.checked;renderOnsiteScopeTable();recalcOnsiteVerify()">' +
        '<span style="font-size:.82rem">' + escHtml(line.trade) + '</span>' +
      '</div>' +
      '<input type="number" value="' + line.qty + '" class="osv-num-in" onchange="osvState.lines[' + i + '].qty=parseFloat(this.value)||0;recalcOnsiteVerify()">' +
      '<span class="osv-unit-lbl">' + (line.unit === 'hr' ? 'hrs' : line.unit) + '</span>' +
      '<input type="number" value="' + line.rate + '" step="0.5" class="osv-num-in" onchange="osvState.lines[' + i + '].rate=parseFloat(this.value)||0;recalcOnsiteVerify()">' +
      '<span class="osv-line-total">' + fmt(line.included ? line.qty * line.rate : 0) + '</span>' +
      '<button class="labor-del" onclick="osvState.lines.splice(' + i + ',1);renderOnsiteScopeTable();recalcOnsiteVerify()">✕</button>' +
    '</div>';
  }).join('');
}

function addOnsiteLine() {
  osvState.lines.push({ key: 'custom_' + Date.now(), trade: 'Custom Task', unit: 'hr', qty: 8, rate: 85, included: true });
  renderOnsiteScopeTable();
  recalcOnsiteVerify();
}

function recalcOnsiteVerify() {
  var raw = osvState.lines.reduce(function(s, l) { return s + (l.included ? l.qty * l.rate : 0); }, 0);
  var op = parseInt((document.getElementById('osvOpSlider') || {}).value || 20);
  var cont = parseInt((document.getElementById('osvContSlider') || {}).value || 5);
  var withOp = raw * (1 + op / 100);
  var grand = withOp * (1 + cont / 100);

  var opVal = document.getElementById('osvOpVal');
  if (opVal) opVal.textContent = op + '%';
  var contVal = document.getElementById('osvContVal');
  if (contVal) contVal.textContent = cont + '%';

  setText('osvLiveTotal', fmt(raw));
  setText('osvGrandTotal', fmt(grand));

  var req = osvState.request;
  if (req) {
    var actSqft = parseFloat((document.getElementById('onsiteActualSqft') || {}).value) || 0;
    var custSqft = req.sqft || 0;
    var basis = osvState.lines.filter(function(l){ return l.included; }).length + ' trades';
    if (actSqft > 0) basis += ' · ' + actSqft + ' sqft (actual)';
    else if (custSqft > 0) basis += ' · ' + custSqft + ' sqft (customer)';
    setText('osvLiveBasis', basis);

    if (actSqft > 0) {
      var flag = document.getElementById('sqftAdjustFlag');
      var diff = actSqft - custSqft;
      if (flag && Math.abs(diff) > custSqft * 0.1) {
        flag.style.display = 'block';
        flag.textContent = diff > 0 ? 'Your measurement is ' + Math.abs(diff).toFixed(0) + ' sqft larger than customer stated' : 'Your measurement is ' + Math.abs(diff).toFixed(0) + ' sqft smaller than customer stated';
      } else if (flag) flag.style.display = 'none';
    }
  }
}

function checkOsvLock() {
  var btn = document.getElementById('lockPriceBtn');
  var val = parseFloat((document.getElementById('onsiteFinalPrice') || {}).value) || 0;
  if (btn) btn.disabled = val <= 0;
}

function lockOnsitePrice() {
  var val = parseFloat(document.getElementById('onsiteFinalPrice').value) || 0;
  if (val <= 0) return;
  state.lockedPrice = val;
  var btn = document.getElementById('lockPriceBtn');
  var conf = document.getElementById('lockedConfirm');
  if (btn) btn.style.display = 'none';
  if (conf) conf.style.display = 'block';
  setText('lockedAmount', fmt(val));

  if (osvState.request) {
    var requests = JSON.parse(localStorage.getItem('renovateiq_requests') || '[]');
    requests = requests.map(function(r) {
      if (r.code === osvState.request.code) { r.status = 'locked'; r.lockedPrice = val; }
      return r;
    });
    localStorage.setItem('renovateiq_requests', JSON.stringify(requests));
    updateRequestsBadge();
  }
  showToast('Price locked at ' + fmt(val));
}

function generateOnsiteContract() {
  if (!state.lockedPrice) { showToast('Lock a price first'); return; }
  var req = osvState.request || {};
  openPrintModal(buildOnsiteContract(req.name || 'Client', state.lockedPrice, req));
}

function buildOnsiteContract(clientName, amount, req) {
  var c = contractor;
  var today = new Date().toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'});
  var scopeList = osvState.lines.filter(function(l){return l.included;}).map(function(l){return l.trade;}).join(', ');
  return '<div class="print-letterhead">' +
    '<div style="font-size:1.2rem;font-weight:800">' + escHtml(c.companyName) + '</div>' +
    '<div style="margin-left:auto;text-align:right;font-size:.78rem;color:var(--text-muted)">' + escHtml(c.phone) + '<br>' + escHtml(c.email) + '<br>Lic: ' + escHtml(c.license) + '</div>' +
    '</div>' +
    '<h2 style="font-size:1.1rem;font-weight:800;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">Labor Services Agreement</h2>' +
    '<p style="font-size:.75rem;color:var(--text-muted);margin-bottom:20px">Date: ' + today + '</p>' +
    '<p style="font-size:.85rem;margin-bottom:8px"><strong>Contractor:</strong> ' + escHtml(c.companyName) + ' · ' + escHtml(c.address) + '</p>' +
    '<p style="font-size:.85rem;margin-bottom:8px"><strong>Client:</strong> ' + escHtml(clientName) + (req.address ? ' · ' + escHtml(req.address) : '') + '</p>' +
    '<p style="font-size:.85rem;margin-bottom:20px"><strong>Project Type:</strong> ' + escHtml(req.projectType || 'Renovation') + (req.sqft ? ' · ' + req.sqft + ' sqft' : '') + '</p>' +
    '<h3 style="margin-bottom:8px">1. Scope of Work</h3>' +
    '<p style="font-size:.82rem;margin-bottom:16px">Contractor agrees to furnish labor for the renovation project verified on-site. Scope: ' + escHtml(scopeList || 'See attached') + '.</p>' +
    '<h3 style="margin-bottom:8px">2. Locked Contract Price</h3>' +
    '<p style="font-size:.82rem;margin-bottom:16px">Total labor price confirmed after on-site measurement: <strong>' + fmt(amount) + '</strong>. This price is fixed unless a signed change order is executed.</p>' +
    '<h3 style="margin-bottom:8px">3. Payment Terms</h3>' +
    '<p style="font-size:.82rem;margin-bottom:16px">30% deposit upon signing. 40% at project midpoint. 30% upon completion and client approval.</p>' +
    '<h3 style="margin-bottom:8px">4. Change Orders</h3>' +
    '<p style="font-size:.82rem;margin-bottom:16px">Any changes to scope require a written change order signed by both parties.</p>' +
    '<h3 style="margin-bottom:8px">5. Warranty</h3>' +
    '<p style="font-size:.82rem;margin-bottom:24px">One (1) year workmanship warranty from project completion.</p>' +
    '<div style="border:1px solid var(--border);border-radius:8px;padding:16px;background:var(--amber-light)">' +
    '<p style="font-size:.72rem;color:#92400E"><strong>Disclaimer:</strong> This is a template. Consult a licensed attorney before use.</p></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:40px">' +
    '<div><div style="border-top:2px solid var(--text);padding-top:6px;font-size:.78rem;margin-top:60px">Contractor Signature &amp; Date</div></div>' +
    '<div><div style="border-top:2px solid var(--text);padding-top:6px;font-size:.78rem;margin-top:60px">Client Signature &amp; Date</div></div>' +
    '</div>';
}

/* ===== UTILITIES ===== */
function fmt(n) {
  return '$' + (Math.round(n || 0)).toLocaleString('en-US');
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function setText(id, text) {
  var el = document.getElementById(id);
  if (el) el.textContent = text;
}

function val(id) {
  var el = document.getElementById(id);
  return el ? el.value : '';
}

function showToast(msg) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(function() { t.classList.remove('show'); }, 2800);
}
