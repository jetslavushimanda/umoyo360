import { requireAuth } from "./utils.js";
import { icon } from "./icons.js";

let selectedMeds = new Set();

const MEDICATIONS = [
  {
    id:"tld", name:"ARVs — TLD / Tenofovir-based", category:"HIV Treatment",
    color:"#6A1B9A",
    description:"First-line HIV treatment taken once daily. Food significantly affects absorption and side effects.",
    takeWith:"Always take with food — a full meal reduces side effects (nausea, dizziness).",
    eat:[
      { food:"Any balanced meal at medication time", why:"Reduces nausea and improves absorption" },
      { food:"Groundnuts or peanut butter", why:"Healthy fat improves absorption" },
      { food:"Beans, eggs, or kapenta at every meal", why:"Protein supports immune recovery" },
      { food:"Orange or guava daily", why:"Vitamin C boosts immune function" },
      { food:"Moringa leaves regularly", why:"Iron, folate, and Vitamin A support" },
    ],
    avoid:[
      { food:"Grapefruit (if available)", why:"Inhibits drug metabolism — increases drug levels dangerously" },
      { food:"Alcohol", why:"Damages liver, reduces drug effectiveness, and worsens side effects" },
      { food:"Calcium supplements or antacids", why:"Take at least 2 hours apart from TDF — reduces absorption" },
      { food:"St John's Wort herbal remedy", why:"Drastically reduces ARV blood levels — treatment failure" },
    ],
    tip:"Take your ARV at the same time every day with a meal. Never stop taking it because of side effects — go to the clinic instead.",
    clinic:"Report persistent vomiting, severe abdominal pain, yellowing of eyes, or skin rash to the clinic immediately.",
  },
  {
    id:"metformin", name:"Metformin (Diabetes)", category:"Diabetes",
    color:"#E65100",
    description:"Used to control blood sugar in Type 2 diabetes. Must be taken with food to prevent stomach upset.",
    takeWith:"Take with your main meal — never on an empty stomach.",
    eat:[
      { food:"Consistent meal timing every day", why:"Metformin works best with regular, predictable eating" },
      { food:"High-fiber foods (beans, rape, sorghum)", why:"Slows sugar absorption, helps metformin work better" },
      { food:"Small portions of nshima or rice", why:"Reduces blood sugar spike" },
      { food:"Eggs, fish, soya at every meal", why:"Protein stabilizes blood sugar" },
    ],
    avoid:[
      { food:"Alcohol", why:"Risk of dangerous lactic acidosis — potentially life-threatening" },
      { food:"Sugary drinks, sodas, fruit juice", why:"Defeats the purpose of the medication" },
      { food:"Large nshima portions", why:"Spikes blood sugar faster than metformin can control" },
      { food:"Skipping meals", why:"Causes dangerous low blood sugar (hypoglycaemia)" },
    ],
    tip:"Metformin can reduce Vitamin B12 absorption over time. Eat eggs, fish, or kapenta regularly to compensate.",
    clinic:"If you feel dizzy, very weak, or confused — especially after exercise — go to clinic for blood sugar check.",
  },
  {
    id:"bp_meds", name:"Blood Pressure Tablets (Amlodipine / Enalapril)", category:"Hypertension",
    color:"#C62828",
    description:"Used to lower high blood pressure. Diet is equally important as the tablet itself.",
    takeWith:"Can be taken with or without food. Take at the same time every day.",
    eat:[
      { food:"Moringa leaves, banana, sweet potato", why:"High potassium naturally lowers blood pressure" },
      { food:"Fresh fish (tilapia, kapenta)", why:"Omega-3 and low sodium support heart health" },
      { food:"Garlic (fresh)", why:"Clinically proven to lower blood pressure slightly" },
      { food:"Beans and lentils", why:"High fiber + potassium support" },
    ],
    avoid:[
      { food:"Salt and Royco/stock cubes", why:"Directly counteracts blood pressure medication" },
      { food:"Grapefruit (especially with amlodipine)", why:"Dangerously increases drug levels in blood" },
      { food:"Alcohol", why:"Causes unpredictable blood pressure swings" },
      { food:"Tinned and processed foods", why:"Hidden sodium content undermines treatment" },
    ],
    tip:"Cook without salt or stock cubes — use fresh garlic, tomatoes, and onions for flavour instead. Your taste adapts within 2 weeks.",
    clinic:"Take your blood pressure reading monthly. If you feel severe headache + blurred vision, go to clinic immediately.",
  },
  {
    id:"cotrimoxazole", name:"Cotrimoxazole (Septrin / Bactrim)", category:"Antibiotic / HIV Prophylaxis",
    color:"#0277BD",
    description:"Antibiotic used to prevent infections in people living with HIV and for general bacterial infections.",
    takeWith:"Take with food and a full glass of water to reduce stomach irritation.",
    eat:[
      { food:"Dark leafy greens (rape, moringa, bondwe)", why:"Cotrimoxazole reduces folate — replenish through food" },
      { food:"Beans and lentils", why:"Good dietary folate source" },
      { food:"Eggs", why:"B12 and folate support" },
      { food:"8+ glasses of water per day", why:"Prevents kidney crystals — very important with this drug" },
    ],
    avoid:[
      { food:"Alcohol", why:"Increases risk of liver side effects and reduces effectiveness" },
      { food:"Dairy products (milk, yoghurt) within 1 hour", why:"Can reduce absorption slightly" },
    ],
    tip:"Drink at least 8 full glasses of water every day while taking cotrimoxazole — it can cause kidney stones if you are dehydrated.",
    clinic:"Report skin rash, mouth sores, or severe stomach pain to the clinic promptly.",
  },
  {
    id:"iron_supplement", name:"Iron Supplement (Ferrous Sulphate)", category:"Anaemia / Pregnancy",
    color:"#C62828",
    description:"Prescribed for iron deficiency anaemia, especially during pregnancy. Absorption is greatly affected by food and drink choices.",
    takeWith:"Take on an empty stomach OR with a Vitamin C food. Avoid dairy and tea at the same time.",
    eat:[
      { food:"Guava, orange, or tomatoes at same time", why:"Doubles iron absorption — critical" },
      { food:"Moringa leaves daily", why:"Natural iron supports supplement" },
      { food:"Kapenta and dark greens", why:"Dietary iron reinforces the supplement" },
    ],
    avoid:[
      { food:"Tea or coffee within 1 hour", why:"Tannins block up to 60% of iron absorption" },
      { food:"Milk or yoghurt within 1 hour", why:"Calcium competes with iron for absorption" },
      { food:"Antacids within 2 hours", why:"Greatly reduces iron absorption" },
      { food:"Bran or high-fibre foods at same time", why:"Phytates can bind iron and block absorption" },
    ],
    tip:"Take your iron tablet with a guava or a glass of orange juice — this combination can double how much iron your body absorbs.",
    clinic:"Iron supplements cause black or dark stools — this is normal. Severe stomach pain or vomiting means tell your health worker.",
  },
  {
    id:"tb_drugs", name:"TB Drugs (Rifampicin / Isoniazid / RHZE)", category:"Tuberculosis",
    color:"#AD1457",
    description:"First-line tuberculosis treatment taken for 6 months. Diet is crucial for recovery and preventing side effects.",
    takeWith:"Take on an empty stomach (30 min before breakfast) for best absorption. If stomach upset, take with a light meal.",
    eat:[
      { food:"Eggs, fish, and beans at every meal", why:"Isoniazid depletes Vitamin B6 — protein foods help replenish it" },
      { food:"Groundnuts and soya", why:"B3 and B6 in groundnuts support nerve health" },
      { food:"Moringa leaves regularly", why:"Iron and Vitamin A support recovery from TB" },
      { food:"High calorie foods if underweight", why:"TB causes severe weight loss — eat more than normal" },
    ],
    avoid:[
      { food:"Alcohol — completely", why:"Severely damages liver already stressed by TB drugs. Risk of liver failure." },
      { food:"Aged cheese, tinned fish, and fermented foods", why:"Isoniazid + tyramine-rich foods can cause dangerous blood pressure spike" },
      { food:"Antacids within 1 hour", why:"Reduces rifampicin absorption" },
    ],
    tip:"Never stop TB drugs early even if you feel better — stopping early creates drug-resistant TB which is much harder to treat. Take every tablet every day for the full 6 months.",
    clinic:"Report yellowing of eyes or skin (jaundice), persistent vomiting, or numbness/tingling in hands and feet immediately.",
  },
  {
    id:"prednisolone", name:"Prednisolone / Steroids", category:"Inflammation / Autoimmune",
    color:"#F57C00",
    description:"Corticosteroid used to reduce inflammation. Long-term use significantly affects nutrition needs.",
    takeWith:"Always take with food — preferably a full meal to protect the stomach lining.",
    eat:[
      { food:"Milk, yoghurt, kapenta (calcium-rich)", why:"Steroids deplete calcium and cause bone loss — replace daily" },
      { food:"Beans, soya, lean protein", why:"Steroids break down muscle — high protein protects it" },
      { food:"Vegetables and low-sugar foods", why:"Steroids raise blood sugar — reduce carbohydrates" },
      { food:"Potassium foods: banana, sweet potato, beans", why:"Steroids deplete potassium" },
    ],
    avoid:[
      { food:"Salty foods and added salt", why:"Steroids cause salt and water retention — salt makes it worse" },
      { food:"Large nshima portions and sugary foods", why:"Steroids significantly raise blood sugar" },
      { food:"Alcohol", why:"Combined liver stress and increased stomach ulcer risk" },
    ],
    tip:"Long-term steroid use causes silent bone loss. Eat kapenta, milk, or moringa every day. Take a calcium supplement if your clinic offers one.",
    clinic:"Report unusual weight gain in face/abdomen, high blood sugar symptoms, or severe stomach pain.",
  },
  {
    id:"folic_acid", name:"Folic Acid (Pregnancy / Neural Tube Prevention)", category:"Pregnancy",
    color:"#0D9954",
    description:"Essential for neural tube development in early pregnancy. Should be started BEFORE pregnancy if possible.",
    takeWith:"Take with any meal. Can be taken at any time of day.",
    eat:[
      { food:"Moringa leaves daily", why:"Highest natural folate source in Zambia" },
      { food:"Beans and lentils", why:"Excellent dietary folate" },
      { food:"Dark leafy greens (rape, bondwe)", why:"Good daily folate" },
      { food:"Eggs", why:"Folate + B12 together" },
    ],
    avoid:[
      { food:"Alcohol", why:"Alcohol depletes folate — directly counteracts the supplement" },
      { food:"Excessive tea", why:"Can slightly reduce folate absorption" },
    ],
    tip:"Folic acid must be taken for at least 1 month BEFORE getting pregnant to prevent neural tube defects. Continue throughout the first trimester.",
    clinic:"Report any unusual symptoms to your clinic. Folic acid itself has no serious side effects.",
  },
  {
    id:"paracetamol", name:"Paracetamol / Panadol", category:"Pain Relief / Fever",
    color:"#435373",
    description:"Common pain reliever and fever reducer. Generally safe but can damage the liver if misused.",
    takeWith:"Can be taken with or without food.",
    eat:[
      { food:"Plenty of water", why:"Helps process and eliminate the drug" },
      { food:"Normal balanced meals", why:"No special dietary requirements" },
    ],
    avoid:[
      { food:"Alcohol", why:"Combined with paracetamol, even normal doses can cause serious liver damage" },
      { food:"Other paracetamol-containing products at same time", why:"Many cold/flu remedies already contain paracetamol — check labels" },
    ],
    tip:"Never exceed the recommended dose. Adults: maximum 4 g (8 standard tablets) per day. Keep well out of reach of children.",
    clinic:"If you accidentally take too much, go to a clinic immediately even if you feel fine — liver damage from overdose is delayed.",
  },
];

export async function initMedicationFoodPage() {
  try {
    await requireAuth();
    renderMedList();
  } catch {}
}

function renderMedList() {
  const container = document.getElementById("med-list");
  if (!container) return;

  const byCategory = {};
  MEDICATIONS.forEach(m => {
    if (!byCategory[m.category]) byCategory[m.category] = [];
    byCategory[m.category].push(m);
  });

  container.innerHTML = Object.entries(byCategory).map(([cat, meds]) => `
    <div class="mf-category">
      <div class="mf-cat-label">${cat}</div>
      ${meds.map(m => `
        <label class="mf-med-chip ${selectedMeds.has(m.id) ? "selected" : ""}" data-id="${m.id}">
          <input type="checkbox" value="${m.id}" class="mf-cb" ${selectedMeds.has(m.id) ? "checked" : ""}>
          <span class="mf-med-dot" style="background:${m.color};"></span>
          <span class="mf-med-name">${m.name}</span>
        </label>
      `).join("")}
    </div>
  `).join("");

  container.querySelectorAll(".mf-cb").forEach(cb => {
    cb.addEventListener("change", () => {
      const id = cb.value;
      if (cb.checked) selectedMeds.add(id);
      else selectedMeds.delete(id);
      const chip = cb.closest(".mf-med-chip");
      chip?.classList.toggle("selected", cb.checked);
      renderResults();
    });
  });
}

function renderResults() {
  const container = document.getElementById("mf-results");
  if (!container) return;

  if (selectedMeds.size === 0) {
    container.classList.add("hidden");
    return;
  }

  const meds = [...selectedMeds].map(id => MEDICATIONS.find(m => m.id === id)).filter(Boolean);

  container.innerHTML = meds.map(m => `
    <div class="mf-result-card" style="border-top-color:${m.color};">
      <div class="mf-result-header">
        <span class="mf-cat-badge" style="background:${m.color}20;color:${m.color};border:1px solid ${m.color}40;">${m.category}</span>
        <h3 class="mf-med-title">${m.name}</h3>
        <p class="mf-med-desc">${m.description}</p>
        <div class="mf-take-with">${icon("info",14)} <strong>How to take:</strong> ${m.takeWith}</div>
      </div>

      <div class="mf-food-cols">
        <div class="mf-col mf-eat-col">
          <div class="mf-col-head">${icon("check",13)} Best Foods to Eat</div>
          ${m.eat.map(f => `
            <div class="mf-food-item">
              <span class="mf-food-name">${f.food}</span>
              <span class="mf-food-why">${f.why}</span>
            </div>`).join("")}
        </div>
        <div class="mf-col mf-avoid-col">
          <div class="mf-col-head">✕ Foods to Avoid</div>
          ${m.avoid.map(f => `
            <div class="mf-food-item">
              <span class="mf-food-name">${f.food}</span>
              <span class="mf-food-why">${f.why}</span>
            </div>`).join("")}
        </div>
      </div>

      <div class="mf-tip">${icon("info",14)} ${m.tip}</div>

      ${m.clinic ? `<div class="mf-clinic-warn">${icon("risk",14)} <span><strong>When to see a clinic:</strong> ${m.clinic}</span></div>` : ""}
    </div>
  `).join("");

  container.classList.remove("hidden");
  container.scrollIntoView({ behavior:"smooth" });
}
