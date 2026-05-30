import { auth, db } from "./firebase-config.js";
import { collection, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { requireAuth, loadUserProfile, showToast, formatDateShort } from "./utils.js";
import { icon } from "./icons.js";

let currentUser = null;
let userProfile = null;
let allLogs = [];

export async function initHealthTrackerPage() {
  try {
    currentUser = await requireAuth();
    userProfile = await loadUserProfile(currentUser.uid);
    setupLogForm();
    await loadLogs();
  } catch (e) { /* redirected */ }
}

function setupLogForm() {
  // Set today's date as default
  const dateInput = document.getElementById("log-date");
  if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];

  document.getElementById("btn-save-log")?.addEventListener("click", saveLog);

  // Energy level buttons
  document.querySelectorAll(".energy-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".energy-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // Meal adherence buttons
  document.querySelectorAll(".adherence-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".adherence-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

async function saveLog() {
  const btn = document.getElementById("btn-save-log");
  const date = document.getElementById("log-date")?.value;
  const weight = parseFloat(document.getElementById("log-weight")?.value);
  const energyLevel = parseInt(document.querySelector(".energy-btn.active")?.dataset.level || "3");
  const mealFollowed = document.querySelector(".adherence-btn.active")?.dataset.value === "yes";
  const notes = document.getElementById("log-notes")?.value.trim();

  if (!date) { showToast("Please select a date.", "error"); return; }

  btn.disabled = true; btn.textContent = "Saving...";

  try {
    await addDoc(collection(db, "healthLogs"), {
      userId: currentUser.uid, date, weight: weight || null,
      energyLevel, mealFollowed, notes, createdAt: serverTimestamp()
    });
    showToast("Health log saved!");
    document.getElementById("log-weight").value = "";
    document.getElementById("log-notes").value = "";
    await loadLogs();
  } catch {
    showToast("Failed to save. Please try again.", "error");
  } finally {
    btn.disabled = false; btn.textContent = "Save Log";
  }
}

async function loadLogs() {
  try {
    const q = query(collection(db,"healthLogs"), where("userId","==",currentUser.uid), orderBy("createdAt","desc"), limit(30));
    const snap = await getDocs(q);
    allLogs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderStats();
    renderWeightChart();
    renderLogList();
  } catch { /* silent */ }
}

function renderStats() {
  const statsEl = document.getElementById("tracker-stats");
  if (!statsEl) return;

  const weightLogs = allLogs.filter(l => l.weight);
  const latest = weightLogs[0];
  const previous = weightLogs[1];
  const weightChange = latest && previous ? (latest.weight - previous.weight).toFixed(1) : null;
  const avgEnergy = allLogs.length ? (allLogs.reduce((s,l) => s + (l.energyLevel||3), 0) / allLogs.length).toFixed(1) : "—";
  const mealAdherence = allLogs.length ? Math.round((allLogs.filter(l => l.mealFollowed).length / allLogs.length) * 100) : 0;
  const totalLogs = allLogs.length;

  statsEl.innerHTML = `
    <div class="tracker-stat-card">
      ${icon("weight", 28)}
      <div class="tracker-stat-value">${latest ? latest.weight + " kg" : "—"}</div>
      <div class="tracker-stat-label">Latest Weight</div>
      ${weightChange !== null ? `<div class="tracker-stat-change ${parseFloat(weightChange) <= 0 ? "change-good":"change-up"}">${parseFloat(weightChange) > 0 ? "+" : ""}${weightChange} kg</div>` : ""}
    </div>
    <div class="tracker-stat-card">
      ${icon("heart", 28)}
      <div class="tracker-stat-value">${avgEnergy}</div>
      <div class="tracker-stat-label">Avg Energy (1–5)</div>
    </div>
    <div class="tracker-stat-card">
      ${icon("check", 28)}
      <div class="tracker-stat-value">${mealAdherence}%</div>
      <div class="tracker-stat-label">Meal Plan Followed</div>
      <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${mealAdherence}%;background:var(--accent-green);"></div></div>
    </div>
    <div class="tracker-stat-card">
      ${icon("calendar", 28)}
      <div class="tracker-stat-value">${totalLogs}</div>
      <div class="tracker-stat-label">Total Logs</div>
    </div>
  `;
}

function renderWeightChart() {
  const chartEl = document.getElementById("weight-chart");
  if (!chartEl) return;

  const weightLogs = allLogs.filter(l => l.weight).reverse().slice(-14);
  if (weightLogs.length < 2) {
    chartEl.innerHTML = `<div class="empty-chart"><p>${icon("tracker",24)} Log your weight at least twice to see a trend chart.</p></div>`;
    return;
  }

  const values = weightLogs.map(l => l.weight);
  const labels = weightLogs.map(l => l.date ? l.date.slice(5) : "");
  const min = Math.min(...values) - 1;
  const max = Math.max(...values) + 1;
  const w = 600, h = 140, padX = 40, padY = 20;

  const points = values.map((v, i) => {
    const x = padX + (i / (values.length - 1)) * (w - padX * 2);
    const y = h - padY - ((v - min) / (max - min)) * (h - padY * 2);
    return { x, y, v, label: labels[i] };
  });

  const polyline = points.map(p => `${p.x},${p.y}`).join(" ");
  const areaPoints = `${points[0].x},${h} ${polyline} ${points[points.length-1].x},${h}`;

  chartEl.innerHTML = `
    <svg viewBox="0 0 ${w} ${h + 20}" style="width:100%;height:auto;display:block;">
      <defs>
        <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1A5276" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="#1A5276" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <polygon points="${areaPoints}" fill="url(#wGrad)"/>
      <polyline points="${polyline}" fill="none" stroke="#1A5276" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${points.map((p, i) => `
        <circle cx="${p.x}" cy="${p.y}" r="5" fill="#1A5276" stroke="#fff" stroke-width="2"/>
        <text x="${p.x}" y="${p.y - 10}" font-size="10" text-anchor="middle" fill="#1A5276" font-weight="600">${p.v}</text>
        <text x="${p.x}" y="${h + 16}" font-size="9" text-anchor="middle" fill="#566573">${p.label}</text>
      `).join("")}
    </svg>
  `;
}

function renderLogList() {
  const listEl = document.getElementById("log-list");
  if (!listEl) return;

  if (allLogs.length === 0) {
    listEl.innerHTML = `<div class="empty-state"><p>No logs yet. Add your first health log above.</p></div>`;
    return;
  }

  const energyLabels = { 1:"Very Low", 2:"Low", 3:"Moderate", 4:"Good", 5:"Excellent" };
  const energyColors = { 1:"#C0392B", 2:"#D35400", 3:"#F39C12", 4:"#27AE60", 5:"#1E8449" };

  listEl.innerHTML = allLogs.slice(0, 14).map(log => `
    <div class="log-row">
      <div class="log-date">${icon("calendar",14)} ${log.date || "—"}</div>
      ${log.weight ? `<div class="log-weight">${icon("weight",14)} ${log.weight} kg</div>` : ""}
      <div class="log-energy" style="color:${energyColors[log.energyLevel]||"#566573"};">${icon("heart",14)} ${energyLabels[log.energyLevel]||"—"}</div>
      <div class="log-meal ${log.mealFollowed?"meal-yes":"meal-no"}">${log.mealFollowed ? icon("check",14)+" Followed plan" : "Skipped plan"}</div>
      ${log.notes ? `<div class="log-notes-text">${log.notes}</div>` : ""}
    </div>
  `).join("");
}
