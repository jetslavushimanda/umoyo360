import { auth, db } from "./firebase-config.js";
import { collection, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { requireAuth, loadUserProfile, showToast, formatDateShort } from "./utils.js";
import { icon } from "./icons.js";

let currentUser = null;
let userProfile = null;

export async function initBMIPage() {
  try {
    currentUser = await requireAuth();
    userProfile = await loadUserProfile(currentUser.uid);
    setupCalculator();
    loadBMIHistory();
  } catch (e) { /* redirected */ }
}

function setupCalculator() {
  const form = document.getElementById("bmi-form");
  form?.addEventListener("submit", e => { e.preventDefault(); calculateBMI(); });

  // Unit toggle
  document.querySelectorAll(".unit-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".unit-toggle").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      toggleUnits(btn.dataset.unit);
    });
  });
}

function toggleUnits(unit) {
  const metricFields = document.getElementById("metric-fields");
  const imperialFields = document.getElementById("imperial-fields");
  if (unit === "metric") {
    metricFields?.classList.remove("hidden");
    imperialFields?.classList.add("hidden");
  } else {
    metricFields?.classList.add("hidden");
    imperialFields?.classList.remove("hidden");
  }
}

function calculateBMI() {
  const activeUnit = document.querySelector(".unit-toggle.active")?.dataset.unit || "metric";
  let weightKg, heightCm;

  if (activeUnit === "metric") {
    weightKg = parseFloat(document.getElementById("weight-kg").value);
    heightCm = parseFloat(document.getElementById("height-cm").value);
  } else {
    const weightLbs = parseFloat(document.getElementById("weight-lbs").value);
    const heightFt = parseFloat(document.getElementById("height-ft").value) || 0;
    const heightIn = parseFloat(document.getElementById("height-in").value) || 0;
    weightKg = weightLbs * 0.453592;
    heightCm = (heightFt * 12 + heightIn) * 2.54;
  }

  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) {
    showToast("Please enter valid height and weight.", "error");
    return;
  }

  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  const rounded = Math.round(bmi * 10) / 10;
  const { category, color, advice, condition } = getBMICategory(rounded);

  displayResult(rounded, category, color, advice, weightKg, heightCm);
  saveBMIRecord(rounded, weightKg, heightCm, category);
}

function getBMICategory(bmi) {
  if (bmi < 18.5) return {
    category: "Underweight",
    color: "#2E86C1",
    advice: "Your weight is below the healthy range. Focus on eating more protein-rich foods like beans, eggs, groundnuts, and fish. Consider seeing a health worker for nutritional guidance.",
    condition: "malnutrition"
  };
  if (bmi < 25) return {
    category: "Normal Weight",
    color: "#1E8449",
    advice: "Excellent! Your weight is in the healthy range. Maintain your current eating habits with a balanced diet of vegetables, proteins, and whole grains.",
    condition: "general"
  };
  if (bmi < 30) return {
    category: "Overweight",
    color: "#D35400",
    advice: "Your weight is slightly above the healthy range. Reduce portions of nshima and fried foods. Increase vegetables, fish, and daily physical activity.",
    condition: "obesity"
  };
  return {
    category: "Obese",
    color: "#C0392B",
    advice: "Your weight is significantly above the healthy range. This increases risk of diabetes, hypertension, and heart disease. See a health worker and use your Umoyo360 meal planner immediately.",
    condition: "obesity"
  };
}

function displayResult(bmi, category, color, advice, weightKg, heightCm) {
  const resultEl = document.getElementById("bmi-result");
  if (!resultEl) return;
  resultEl.classList.remove("hidden");

  const percentage = Math.min(Math.max(((bmi - 10) / (40 - 10)) * 100, 0), 100);

  resultEl.innerHTML = `
    <div class="bmi-result-card" style="border-top: 4px solid ${color};">
      <div class="bmi-score-row">
        <div class="bmi-score" style="color:${color};">${bmi}</div>
        <div class="bmi-category-badge" style="background:${color};">${category}</div>
      </div>

      <div class="bmi-gauge">
        <div class="bmi-gauge-bar">
          <div class="bmi-gauge-segment" style="background:#2E86C1;flex:1.85;"></div>
          <div class="bmi-gauge-segment" style="background:#1E8449;flex:6.5;"></div>
          <div class="bmi-gauge-segment" style="background:#D35400;flex:5;"></div>
          <div class="bmi-gauge-segment" style="background:#C0392B;flex:10;"></div>
        </div>
        <div class="bmi-gauge-labels">
          <span>Underweight<br>&lt;18.5</span>
          <span>Normal<br>18.5–24.9</span>
          <span>Overweight<br>25–29.9</span>
          <span>Obese<br>≥30</span>
        </div>
        <div class="bmi-needle" style="left:${percentage}%;background:${color};"></div>
      </div>

      <div class="bmi-stats">
        <div class="bmi-stat"><span class="bmi-stat-label">Weight</span><span class="bmi-stat-value">${weightKg.toFixed(1)} kg</span></div>
        <div class="bmi-stat"><span class="bmi-stat-label">Height</span><span class="bmi-stat-value">${heightCm.toFixed(0)} cm</span></div>
        <div class="bmi-stat"><span class="bmi-stat-label">BMI</span><span class="bmi-stat-value" style="color:${color};">${bmi}</span></div>
      </div>

      <div class="bmi-advice" style="border-left:4px solid ${color};">
        <div class="bmi-advice-title">${icon("info",18)} Health Advice</div>
        <p>${advice}</p>
      </div>

      <a href="meal-planner.html" class="btn-green btn-full" style="margin-top:1rem;display:flex;align-items:center;justify-content:center;gap:0.5rem;">
        ${icon("mealPlanner",18)} Open Meal Planner
      </a>
    </div>
  `;

  resultEl.scrollIntoView({ behavior: "smooth" });
}

async function saveBMIRecord(bmi, weight, height, category) {
  try {
    await addDoc(collection(db, "bmiRecords"), {
      userId: currentUser.uid, bmi, weight, height, category, createdAt: serverTimestamp()
    });
    loadBMIHistory();
  } catch { /* silent */ }
}

async function loadBMIHistory() {
  const historyEl = document.getElementById("bmi-history");
  if (!historyEl) return;

  try {
    const q = query(collection(db,"bmiRecords"), where("userId","==",currentUser.uid), orderBy("createdAt","desc"), limit(10));
    const snap = await getDocs(q);
    if (snap.empty) { historyEl.innerHTML = '<p class="empty-history">No records yet. Calculate your first BMI above.</p>'; return; }

    const records = snap.docs.map(d => d.data());
    const categoryColors = { "Normal Weight":"#1E8449","Underweight":"#2E86C1","Overweight":"#D35400","Obese":"#C0392B" };

    historyEl.innerHTML = records.map(r => `
      <div class="history-row">
        <div class="history-date">${icon("calendar",15)} ${formatDateShort(r.createdAt)}</div>
        <div class="history-bmi">${r.bmi}</div>
        <div class="history-badge" style="background:${categoryColors[r.category]||"#566573"};">${r.category}</div>
        <div class="history-weight">${r.weight?.toFixed(1)} kg</div>
      </div>
    `).join("");

    // Draw mini SVG trend chart
    if (records.length >= 2) {
      drawTrendChart(records.reverse(), historyEl);
    }
  } catch { historyEl.innerHTML = '<p class="empty-history">Could not load history.</p>'; }
}

function drawTrendChart(records, container) {
  const values = records.map(r => r.bmi);
  const min = Math.min(...values) - 1;
  const max = Math.max(...values) + 1;
  const w = 300, h = 80, pad = 20;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / (max - min)) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");

  const chart = document.createElement("div");
  chart.className = "bmi-trend-chart";
  chart.innerHTML = `
    <p class="chart-title">${icon("tracker",15)} BMI Trend</p>
    <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;">
      <polyline points="${points}" fill="none" stroke="#1A5276" stroke-width="2.5" stroke-linejoin="round"/>
      ${values.map((v, i) => {
        const x = pad + (i / (values.length - 1)) * (w - pad * 2);
        const y = h - pad - ((v - min) / (max - min)) * (h - pad * 2);
        return `<circle cx="${x}" cy="${y}" r="4" fill="#1A5276"/>
                <text x="${x}" y="${y - 8}" font-size="9" text-anchor="middle" fill="#566573">${v}</text>`;
      }).join("")}
    </svg>
  `;
  container.appendChild(chart);
}
