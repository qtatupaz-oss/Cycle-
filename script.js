(function(){
  "use strict";

  var recyclables = [
    { id:'plastic', label:'Plastic Bottles', rate:10, icon:'🧴' },
    { id:'aluminum', label:'Aluminum Cans', rate:15, icon:'🥫' },
    { id:'paper', label:'Paper & Cardboard', rate:5, icon:'📦' }
  ];
  var ewasteItems = [
    { id:'phone', label:'Old Phone', points:150, icon:'📱' },
    { id:'charger', label:'Charger / Cable', points:30, icon:'🔌' },
    { id:'battery', label:'Battery', points:20, icon:'🔋' },
    { id:'smallelec', label:'Small Electronics', points:80, icon:'🎧' }
  ];
  var rewards = [
    { id:'gcash50', name:'₱50 GCash Load', cost:500, icon:'📲' },
    { id:'coffee', name:'Coffee Shop Voucher', cost:300, icon:'☕' },
    { id:'fastfood', name:'₱75 Fast Food Discount', cost:400, icon:'🍔' },
    { id:'printing', name:'50-Page Printing Credit', cost:150, icon:'🖨️' },
    { id:'transpo', name:'₱30 Transport Credit', cost:250, icon:'🚌' },
    { id:'grocery', name:'₱100 Grocery Coupon', cost:800, icon:'🛒' }
  ];
  var kiosks = [
    { name:'SM Megamall Kiosk', type:'Mall', icon:'🏬', distance:'1.2 km' },
    { name:'TIP Manila Campus Kiosk', type:'School', icon:'🎓', distance:'2.5 km' },
    { name:'Ortigas Center Office Kiosk', type:'Office', icon:'🏢', distance:'3.8 km' },
    { name:'Barangay San Juan Hall', type:'LGU', icon:'🏛️', distance:'4.1 km' }
  ];

  var STORAGE_KEY = 'cyclePlusDemoStateV1';
  var state = { loggedIn:false, userName:'', points:0, history:[] };
  try {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved) state = JSON.parse(saved);
  } catch(e) {}

  function saveState(){ try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {} }

  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  function fmtDate(iso){
    var d = new Date(iso);
    return d.toLocaleDateString('en-PH', { month:'short', day:'numeric' });
  }

  // ---------------- Toast ----------------
  var toastEl = document.getElementById('toast');
  var toastTimer;
  function showToast(msg){
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove('show'); }, 2200);
  }

  // ---------------- Sync pulse ----------------
  var syncEl = document.getElementById('syncIndicator');
  function pulseSync(){
    syncEl.classList.remove('active');
    void syncEl.offsetWidth;
    syncEl.classList.add('active');
    setTimeout(function(){ syncEl.classList.remove('active'); }, 1400);
  }

  // ================= KIOSK =================
  var kioskScreenEl = document.getElementById('kioskScreen');
  var kioskStep = 'idle';
  var kSel = { material: recyclables[0].id, weight: 1.0 };
  var kResult = { label:'', points:0 };

  function loopIconSVG(cls){
    return '<svg class="'+cls+'" viewBox="0 0 48 48" fill="none">' +
      '<path d="M24 6a18 18 0 0 1 15.5 8.9" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M35 9v7h-7" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M24 42a18 18 0 0 1-15.5-8.9" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M13 39v-7h7" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function renderKiosk(){
    var html = '';
    if (kioskStep === 'idle') {
      html = '<div class="kiosk-pad kiosk-idle">' +
        '<img src="Logo Alt.png" alt="Cycle+ logo" class="loop-icon">' +
        '<h2>Welcome to Cycle+</h2>' +
        '<p>Scan your Cycle+ QR code to start earning points for recycling.</p>' +
        '<img src="viewfinder.png" alt="QR scanner viewfinder" class="kiosk-viewfinder">' +
        '<button class="btn" id="k-scan">Scan QR Code</button>' +
        '</div>';
    } else if (kioskStep === 'scanning') {
      html = '<div class="kiosk-pad kiosk-idle">' +
        loopIconSVG('loop-icon') +
        '<h2>Scanning…</h2>' +
        '<p>Hold your code up to the reader.</p>' +
        '</div>';
    } else if (kioskStep === 'menu') {
      html = '<div class="kiosk-pad">' +
        '<h2 class="screen-title">Welcome back!</h2>' +
        '<p class="screen-sub">What are you dropping off today?</p>' +
        '<div class="chip-row">' +
          '<div class="chip" id="k-cat-recyclable" style="flex-basis:100%"><span class="ic">♻️</span>Recyclables<br><span style="color:var(--color-ink-soft);font-size:0.72rem">Plastic, aluminum, paper</span></div>' +
          '<div class="chip" id="k-cat-ewaste" style="flex-basis:100%"><span class="ic">🔌</span>E-Waste<br><span style="color:var(--color-ink-soft);font-size:0.72rem">Phones, chargers, batteries</span></div>' +
        '</div>' +
        '</div>';
    } else if (kioskStep === 'recyclable') {
      var mat = recyclables.filter(function(m){ return m.id === kSel.material; })[0];
      var pts = Math.round(mat.rate * kSel.weight);
      html = '<div class="kiosk-pad">' +
        '<h2 class="screen-title">Select material</h2>' +
        '<div class="chip-row" id="k-mat-list">' +
        recyclables.map(function(m){
          return '<div class="chip mat-chip' + (m.id===kSel.material?' selected':'') + '" data-mat="'+m.id+'"><span class="ic">'+m.icon+'</span>'+m.label+'</div>';
        }).join('') +
        '</div>' +
        '<div class="weight-row"><input type="range" min="0.1" max="5" step="0.1" value="'+kSel.weight+'" id="k-weight"><div class="weight-val">'+kSel.weight.toFixed(1)+' kg</div></div>' +
        '<div class="points-preview"><div class="num">+'+pts+'</div><div class="lbl">CYCLE POINTS</div></div>' +
        '<button class="btn block" id="k-confirm-recyclable">Confirm Deposit</button>' +
        '<button class="btn secondary block" style="margin-top:8px" id="k-back">Back</button>' +
        '</div>';
    } else if (kioskStep === 'ewaste') {
      html = '<div class="kiosk-pad">' +
        '<h2 class="screen-title">Select item</h2>' +
        '<p class="screen-sub">Tap the item you\'re dropping off.</p>' +
        '<div class="chip-row">' +
        ewasteItems.map(function(it){
          return '<div class="chip ewaste-chip" data-item="'+it.id+'"><span class="ic">'+it.icon+'</span>'+it.label+'<br><span style="color:var(--color-secondary);font-size:0.72rem;font-weight:600">+'+it.points+' pts</span></div>';
        }).join('') +
        '</div>' +
        '<button class="btn secondary block" style="margin-top:12px" id="k-back">Back</button>' +
        '</div>';
    } else if (kioskStep === 'result') {
      html = '<div class="kiosk-pad kiosk-idle">' +
        '<div class="result-badge"><svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
        '<h2>+'+kResult.points+' points!</h2>' +
        '<p>'+esc(kResult.label)+' deposited. Thanks for recycling.</p>' +
        '<button class="btn secondary" id="k-done">Done</button>' +
        '</div>';
    }
    kioskScreenEl.innerHTML = html;
    bindKioskEvents();
  }

  function bindKioskEvents(){
    var scanBtn = document.getElementById('k-scan');
    if (scanBtn) scanBtn.onclick = function(){
      kioskStep = 'scanning'; renderKiosk();
      setTimeout(function(){ kioskStep = 'menu'; renderKiosk(); }, 850);
    };
    var catR = document.getElementById('k-cat-recyclable');
    if (catR) catR.onclick = function(){ kioskStep = 'recyclable'; kSel.material = recyclables[0].id; kSel.weight = 1.0; renderKiosk(); };
    var catE = document.getElementById('k-cat-ewaste');
    if (catE) catE.onclick = function(){ kioskStep = 'ewaste'; renderKiosk(); };
    var backBtn = document.getElementById('k-back');
    if (backBtn) backBtn.onclick = function(){ kioskStep = 'menu'; renderKiosk(); };

    var matChips = document.querySelectorAll('.mat-chip');
    matChips.forEach(function(c){
      c.onclick = function(){ kSel.material = c.getAttribute('data-mat'); renderKiosk(); };
    });
    var weightSlider = document.getElementById('k-weight');
    if (weightSlider) weightSlider.oninput = function(){ kSel.weight = parseFloat(this.value); renderKiosk(); };

    var confirmRec = document.getElementById('k-confirm-recyclable');
    if (confirmRec) confirmRec.onclick = function(){
      var mat = recyclables.filter(function(m){ return m.id === kSel.material; })[0];
      var pts = Math.round(mat.rate * kSel.weight);
      finishDeposit(mat.label, kSel.weight.toFixed(1) + ' kg', pts, kSel.weight);
    };

    var ewasteChips = document.querySelectorAll('.ewaste-chip');
    ewasteChips.forEach(function(c){
      c.onclick = function(){
        var it = ewasteItems.filter(function(i){ return i.id === c.getAttribute('data-item'); })[0];
        finishDeposit(it.label, '1 item', it.points, 0);
      };
    });

    var doneBtn = document.getElementById('k-done');
    if (doneBtn) doneBtn.onclick = function(){ kioskStep = 'idle'; renderKiosk(); };
  }

  function finishDeposit(label, detail, pts, kg){
    state.points += pts;
    state.history.unshift({ date: new Date().toISOString(), label: label, detail: detail, points: pts, type: 'earn', kg: kg || 0 });
    saveState();
    kResult = { label: label, points: pts };
    kioskStep = 'result';
    renderKiosk();
    pulseSync();
    if (state.loggedIn) renderPhone();
    setTimeout(function(){
      if (kioskStep === 'result') { kioskStep = 'idle'; renderKiosk(); }
    }, 3800);
  }

  // ================= WEBSITE (desktop) =================
  var phoneContentEl = document.getElementById('phoneContent');
  var tabbarEl = document.getElementById('phoneTabbar');
  var activeTab = 'dashboard';
  var gateMode = 'login';

  function renderPhone(){
    if (!state.loggedIn) {
      tabbarEl.style.visibility = 'hidden';
      phoneContentEl.innerHTML = renderGate();
      bindGateEvents();
      return;
    }
    tabbarEl.style.visibility = 'visible';
    Array.prototype.forEach.call(tabbarEl.children, function(btn){
      btn.classList.toggle('active', btn.getAttribute('data-tab') === activeTab);
    });
    var html = '';
    if (activeTab === 'dashboard') html = renderDashboard();
    else if (activeTab === 'rewards') html = renderRewards();
    else if (activeTab === 'history') html = renderHistory();
    else if (activeTab === 'locator') html = renderLocator();
    phoneContentEl.innerHTML = html;
    bindPhoneEvents();
  }

  function renderGate(){
    return '<div class="gate">' +
      '<img src="Logo Alt.png" alt="Cycle+ logo" class="loop-icon">' +
      '<h2>Welcome to Cycle+</h2>' +
      '<p class="sub">Track points, find kiosks, and redeem rewards.</p>' +
      '<div class="segmented">' +
        '<button data-mode="login" class="'+(gateMode==='login'?'active':'')+'">Log In</button>' +
        '<button data-mode="register" class="'+(gateMode==='register'?'active':'')+'">Register</button>' +
      '</div>' +
      '<input type="text" id="g-name" placeholder="Your name" value="'+esc(state.userName)+'">' +
      '<button class="btn block" id="g-continue">Continue</button>' +
      '<div class="qr-note">or tap "Scan QR Code" on a nearby kiosk</div>' +
      '</div>';
  }

  function bindGateEvents(){
    var modeBtns = phoneContentEl.querySelectorAll('.segmented button');
    modeBtns.forEach(function(b){
      b.onclick = function(){ gateMode = b.getAttribute('data-mode'); renderPhone(); };
    });
    var cont = document.getElementById('g-continue');
    cont.onclick = function(){
      var nameInput = document.getElementById('g-name');
      var name = nameInput.value.trim();
      if (!name) { nameInput.focus(); return; }
      state.loggedIn = true;
      state.userName = name;
      saveState();
      activeTab = 'dashboard';
      renderPhone();
    };
  }

  function totalKg(){
    return state.history.reduce(function(sum, h){ return sum + (h.kg || 0); }, 0);
  }
  function itemsCount(){
    return state.history.filter(function(h){ return h.type === 'earn'; }).length;
  }

  function renderDashboard(){
    var recent = state.history.slice(0, 3);
    var recentHtml = recent.length ? recent.map(historyRow).join('') :
      '<div class="empty-state"><div class="ic">🌱</div><p>No activity yet — visit a kiosk to start earning points.</p></div>';
    return '<div class="section-label">Hi, ' + esc(state.userName) + '</div>' +
      '<div class="balance-card"><div class="lbl">CYCLE POINTS</div><div class="num">' + state.points + '</div></div>' +
      '<div class="stat-row">' +
        '<div class="stat-mini"><div class="num">' + totalKg().toFixed(1) + 'kg</div><div class="lbl">Recycled</div></div>' +
        '<div class="stat-mini"><div class="num">' + itemsCount() + '</div><div class="lbl">Drop-offs</div></div>' +
        '<div class="stat-mini"><div class="num">' + Math.round(totalKg() * 1.5) + 'kg</div><div class="lbl">CO₂ saved*</div></div>' +
      '</div>' +
      '<div class="section-label">Recent activity</div>' + recentHtml +
      '<p style="font-size:0.62rem;color:var(--color-ink-soft);margin-top:10px">*Estimated impact for illustration.</p>';
  }

  function historyRow(h){
    var ic = h.type === 'redeem' ? '🎁' : '♻️';
    return '<div class="hist-item"><div class="hist-ic">'+ic+'</div>' +
      '<div class="hist-main"><div class="t">'+esc(h.label)+'</div><div class="d">'+fmtDate(h.date)+(h.detail?' · '+esc(h.detail):'')+'</div></div>' +
      '<div class="hist-pts '+h.type+'">'+(h.points>0?'+':'')+h.points+'</div></div>';
  }

  function renderRewards(){
    return '<div class="section-label">Rewards Marketplace</div>' +
      '<div class="card" style="padding:4px 12px">' +
      rewards.map(function(r){
        return '<div class="reward-item"><div class="reward-ic">'+r.icon+'</div>' +
          '<div class="reward-main"><div class="t">'+esc(r.name)+'</div><div class="reward-cost">'+r.cost+' points</div></div>' +
          '<button class="btn small redeem-btn" data-id="'+r.id+'">Redeem</button></div>';
      }).join('') +
      '</div>';
  }

  function renderHistory(){
    if (!state.history.length) {
      return '<div class="section-label">Recycling History</div>' +
        '<div class="empty-state"><div class="ic">📋</div><p>Nothing logged yet. Your kiosk drop-offs and reward redemptions will appear here.</p></div>';
    }
    return '<div class="section-label">Recycling History</div>' +
      '<div class="card" style="padding:4px 12px">' +
      state.history.map(historyRow).join('') +
      '</div>';
  }

  function renderLocator(){
    return '<div class="section-label">Nearby Kiosks</div>' +
      kiosks.map(function(k){
        return '<div class="locator-item"><div class="locator-ic">'+k.icon+'</div>' +
          '<div class="locator-main"><div class="t">'+esc(k.name)+'</div><div class="d">'+k.type+'</div></div>' +
          '<div class="locator-dist">'+k.distance+'</div></div>';
      }).join('') +
      '<p style="font-size:0.68rem;color:var(--color-ink-soft);margin-top:6px">Sample locations for demo purposes.</p>';
  }

  function bindPhoneEvents(){
    var redeemBtns = phoneContentEl.querySelectorAll('.redeem-btn');
    redeemBtns.forEach(function(b){
      b.onclick = function(){
        var reward = rewards.filter(function(r){ return r.id === b.getAttribute('data-id'); })[0];
        if (state.points < reward.cost) {
          showToast('Not enough points — need ' + (reward.cost - state.points) + ' more');
          return;
        }
        state.points -= reward.cost;
        state.history.unshift({ date: new Date().toISOString(), label: 'Redeemed: ' + reward.name, detail: '', points: -reward.cost, type: 'redeem', kg: 0 });
        saveState();
        showToast('Redeemed ' + reward.name + '!');
        renderPhone();
      };
    });
  }

  tabbarEl.addEventListener('click', function(e){
    var btn = e.target.closest('button[data-tab]');
    if (!btn) return;
    activeTab = btn.getAttribute('data-tab');
    renderPhone();
  });

  document.getElementById('resetBtn').addEventListener('click', function(){
    try { localStorage.removeItem(STORAGE_KEY); } catch(e) {}
    location.reload();
  });

  renderKiosk();
  renderPhone();
})();
