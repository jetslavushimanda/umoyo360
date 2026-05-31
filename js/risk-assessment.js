import { auth, db } from "./firebase-config.js";
import { collection, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { requireAuth, loadUserProfile, showToast, formatDateShort } from "./utils.js";
import { icon } from "./icons.js";

let currentUser = null;
let userProfile = null;
let answers = {};
let currentQuestion = 0;

const QUESTIONS = [
  { id:"nshima", text:"How often do you eat white nshima or white rice?", options:[{label:"Rarely (once a week or less)", score:{diabetes_type2:0,obesity:0}},{label:"Sometimes (2–3 times a week)", score:{diabetes_type2:1,obesity:1}},{label:"Daily (once a day)", score:{diabetes_type2:2,obesity:2}},{label:"Every meal, every day", score:{diabetes_type2:3,obesity:3}}] },
  { id:"sugar", text:"How often do you drink sodas, juice, or sugary drinks?", options:[{label:"Never or rarely", score:{diabetes_type2:0,obesity:0}},{label:"Once or twice a week", score:{diabetes_type2:1,obesity:1}},{label:"Most days", score:{diabetes_type2:2,obesity:2}},{label:"Every day, multiple times", score:{diabetes_type2:3,obesity:3,hypertension:1}}] },
  { id:"salt", text:"How much salt or Royco/stock cubes do you add to your food?", options:[{label:"I use very little or none", score:{hypertension:0,stroke:0}},{label:"A small amount", score:{hypertension:1,stroke:1}},{label:"A normal amount", score:{hypertension:2,stroke:1}},{label:"A lot — I like salty food", score:{hypertension:3,stroke:2,heart_disease:1}}] },
  { id:"fried", text:"How often do you eat fried foods (chips, vitumbuwa, fried chicken)?", options:[{label:"Rarely", score:{heart_disease:0,cholesterol:0,obesity:0}},{label:"Once or twice a week", score:{heart_disease:1,cholesterol:1,obesity:1}},{label:"Most days", score:{heart_disease:2,cholesterol:2,obesity:2}},{label:"Every day", score:{heart_disease:3,cholesterol:3,obesity:3}}] },
  { id:"vegetables", text:"How many portions of vegetables do you eat per day?", options:[{label:"3 or more portions daily", score:{colon_cancer:0,vitamin_a:0}},{label:"1–2 portions daily", score:{colon_cancer:1,vitamin_a:1}},{label:"A few times a week", score:{colon_cancer:2,vitamin_a:2}},{label:"Rarely or never", score:{colon_cancer:3,vitamin_a:3,anaemia:1}}] },
  { id:"exercise", text:"How physically active are you?", options:[{label:"Active daily (walking, sport, farming)", score:{obesity:0,diabetes_type2:0,heart_disease:0}},{label:"Moderately active (3–4 times a week)", score:{obesity:1,diabetes_type2:0,heart_disease:0}},{label:"Lightly active (1–2 times a week)", score:{obesity:2,diabetes_type2:1,heart_disease:1}},{label:"Sedentary (I sit most of the day)", score:{obesity:3,diabetes_type2:2,heart_disease:2}}] },
  { id:"family", text:"Does anyone in your close family have any of these conditions?", options:[{label:"No family history", score:{diabetes_type2:0,hypertension:0,heart_disease:0}},{label:"Hypertension or stroke", score:{hypertension:2,stroke:2}},{label:"Diabetes", score:{diabetes_type2:2}},{label:"Heart disease or obesity", score:{heart_disease:2,obesity:1}}] },
  { id:"alcohol", text:"How often do you drink alcohol (beer, Chibuku, wine)?", options:[{label:"Never", score:{liver_disease:0,hypertension:0}},{label:"Occasionally (once a month)", score:{liver_disease:1,hypertension:0}},{label:"Weekly", score:{liver_disease:2,hypertension:1,gout:1}},{label:"Several times a week or daily", score:{liver_disease:3,hypertension:2,gout:2,stroke:1}}] },
  { id:"weight", text:"How would you describe your current body weight?", options:[{label:"I am underweight or very thin", score:{malnutrition:3,anaemia:1}},{label:"I am a healthy weight", score:{}},{label:"I am slightly overweight", score:{obesity:1,diabetes_type2:1,hypertension:1}},{label:"I am significantly overweight", score:{obesity:3,diabetes_type2:2,hypertension:2,heart_disease:1}}] },
  { id:"thirst", text:"Do you often feel very thirsty or urinate frequently?", options:[{label:"No, normal thirst and urination", score:{}},{label:"Sometimes more thirsty than usual", score:{diabetes_type2:1}},{label:"Yes, often very thirsty", score:{diabetes_type2:2}},{label:"Yes, constantly thirsty and urinating", score:{diabetes_type2:3,diabetes_type1:2}}] },
  { id:"fatigue", text:"How often do you feel tired or short of breath without obvious reason?", options:[{label:"Rarely — I have good energy", score:{}},{label:"Sometimes tired", score:{anaemia:1}},{label:"Often tired, even with rest", score:{anaemia:2,heart_disease:1}},{label:"Always tired, short of breath", score:{anaemia:3,heart_disease:2}}] },
  { id:"meat", text:"How often do you eat red meat, organ meats, or dried fish?", options:[{label:"Rarely", score:{colon_cancer:0,gout:0,iron_overload:0}},{label:"Once or twice a week", score:{colon_cancer:1,gout:0}},{label:"Most days", score:{colon_cancer:2,gout:1}},{label:"Every day, large portions", score:{colon_cancer:3,gout:2,iron_overload:1}}] },
];

const RISK_THRESHOLDS = { low:{ max:2, color:"#1E8449", label:"Low Risk" }, moderate:{ max:5, color:"#D35400", label:"Moderate Risk" }, high:{ max:99, color:"#C0392B", label:"High Risk" } };

const CONDITION_LABELS = {
  diabetes_type2:"Type 2 Diabetes", hypertension:"Hypertension", heart_disease:"Heart Disease",
  obesity:"Obesity", cholesterol:"High Cholesterol", liver_disease:"Liver Disease",
  colon_cancer:"Colon Cancer Risk", stroke:"Stroke Risk", gout:"Gout",
  anaemia:"Anaemia", malnutrition:"Malnutrition", vitamin_a:"Vitamin A Deficiency",
  diabetes_type1:"Type 1 Diabetes", iron_overload:"Iron Overload"
};

const DIETARY_ADVICE = {
  diabetes_type2: { title:"Managing Diabetes Through Diet", eat:["Sorghum porridge or small nshima portions","Sugar beans & lentils","Bitter melon (karela)","Okra (delele)","Moringa leaves","Fresh fish (tilapia/kapenta)"], avoid:["White nshima in large portions","Sugary drinks & juice","White bread & refined grains","Sweets, honey & energy drinks"] },
  hypertension: { title:"Lowering Blood Pressure Through Diet", eat:["Moringa leaves","Banana & sweet potato","Fresh fish","Garlic & tomatoes","Beetroot","Hibiscus tea"], avoid:["Salt & Royco/stock cubes","Fried foods (vitumbuwa, chips)","Canned & processed foods","Alcohol (Chibuku, beer)"] },
  heart_disease: { title:"Protecting Your Heart Through Diet", eat:["Rolled oats","Fresh fish (omega-3 rich)","Beans & lentils","Garlic","Moringa leaves","Avocado"], avoid:["Fatty meats & sausages","Fried foods","Margarine & butter","Salt & stock cubes"] },
  obesity: { title:"Reaching a Healthy Weight Through Diet", eat:["Leafy greens (rape, cabbage, bondwe)","Fruits (guava, pawpaw)","Fish & chicken (not fried)","Beans","Sorghum porridge"], avoid:["Fried foods (chips, vitumbuwa)","Sugary drinks","Large nshima portions","Processed snacks"] },
  cholesterol: { title:"Lowering Cholesterol Through Diet", eat:["Rolled oats","Beans & lentils","Fresh fish","Garlic","Moringa","Guava & orange"], avoid:["Fatty meats","Fried foods","Butter & margarine","Organ meats in large amounts"] },
  anaemia: { title:"Treating Anaemia Through Diet", eat:["Moringa leaves (rich in iron)","Kapenta fish","Beans & cowpeas","Dark leafy greens (rape, bondwe)","Guava & orange (Vitamin C)"], avoid:["Tea & coffee within 1 hour of meals","Skipping iron-rich foods","Excess milky tea (blocks iron)"] },
  liver_disease: { title:"Supporting Liver Health Through Diet", eat:["Fruits & vegetables","Beans & soya pieces","Fish","Brown rice","Moringa tea"], avoid:["Alcohol — completely","Fried & fatty foods","Processed meats","Salt in excess"] },
  colon_cancer: { title:"Reducing Colon Cancer Risk Through Diet", eat:["Vegetables (rape, cabbage, carrots)","Beans & lentils","Sorghum & bran","Fresh fruits","Water (8+ glasses daily)"], avoid:["Red & processed meats every day","Fried foods","Low-fibre meals","Alcohol"] },
  stroke: { title:"Reducing Stroke Risk Through Diet", eat:["Moringa leaves","Fresh fish","Banana","Garlic","Vegetables","Plain water (2 litres/day)"], avoid:["Salt & stock cubes","Fried foods","Alcohol","Excessive red meat"] },
  gout: { title:"Managing Gout Through Diet", eat:["Cherries & guava","Moringa tea","Vegetables","Eggs","Sorghum porridge"], avoid:["Dried fish & organ meats in excess","Alcohol (especially beer/Chibuku)","Red meat daily","Sugary drinks"] },
  malnutrition: { title:"Treating Malnutrition Through Diet", eat:["Peanut butter (groundnut)","Eggs","Moringa powder added to meals","Soya pieces","Beans","Milk or yoghurt"], avoid:["Skipping meals","Empty-calorie foods only","Excessive tea without food"] },
  vitamin_a: { title:"Treating Vitamin A Deficiency", eat:["Pumpkin (chibwabwa) & pumpkin leaves","Carrots","Orange-flesh sweet potato","Eggs","Moringa leaves","Pawpaw & mango"], avoid:["Diets with no orange/yellow vegetables","Skipping vegetables every day"] },
  diabetes_type1: { title:"Managing Type 1 Diabetes Through Diet", eat:["Consistent meal timing every day","Brown rice (half portions)","Fish & eggs","Moringa leaves","Bitter melon"], avoid:["Skipping meals","Sugary drinks","Large carb portions without insulin timing"] },
  iron_overload: { title:"Managing Iron Overload Through Diet", eat:["Tea with meals (reduces iron absorption)","Milk & yoghurt (calcium blocks iron)","Vegetables & fruits","Fish in moderate amounts"], avoid:["Organ meats (liver, kidney) in large amounts","Red meat every day","Iron supplements unless prescribed"] },
};

export async function initRiskAssessmentPage() {
  try {
    currentUser = await requireAuth();
    userProfile = await loadUserProfile(currentUser.uid);
    renderQuestion(0);
    loadPastResults();
  } catch (e) { /* redirected */ }
}

function renderQuestion(index) {
  const container = document.getElementById("quiz-container");
  if (!container) return;

  const q = QUESTIONS[index];
  const progress = Math.round(((index) / QUESTIONS.length) * 100);

  container.innerHTML = `
    <div class="quiz-progress">
      <div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:${progress}%"></div></div>
      <span class="quiz-progress-label">Question ${index + 1} of ${QUESTIONS.length}</span>
    </div>
    <div class="quiz-question-card">
      <p class="quiz-question-text">${q.text}</p>
      <div class="quiz-options">
        ${q.options.map((opt, i) => `
          <button class="quiz-option-btn ${answers[q.id]===i?"selected":""}" data-index="${i}">
            ${opt.label}
          </button>
        `).join("")}
      </div>
      <div class="quiz-nav">
        ${index > 0 ? `<button class="btn-secondary" id="btn-prev">← Back</button>` : "<span></span>"}
        ${index < QUESTIONS.length - 1
          ? `<button class="btn-primary" id="btn-next" ${answers[q.id]===undefined?"disabled":""}>Next →</button>`
          : `<button class="btn-green" id="btn-submit" ${answers[q.id]===undefined?"disabled":""}>See My Results</button>`
        }
      </div>
    </div>
  `;

  container.querySelectorAll(".quiz-option-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      answers[q.id] = parseInt(btn.dataset.index);
      container.querySelectorAll(".quiz-option-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      const nextBtn = document.getElementById("btn-next") || document.getElementById("btn-submit");
      if (nextBtn) nextBtn.disabled = false;
    });
  });

  document.getElementById("btn-prev")?.addEventListener("click", () => renderQuestion(index - 1));
  document.getElementById("btn-next")?.addEventListener("click", () => renderQuestion(index + 1));
  document.getElementById("btn-submit")?.addEventListener("click", calculateResults);
}

function calculateResults() {
  const scores = {};
  QUESTIONS.forEach(q => {
    const answerIndex = answers[q.id];
    if (answerIndex === undefined) return;
    const optionScore = q.options[answerIndex].score;
    Object.entries(optionScore).forEach(([condition, pts]) => {
      scores[condition] = (scores[condition] || 0) + pts;
    });
  });

  const results = Object.entries(scores)
    .map(([condition, score]) => ({ condition, score, label: CONDITION_LABELS[condition] || condition }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  displayResults(results);
  saveResults(results);
}

function getRiskLevel(score) {
  if (score <= RISK_THRESHOLDS.low.max) return RISK_THRESHOLDS.low;
  if (score <= RISK_THRESHOLDS.moderate.max) return RISK_THRESHOLDS.moderate;
  return RISK_THRESHOLDS.high;
}

function displayResults(results) {
  const container = document.getElementById("quiz-container");
  container.innerHTML = `
    <div class="results-header">
      <div class="results-title">${icon("target", 24)} Your Risk Assessment Results</div>
      <p class="results-subtitle">Based on your answers, here are your risk levels for diet-related conditions.</p>
    </div>
    <div class="results-list">
      ${results.map(r => {
        const risk = getRiskLevel(r.score);
        const pct = Math.min((r.score / 9) * 100, 100);
        return `
          <div class="result-row">
            <div class="result-condition">${r.label}</div>
            <div class="result-bar-wrap">
              <div class="result-bar-fill" style="width:${pct}%;background:${risk.color};"></div>
            </div>
            <span class="result-badge" style="background:${risk.color};">${risk.label}</span>
          </div>`;
      }).join("")}
    </div>
    <div class="results-advice">
      ${icon("info", 18)} Use your <strong>Meal Planner</strong> to get a personalized plan that addresses your highest-risk conditions.
    </div>
    <div class="results-actions">
      <a href="meal-planner.html" class="btn-green">Open Meal Planner</a>
      <button class="btn-secondary" id="btn-retake">Retake Assessment</button>
    </div>
    ${buildAdviceSection(results)}
  `;
  document.getElementById("btn-retake")?.addEventListener("click", () => { answers = {}; renderQuestion(0); });
}

function buildAdviceSection(results) {
  const topConditions = results.filter(r => r.score > 0).slice(0, 3);
  if (topConditions.length === 0) return "";

  const cards = topConditions.map(r => {
    const advice = DIETARY_ADVICE[r.condition];
    if (!advice) return "";
    const risk = getRiskLevel(r.score);
    return `
      <div class="advice-card">
        <div class="advice-card-title" style="color:${risk.color};">
          ${icon("info", 16)} ${advice.title}
          <span class="result-badge" style="background:${risk.color};margin-left:0.5rem;">${risk.label}</span>
        </div>
        <div class="advice-cols">
          <div class="advice-col advice-eat">
            <div class="advice-col-head">${icon("check", 14)} Eat More</div>
            <ul>${advice.eat.map(f => `<li>${f}</li>`).join("")}</ul>
          </div>
          <div class="advice-col advice-avoid">
            <div class="advice-col-head">✕ Avoid</div>
            <ul>${advice.avoid.map(f => `<li>${f}</li>`).join("")}</ul>
          </div>
        </div>
      </div>`;
  }).join("");

  return `
    <div class="advice-section">
      <h3 class="advice-section-title">${icon("target", 18)} Your Personalised Action Plan</h3>
      <p class="advice-section-sub">Zambian food advice for your top risk conditions.</p>
      ${cards}
      <div class="advice-next-steps">
        ${icon("mealPlanner", 16)} Open the <a href="meal-planner.html"><strong>Meal Planner</strong></a> to get a full diet plan personalised for your highest-risk condition.
      </div>
    </div>`;
}

async function saveResults(results) {
  try {
    await addDoc(collection(db, "riskAssessments"), { userId: currentUser.uid, results, createdAt: serverTimestamp() });
    loadPastResults();
  } catch { /* silent */ }
}

async function loadPastResults() {
  const historyEl = document.getElementById("past-results");
  if (!historyEl) return;
  try {
    const q = query(collection(db,"riskAssessments"), where("userId","==",currentUser.uid), orderBy("createdAt","desc"), limit(3));
    const snap = await getDocs(q);
    if (snap.empty) { historyEl.innerHTML = `<p style="color:var(--text-medium);font-size:0.875rem;">No previous assessments yet.</p>`; return; }
    historyEl.innerHTML = snap.docs.map(d => {
      const data = d.data();
      const top = data.results?.[0];
      const risk = top ? getRiskLevel(top.score) : null;
      return `<div class="past-result-row">
        <span style="font-size:0.82rem;color:var(--text-medium);">${icon("calendar",13)} ${formatDateShort(data.createdAt)}</span>
        ${top ? `<span style="font-size:0.82rem;">Highest risk: <strong style="color:${risk?.color}">${top.label}</strong></span>` : ""}
      </div>`;
    }).join("");
  } catch { /* silent */ }
}
