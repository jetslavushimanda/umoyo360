import { requireAuth } from "./utils.js";
import { icon } from "./icons.js";

let activeStage = "t1";

const STAGES = [
  { id:"t1", label:"1st Trimester", sub:"Weeks 1–12" },
  { id:"t2", label:"2nd Trimester", sub:"Weeks 13–26" },
  { id:"t3", label:"3rd Trimester", sub:"Weeks 27–40" },
  { id:"bf", label:"Breastfeeding", sub:"0–24 months" },
];

const DATA = {
  t1: {
    intro: "Weeks 1–12 are when your baby's brain, spine, and organs form. Folate is the most critical nutrient — it prevents neural tube defects and must be taken BEFORE pregnancy begins.",
    nutrients: [
      { name:"Folic Acid (Folate)", color:"#0D9954", target:"400–600 mcg daily",
        why:"Prevents brain and spine defects. Most critical in first 12 weeks.",
        foods:[{n:"Moringa leaves",note:"Highest folate in Zambia"},{n:"Beans & lentils",note:"Excellent folate source"},{n:"Rape & bondwe (dark greens)",note:"Good daily folate"},{n:"Eggs",note:"Folate + B12"},{n:"Folic acid tablet from clinic",note:"Take 400 mcg every day"}] },
      { name:"Iron", color:"#C62828", target:"27 mg daily",
        why:"Prevents severe anaemia which causes extreme fatigue and risks complications during birth.",
        foods:[{n:"Kapenta (eat whole)",note:"Best affordable iron"},{n:"Beef liver (small amounts, 1–2×/week)",note:"High iron + B12"},{n:"Beans & lentils",note:"Good plant iron"},{n:"Guava or orange with every iron meal",note:"Doubles iron absorption"}] },
      { name:"Vitamin B6", color:"#E65100", target:"1.9 mg daily",
        why:"Reduces nausea and morning sickness, which is common in the first trimester.",
        foods:[{n:"Banana",note:"Gentle on nauseous stomach, good B6"},{n:"Groundnuts",note:"Good B6"},{n:"Fresh fish",note:"B6 + protein"},{n:"Sorghum porridge",note:"Easy to digest"}] },
    ],
    plan:{ "☀️ Breakfast":"Sorghum porridge + boiled egg + small banana", "🍎 Morning Snack":"Guava or orange", "🍽️ Lunch":"Small nshima + beans relish + moringa/rape + tomatoes", "🌤️ Snack":"Handful of groundnuts", "🌙 Supper":"Rice + kapenta + pumpkin leaves + guava" },
    avoid:["Alcohol — no amount is safe during pregnancy","Undercooked or raw meat and fish (risk of Listeria, Toxoplasma)","Large amounts of unripe pawpaw — can cause contractions","More than 1 cup of tea or coffee per day (blocks iron)","Street food with unclear hygiene"],
    warnings:["Heavy bleeding at any time — go to hospital NOW","Severe vomiting that stops you eating or drinking — go to clinic","Severe abdominal or pelvic pain — go to clinic","Fever above 38°C — go to clinic"],
    tip:"If morning sickness is severe, eat small amounts every 2 hours. Cold or room-temperature food is easier to keep down than hot food.",
  },
  t2: {
    intro: "Weeks 13–26 — your baby grows rapidly. Most women feel better now and have more appetite. Iron and calcium become critical as your blood volume increases by 50%.",
    nutrients: [
      { name:"Iron", color:"#C62828", target:"27–30 mg daily",
        why:"Your blood volume has increased 50%. Anaemia now increases the risk of preterm birth and complications.",
        foods:[{n:"Moringa leaves daily",note:"Take every single day"},{n:"Kapenta — eat the tiny bones",note:"Iron + calcium together"},{n:"Beef liver (twice/week)",note:"Very high iron — keep portions small"},{n:"Iron tablet from clinic + guava",note:"Take with Vitamin C food"}] },
      { name:"Calcium", color:"#1565C0", target:"1000–1300 mg daily",
        why:"Baby's bones and teeth are forming rapidly. If you don't eat enough, baby takes calcium FROM YOUR BONES.",
        foods:[{n:"Milk or yoghurt daily",note:"Best absorbed calcium"},{n:"Kapenta — eat whole bones",note:"Richest calcium source in Zambia"},{n:"Moringa leaves",note:"Good plant calcium"},{n:"Rape & bondwe",note:"Calcium + iron + folate"}] },
      { name:"Protein", color:"#6A1B9A", target:"Extra 25 g above normal daily",
        why:"Baby's brain, muscles, and organs are developing. You need significantly more protein.",
        foods:[{n:"Eggs daily",note:"Complete protein + choline for brain"},{n:"Fish 3× per week",note:"Omega-3 for baby's brain"},{n:"Beans & soya pieces",note:"Affordable daily protein"},{n:"Groundnuts / peanut butter",note:"Protein + healthy fat"}] },
    ],
    plan:{ "☀️ Breakfast":"Egg omelette + moringa + banana + milk/yoghurt", "🍎 Morning Snack":"Orange or guava + groundnuts", "🍽️ Lunch":"Nshima + beans + kapenta + rape + tomatoes", "🌤️ Snack":"Yoghurt or pawpaw", "🌙 Supper":"Rice + fish + pumpkin leaves + glass of milk" },
    avoid:["Alcohol — completely throughout pregnancy","Highly salted foods (Royco, tinned fish in brine) — raises blood pressure risk","Too much liver (more than twice/week) — excess Vitamin A harms baby","Unpasteurized milk — Brucellosis risk","Large fish if available (potential mercury)"],
    warnings:["Swelling of hands and face — could be pre-eclampsia, go to clinic","Severe headache + blurred vision — go to clinic IMMEDIATELY","No baby movement felt by week 20 — check with clinic","Burning urination (UTI) — treat promptly with clinic visit"],
    tip:"Eat 5 small meals rather than 3 large ones — your growing uterus presses on your stomach. Always take your iron tablet with a Vitamin C food like guava or orange.",
  },
  t3: {
    intro: "Weeks 27–40 — baby gains most of its weight now. Your iron, omega-3, and calorie needs are at their highest. Prepare your body for labour and recovery.",
    nutrients: [
      { name:"Iron + Vitamin C", color:"#C62828", target:"30–35 mg daily",
        why:"Severe anaemia now directly increases the risk of death during childbirth. This is the most dangerous time for anaemia in Zambia.",
        foods:[{n:"Iron tablet from clinic EVERY DAY",note:"Do not miss a single day"},{n:"Moringa leaves daily",note:"Natural iron + folate"},{n:"Guava or orange at every meal",note:"Doubles iron absorption"},{n:"Kapenta at least 3× per week",note:"Iron + calcium + protein"}] },
      { name:"Omega-3 Fatty Acids", color:"#0277BD", target:"200–300 mg DHA daily",
        why:"Baby's brain has its biggest growth in the last trimester. Omega-3 is the main brain-building fat.",
        foods:[{n:"Fresh tilapia or bream (3×/week)",note:"Best local omega-3 source"},{n:"Kapenta",note:"Good omega-3"},{n:"Groundnuts",note:"Plant omega-3 (ALA)"},{n:"Free-range eggs",note:"Some DHA content"}] },
      { name:"Zinc", color:"#00838F", target:"12–13 mg daily",
        why:"Supports baby's immune development and your wound healing after delivery.",
        foods:[{n:"Beef or chicken",note:"Best zinc sources"},{n:"Eggs",note:"Good zinc"},{n:"Beans & lentils (soaked overnight)",note:"Plant zinc — soaking increases absorption"},{n:"Groundnuts",note:"Good zinc content"}] },
    ],
    plan:{ "☀️ Breakfast":"Sorghum porridge + egg + moringa + guava", "🍎 Morning Snack":"Banana + peanut butter on bread", "🍽️ Lunch":"Nshima + kapenta + rape + tomatoes + orange", "🌤️ Snack":"Milk + groundnuts", "🌙 Supper":"Rice + tilapia/beans + pumpkin or carrots + guava" },
    avoid:["Alcohol — completely","Very salty foods — greatly increases pre-eclampsia risk","Lying flat on your back for long periods — reduces blood flow to baby","Very large heavy meals — causes severe heartburn and reflux","Less than 8 glasses of water per day — dehydration stresses baby"],
    warnings:["Sudden severe headache + swollen face or hands = PRE-ECLAMPSIA — go to hospital IMMEDIATELY","Baby not moving for 12+ hours after week 28 — go to clinic same day","Any bleeding or fluid leaking from vagina — go to hospital","Contractions before week 37 — go to hospital (preterm labour)"],
    tip:"Eat iron-rich foods (kapenta, moringa, beans) together with Vitamin C foods (guava, orange, tomato) at every meal. NEVER drink tea within 1 hour of taking your iron tablet.",
  },
  bf: {
    intro: "While breastfeeding, your nutritional needs are even higher than during pregnancy. What you eat directly affects the quality and quantity of your breast milk. You need an extra 500 calories per day.",
    nutrients: [
      { name:"Energy & Calories", color:"#E65100", target:"Extra 500 calories daily",
        why:"Breastfeeding burns 500+ extra calories per day. Undereating directly reduces milk supply.",
        foods:[{n:"Nshima + relish at every meal",note:"Do not skip any meal"},{n:"Groundnuts / peanut butter",note:"Energy-dense, excellent for milk"},{n:"Sweet potato",note:"Energy + Vitamin A for breastmilk"},{n:"Soya pieces",note:"Protein + energy"}] },
      { name:"Calcium", color:"#1565C0", target:"1000–1300 mg daily",
        why:"Your body takes calcium FROM YOUR BONES for breastmilk. Not replacing it causes osteoporosis later.",
        foods:[{n:"Milk or yoghurt daily",note:"Best calcium source"},{n:"Kapenta — eat the bones",note:"Excellent bone calcium"},{n:"Moringa leaves",note:"Plant calcium + iron"},{n:"Rape & bondwe",note:"Daily calcium source"}] },
      { name:"Hydration", color:"#0891B2", target:"12–14 glasses of water daily",
        why:"Breastmilk is 90% water. Dehydration is the #1 reason milk supply drops.",
        foods:[{n:"Plain water (10+ glasses daily)",note:"Most important of all"},{n:"Hibiscus tea (cold)",note:"Hydrating + iron"},{n:"Moringa tea",note:"Nutrients + fluid"},{n:"Pawpaw or watermelon",note:"High water content fruits"}] },
    ],
    plan:{ "☀️ Breakfast":"Sorghum porridge + egg + moringa + milk/yoghurt", "🍎 Morning Snack":"Groundnuts + guava + large glass of water", "🍽️ Lunch":"Nshima + beans or kapenta + rape + tomatoes + orange", "🌤️ Snack":"Banana + peanut butter + water", "🌙 Supper":"Rice or nshima + fish or eggs + vegetables + water", "➕ Extra":"Bread + peanut butter if still hungry" },
    avoid:["Alcohol — passes directly into breastmilk and harms baby's brain","Skipping meals — this is the main cause of low milk supply","Excessive caffeine (more than 2 cups/day) — babies cannot process caffeine","Herbal teas with unknown ingredients — some reduce milk supply","Very spicy foods if baby shows consistent stomach discomfort"],
    warnings:["Breast hard, red, very painful, and you have fever = mastitis — go to clinic for antibiotics SAME DAY","Baby not gaining weight or fewer than 6 wet nappies per day — clinic check needed","Severe pain every time you breastfeed — clinic or breastfeeding counsellor can help","Feeling deeply depressed or unable to care for baby — postpartum depression is common and treatable"],
    tip:"Drink a full glass of water every single time you breastfeed. Adding moringa leaves to your daily relish is the best natural way to increase and enrich your breast milk in Zambia.",
  },
};

export async function initPregnancyNutritionPage() {
  try {
    await requireAuth();
    renderTabs();
    renderContent(activeStage);
  } catch {}
}

function renderTabs() {
  const bar = document.getElementById("stage-tabs");
  if (!bar) return;
  bar.innerHTML = STAGES.map(s => `
    <button class="preg-tab ${s.id === activeStage ? "active" : ""}" data-id="${s.id}">
      <span class="preg-tab-label">${s.label}</span>
      <span class="preg-tab-sub">${s.sub}</span>
    </button>`).join("");
  bar.querySelectorAll(".preg-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      activeStage = btn.dataset.id;
      bar.querySelectorAll(".preg-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderContent(activeStage);
    });
  });
}

function renderContent(id) {
  const el = document.getElementById("stage-content");
  if (!el) return;
  const d = DATA[id];

  el.innerHTML = `
    <div class="preg-intro">${d.intro}</div>

    <h2 class="preg-h2">${icon("pregnancy",18)} Key Nutrients</h2>
    ${d.nutrients.map(n => `
      <div class="preg-nutrient" style="border-left-color:${n.color};">
        <div class="preg-nut-head">
          <span class="preg-nut-name" style="color:${n.color};">${n.name}</span>
          <span class="preg-nut-target">${n.target}</span>
        </div>
        <p class="preg-nut-why">${n.why}</p>
        <div class="preg-food-list">
          ${n.foods.map(f => `
            <div class="preg-food-row">
              <span class="preg-food-name">${icon("check",12)} ${f.n}</span>
              <span class="preg-food-note">${f.note}</span>
            </div>`).join("")}
        </div>
      </div>`).join("")}

    <h2 class="preg-h2">${icon("mealPlanner",18)} Sample Daily Meal Plan</h2>
    <div class="preg-meal-plan">
      ${Object.entries(d.plan).map(([slot,meal]) => `
        <div class="preg-meal-row-plan">
          <span class="preg-meal-slot">${slot}</span>
          <span class="preg-meal-food">${meal}</span>
        </div>`).join("")}
    </div>

    <h2 class="preg-h2 preg-avoid-h">✕ Foods & Things to Avoid</h2>
    <div class="preg-avoid-card">
      <ul>${d.avoid.map(a => `<li>${a}</li>`).join("")}</ul>
    </div>

    <div class="preg-tip">${icon("info",15)} <span>${d.tip}</span></div>

    <h2 class="preg-h2 preg-warn-h">${icon("risk",18)} Warning Signs — Go to Clinic</h2>
    <div class="preg-warn-card">
      <ul>${d.warnings.map(w => `<li>${w}</li>`).join("")}</ul>
    </div>
  `;
}
