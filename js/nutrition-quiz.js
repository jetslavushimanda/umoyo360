import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { requireAuth, showToast, formatDateShort } from "./utils.js";
import { icon } from "./icons.js";

let currentUser = null;
let currentQuiz = [];
let currentQ = 0;
let score = 0;
let answered = false;

const QUESTIONS = [
  { q:"Which Zambian food has the highest iron content?", options:["White Maize Nshima","Moringa Leaves","White Rice","Cooking Oil"], answer:1, fact:"Moringa leaves have more iron per gram than beef and are available fresh across Zambia." },
  { q:"How many glasses of water should a healthy adult drink every day?", options:["3–4 glasses","5–6 glasses","8 glasses (2 litres)","10–12 glasses"], answer:2, fact:"8 glasses (about 2 litres) is the standard recommendation. Pregnancy and breastfeeding need 10–14 glasses." },
  { q:"Which food doubles your body's absorption of iron from plant foods?", options:["Salt","Vitamin C (guava, orange)","Cooking oil","More water"], answer:1, fact:"Vitamin C converts iron into a more absorbable form. Always pair iron-rich foods (beans, moringa, kapenta) with guava, orange, or tomatoes." },
  { q:"What is the Zambian name for pumpkin leaves?", options:["Bondwe","Chibwabwa","Impwa","Delele"], answer:1, fact:"Chibwabwa (pumpkin leaves) are rich in beta-carotene (Vitamin A), iron, and folate — and are widely available across Zambia." },
  { q:"Which nutrient does orange-flesh sweet potato provide the most?", options:["Protein","Calcium","Vitamin A (Beta-carotene)","Vitamin B12"], answer:2, fact:"One serving of orange-flesh sweet potato provides a full day's Vitamin A requirement. It is one of the most affordable superfoods in Zambia." },
  { q:"What is the main cause of goitre (swollen neck) in Zambia?", options:["Too much salt","Not enough Iodine","Iron deficiency","Drinking too much water"], answer:1, fact:"Zambia is landlocked and its soils are low in iodine. Using iodized salt daily prevents goitre completely." },
  { q:"Which drink REDUCES iron absorption from your meal?", options:["Orange juice","Plain water","Tea or coffee","Milk"], answer:2, fact:"Tea contains tannins that can block up to 60% of iron absorption. Never drink tea within 1 hour of iron-rich foods or iron tablets." },
  { q:"What is the cheapest and most protein-rich food for a Zambian family?", options:["Beef","Soya Pieces","White Bread","Cassava"], answer:1, fact:"Soya pieces contain more protein per kwacha than any other food in Zambia. 250g costs around K15 and feeds a family of 4." },
  { q:"Which vitamin is only found in animal foods (not in plants)?", options:["Vitamin C","Vitamin A","Vitamin B12","Vitamin D"], answer:2, fact:"Vitamin B12 is only found in animal foods: eggs, fish, meat, and dairy. Strict plant-based eaters should eat eggs regularly to avoid deficiency." },
  { q:"What does kapenta fish provide when you eat the tiny bones?", options:["Iodine","Calcium","Vitamin C","Magnesium"], answer:1, fact:"The tiny bones in kapenta are an excellent source of calcium — the best and most affordable bone calcium food available in Zambia." },
  { q:"Which condition is caused by not eating enough protein, especially in children?", options:["Rickets","Kwashiorkor","Scurvy","Pellagra"], answer:1, fact:"Kwashiorkor causes a swollen belly, swollen limbs, and discoloured hair in children. It is treated with protein-rich foods and therapeutic feeding." },
  { q:"How should you eat iron from plants (like beans and moringa) to absorb the most?", options:["Eat alone with nothing else","Eat with tea","Eat with Vitamin C food (guava, orange, tomatoes)","Eat with milk"], answer:2, fact:"Vitamin C converts plant iron (non-haem iron) into a form the body absorbs much more easily. This is especially important during pregnancy." },
  { q:"Which food is the BEST for pregnant and breastfeeding women in Zambia?", options:["White Nshima","Kapenta and Moringa Leaves","Cassava Flour Porridge","White Rice"], answer:1, fact:"Kapenta and moringa together provide iron, calcium, protein, folate, and Vitamin A — the most critical nutrients during pregnancy and breastfeeding." },
  { q:"What does the 'K' stand for on iodized salt bags?", options:["Potassium","Kwacha","Kenya","Kilogram"], answer:0, fact:"The 'K' on iodized salt stands for potassium iodate (KIO3) — the form of iodine used to fortify table salt in Zambia." },
  { q:"Which fruit has the most Vitamin C in Zambia?", options:["Orange","Mango","Guava","Banana"], answer:2, fact:"Guava has 4–5 times more Vitamin C than an orange. It is cheap, widely available, and one of the most nutritious fruits in Zambia." },
  { q:"How long should you exclusively breastfeed a newborn baby?", options:["1 month","3 months","6 months","12 months"], answer:2, fact:"WHO recommends exclusive breastfeeding for the first 6 months. No water, no porridge, no other food or drink — only breastmilk." },
  { q:"Which nutrient prevents neural tube defects (brain and spine problems) during early pregnancy?", options:["Iron","Calcium","Folic Acid","Vitamin D"], answer:2, fact:"Folic acid prevents neural tube defects if taken BEFORE and during the first trimester. It is available free from health centres across Zambia." },
  { q:"What is the best way to cook vegetables to keep the most nutrients?", options:["Boil for 30+ minutes","Steam or stir-fry briefly (5 minutes)","Deep fry","Pressure cook for 1 hour"], answer:1, fact:"Vitamin C and B vitamins are destroyed by heat. Brief cooking (steaming or stir-frying for 5 minutes) preserves the most nutrients." },
  { q:"Which food should a child with swollen legs and face eat immediately?", options:["More nshima","Protein — eggs, beans, soya, or kapenta","More sugar","More salt"], answer:1, fact:"Swollen legs and face in a malnourished child is kwashiorkor — caused by severe protein deficiency. High-protein foods and clinic treatment are needed urgently." },
  { q:"What is the primary nutritional benefit of moringa leaves?", options:["High sugar for energy","Rich in iron, Vitamin A, calcium, and folate","High in saturated fat","High in starch"], answer:1, fact:"Moringa is called a 'superfood' because it provides iron, Vitamin A, calcium, Vitamin C, and folate all in one food — and grows freely across Zambia." },
  { q:"Which cooking method preserves the most Vitamin C in rape (leafy greens)?", options:["Boil for 20 minutes","Boil for 5 minutes then drain water","Stir-fry or steam for 4–5 minutes","Deep fry in oil"], answer:2, fact:"Vitamin C breaks down with heat and dissolves in water. Brief steaming or stir-frying for 4–5 minutes is best. Never boil greens for more than 5 minutes." },
  { q:"What is the most common nutritional deficiency in Zambia?", options:["Vitamin D deficiency","Iron deficiency (Anaemia)","Vitamin B12 deficiency","Zinc deficiency"], answer:1, fact:"Iron deficiency anaemia affects an estimated 60% of women and 50% of children under 5 in Zambia. Eating moringa, kapenta, and beans daily prevents it." },
  { q:"How does cooking oil help the body absorb orange and yellow vegetables?", options:["It doesn't — oil is always bad","It helps dissolve fat-soluble vitamins like Vitamin A","It adds iron to the food","It increases the Vitamin C content"], answer:1, fact:"Vitamin A (beta-carotene) is fat-soluble — it must dissolve in fat to be absorbed. Adding a small amount of oil to pumpkin, carrots, or sweet potato greatly increases absorption." },
  { q:"What is the safe minimum weight for a newborn baby at birth?", options:["1.5 kg","2.5 kg","3.0 kg","3.5 kg"], answer:1, fact:"A baby weighing less than 2.5 kg at birth is classified as low birth weight and needs special care at a health facility." },
  { q:"Which food is recommended to INCREASE breast milk supply?", options:["Carbonated drinks","Moringa leaves and plenty of water","Coffee","Herbal energy drinks"], answer:1, fact:"Moringa leaves contain compounds that support milk production (galactagogues). Drinking 12–14 glasses of water daily is the most important factor for milk supply." },
];

function shuffleArray(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export async function initNutritionQuizPage() {
  try {
    currentUser = await requireAuth();
    loadLeaderboard();
    renderStart();
  } catch {}
}

function renderStart() {
  const container = document.getElementById("quiz-container");
  if (!container) return;
  container.innerHTML = `
    <div class="nq-start-card">
      <div class="nq-start-icon">${icon("quiz",48)}</div>
      <h2>Daily Nutrition Quiz</h2>
      <p>Test your knowledge of Zambian nutrition and health. 10 questions, multiple choice. Learn a new fact with every answer!</p>
      <div class="nq-stats-row" id="nq-stats-row"></div>
      <button class="btn-green nq-start-btn" id="btn-start-quiz">
        ${icon("quiz",18)} Start Quiz
      </button>
    </div>`;
  document.getElementById("btn-start-quiz")?.addEventListener("click", startQuiz);
  loadUserStats();
}

async function loadUserStats() {
  const el = document.getElementById("nq-stats-row");
  if (!el || !currentUser) return;
  try {
    const q = query(collection(db,"quizScores"), where("userId","==",currentUser.uid), orderBy("createdAt","desc"), limit(5));
    const snap = await getDocs(q);
    if (snap.empty) return;
    const scores = snap.docs.map(d => d.data().score);
    const best = Math.max(...scores);
    const avg = Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
    el.innerHTML = `
      <div class="nq-stat"><span class="nq-stat-n">${scores.length}</span><span class="nq-stat-l">Quizzes</span></div>
      <div class="nq-stat"><span class="nq-stat-n">${best}/10</span><span class="nq-stat-l">Best Score</span></div>
      <div class="nq-stat"><span class="nq-stat-n">${avg}/10</span><span class="nq-stat-l">Average</span></div>`;
  } catch {}
}

function startQuiz() {
  currentQuiz = shuffleArray(QUESTIONS).slice(0, 10);
  currentQ = 0;
  score = 0;
  renderQuestion();
}

function renderQuestion() {
  const container = document.getElementById("quiz-container");
  if (!container) return;
  answered = false;
  const q = currentQuiz[currentQ];
  const progress = ((currentQ) / currentQuiz.length) * 100;

  container.innerHTML = `
    <div class="nq-progress-wrap">
      <div class="nq-progress-bar"><div class="nq-progress-fill" style="width:${progress}%"></div></div>
      <span class="nq-progress-label">Question ${currentQ + 1} of ${currentQuiz.length}</span>
    </div>
    <div class="nq-question-card">
      <div class="nq-score-badge">${icon("star",14)} Score: ${score}/${currentQ}</div>
      <p class="nq-question-text">${q.q}</p>
      <div class="nq-options">
        ${q.options.map((opt,i) => `
          <button class="nq-option" data-index="${i}">${opt}</button>
        `).join("")}
      </div>
      <div class="nq-fact hidden" id="nq-fact"></div>
      <button class="btn-primary nq-next-btn hidden" id="btn-next">
        ${currentQ < currentQuiz.length - 1 ? "Next Question →" : "See Results"}
      </button>
    </div>`;

  container.querySelectorAll(".nq-option").forEach(btn => {
    btn.addEventListener("click", () => {
      if (answered) return;
      answered = true;
      const chosen = parseInt(btn.dataset.index);
      const correct = q.answer;

      container.querySelectorAll(".nq-option").forEach((b, i) => {
        b.disabled = true;
        if (i === correct) b.classList.add("nq-correct");
        else if (i === chosen) b.classList.add("nq-wrong");
      });

      if (chosen === correct) score++;

      const factEl = document.getElementById("nq-fact");
      if (factEl) {
        factEl.innerHTML = `${chosen === correct ? "✅ Correct!" : "❌ Incorrect."} <strong>Did you know?</strong> ${q.fact}`;
        factEl.classList.remove("hidden");
      }
      document.getElementById("btn-next")?.classList.remove("hidden");
    });
  });

  document.getElementById("btn-next")?.addEventListener("click", () => {
    currentQ++;
    if (currentQ < currentQuiz.length) renderQuestion();
    else renderResults();
  });
}

function renderResults() {
  const container = document.getElementById("quiz-container");
  if (!container) return;
  const pct = Math.round((score / currentQuiz.length) * 100);
  const grade = pct >= 80 ? { label:"Excellent!", color:"#0D9954", msg:"You have outstanding Zambian nutrition knowledge!" }
               : pct >= 60 ? { label:"Good Job!", color:"#1565C0", msg:"You know your nutrition well. Keep learning!" }
               : pct >= 40 ? { label:"Keep Learning", color:"#E65100", msg:"Review the Health Education section to build your knowledge." }
               : { label:"Keep Trying!", color:"#C62828", msg:"Read the facts below and try again — your knowledge will improve!" };

  container.innerHTML = `
    <div class="nq-result-card">
      <div class="nq-result-circle" style="border-color:${grade.color};">
        <span class="nq-result-score" style="color:${grade.color};">${score}</span>
        <span class="nq-result-total">/ ${currentQuiz.length}</span>
      </div>
      <h2 class="nq-result-grade" style="color:${grade.color};">${grade.label}</h2>
      <p class="nq-result-msg">${grade.msg}</p>
    </div>

    <div class="nq-review">
      <h3>${icon("education",18)} Review — What You Learned</h3>
      ${currentQuiz.map((q, i) => `
        <div class="nq-review-item">
          <span class="nq-review-num">${i+1}.</span>
          <div>
            <p class="nq-review-q">${q.q}</p>
            <p class="nq-review-fact">${icon("info",12)} ${q.fact}</p>
          </div>
        </div>`).join("")}
    </div>

    <div class="nq-result-actions">
      <button class="btn-green" id="btn-retry">${icon("quiz",16)} Try Again</button>
      <a href="education.html" class="btn-secondary">Health Education</a>
    </div>`;

  document.getElementById("btn-retry")?.addEventListener("click", renderStart);
  saveScore(score);
}

async function saveScore(s) {
  try {
    await addDoc(collection(db,"quizScores"), { userId:currentUser.uid, score:s, total:10, createdAt:serverTimestamp() });
    loadLeaderboard();
  } catch {}
}

async function loadLeaderboard() {
  const el = document.getElementById("leaderboard");
  if (!el || !currentUser) return;
  try {
    const q = query(collection(db,"quizScores"), where("userId","==",currentUser.uid), orderBy("createdAt","desc"), limit(5));
    const snap = await getDocs(q);
    if (snap.empty) { el.innerHTML = `<p class="nq-no-history">No quiz attempts yet. Take your first quiz!</p>`; return; }
    const titleEl = document.getElementById("lb-title");
    if (titleEl) titleEl.classList.remove("hidden");
    el.innerHTML = `<div class="nq-history-list">
      ${snap.docs.map((d,i) => {
        const r = d.data();
        const pct = Math.round((r.score / r.total) * 100);
        const color = pct>=80?"#0D9954":pct>=60?"#1565C0":pct>=40?"#E65100":"#C62828";
        return `<div class="nq-history-row">
          <span class="nq-hist-num">#${i+1}</span>
          <span class="nq-hist-score" style="color:${color};">${r.score}/${r.total}</span>
          <span class="nq-hist-pct">${pct}%</span>
          <span class="nq-hist-date">${formatDateShort(r.createdAt)}</span>
        </div>`;
      }).join("")}
    </div>`;
  } catch {}
}
