import { auth, db } from "./firebase-config.js";
import { collection, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { requireAuth, loadUserProfile, showToast, getDayName, shuffleArray, formatDateShort } from "./utils.js";
import { FOODS_DATABASE, getCategories, getFoodsByCategory } from "./foods-database.js";
import { getConditionById, getMealStructure } from "./conditions.js";

let currentUser = null;
let userProfile = null;
let selectedFoodIds = new Set();
let activeCategory = null;
let planDuration = 7;
let generatedPlan = null;

export async function initMealPlannerPage() {
  try {
    currentUser = await requireAuth();
    userProfile = await loadUserProfile(currentUser.uid);
    renderConditionBadge();
    setupPlanToggle();
    if (userProfile.condition === "general") renderGeneralForm();
    else renderFoodSelector();
    document.getElementById("btn-generate")?.addEventListener("click", handleGenerate);
  } catch (e) { /* redirected */ }
}

function renderConditionBadge() {
  const cond = getConditionById(userProfile.condition);
  const badge = document.getElementById("condition-badge");
  if (badge && cond) badge.textContent = cond.name;
}

function setupPlanToggle() {
  document.querySelectorAll(".plan-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".plan-toggle").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      planDuration = parseInt(btn.dataset.days, 10);
    });
  });
}

function renderFoodSelector() {
  const categories = getCategories();
  activeCategory = categories[0];

  const tabBar = document.getElementById("category-tabs");
  tabBar.innerHTML = "";
  categories.forEach(cat => {
    const tab = document.createElement("button");
    tab.className = "tab" + (cat === activeCategory ? " active" : "");
    tab.textContent = cat;
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      activeCategory = cat;
      renderFoodGrid(cat);
    });
    tabBar.appendChild(tab);
  });

  document.getElementById("food-search")?.addEventListener("input", e => {
    const q = e.target.value.toLowerCase();
    renderFoodGrid(activeCategory, q.length > 1 ? q : "");
  });

  document.getElementById("btn-select-safe")?.addEventListener("click", () => {
    getFoodsByCategory(activeCategory).forEach(f => {
      if (!f.forbiddenFor.includes(userProfile.condition)) selectedFoodIds.add(f.id);
    });
    renderFoodGrid(activeCategory);
    updateSelectionCounter();
  });

  document.getElementById("btn-clear-all")?.addEventListener("click", () => {
    getFoodsByCategory(activeCategory).forEach(f => selectedFoodIds.delete(f.id));
    renderFoodGrid(activeCategory);
    updateSelectionCounter();
  });

  renderFoodGrid(activeCategory);
  updateSelectionCounter();
}

function renderFoodGrid(category, searchQuery = "") {
  const grid = document.getElementById("food-grid");
  if (!grid) return;

  let foods = getFoodsByCategory(category);
  if (searchQuery) foods = foods.filter(f => f.name.toLowerCase().includes(searchQuery) || f.localName.toLowerCase().includes(searchQuery));

  grid.innerHTML = "";
  foods.forEach(food => {
    const isForbidden = food.forbiddenFor.includes(userProfile.condition);
    const isRecommended = food.recommendedFor.includes(userProfile.condition);
    const isSelected = selectedFoodIds.has(food.id);

    const card = document.createElement("div");
    card.className = "food-card" + (isForbidden ? " forbidden" : "") + (isRecommended ? " recommended" : "") + (isSelected ? " selected" : "");
    card.innerHTML = `
      <div class="food-card-icon">${food.icon || food.name[0]}</div>
      <div class="food-card-info">
        <span class="food-name">${food.name}</span>
        <span class="food-local">${food.localName}</span>
      </div>
      ${isRecommended ? '<span class="badge-star">★</span>' : ""}
      ${isForbidden ? '<span class="badge-lock">🔒</span>' : ""}
      <input type="checkbox" class="food-checkbox" ${isSelected ? "checked" : ""} ${isForbidden ? "disabled" : ""}>
    `;

    if (isForbidden) {
      card.addEventListener("click", () => showToast(`Not recommended for ${getConditionById(userProfile.condition)?.shortName || "your condition"}.`, "error"));
    } else {
      card.addEventListener("click", () => {
        if (selectedFoodIds.has(food.id)) { selectedFoodIds.delete(food.id); card.classList.remove("selected"); card.querySelector(".food-checkbox").checked = false; }
        else { selectedFoodIds.add(food.id); card.classList.add("selected"); card.querySelector(".food-checkbox").checked = true; }
        updateSelectionCounter();
      });
    }
    grid.appendChild(card);
  });
}

function renderGeneralForm() {
  const container = document.getElementById("food-selector");
  if (!container) return;
  container.innerHTML = `
    <div class="general-form">
      <p class="general-intro">You have no specific condition. Answer 3 quick questions and we will generate your balanced meal plan.</p>
      <div class="form-group"><label>What is your main staple?</label>
        <div class="radio-group">
          <label><input type="radio" name="staple" value="nshima" checked> Nshima</label>
          <label><input type="radio" name="staple" value="rice"> Rice</label>
          <label><input type="radio" name="staple" value="cassava"> Cassava</label>
          <label><input type="radio" name="staple" value="mixed"> Mixed</label>
        </div>
      </div>
      <div class="form-group"><label>Your protein preference?</label>
        <div class="radio-group">
          <label><input type="radio" name="protein" value="fish" checked> Fish</label>
          <label><input type="radio" name="protein" value="meat"> Meat</label>
          <label><input type="radio" name="protein" value="plant"> Plant-based</label>
          <label><input type="radio" name="protein" value="mixed"> Mixed</label>
        </div>
      </div>
      <div class="form-group"><label>Your vegetable preference?</label>
        <div class="radio-group">
          <label><input type="radio" name="veg" value="leafy" checked> Leafy Greens</label>
          <label><input type="radio" name="veg" value="root"> Root Vegetables</label>
          <label><input type="radio" name="veg" value="mixed"> Mixed</label>
        </div>
      </div>
    </div>`;
  const btn = document.getElementById("btn-generate");
  if (btn) btn.disabled = false;
}

function updateSelectionCounter() {
  const count = selectedFoodIds.size;
  const counter = document.getElementById("selection-counter");
  const btn = document.getElementById("btn-generate");
  if (counter) counter.textContent = `${count} food${count !== 1 ? "s" : ""} selected`;
  if (btn) btn.disabled = count < 10;
}

async function handleGenerate() {
  const btn = document.getElementById("btn-generate");
  btn.disabled = true; btn.textContent = "Generating...";
  try {
    if (userProfile.condition === "general") {
      const staple = document.querySelector('input[name="staple"]:checked')?.value || "mixed";
      const protein = document.querySelector('input[name="protein"]:checked')?.value || "mixed";
      const veg = document.querySelector('input[name="veg"]:checked')?.value || "mixed";
      selectGeneralFoods(staple, protein, veg);
    }
    generatedPlan = generateMealPlan([...selectedFoodIds], userProfile.condition, planDuration);
    await savePlanToFirestore(generatedPlan);
    renderPlanDisplay(generatedPlan);
    document.getElementById("plan-display").scrollIntoView({ behavior: "smooth" });
    showToast("Meal plan generated and saved!");
  } catch (err) {
    showToast("Failed to generate plan. Please try again.", "error");
    console.error(err);
  } finally {
    btn.disabled = false; btn.textContent = "Generate My Meal Plan";
    updateSelectionCounter();
  }
}

function selectGeneralFoods(staple, protein, veg) {
  selectedFoodIds.clear();
  const find = name => FOODS_DATABASE.find(f => f.name === name);
  const stapleMap = { nshima:["White Maize Nshima","Yellow Maize Nshima"], rice:["White Rice","Brown Rice"], cassava:["Boiled Cassava","Cassava Flour Nshima"], mixed:["White Maize Nshima","Brown Rice","Boiled Cassava","Rolled Oats","Sorghum Porridge"] };
  const proteinMap = { fish:["Fresh Bream/Tilapia","Kapenta Fresh","Tinned Sardines","Tinned Mackerel"], meat:["Fresh Chicken","Fresh Beef","Goat Meat"], plant:["Sugar Beans","Soya Pieces","Lentils","Cowpeas"], mixed:["Fresh Bream/Tilapia","Fresh Chicken","Sugar Beans","Chicken Eggs","Kapenta Fresh"] };
  const vegMap = { leafy:["Rape","Green Cabbage","Chibwabwa (Pumpkin Leaves)","Moringa Leaves","Bondwe"], root:["Carrots","Butternut","Pumpkin","Beetroot"], mixed:["Rape","Green Cabbage","Tomatoes","Carrots","Moringa Leaves","Bondwe","Chibwabwa (Pumpkin Leaves)"] };
  [...(stapleMap[staple]||stapleMap.mixed), ...(proteinMap[protein]||proteinMap.mixed), ...(vegMap[veg]||vegMap.mixed), "Banana","Guava","Pawpaw","Moringa Tea","Plain Water"]
    .forEach(name => { const f = find(name); if (f) selectedFoodIds.add(f.id); });
}

export function generateMealPlan(foodIds, conditionId, planDuration) {
  const selectedFoods = FOODS_DATABASE.filter(f => foodIds.includes(f.id));
  const mealStructure = getMealStructure(conditionId);
  const condition = getConditionById(conditionId);
  const byMeal = {};
  mealStructure.forEach(slot => { byMeal[slot] = []; });
  selectedFoods.forEach(food => {
    food.mealTimes.forEach(time => {
      if (time === "snack") { if (byMeal["morning_snack"]) byMeal["morning_snack"].push(food); if (byMeal["afternoon_snack"]) byMeal["afternoon_snack"].push(food); }
      else if (byMeal[time]) byMeal[time].push(food);
    });
  });
  const water = FOODS_DATABASE.find(f => f.name === "Plain Water");
  const days = [];
  let prevBreakfast = null, prevProtein = null;

  for (let i = 0; i < planDuration; i++) {
    const dayMeals = {};
    mealStructure.forEach(slot => {
      const pool = shuffleArray(byMeal[slot] || []);
      if (slot === "breakfast") {
        const options = pool.filter(f => f.id !== prevBreakfast);
        const chosen = options.length ? options : pool;
        const mainItem = chosen[0];
        dayMeals[slot] = { foods: mainItem ? [mainItem.name, ...chosen.slice(1,3).map(e=>e.name)] : ["Boiled Sweet Potato"], note: getBreakfastNote(conditionId) };
        prevBreakfast = mainItem?.id;
      } else if (slot === "lunch" || slot === "supper") {
        const staples = pool.filter(f => f.category === "Staples");
        const proteins = pool.filter(f => ["Meat","Fish","Eggs & Legumes"].includes(f.category) && f.id !== prevProtein);
        const veggies = shuffleArray(pool.filter(f => ["Leafy Veg","Vegetables"].includes(f.category)));
        const staple = staples[0], protein = proteins[0] || pool.find(f => f.category === "Eggs & Legumes");
        const foods = [];
        if (staple) foods.push(applyPortionNote(staple.name, conditionId));
        if (protein) foods.push(protein.name);
        if (veggies[0]) foods.push(veggies[0].name);
        if (veggies[1] && slot === "supper") foods.push(veggies[1].name);
        if (water) foods.push("Plain Water");
        dayMeals[slot] = { foods: foods.length ? foods : ["Boiled Sweet Potato","Beans","Rape"], note: "" };
        if (protein) prevProtein = protein.id;
      } else {
        const snacks = shuffleArray(pool.filter(f => ["Fruits","Traditional Snacks","Dairy","Drinks"].includes(f.category)));
        dayMeals[slot] = { foods: [...snacks.slice(0,2).map(s=>s.name), water ? "Plain Water" : ""].filter(Boolean), note: getSnackNote(conditionId) };
      }
    });
    applyConditionRules(dayMeals, selectedFoods, conditionId, i);
    days.push({ dayNumber: i+1, dayName: planDuration===7 ? getDayName(i) : `Day ${i+1}`, meals: dayMeals, nutritionNote: getDailyNote(conditionId, i) });
  }
  return { generatedAt: new Date().toISOString(), conditionId, conditionName: condition?.name||"General", planDuration, days };
}

function applyPortionNote(foodName, conditionId) {
  if ((conditionId==="diabetes_type2"||conditionId==="diabetes_type1") && (foodName.toLowerCase().includes("nshima")||foodName.toLowerCase().includes("rice"))) return `${foodName} (½ cup portion)`;
  return foodName;
}
function applyConditionRules(dayMeals, selectedFoods, conditionId, i) {
  if (conditionId==="anaemia") {
    const ironFood = selectedFoods.find(f=>f.nutrients.iron==="high");
    const vitCFood = selectedFoods.find(f=>f.nutrients.vitaminC==="high");
    if (ironFood && dayMeals.lunch && !dayMeals.lunch.foods.includes(ironFood.name)) dayMeals.lunch.foods.splice(1,0,ironFood.name);
    if (vitCFood && dayMeals.lunch && !dayMeals.lunch.foods.includes(vitCFood.name)) dayMeals.lunch.foods.push(vitCFood.name);
  }
  if ((conditionId==="diabetes_type2"||conditionId==="diabetes_type1") && i%2===0) {
    const special = selectedFoods.find(f=>f.name==="Bitter Melon")||selectedFoods.find(f=>f.name==="Okra (Delele)");
    if (special && dayMeals.lunch && !dayMeals.lunch.foods.includes(special.name)) dayMeals.lunch.foods.push(special.name);
  }
  if (conditionId==="malnutrition") {
    const gnut = selectedFoods.find(f=>f.name.includes("Groundnut")||f.name==="Peanut Butter");
    if (gnut && dayMeals.breakfast && !dayMeals.breakfast.foods.includes(gnut.name)) dayMeals.breakfast.foods.push(gnut.name);
  }
}
function getBreakfastNote(c) { return {gastritis:"Soft, gentle breakfast. Eat slowly.",diabetes_type2:"Pair with protein to slow sugar absorption.",diabetes_type1:"Pair with protein. Time with insulin dose.",anaemia:"Do not take tea or coffee with this meal.",malnutrition:"Add groundnut powder or moringa to porridge."}[c]||""; }
function getSnackNote(c) { return {diabetes_type2:"Keep snack small — one fruit or handful of nuts.",anaemia:"Pair with Vitamin C food to boost iron.",kidney_disease:"Avoid high-potassium fruits.",osteoporosis:"Choose dairy snack for calcium."}[c]||""; }
function getDailyNote(c,i) {
  const pool = {diabetes_type2:["Today's plan balances carbohydrates with protein and fiber to keep blood sugar stable.","Eat meals at the same time every day — consistency controls blood sugar.","Drink 2 litres of water today."],hypertension:["Cook today's relish without salt or stock cubes.","Today's plan includes potassium-rich foods that naturally lower blood pressure.","Walk for 20 minutes today."],anaemia:["Today includes iron-rich foods paired with Vitamin C for maximum absorption.","Do not drink tea within 1 hour of iron-rich meals.","Moringa added to any meal provides iron, Vitamin C, and protein."],general:["Today's plan provides all major food groups your body needs.","Drink at least 8 glasses of water today.","Variety is the most powerful nutrition strategy."]}[c]||["Eat well, stay healthy.","Good nutrition is your best medicine.","Every healthy meal is an investment in your future."];
  return pool[i%pool.length];
}

export function renderPlanDisplay(plan) {
  const container = document.getElementById("plan-display");
  if (!container) return;
  container.classList.remove("hidden");
  const mealIcons = {breakfast:"☀️",morning_snack:"🍎",lunch:"🍽️",afternoon_snack:"🌤️",supper:"🌙"};
  const mealLabels = {breakfast:"Breakfast",morning_snack:"Morning Snack",lunch:"Lunch",afternoon_snack:"Afternoon Snack",supper:"Supper"};
  container.innerHTML = `
    <div class="plan-header">
      <h2>${plan.planDuration}-Day Meal Plan</h2>
      <p class="plan-meta">Personalized for: <strong>${plan.conditionName}</strong></p>
      <p class="plan-meta">Generated: ${formatDateShort(plan.generatedAt)}</p>
      <div class="plan-header-btns">
        <button class="btn-secondary" id="btn-new-plan">Generate New Plan</button>
        <button class="btn-green" id="btn-download-pdf">⬇ Download PDF</button>
      </div>
    </div>
    <div class="days-container">
      ${plan.days.map(day=>`
        <div class="day-card">
          <div class="day-header" onclick="this.parentElement.classList.toggle('expanded')">
            <span class="day-title">${day.dayName}</span><span class="day-toggle">▼</span>
          </div>
          <div class="day-body">
            ${Object.entries(day.meals).map(([slot,meal])=>`
              <div class="meal-section">
                <div class="meal-title">${mealIcons[slot]||"🍴"} ${mealLabels[slot]||slot}</div>
                <ul class="meal-foods">${meal.foods.map(f=>`<li>${f}</li>`).join("")}</ul>
                ${meal.note?`<p class="meal-note">${meal.note}</p>`:""}
              </div>`).join("")}
            <p class="day-nutrition-note">💡 ${day.nutritionNote}</p>
          </div>
        </div>`).join("")}
    </div>
    <div class="plan-summary-box">
      <h3>Plan Summary</h3>
      <p>This ${plan.planDuration}-day plan is personalized for <strong>${plan.conditionName}</strong>.</p>
      <p>Every meal uses real Zambian foods available at your local market.</p>
      <a href="health-tracker.html" class="btn-primary">Track Your Progress</a>
    </div>`;
  document.getElementById("btn-new-plan")?.addEventListener("click", () => { container.classList.add("hidden"); window.scrollTo({top:0,behavior:"smooth"}); });
  container.querySelector(".day-card")?.classList.add("expanded");
  document.getElementById("btn-download-pdf")?.addEventListener("click", () => downloadPlanAsPDF(plan));
}

async function savePlanToFirestore(plan) {
  await addDoc(collection(db, "mealPlans"), { userId: currentUser.uid, plan, conditionId: plan.conditionId, planDuration: plan.planDuration, createdAt: serverTimestamp() });
}

function downloadPlanAsPDF(plan) {
  const btn = document.getElementById("btn-download-pdf");
  btn.textContent = "Preparing PDF...";
  btn.disabled = true;

  const mealIcons = {breakfast:"☀️",morning_snack:"🍎",lunch:"🍽️",afternoon_snack:"🌤️",supper:"🌙"};
  const mealLabels = {breakfast:"Breakfast",morning_snack:"Morning Snack",lunch:"Lunch",afternoon_snack:"Afternoon Snack",supper:"Supper"};

  const html = `
    <div style="font-family:Arial,sans-serif;padding:20px;color:#1C2833;max-width:700px;margin:0 auto;">
      <div style="background:#1A5276;color:white;padding:24px;border-radius:12px;text-align:center;margin-bottom:24px;">
        <h1 style="margin:0;font-size:28px;letter-spacing:-0.5px;">UMOYO360</h1>
        <p style="margin:6px 0 0;opacity:0.9;font-size:14px;">Your Complete Health Guardian</p>
      </div>

      <div style="background:#f4f6f7;border-radius:10px;padding:16px;margin-bottom:24px;text-align:center;">
        <h2 style="margin:0 0 6px;color:#1A5276;">${plan.planDuration}-Day Personalized Meal Plan</h2>
        <p style="margin:0;color:#566573;font-size:14px;">Condition: <strong>${plan.conditionName}</strong> &nbsp;|&nbsp; Generated: ${formatDateShort(plan.generatedAt)}</p>
      </div>

      ${plan.days.map(day => `
        <div style="margin-bottom:20px;border:1px solid #D5D8DC;border-radius:10px;overflow:hidden;page-break-inside:avoid;">
          <div style="background:#1A5276;color:white;padding:12px 16px;font-weight:700;font-size:16px;">
            ${day.dayName}
          </div>
          <div style="padding:0;">
            ${Object.entries(day.meals).map(([slot, meal]) => `
              <div style="padding:12px 16px;border-bottom:1px solid #f0f0f0;">
                <div style="font-weight:700;color:#1A5276;font-size:13px;margin-bottom:6px;">
                  ${mealIcons[slot] || "🍴"} ${mealLabels[slot] || slot}
                </div>
                <ul style="margin:0;padding-left:16px;">
                  ${meal.foods.map(f => `<li style="font-size:13px;padding:2px 0;color:#1C2833;">${f}</li>`).join("")}
                </ul>
                ${meal.note ? `<p style="margin:6px 0 0;font-size:12px;color:#566573;font-style:italic;">${meal.note}</p>` : ""}
              </div>
            `).join("")}
            <div style="padding:10px 16px;background:#EBF5FB;font-size:12px;color:#1A5276;">
              💡 ${day.nutritionNote}
            </div>
          </div>
        </div>
      `).join("")}

      <div style="margin-top:24px;padding:16px;background:#F0FFF4;border:2px solid #1E8449;border-radius:10px;text-align:center;">
        <p style="margin:0;color:#1E8449;font-weight:700;">Umoyo360 — Because your health is your greatest wealth.</p>
        <p style="margin:6px 0 0;color:#566573;font-size:12px;">JETS National Innovation Challenge 2026 — Republic of Zambia</p>
      </div>
    </div>
  `;

  const element = document.createElement("div");
  element.innerHTML = html;
  document.body.appendChild(element);

  const opt = {
    margin: 10,
    filename: `Umoyo360_MealPlan_${plan.planDuration}days.pdf`,
    image: { type:"jpeg", quality:0.98 },
    html2canvas: { scale:2, useCORS:true },
    jsPDF: { unit:"mm", format:"a4", orientation:"portrait" }
  };

  html2pdf().set(opt).from(element).save().then(() => {
    document.body.removeChild(element);
    btn.textContent = "⬇ Download PDF";
    btn.disabled = false;
    showToast("PDF downloaded successfully!");
  });
}
