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

    if (userProfile.condition === "general") {
      renderGeneralForm();
    } else {
      renderFoodSelector();
    }

    document.getElementById("btn-generate")?.addEventListener("click", handleGenerate);
  } catch (e) { /* redirected */ }
}

// ── UI ────────────────────────────────────────────────────────────────────
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
  const container = document.getElementById("food-selector");
  if (!container) return;

  const categories = getCategories();
  activeCategory = categories[0];

  // Category tabs
  const tabBar = document.getElementById("category-tabs");
  tabBar.innerHTML = "";
  categories.forEach(cat => {
    const tab = document.createElement("button");
    tab.className = "tab" + (cat === activeCategory ? " active" : "");
    tab.textContent = cat;
    tab.dataset.category = cat;
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      activeCategory = cat;
      renderFoodGrid(cat);
    });
    tabBar.appendChild(tab);
  });

  // Search
  const searchInput = document.getElementById("food-search");
  searchInput?.addEventListener("input", e => {
    const q = e.target.value.toLowerCase();
    if (q.length > 1) {
      renderFoodGrid(activeCategory, q);
    } else {
      renderFoodGrid(activeCategory);
    }
  });

  // Select all safe
  document.getElementById("btn-select-safe")?.addEventListener("click", () => {
    const foods = getFoodsByCategory(activeCategory);
    foods.forEach(f => {
      if (!f.forbiddenFor.includes(userProfile.condition)) {
        selectedFoodIds.add(f.id);
      }
    });
    renderFoodGrid(activeCategory);
    updateSelectionCounter();
  });

  // Clear all
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
  if (searchQuery) {
    foods = foods.filter(f =>
      f.name.toLowerCase().includes(searchQuery) ||
      f.localName.toLowerCase().includes(searchQuery)
    );
  }

  grid.innerHTML = "";
  foods.forEach(food => {
    const isForbidden = food.forbiddenFor.includes(userProfile.condition);
    const isRecommended = food.recommendedFor.includes(userProfile.condition);
    const isSelected = selectedFoodIds.has(food.id);

    const card = document.createElement("div");
    card.className = "food-card" +
      (isForbidden ? " forbidden" : "") +
      (isRecommended ? " recommended" : "") +
      (isSelected ? " selected" : "");

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
      card.addEventListener("click", () => {
        const cond = getConditionById(userProfile.condition);
        showToast(`Not recommended for ${cond?.shortName || "your condition"}.`, "error");
      });
    } else {
      card.addEventListener("click", () => {
        if (selectedFoodIds.has(food.id)) {
          selectedFoodIds.delete(food.id);
          card.classList.remove("selected");
          card.querySelector(".food-checkbox").checked = false;
        } else {
          selectedFoodIds.add(food.id);
          card.classList.add("selected");
          card.querySelector(".food-checkbox").checked = true;
        }
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
      <div class="form-group">
        <label>What is your main staple?</label>
        <div class="radio-group" id="q-staple">
          <label><input type="radio" name="staple" value="nshima" checked> Nshima</label>
          <label><input type="radio" name="staple" value="rice"> Rice</label>
          <label><input type="radio" name="staple" value="cassava"> Cassava</label>
          <label><input type="radio" name="staple" value="mixed"> Mixed</label>
        </div>
      </div>
      <div class="form-group">
        <label>Your protein preference?</label>
        <div class="radio-group" id="q-protein">
          <label><input type="radio" name="protein" value="fish" checked> Fish</label>
          <label><input type="radio" name="protein" value="meat"> Meat</label>
          <label><input type="radio" name="protein" value="plant"> Plant-based</label>
          <label><input type="radio" name="protein" value="mixed"> Mixed</label>
        </div>
      </div>
      <div class="form-group">
        <label>Your vegetable preference?</label>
        <div class="radio-group" id="q-veg">
          <label><input type="radio" name="veg" value="leafy" checked> Leafy Greens</label>
          <label><input type="radio" name="veg" value="root"> Root Vegetables</label>
          <label><input type="radio" name="veg" value="mixed"> Mixed</label>
        </div>
      </div>
    </div>
  `;

  const btn = document.getElementById("btn-generate");
  if (btn) btn.disabled = false;
}

function updateSelectionCounter() {
  const count = selectedFoodIds.size;
  const counter = document.getElementById("selection-counter");
  const btn = document.getElementById("btn-generate");
  if (counter) counter.textContent = `${count} food${count !== 1 ? "s" : ""} selected`;
  if (btn) {
    btn.disabled = count < 10;
    btn.title = count < 10 ? "Select at least 10 foods to generate a plan" : "";
  }
}

// ── Plan generation ───────────────────────────────────────────────────────
async function handleGenerate() {
  const btn = document.getElementById("btn-generate");
  btn.disabled = true;
  btn.textContent = "Generating...";

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
  } finally {
    btn.disabled = false;
    btn.textContent = "Generate My Meal Plan";
    updateSelectionCounter();
  }
}

function selectGeneralFoods(staple, protein, veg) {
  selectedFoodIds.clear();

  // Always include water
  const water = FOODS_DATABASE.find(f => f.name === "Plain Water");
  if (water) selectedFoodIds.add(water.id);

  // Staples
  const stapleMap = {
    nshima: ["White Maize Nshima","Yellow Maize Nshima"],
    rice: ["White Rice","Brown Rice"],
    cassava: ["Boiled Cassava","Cassava Flour Nshima"],
    mixed: ["White Maize Nshima","Brown Rice","Boiled Cassava","Rolled Oats","Sorghum Porridge"]
  };
  (stapleMap[staple] || stapleMap.mixed).forEach(name => {
    const f = FOODS_DATABASE.find(fd => fd.name === name);
    if (f) selectedFoodIds.add(f.id);
  });

  // Proteins
  const proteinMap = {
    fish: ["Fresh Bream/Tilapia","Kapenta Fresh","Tinned Sardines","Tinned Mackerel"],
    meat: ["Fresh Chicken","Fresh Beef","Goat Meat"],
    plant: ["Sugar Beans","Soya Pieces","Lentils","Cowpeas"],
    mixed: ["Fresh Bream/Tilapia","Fresh Chicken","Sugar Beans","Chicken Eggs","Kapenta Fresh"]
  };
  (proteinMap[protein] || proteinMap.mixed).forEach(name => {
    const f = FOODS_DATABASE.find(fd => fd.name === name);
    if (f) selectedFoodIds.add(f.id);
  });

  // Vegetables
  const vegMap = {
    leafy: ["Rape","Green Cabbage","Chibwabwa (Pumpkin Leaves)","Moringa Leaves","Bondwe"],
    root: ["Carrots","Butternut","Pumpkin","Beetroot"],
    mixed: ["Rape","Green Cabbage","Tomatoes","Carrots","Moringa Leaves","Bondwe","Chibwabwa (Pumpkin Leaves)"]
  };
  (vegMap[veg] || vegMap.mixed).forEach(name => {
    const f = FOODS_DATABASE.find(fd => fd.name === name);
    if (f) selectedFoodIds.add(f.id);
  });

  // Add some fruits and extras
  ["Banana","Guava","Pawpaw","Moringa Tea","Black Tea"].forEach(name => {
    const f = FOODS_DATABASE.find(fd => fd.name === name);
    if (f) selectedFoodIds.add(f.id);
  });
}

export function generateMealPlan(foodIds, conditionId, planDuration) {
  const selectedFoods = FOODS_DATABASE.filter(f => foodIds.includes(f.id));
  const mealStructure = getMealStructure(conditionId);
  const condition = getConditionById(conditionId);

  // Categorize foods by meal suitability
  const byMeal = {};
  mealStructure.forEach(slot => { byMeal[slot] = []; });

  selectedFoods.forEach(food => {
    food.mealTimes.forEach(time => {
      const slot = time === "snack"
        ? (mealStructure.includes("morning_snack") ? "morning_snack" : null)
        : time;
      if (slot && byMeal[slot]) byMeal[slot].push(food);
    });

    if (food.mealTimes.includes("snack") && mealStructure.includes("afternoon_snack")) {
      byMeal["afternoon_snack"].push(food);
    }
  });

  // Ensure basics
  const water = selectedFoods.find(f => f.name === "Plain Water") ||
    FOODS_DATABASE.find(f => f.name === "Plain Water");

  const days = [];
  let prevBreakfast = null;
  let prevProtein = null;

  for (let i = 0; i < planDuration; i++) {
    const dayMeals = {};
    const dayNotes = [];

    mealStructure.forEach(slot => {
      const pool = shuffleArray(byMeal[slot] || []);

      if (slot === "breakfast") {
        const options = pool.filter(f => f.id !== prevBreakfast);
        const chosen = options.length ? options : pool;
        const mainItem = chosen[0];
        const extras = chosen.slice(1, 3);
        dayMeals[slot] = {
          foods: mainItem ? [mainItem.name, ...extras.map(e => e.name)] : ["Boiled Sweet Potato"],
          note: getBreakfastNote(conditionId)
        };
        prevBreakfast = mainItem?.id;

      } else if (slot === "lunch" || slot === "supper") {
        const staples = pool.filter(f => f.category === "Staples");
        const proteins = pool.filter(f =>
          (f.category === "Meat" || f.category === "Fish" || f.category === "Eggs & Legumes") &&
          f.id !== prevProtein
        );
        const veggies = shuffleArray(pool.filter(f =>
          f.category === "Leafy Veg" || f.category === "Vegetables"
        ));

        const staple = staples[0];
        const protein = proteins[0] || pool.find(f => f.category === "Eggs & Legumes");
        const veg1 = veggies[0];
        const veg2 = veggies[1];

        const foods = [];
        if (staple) foods.push(applyPortionNote(staple.name, conditionId));
        if (protein) foods.push(protein.name);
        if (veg1) foods.push(veg1.name);
        if (veg2 && slot === "supper") foods.push(veg2.name);
        if (water) foods.push("Plain Water");

        dayMeals[slot] = { foods: foods.length ? foods : ["Boiled Sweet Potato","Beans","Rape"], note: "" };
        if (protein) prevProtein = protein.id;

      } else if (slot === "morning_snack" || slot === "afternoon_snack") {
        const snacks = shuffleArray(pool.filter(f =>
          f.category === "Fruits" || f.category === "Traditional Snacks" ||
          f.category === "Dairy" || f.category === "Drinks"
        ));
        dayMeals[slot] = {
          foods: snacks.slice(0, 2).map(s => s.name).concat(water ? ["Plain Water"] : []),
          note: getSnackNote(conditionId)
        };
      }
    });

    applyConditionRules(dayMeals, selectedFoods, conditionId, i);

    days.push({
      dayNumber: i + 1,
      dayName: planDuration === 7 ? getDayName(i) : `Day ${i + 1}`,
      meals: dayMeals,
      nutritionNote: getDailyNote(conditionId, i)
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    conditionId,
    conditionName: condition?.name || "General",
    planDuration,
    days
  };
}

function applyPortionNote(foodName, conditionId) {
  if (conditionId === "diabetes_type2" || conditionId === "diabetes_type1") {
    if (foodName.toLowerCase().includes("nshima") || foodName.toLowerCase().includes("rice")) {
      return `${foodName} (½ cup portion)`;
    }
  }
  return foodName;
}

function applyConditionRules(dayMeals, selectedFoods, conditionId, dayIndex) {
  if (conditionId === "anaemia") {
    // Ensure iron + Vitamin C pairing in lunch
    const ironFoods = selectedFoods.filter(f => f.nutrients.iron === "high");
    const vitCFoods = selectedFoods.filter(f => f.nutrients.vitaminC === "high");
    if (ironFoods.length && vitCFoods.length && dayMeals.lunch) {
      if (!dayMeals.lunch.foods.some(f => ironFoods.find(i => i.name === f.replace(" (½ cup portion)",""))))
        dayMeals.lunch.foods.splice(1, 0, ironFoods[dayIndex % ironFoods.length].name);
      if (!dayMeals.lunch.foods.some(f => vitCFoods.find(v => v.name === f)))
        dayMeals.lunch.foods.push(vitCFoods[dayIndex % vitCFoods.length].name);
    }
  }

  if (conditionId === "diabetes_type2" || conditionId === "diabetes_type1") {
    const bitterMelon = selectedFoods.find(f => f.name === "Bitter Melon");
    const okra = selectedFoods.find(f => f.name === "Okra (Delele)");
    if ((bitterMelon || okra) && dayIndex % 2 === 0 && dayMeals.lunch) {
      const food = bitterMelon || okra;
      if (!dayMeals.lunch.foods.includes(food.name))
        dayMeals.lunch.foods.push(food.name);
    }
  }

  if (conditionId === "malnutrition") {
    const gnut = selectedFoods.find(f => f.name.includes("Groundnut") || f.name === "Peanut Butter");
    if (gnut && dayMeals.breakfast && !dayMeals.breakfast.foods.includes(gnut.name))
      dayMeals.breakfast.foods.push(gnut.name);
  }
}

function getBreakfastNote(conditionId) {
  const notes = {
    gastritis: "Soft, gentle breakfast. Eat slowly.",
    diabetes_type2: "Pair with protein to slow sugar absorption.",
    diabetes_type1: "Pair with protein. Time with insulin dose.",
    anaemia: "Do not take tea or coffee with this meal.",
    malnutrition: "Add groundnut powder or moringa to porridge."
  };
  return notes[conditionId] || "";
}

function getSnackNote(conditionId) {
  const notes = {
    diabetes_type2: "Keep snack small — one fruit or handful of nuts.",
    anaemia: "Pair with Vitamin C food (orange, guava) to boost iron.",
    kidney_disease: "Avoid high-potassium fruits like banana or orange.",
    osteoporosis: "Choose dairy snack for calcium."
  };
  return notes[conditionId] || "";
}

function getDailyNote(conditionId, dayIndex) {
  const notePool = {
    diabetes_type2: [
      "Today's plan balances carbohydrates with protein and fiber to keep blood sugar stable.",
      "Eat meals at the same time every day. Consistency controls blood sugar better than any single food.",
      "Drink 2 litres of water today. Dehydration raises blood sugar levels."
    ],
    hypertension: [
      "Cook today's relish without salt or stock cubes. Use fresh garlic and tomatoes for flavor.",
      "Today's plan includes potassium-rich foods that naturally lower blood pressure.",
      "Walk for 20 minutes today. Exercise is as powerful as medication for blood pressure."
    ],
    anaemia: [
      "Today includes iron-rich foods paired with Vitamin C for maximum absorption.",
      "Do not drink tea or coffee within 1 hour of your iron-rich meals today.",
      "Moringa added to any meal today provides iron, Vitamin C, and protein together."
    ],
    general: [
      "Today's plan provides all major food groups your body needs to stay healthy.",
      "Drink at least 8 glasses of water today.",
      "Variety is the most powerful nutrition strategy. Today includes 5 food groups."
    ]
  };
  const pool = notePool[conditionId] || notePool.general;
  return pool[dayIndex % pool.length];
}

// ── Display plan ──────────────────────────────────────────────────────────
export function renderPlanDisplay(plan) {
  const container = document.getElementById("plan-display");
  if (!container) return;
  container.classList.remove("hidden");

  const mealIcons = {
    breakfast: "☀️",
    morning_snack: "🍎",
    lunch: "🍽️",
    afternoon_snack: "🌤️",
    supper: "🌙"
  };

  const mealLabels = {
    breakfast: "Breakfast",
    morning_snack: "Morning Snack",
    lunch: "Lunch",
    afternoon_snack: "Afternoon Snack",
    supper: "Supper"
  };

  container.innerHTML = `
    <div class="plan-header">
      <h2>${plan.planDuration}-Day Meal Plan</h2>
      <p class="plan-meta">Personalized for: <strong>${plan.conditionName}</strong></p>
      <p class="plan-meta">Generated: ${formatDateShort(plan.generatedAt)}</p>
      <button class="btn-secondary" id="btn-new-plan">Generate New Plan</button>
    </div>
    <div class="days-container">
      ${plan.days.map(day => `
        <div class="day-card">
          <div class="day-header" onclick="this.parentElement.classList.toggle('expanded')">
            <span class="day-title">${day.dayName}</span>
            <span class="day-toggle">▼</span>
          </div>
          <div class="day-body">
            ${Object.entries(day.meals).map(([slot, meal]) => `
              <div class="meal-section">
                <div class="meal-title">${mealIcons[slot] || "🍴"} ${mealLabels[slot] || slot}</div>
                <ul class="meal-foods">
                  ${meal.foods.map(f => `<li>${f}</li>`).join("")}
                </ul>
                ${meal.note ? `<p class="meal-note">${meal.note}</p>` : ""}
              </div>
            `).join("")}
            <p class="day-nutrition-note">💡 ${day.nutritionNote}</p>
          </div>
        </div>
      `).join("")}
    </div>
    <div class="plan-summary-box">
      <h3>Plan Summary</h3>
      <p>This ${plan.planDuration}-day plan is personalized for <strong>${plan.conditionName}</strong>.</p>
      <p>Every meal uses real Zambian foods available at your local market.</p>
      <a href="clinic-finder.html" class="btn-primary">Find a Clinic Near You</a>
    </div>
  `;

  document.getElementById("btn-new-plan")?.addEventListener("click", () => {
    container.classList.add("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Open first day by default
  container.querySelector(".day-card")?.classList.add("expanded");
}

// ── History ───────────────────────────────────────────────────────────────
export async function loadPlanHistory() {
  if (!currentUser) return [];
  const q = query(
    collection(db, "mealPlans"),
    where("userId", "==", currentUser.uid),
    orderBy("createdAt", "desc"),
    limit(10)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function savePlanToFirestore(plan) {
  await addDoc(collection(db, "mealPlans"), {
    userId: currentUser.uid,
    plan,
    conditionId: plan.conditionId,
    planDuration: plan.planDuration,
    createdAt: serverTimestamp()
  });
}
