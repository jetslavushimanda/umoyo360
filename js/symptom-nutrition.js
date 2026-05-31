import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { requireAuth, loadUserProfile, showToast, formatDateShort } from "./utils.js";
import { icon } from "./icons.js";

let currentUser = null;
let selectedSymptoms = new Set();
const MAX_SYMPTOMS = 8;

const SYMPTOMS = [
  { id:"fatigue",           label:"Fatigue / Always Tired",                  emoji:"😴" },
  { id:"pale_skin",         label:"Pale Skin / Pale Nails / Inner Eyelids",  emoji:"🫲" },
  { id:"night_blindness",   label:"Poor Night Vision / Blurry Vision",       emoji:"👁️" },
  { id:"dry_skin",          label:"Dry Skin / Flaky Scalp / Hair Loss",      emoji:"💆" },
  { id:"bleeding_gums",     label:"Bleeding Gums / Mouth Sores",             emoji:"🦷" },
  { id:"slow_healing",      label:"Slow Wound Healing",                      emoji:"🩹" },
  { id:"muscle_cramps",     label:"Muscle Cramps / Leg Weakness",            emoji:"💪" },
  { id:"bone_pain",         label:"Bone Pain / Joint Aches",                 emoji:"🦴" },
  { id:"swollen_legs",      label:"Swollen Legs / Ankles / Face",            emoji:"🦵" },
  { id:"frequent_illness",  label:"Frequent Colds / Low Immunity",           emoji:"🤧" },
  { id:"constipation",      label:"Constipation / Bloating",                 emoji:"😣" },
  { id:"poor_appetite",     label:"Poor Appetite / Unexplained Weight Loss", emoji:"🍽️" },
  { id:"anxiety",           label:"Anxiety / Mood Changes / Irritability",   emoji:"😟" },
  { id:"heart_palpitations",label:"Palpitations / Irregular Heartbeat",      emoji:"💓" },
  { id:"goitre",            label:"Swollen Neck (Goitre)",                   emoji:"🫀" },
  { id:"headache",          label:"Frequent Headaches / Dizziness",          emoji:"🤕" },
];

const DEFICIENCIES = [
  {
    id: "iron",
    name: "Iron Deficiency (Anaemia)",
    color: "#C62828",
    symptoms: ["fatigue","pale_skin","slow_healing","frequent_illness","poor_appetite","headache"],
    description: "Iron carries oxygen in your blood. Low iron causes tiredness, weakness, and poor immune function. This is the most common nutritional deficiency in Zambia, especially in women and children.",
    eat: [
      { name:"Moringa Leaves", note:"Highest natural iron source in Zambia" },
      { name:"Kapenta (Dried Small Fish)", note:"Excellent and affordable iron source" },
      { name:"Beef Liver (small portions)", note:"Rich in iron and B12" },
      { name:"Beans & Lentils", note:"Good plant-based iron" },
      { name:"Bondwe & Rape (dark greens)", note:"Good iron, easy to find" },
      { name:"Guava or Orange (Vitamin C)", note:"Doubles iron absorption — eat alongside" },
    ],
    avoid: ["Tea or coffee within 1 hour of meals (blocks iron absorption)","Milky tea as the main drink (blocks iron)"],
    tip: "Always eat an iron-rich food (moringa, kapenta, beans) together with a Vitamin C food (guava, orange, tomatoes). This doubles how much iron your body absorbs.",
    urgency: "high",
    clinic: "See a clinic if you feel dizzy, very short of breath, or have very pale eyelids.",
  },
  {
    id: "vitamin_a",
    name: "Vitamin A Deficiency",
    color: "#E65100",
    symptoms: ["night_blindness","dry_skin","frequent_illness","poor_appetite"],
    description: "Vitamin A is essential for healthy vision (especially at night), immune function, and skin repair. Deficiency is very common in children and pregnant women in rural Zambia.",
    eat: [
      { name:"Pumpkin & Chibwabwa (Pumpkin Leaves)", note:"Rich in beta-carotene (Vitamin A)" },
      { name:"Carrots", note:"Excellent and affordable beta-carotene" },
      { name:"Orange-Flesh Sweet Potato", note:"One of the best Vitamin A sources" },
      { name:"Moringa Leaves", note:"High in Vitamin A" },
      { name:"Eggs & Liver", note:"Contain ready-made Vitamin A" },
      { name:"Pawpaw & Mango", note:"Good beta-carotene + easy to find" },
    ],
    avoid: ["Diets with no orange or yellow vegetables","Skipping vegetables entirely for days"],
    tip: "Add a small amount of cooking oil when eating orange/yellow vegetables — oil greatly increases how much Vitamin A your body absorbs from plant foods.",
    urgency: "high",
    clinic: "See a clinic if a child cannot see well in dim light or has dry, cloudy eyes.",
  },
  {
    id: "vitamin_c",
    name: "Vitamin C Deficiency",
    color: "#F57C00",
    symptoms: ["bleeding_gums","slow_healing","frequent_illness","fatigue"],
    description: "Vitamin C is needed for healthy gums, wound healing, and a strong immune system. Deficiency causes bleeding gums, slow healing of cuts, and getting sick often.",
    eat: [
      { name:"Guava", note:"Has more Vitamin C than oranges — cheap and local" },
      { name:"Orange & Lemon", note:"Classic Vitamin C sources" },
      { name:"Fresh Tomatoes & Green Pepper", note:"Good everyday source" },
      { name:"Raw Cabbage", note:"Good source — Vitamin C is lost when boiled" },
      { name:"Moringa Leaves", note:"Rich in Vitamin C and iron" },
      { name:"Pawpaw", note:"Easy to find, great Vitamin C" },
    ],
    avoid: ["Boiling vegetables for more than 5 minutes (destroys Vitamin C)","Eating no fresh fruit for weeks"],
    tip: "Eat at least one fresh fruit or raw vegetable every single day. Guava is the best value Vitamin C food in Zambia.",
    urgency: "moderate",
    clinic: null,
  },
  {
    id: "calcium_vitd",
    name: "Calcium & Vitamin D Deficiency",
    color: "#1565C0",
    symptoms: ["bone_pain","muscle_cramps","poor_appetite"],
    description: "Calcium builds strong bones and teeth. Vitamin D helps the body absorb calcium from food. Deficiency leads to weak bones, rickets in children, muscle cramps, and aching joints.",
    eat: [
      { name:"Milk & Yoghurt", note:"Best and most available calcium source" },
      { name:"Kapenta — Eat the Bones", note:"Tiny bones = excellent bone calcium" },
      { name:"Moringa Leaves", note:"Good plant calcium + minerals" },
      { name:"Rape & Bondwe (dark greens)", note:"Plant-based calcium" },
      { name:"15 Minutes of Morning Sunlight", note:"Skin makes Vitamin D from sunlight" },
    ],
    avoid: ["Fizzy drinks like Fanta/Coke (reduce calcium absorption)","Excessive tea/coffee with every meal"],
    tip: "Eat kapenta with the tiny bones intact — don't remove them. They are the richest natural calcium source available to most Zambian families.",
    urgency: "moderate",
    clinic: "See a clinic if a child's legs are bowing outward or if bones break easily.",
  },
  {
    id: "magnesium_potassium",
    name: "Magnesium & Potassium Deficiency",
    color: "#6A1B9A",
    symptoms: ["muscle_cramps","headache","anxiety","heart_palpitations","fatigue"],
    description: "Magnesium and potassium control nerve and muscle function, including the heartbeat. Low levels cause painful cramps, headaches, anxiety, palpitations, and constant tiredness.",
    eat: [
      { name:"Banana", note:"The best natural potassium food, affordable" },
      { name:"Beans & Lentils", note:"Good magnesium and potassium together" },
      { name:"Groundnuts / Pumpkin Seeds", note:"High magnesium content" },
      { name:"Moringa Leaves", note:"Magnesium + potassium + iron" },
      { name:"Sweet Potato", note:"Good potassium source" },
      { name:"Sorghum Porridge", note:"Contains magnesium" },
    ],
    avoid: ["Excessive alcohol (depletes both magnesium and potassium)","Very salty foods eaten daily (deplete potassium)"],
    tip: "Eat a banana every day. A meal of banana + bean relish covers both your daily magnesium and potassium needs at very low cost.",
    urgency: "moderate",
    clinic: "See a clinic if you have a very irregular heartbeat or severe chest palpitations.",
  },
  {
    id: "protein",
    name: "Protein Deficiency (Malnutrition)",
    color: "#C62828",
    symptoms: ["swollen_legs","poor_appetite","fatigue","slow_healing","dry_skin"],
    description: "Protein builds every tissue in the body — muscles, organs, skin, and the immune system. Severe deficiency (kwashiorkor) causes swollen legs and face, muscle wasting, poor healing, and extreme weakness.",
    eat: [
      { name:"Beans & Lentils (Daily)", note:"Affordable, complete protein when paired with grain" },
      { name:"Soya Pieces", note:"Very high protein at low cost — use 3x/week" },
      { name:"Kapenta & Fresh Fish", note:"Complete protein" },
      { name:"Eggs", note:"Best quality protein available" },
      { name:"Groundnuts / Peanut Butter", note:"Protein and healthy fat" },
      { name:"Chicken", note:"Good protein, any cut" },
    ],
    avoid: ["Nshima-only meals with no relish","Skipping protein at multiple meals in a row"],
    tip: "Swollen legs and face with poor diet is a medical emergency. Go to a clinic. While doing so, eat eggs or beans at every single meal.",
    urgency: "high",
    clinic: "URGENT: Swollen legs, feet, or face with poor diet means go to a clinic immediately — this is kwashiorkor.",
  },
  {
    id: "fiber",
    name: "Fiber Deficiency",
    color: "#2E7D32",
    symptoms: ["constipation","anxiety"],
    description: "Dietary fiber from vegetables, beans, and wholegrains keeps the digestive system healthy. Low fiber causes constipation, bloating, and over many years increases the risk of colon cancer.",
    eat: [
      { name:"Beans & Lentils", note:"Excellent fiber — best plant food" },
      { name:"Vegetables (Rape, Cabbage, Carrots)", note:"Good fiber every day" },
      { name:"Sorghum Porridge (not refined)", note:"High fiber traditional grain" },
      { name:"Fruits with Skin (Guava)", note:"Fiber is mostly in the skin" },
      { name:"Brown Rice over White Rice", note:"Retains more fiber" },
    ],
    avoid: ["Only white nshima every meal with no vegetables","No vegetables or fruit for days at a time"],
    tip: "Drink 8 glasses of water daily alongside high-fiber foods. Water helps fiber move food through the gut efficiently.",
    urgency: "low",
    clinic: null,
  },
  {
    id: "iodine",
    name: "Iodine Deficiency",
    color: "#0277BD",
    symptoms: ["goitre","fatigue","anxiety","poor_appetite"],
    description: "Iodine controls the thyroid gland which regulates energy, growth, and metabolism. Zambia is landlocked and its soils are low in iodine. Deficiency causes goitre (swollen neck), extreme fatigue, and poor mental development in children.",
    eat: [
      { name:"Iodized Salt (Every Day)", note:"Check label — must say 'iodized salt'" },
      { name:"Kapenta & Dried Fish", note:"Natural iodine content" },
      { name:"Sea Fish (if available)", note:"High natural iodine" },
      { name:"Eggs", note:"Moderate iodine content" },
    ],
    avoid: ["Unfortified or un-iodized salt","Cassava in very large amounts (contains natural goitrogens)"],
    tip: "Always buy iodized salt — it looks identical to regular salt but prevents goitre. It is the single cheapest and most effective nutrition intervention available.",
    urgency: "high",
    clinic: "See a clinic if there is a visible or palpable swelling on the front of the neck.",
  },
  {
    id: "zinc",
    name: "Zinc Deficiency",
    color: "#00838F",
    symptoms: ["frequent_illness","slow_healing","poor_appetite","dry_skin"],
    description: "Zinc is critical for immune function, wound healing, taste and smell, and child growth. Deficiency is common when the diet lacks variety and animal-source foods.",
    eat: [
      { name:"Beef & Chicken", note:"Best bioavailable zinc sources" },
      { name:"Beans & Lentils", note:"Good plant zinc — soak before cooking" },
      { name:"Groundnuts / Pumpkin Seeds", note:"Good zinc content" },
      { name:"Eggs", note:"Moderate zinc" },
      { name:"Kapenta & Fish", note:"Good zinc source" },
    ],
    avoid: ["Only plant foods without any variety for weeks","Skipping all animal-source protein daily"],
    tip: "Soak or ferment beans and grains before cooking — this breaks down phytic acid and doubles zinc absorption from plant foods.",
    urgency: "moderate",
    clinic: null,
  },
  {
    id: "b_vitamins",
    name: "B Vitamin Deficiency",
    color: "#AD1457",
    symptoms: ["fatigue","anxiety","headache","pale_skin","poor_appetite"],
    description: "B vitamins (B1, B2, B6, B12, Folate) are essential for energy production, brain function, nerve health, and red blood cell formation. Deficiency causes chronic fatigue, mood problems, numbness, and anaemia.",
    eat: [
      { name:"Eggs", note:"Excellent B12 and B2 source" },
      { name:"Fresh Fish (Tilapia, Bream)", note:"B12 + B6 + B3" },
      { name:"Beans & Lentils", note:"B1 + Folate" },
      { name:"Moringa Leaves", note:"B2 + Folate" },
      { name:"Sorghum & Whole Grains", note:"B1 and B3" },
      { name:"Groundnuts", note:"B3 + B6" },
    ],
    avoid: ["Only refined white foods (nshima, white rice) every day","Discarding vegetable cooking water — B vitamins dissolve into it"],
    tip: "Never throw away the water you used to boil vegetables. Use it as soup stock or in your sauce — it contains valuable dissolved B vitamins.",
    urgency: "moderate",
    clinic: null,
  },
];

export async function initSymptomNutritionPage() {
  try {
    currentUser = await requireAuth();
    await loadUserProfile(currentUser.uid);
    renderSymptomChecklist();
    loadPastChecks();
  } catch (e) { /* redirected */ }
}

function renderSymptomChecklist() {
  const container = document.getElementById("symptom-container");
  if (!container) return;

  container.innerHTML = `
    <div class="sn-intro-card">
      <p>Select the symptoms you are experiencing. The app will identify which nutritional deficiencies are most likely and show you which Zambian foods to eat to address them.</p>
      <p class="sn-limit-note">${icon("info",14)} Select up to ${MAX_SYMPTOMS} symptoms at a time.</p>
    </div>

    <div class="sn-symptom-grid" id="symptom-grid">
      ${SYMPTOMS.map(s => `
        <button class="sn-symptom-btn" data-id="${s.id}" type="button">
          <span class="sn-symptom-emoji">${s.emoji}</span>
          <span class="sn-symptom-label">${s.label}</span>
        </button>
      `).join("")}
    </div>

    <div class="sn-selected-count" id="selected-count">0 symptoms selected</div>

    <button class="btn-green btn-full sn-check-btn" id="btn-check" disabled>
      ${icon("symptom",18)} Check My Nutrition
    </button>
  `;

  container.querySelectorAll(".sn-symptom-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      if (selectedSymptoms.has(id)) {
        selectedSymptoms.delete(id);
        btn.classList.remove("selected");
      } else {
        if (selectedSymptoms.size >= MAX_SYMPTOMS) {
          showToast(`Select up to ${MAX_SYMPTOMS} symptoms at a time.`, "error");
          return;
        }
        selectedSymptoms.add(id);
        btn.classList.add("selected");
      }
      updateSelectedCount();
    });
  });

  document.getElementById("btn-check")?.addEventListener("click", analyseSymptoms);
}

function updateSelectedCount() {
  const n = selectedSymptoms.size;
  const el = document.getElementById("selected-count");
  if (el) el.textContent = `${n} symptom${n !== 1 ? "s" : ""} selected`;
  const btn = document.getElementById("btn-check");
  if (btn) btn.disabled = n === 0;
}

function analyseSymptoms() {
  if (selectedSymptoms.size === 0) return;

  const scores = {};
  selectedSymptoms.forEach(symptomId => {
    DEFICIENCIES.forEach(def => {
      if (def.symptoms.includes(symptomId)) {
        scores[def.id] = (scores[def.id] || 0) + 1;
      }
    });
  });

  const ranked = Object.entries(scores)
    .map(([id, score]) => ({ ...DEFICIENCIES.find(d => d.id === id), score }))
    .sort((a, b) => b.score - a.score || (b.urgency === "high" ? 1 : -1));

  if (ranked.length === 0) {
    showToast("No specific deficiencies detected for those symptoms. Eat a varied, balanced diet.", "info");
    return;
  }

  displayResults(ranked);
  saveCheck([...selectedSymptoms], ranked);
}

function displayResults(ranked) {
  const container = document.getElementById("results-container");
  if (!container) return;

  const hasHighUrgency = ranked.some(r => r.urgency === "high");

  const urgencyColors = { high:"#C62828", moderate:"#E65100", low:"#2E7D32" };
  const urgencyLabels = { high:"High Priority", moderate:"Moderate", low:"Low" };

  container.innerHTML = `
    <div class="sn-results-header">
      <h2>${icon("symptom",20)} Your Nutritional Analysis</h2>
      <p class="sn-results-sub">Based on your ${selectedSymptoms.size} selected symptoms, we identified ${ranked.length} likely nutritional ${ranked.length === 1 ? "issue" : "issues"}.</p>
    </div>

    ${ranked.map((def, i) => `
      <div class="sn-deficiency-card" style="border-top-color:${def.color};">
        <div class="sn-def-header">
          <div class="sn-def-rank" style="background:${def.color};">${i + 1}</div>
          <div class="sn-def-title">
            <h3>${def.name}</h3>
            <span class="sn-urgency-badge" style="background:${urgencyColors[def.urgency]}20;color:${urgencyColors[def.urgency]};border:1px solid ${urgencyColors[def.urgency]}40;">
              ${urgencyLabels[def.urgency]}
            </span>
          </div>
          <div class="sn-match-score">${def.score} symptom${def.score !== 1 ? "s" : ""}</div>
        </div>

        <p class="sn-def-desc">${def.description}</p>

        <div class="sn-food-cols">
          <div class="sn-food-col sn-eat">
            <div class="sn-food-col-head">${icon("check",13)} Eat These Foods</div>
            <ul>
              ${def.eat.map(f => `
                <li>
                  <strong>${f.name}</strong>
                  ${f.note ? `<span class="sn-food-note">${f.note}</span>` : ""}
                </li>
              `).join("")}
            </ul>
          </div>
          <div class="sn-food-col sn-avoid">
            <div class="sn-food-col-head">✕ Avoid</div>
            <ul>${def.avoid.map(a => `<li>${a}</li>`).join("")}</ul>
          </div>
        </div>

        <div class="sn-tip-box">
          ${icon("info",15)} <span>${def.tip}</span>
        </div>

        ${def.clinic ? `
          <div class="sn-clinic-box">
            ${icon("risk",15)} <span><strong>When to see a clinic:</strong> ${def.clinic}</span>
          </div>
        ` : ""}
      </div>
    `).join("")}

    ${hasHighUrgency ? `
      <div class="sn-clinic-summary">
        <h3>${icon("risk",18)} Visit a Health Clinic</h3>
        <p>One or more of your identified deficiencies are <strong>high priority</strong>. Visit your nearest clinic or health post for a proper assessment and treatment. Nutritional deficiencies can be easily treated when caught early.</p>
        <p style="margin-top:0.5rem;font-size:0.82rem;color:var(--text-medium);">Show this screen to your health worker to help explain your symptoms.</p>
      </div>
    ` : ""}

    <div class="sn-action-row">
      <a href="meal-planner.html" class="btn-green">Open Meal Planner</a>
      <button class="btn-secondary" id="btn-reassess">${icon("arrowLeft",15)} Check Again</button>
    </div>
  `;

  container.classList.remove("hidden");
  container.scrollIntoView({ behavior: "smooth" });

  document.getElementById("btn-reassess")?.addEventListener("click", () => {
    selectedSymptoms.clear();
    container.classList.add("hidden");
    container.innerHTML = "";
    renderSymptomChecklist();
    document.getElementById("symptom-container")?.scrollIntoView({ behavior: "smooth" });
  });
}

async function saveCheck(symptoms, results) {
  try {
    await addDoc(collection(db, "symptomChecks"), {
      userId: currentUser.uid,
      symptoms,
      results: results.map(r => ({ id: r.id, name: r.name, score: r.score, urgency: r.urgency })),
      createdAt: serverTimestamp(),
    });
    loadPastChecks();
  } catch { /* silent */ }
}

async function loadPastChecks() {
  const historyEl = document.getElementById("past-checks");
  if (!historyEl) return;
  try {
    const q = query(collection(db, "symptomChecks"), where("userId","==",currentUser.uid), orderBy("createdAt","desc"), limit(3));
    const snap = await getDocs(q);
    if (snap.empty) {
      historyEl.innerHTML = `<p class="sn-no-history">No previous checks yet.</p>`;
      return;
    }
    const titleEl = document.getElementById("past-title");
    if (titleEl) titleEl.classList.remove("hidden");
    historyEl.innerHTML = snap.docs.map(d => {
      const data = d.data();
      const top = data.results?.[0];
      const urgencyColors = { high:"#C62828", moderate:"#E65100", low:"#2E7D32" };
      return `
        <div class="sn-past-row">
          <span class="sn-past-date">${icon("calendar",13)} ${formatDateShort(data.createdAt)}</span>
          <span class="sn-past-symptoms">${data.symptoms?.length || 0} symptoms</span>
          ${top ? `<span class="sn-past-top" style="color:${urgencyColors[top.urgency]||"#666"};">${top.name}</span>` : ""}
        </div>`;
    }).join("");
  } catch { /* silent */ }
}
