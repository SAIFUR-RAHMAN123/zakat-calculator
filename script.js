// =========================================
//  Zakat Calculator — script.js
// =========================================

let GR = 16500,
    SR = 290;
const NG = 85,
      NS = 595;
const ngv = () => NG * GR;
const nsv = () => NS * SR;

// ── Rates by country (approx local currency) ──
const COUNTRY_RATES = {
  IN: { gr: 16500,   sr: 290,    label: "India (INR ₹)" },
  PK: { gr: 50247,   sr: 883,    label: "Pakistan (PKR)" },
  BD: { gr: 22037,   sr: 387,    label: "Bangladesh (BDT)" },
  AE: { gr: 660,     sr: 11.6,   label: "UAE (AED)" },
  SA: { gr: 675,     sr: 11.86,  label: "Saudi Arabia (SAR)" },
  GB: { gr: 134,     sr: 2.35,   label: "UK (GBP £)" },
  US: { gr: 180,     sr: 3.16,   label: "USA (USD $)" },
  MY: { gr: 706,     sr: 12.5,   label: "Malaysia (MYR)" },
  ID: { gr: 3024241, sr: 53154,  label: "Indonesia (IDR)" },
};

// ── Helpers ──
function fmt(n) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
function gv(id) {
  return parseFloat(document.getElementById(id).value) || 0;
}
function pp(n) {
  return (n * 100).toFixed(1) + "%";
}

// ── Display Updates ──
function updateDisplays() {
  document.getElementById("grd").textContent = "₹" + GR.toLocaleString("en-IN") + "/g";
  document.getElementById("srd").textContent = "₹" + SR.toLocaleString("en-IN") + "/g";
  document.getElementById("ngd").textContent = fmt(ngv());
  document.getElementById("nsd").textContent = fmt(nsv());
}

// ── Modal ──
function openModal() {
  document.getElementById("mgr").value = GR;
  document.getElementById("msr").value = SR;
  document.getElementById("rateModal").classList.add("open");
}
function closeModal() {
  document.getElementById("rateModal").classList.remove("open");
}
function saveRates() {
  const g = parseFloat(document.getElementById("mgr").value);
  const s = parseFloat(document.getElementById("msr").value);
  if (g > 0) GR = g;
  if (s > 0) SR = s;
  document.getElementById("src-lbl").textContent = "Manually updated ✓";
  updateDisplays();
  syncG("g");
  syncS("g");
  closeModal();
}

// ── Location with auto rate set ──
function detectLoc() {
  const btn = document.getElementById("loc-btn");
  btn.textContent = "⏳...";
  btn.disabled = true;

  if (!navigator.geolocation) {
    document.getElementById("loc-text").textContent = "Browser mein support nahi";
    btn.textContent = "📡 Location Lein";
    btn.disabled = false;
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude,
            lon = pos.coords.longitude;
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
        .then((r) => r.json())
        .then((d) => {
          const cc = d.address?.country_code?.toUpperCase() || "IN";
          const rates = COUNTRY_RATES[cc] || COUNTRY_RATES["IN"];
          GR = rates.gr;
          SR = rates.sr;
          document.getElementById("loc-text").innerHTML =
            `<span>📍 ${d.address?.city || d.address?.state || ""}, ${d.address?.country || cc} — Rates auto-set!</span>`;
          document.getElementById("src-lbl").textContent =
            `Auto: ${rates.label} — verify karein (Google: gold price today)`;
          updateDisplays();
          syncG("g");
          syncS("g");
          btn.textContent = "✓ Set Hua";
          btn.disabled = false;
        })
        .catch(() => {
          document.getElementById("loc-text").innerHTML =
            `<span>Lat ${lat.toFixed(1)}, Lon ${lon.toFixed(1)}</span>`;
          document.getElementById("src-lbl").textContent =
            "Location mili — rate manually set karein";
          btn.textContent = "✓ Mila";
          btn.disabled = false;
        });
    },
    () => {
      document.getElementById("loc-text").textContent =
        "Allow nahi hua — manually rates set karein";
      btn.textContent = "📡 Dobara";
      btn.disabled = false;
    }
  );
}

// ── Gold / Silver Sync ──
function syncG(t) {
  if (t === "g") {
    const g = gv("gg");
    document.getElementById("gv").value = g > 0 ? Math.round(g * GR) : "";
  } else {
    document.getElementById("gg").value = "";
  }
}
function syncS(t) {
  if (t === "g") {
    const g = gv("sg");
    document.getElementById("sv").value = g > 0 ? Math.round(g * SR) : "";
  } else {
    document.getElementById("sg").value = "";
  }
}

// ── History ──
let history = JSON.parse(localStorage.getItem("zakat_history") || "[]");

function saveToHistory(entry) {
  history.unshift(entry);
  if (history.length > 5) history = history.slice(0, 5);
  try {
    localStorage.setItem("zakat_history", JSON.stringify(history));
  } catch (e) {}
  renderHistory();
}

function renderHistory() {
  const body = document.getElementById("hist-body");
  if (history.length === 0) {
    body.innerHTML =
      '<div class="hist-empty">Abhi koi history nahi — pehle calculate karein</div>';
    return;
  }
  body.innerHTML = history
    .map(
      (h) => `
      <div class="hist-row">
        <div>
          <div class="hist-date">${h.date}</div>
          <div class="hist-wealth">Net Wealth: ${h.net}</div>
        </div>
        <div style="text-align:right;">
          <div class="hist-zakat">${h.zakat}</div>
          <div class="hist-badge ${h.due ? "due" : "notdue"}">${h.due ? "Wajib" : "Wajib Nahi"}</div>
        </div>
      </div>`
    )
    .join("");
}

function clearHistory() {
  history = [];
  try {
    localStorage.removeItem("zakat_history");
  } catch (e) {}
  renderHistory();
}

// ── Main Calculate ──
function calc() {
  const goldVal   = gv("gv");
  const silverVal = gv("sv");

  const cats = [
    { e: "💵", n: "Naqdiyat (Cash)",               v: gv("cash")  },
    { e: "🏦", n: "Bank + Digital Wallets",         v: gv("bank")  },
    { e: "📜", n: "FD / RD",                        v: gv("fd")    },
    { e: "💰", n: "Aur Bachat",                     v: gv("osav")  },
    { e: "🥇", n: "Sona (Gold)",                    v: goldVal     },
    { e: "🥈", n: "Chandi (Silver)",                v: silverVal   },
    { e: "📈", n: "Shares / Stocks",                v: gv("stocks")},
    { e: "💹", n: "Mutual Funds",                   v: gv("mfu")   },
    { e: "🏘️", n: "Kiraya Amdani",                  v: gv("rent")  },
    { e: "💼", n: "Digar Investments",              v: gv("oinv")  },
    { e: "🏪", n: "Business Maal",                  v: gv("inv")   },
    { e: "🤝", n: "Qarz Dena (wapas milne wala)",   v: gv("lgiv")  },
    { e: "💰", n: "Business Cash",                  v: gv("bcash") },
    { e: "📦", n: "Aur Business Assets",            v: gv("both")  },
  ];

  const deduct = gv("ltak") + gv("bills");
  const total  = cats.reduce((s, c) => s + c.v, 0);
  const net    = Math.max(0, total - deduct);

  // Combined nisab calculation
  const gPct   = goldVal   / ngv();
  const sPct   = silverVal / nsv();
  const otherW = Math.max(
    0,
    cats
      .filter((c) => c.e !== "🥇" && c.e !== "🥈")
      .reduce((s, c) => s + c.v, 0) - deduct
  );
  const oPct    = otherW / nsv();
  const combined = gPct + sPct + oPct;
  const due      = combined >= 1.0;
  const zakat    = due ? net * 0.025 : 0;

  // Show result panel
  const rp = document.getElementById("rp");
  rp.style.display = "block";
  rp.scrollIntoView({ behavior: "smooth", block: "start" });

  document.getElementById("zamt").textContent = fmt(zakat);
  document.getElementById("nwd").textContent  = "Net Zakatable Wealth: " + fmt(net);
  document.getElementById("ta").textContent   = fmt(total);
  document.getElementById("td").textContent   = fmt(deduct);
  document.getElementById("nth").textContent  = fmt(nsv());

  const badge = document.getElementById("badge");
  badge.textContent = due ? "ZAKAT WAJIB HAI ✓" : "ZAKAT WAJIB NAHI";
  badge.className   = "rs-badge " + (due ? "due" : "notdue");

  // Formula rows
  function setFormula(pctId, formulaId, val, divisor, pctVal) {
    document.getElementById(pctId).textContent = pp(pctVal);
    document.getElementById(formulaId).innerHTML =
      `<span class="fval">${fmt(val)}</span>` +
      `<span class="fdiv">÷</span>` +
      `<span class="fval">${fmt(divisor)}</span>` +
      ` = <span style="color:var(--gold-light);font-weight:700;">${pp(pctVal)}</span>`;
  }
  setFormula("gnp", "gnp-formula", goldVal,   ngv(), gPct);
  setFormula("snp", "snp-formula", silverVal,  nsv(), sPct);
  setFormula("onp", "onp-formula", otherW,     nsv(), oPct);

  const cel = document.getElementById("cnp");
  cel.textContent = pp(combined);
  cel.className   = "v " + (combined >= 1 ? "g" : "r");

  document.getElementById("nvrd").innerHTML = due
    ? '<span class="g">✓ Nisab Poora — Zakat Farz Hai</span>'
    : '<span class="r">✗ Nisab Poora Nahi — Zakat Wajib Nahi</span>';

  // Breakdown rows
  const con = document.getElementById("brows");
  con.innerHTML = "";
  cats.forEach((c) => {
    if (c.v > 0) {
      const r = document.createElement("div");
      r.className = "btr";
      r.innerHTML =
        `<div class="btc"><span>${c.e}</span>${c.n}: ${fmt(c.v)}</div>` +
        `<div class="bta">${due ? fmt(c.v * 0.025) : "—"}</div>`;
      con.appendChild(r);
    }
  });
  if (deduct > 0) {
    const r = document.createElement("div");
    r.className = "btr";
    r.innerHTML =
      `<div class="btc" style="color:#c0392b">🔻 Deductions</div>` +
      `<div class="bta" style="color:#c0392b">− ${fmt(deduct)}</div>`;
    con.appendChild(r);
  }
  const tr = document.createElement("div");
  tr.className = "btr";
  tr.style.cssText = "background:rgba(27,67,50,0.06);font-weight:700;";
  tr.innerHTML =
    `<div class="btc" style="color:var(--emerald);font-weight:700;">📊 Kul Zakat</div>` +
    `<div class="bta" style="font-size:1rem;">${fmt(zakat)}</div>`;
  con.appendChild(tr);

  // Installment breakdown
  document.getElementById("wa").textContent  = fmt(zakat / 52);
  document.getElementById("moa").textContent = fmt(zakat / 12);
  document.getElementById("ra").textContent  = fmt(zakat / 30);

  // Save to history
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  saveToHistory({ date: dateStr, net: fmt(net), zakat: fmt(zakat), due });
}

// ── Reset ──
function resetCalc() {
  document.querySelectorAll("input[type=number]").forEach((i) => (i.value = ""));
  document.getElementById("rp").style.display = "none";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ── Init ──
updateDisplays();
renderHistory();