import { auth, db } from "./firebase-config.js";
import { collection, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { requireAuth, showToast, formatDateShort } from "./utils.js";
import { icon } from "./icons.js";

let currentUser = null;

// WHO weight-for-age reference: [months, median_kg, -2SD (underweight), -3SD (severely)]
const WHO_WEIGHT = [
  [0,3.3,2.5,2.1],[1,4.4,3.4,2.9],[2,5.4,4.2,3.5],[3,6.2,4.8,4.1],[4,6.9,5.3,4.5],
  [5,7.5,5.7,4.9],[6,7.9,6.0,5.1],[7,8.3,6.3,5.3],[8,8.6,6.5,5.5],[9,8.9,6.7,5.7],
  [10,9.1,6.9,5.8],[11,9.4,7.1,6.0],[12,9.6,7.2,6.1],[15,10.2,7.7,6.5],
  [18,10.8,8.1,6.9],[21,11.3,8.5,7.2],[24,11.5,8.6,7.3],[30,12.5,9.3,7.9],
  [36,13.3,9.9,8.3],[42,14.1,10.4,8.8],[48,15.0,11.0,9.2],[54,15.8,11.5,9.6],[60,16.8,12.1,10.0],
];

// WHO height-for-age reference: [months, median_cm, -2SD (stunted), -3SD (severely)]
const WHO_HEIGHT = [
  [0,49.9,45.5,44.2],[3,61.4,56.5,54.7],[6,66.8,61.5,59.8],[9,71.2,65.7,63.7],
  [12,74.9,69.0,66.7],[18,82.3,75.8,73.0],[24,87.8,81.0,77.7],[30,92.7,85.4,81.7],
  [36,96.1,88.7,84.9],[42,99.9,92.2,88.2],[48,103.3,95.4,91.1],[54,106.4,98.5,94.0],[60,109.4,101.4,96.7],
];

const FEEDING_ADVICE = {
  "0-5": {
    title:"0–5 Months: Exclusive Breastfeeding",
    advice:[
      "Breastfeed ONLY — no water, no porridge, no other foods or drinks.",
      "Breastfeed on demand, at least 8–12 times per day (including at night).",
      "Breastmilk is perfect nutrition — it contains all nutrients baby needs.",
      "If not breastfeeding, use WHO-recommended infant formula correctly.",
      "Never give cow's milk, thin porridge, or sugary water to babies under 6 months.",
    ],
    foods:"Breastmilk only",
    times:"On demand (8–12× per day)",
  },
  "6-8": {
    title:"6–8 Months: Start Complementary Foods",
    advice:[
      "Continue breastfeeding — it remains the main source of nutrition.",
      "Start soft, mashed foods: smooth porridge, mashed banana, mashed sweet potato.",
      "Introduce one new food at a time — wait 3 days before introducing another.",
      "Start with 2–3 tablespoons per meal, 2–3 meals per day.",
      "Add a small amount of cooking oil or groundnut paste to porridge for energy.",
      "Always breastfeed BEFORE giving solid food at this age.",
    ],
    foods:"Breastmilk + mashed porridge, banana, sweet potato, mashed beans",
    times:"Breastfeed on demand + 2–3 meals/day",
  },
  "9-11": {
    title:"9–11 Months: Varied Mashed and Minced Foods",
    advice:[
      "Continue breastfeeding as the main drink.",
      "Give mashed or finely chopped family foods: beans, kapenta, eggs, mashed vegetables.",
      "Increase to 3–4 meals per day plus 1–2 snacks.",
      "Add protein at every meal: mashed beans, egg yolk, kapenta, soya pieces.",
      "Give finger foods to encourage self-feeding: banana slices, soft cooked carrot.",
      "Add moringa leaves to porridge or relish for iron and Vitamin A.",
    ],
    foods:"Breastmilk + mashed beans/kapenta/eggs + mashed veg + soft fruits",
    times:"Breastfeed on demand + 3–4 meals + 1–2 snacks/day",
  },
  "12-23": {
    title:"12–23 Months: Family Foods + Continued Breastfeeding",
    advice:[
      "Continue breastfeeding up to 2 years and beyond.",
      "Give chopped, soft family foods — no more blending needed.",
      "Feed 3 full meals per day plus 1–2 nutritious snacks.",
      "Ensure every meal has protein: beans, kapenta, eggs, chicken, or soya.",
      "Give iron-rich foods with Vitamin C (guava, tomato) at each meal.",
      "Never give sweet drinks, tea, or biscuits instead of proper meals.",
    ],
    foods:"All family foods chopped small + breastmilk",
    times:"3 meals + 2 snacks/day + breastmilk on demand",
  },
  "24-60": {
    title:"2–5 Years: Full Family Diet",
    advice:[
      "Give 3 main meals and 2 healthy snacks every day.",
      "Include protein at every meal: eggs, beans, kapenta, chicken, or soya.",
      "Give a variety of coloured vegetables: orange (Vitamin A), green (iron/folate).",
      "Add moringa leaves to any relish — provides iron, Vitamin A, and calcium.",
      "Offer fruit as snacks instead of sweets or biscuits.",
      "Give at least 6 glasses of clean water daily.",
      "Do not give tea — it blocks iron absorption in growing children.",
    ],
    foods:"Varied family foods: nshima/rice + beans/kapenta/eggs + veg + fruit",
    times:"3 meals + 2 snacks/day",
  },
};

function interpolate(table, months) {
  for (let i = 0; i < table.length - 1; i++) {
    const [m1, ...v1] = table[i];
    const [m2, ...v2] = table[i + 1];
    if (months >= m1 && months <= m2) {
      const t = (months - m1) / (m2 - m1);
      return v1.map((v, j) => v + t * (v2[j] - v));
    }
  }
  const last = table[table.length - 1];
  return last.slice(1);
}

function assessWeight(months, weight) {
  if (months > 60) return null;
  const [median, sd2, sd3] = interpolate(WHO_WEIGHT, months);
  const sd1 = median + (median - sd2) * 0.5;
  const plus2 = median + (median - sd2);
  if (weight < sd3) return { status:"Severely Underweight", color:"#C62828", level:0, median, sd2, sd3, plus2 };
  if (weight < sd2) return { status:"Underweight", color:"#E65100", level:1, median, sd2, sd3, plus2 };
  if (weight > plus2) return { status:"Overweight", color:"#E65100", level:3, median, sd2, sd3, plus2 };
  if (weight < sd1) return { status:"At Risk of Underweight", color:"#F59E0B", level:2, median, sd2, sd3, plus2 };
  return { status:"Normal Weight", color:"#0D9954", level:4, median, sd2, sd3, plus2 };
}

function assessHeight(months, height) {
  if (months > 60) return null;
  const [median, sd2, sd3] = interpolate(WHO_HEIGHT, months);
  if (height < sd3) return { status:"Severely Stunted", color:"#C62828", median, sd2, sd3 };
  if (height < sd2) return { status:"Stunted", color:"#E65100", median, sd2, sd3 };
  return { status:"Normal Height", color:"#0D9954", median, sd2, sd3 };
}

function getFeedingGroup(months) {
  if (months < 6)  return FEEDING_ADVICE["0-5"];
  if (months < 9)  return FEEDING_ADVICE["6-8"];
  if (months < 12) return FEEDING_ADVICE["9-11"];
  if (months < 24) return FEEDING_ADVICE["12-23"];
  return FEEDING_ADVICE["24-60"];
}

export async function initChildGrowthPage() {
  try {
    currentUser = await requireAuth();
    setupForm();
    loadHistory();
  } catch {}
}

function setupForm() {
  const form = document.getElementById("growth-form");
  if (!form) return;
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("log-date").value = today;

  form.addEventListener("submit", e => {
    e.preventDefault();
    const name   = document.getElementById("child-name").value.trim() || "Child";
    const months = parseInt(document.getElementById("child-age").value, 10);
    const weight = parseFloat(document.getElementById("child-weight").value);
    const height = parseFloat(document.getElementById("child-height").value) || null;

    if (!months || months < 0 || months > 60 || !weight || weight < 1) {
      showToast("Please enter a valid age (0–60 months) and weight.", "error");
      return;
    }
    displayResult(name, months, weight, height);
    saveRecord(name, months, weight, height);
  });
}

function displayResult(name, months, weight, height) {
  const wResult = assessWeight(months, weight);
  const hResult = height ? assessHeight(months, height) : null;
  const feeding = getFeedingGroup(months);
  const container = document.getElementById("result-container");
  if (!container) return;

  const urgent = wResult && (wResult.level === 0 || wResult.level === 1);
  const stunted = hResult && (hResult.status === "Stunted" || hResult.status === "Severely Stunted");

  container.innerHTML = `
    <div class="cg-result-header">
      <h2>${icon("child",20)} ${name} — ${months} month${months !== 1?"s":""} old</h2>
    </div>

    ${wResult ? `
    <div class="cg-assessment-card" style="border-top-color:${wResult.color};">
      <div class="cg-assess-row">
        <div class="cg-assess-label">Weight Assessment</div>
        <div class="cg-assess-status" style="color:${wResult.color};">${wResult.status}</div>
      </div>
      <div class="cg-weight-bar-wrap">
        <div class="cg-weight-ref">
          <span>Severely UW<br>${wResult.sd3.toFixed(1)} kg</span>
          <span>Underweight<br>${wResult.sd2.toFixed(1)} kg</span>
          <span>Normal<br>${wResult.median.toFixed(1)} kg</span>
          <span>Overweight<br>${wResult.plus2.toFixed(1)} kg</span>
        </div>
        <div class="cg-weight-bar">
          <div class="cg-weight-marker" style="left:${Math.min(Math.max(((weight - wResult.sd3) / (wResult.plus2 - wResult.sd3)) * 100, 2), 97)}%;background:${wResult.color};" title="${weight} kg"></div>
        </div>
      </div>
      <p class="cg-assess-note">Actual weight: <strong>${weight} kg</strong> | WHO median for age: <strong>${wResult.median.toFixed(1)} kg</strong></p>
    </div>` : ""}

    ${hResult ? `
    <div class="cg-assessment-card" style="border-top-color:${hResult.color};">
      <div class="cg-assess-row">
        <div class="cg-assess-label">Height Assessment</div>
        <div class="cg-assess-status" style="color:${hResult.color};">${hResult.status}</div>
      </div>
      <p class="cg-assess-note">Actual height: <strong>${height} cm</strong> | WHO median: <strong>${hResult.median.toFixed(1)} cm</strong> | Stunting threshold: <strong>${hResult.sd2.toFixed(1)} cm</strong></p>
    </div>` : ""}

    ${urgent || stunted ? `
    <div class="cg-urgent-box">
      ${icon("risk",16)}
      <div>
        <strong>Please visit a clinic or health post.</strong><br>
        ${urgent ? "This child may need nutritional treatment (RUTF/therapeutic feeding). Early treatment prevents long-term harm." : ""}
        ${stunted ? "Stunting is caused by chronic malnutrition. A health worker can assess and support this child." : ""}
      </div>
    </div>` : ""}

    <div class="cg-feeding-card">
      <h3>${icon("mealPlanner",18)} ${feeding.title}</h3>
      <div class="cg-feeding-meta">
        <span>${icon("check",13)} <strong>Foods:</strong> ${feeding.foods}</span>
        <span>${icon("calendar",13)} <strong>Frequency:</strong> ${feeding.times}</span>
      </div>
      <ul class="cg-feeding-list">
        ${feeding.advice.map(a => `<li>${a}</li>`).join("")}
      </ul>
    </div>
  `;

  container.classList.remove("hidden");
  container.scrollIntoView({ behavior:"smooth" });
}

async function saveRecord(name, months, weight, height) {
  try {
    await addDoc(collection(db,"childGrowth"), {
      userId: currentUser.uid, name, ageMonths: months, weight, height: height || null,
      createdAt: serverTimestamp(),
    });
    loadHistory();
  } catch {}
}

async function loadHistory() {
  const el = document.getElementById("growth-history");
  if (!el) return;
  try {
    const q = query(collection(db,"childGrowth"), where("userId","==",currentUser.uid), orderBy("createdAt","desc"), limit(10));
    const snap = await getDocs(q);
    if (snap.empty) { el.innerHTML = `<p class="cg-no-history">No records yet. Log your child's measurements above.</p>`; return; }
    el.innerHTML = `<div class="cg-history-list">
      ${snap.docs.map(d => {
        const r = d.data();
        const w = assessWeight(r.ageMonths, r.weight);
        return `<div class="cg-history-row">
          <span class="cg-hist-name">${r.name}</span>
          <span class="cg-hist-age">${r.ageMonths} mo</span>
          <span class="cg-hist-weight">${r.weight} kg</span>
          ${w ? `<span class="cg-hist-status" style="color:${w.color};">${w.status}</span>` : ""}
          <span class="cg-hist-date">${formatDateShort(r.createdAt)}</span>
        </div>`;
      }).join("")}
    </div>`;
  } catch { el.innerHTML = `<p class="cg-no-history">Could not load history.</p>`; }
}
