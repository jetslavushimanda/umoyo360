import { requireAuth } from "./utils.js";
import { icon } from "./icons.js";

// Approximate 2024 Zambia retail prices (ZMW per serving for ~4 people)
const FOODS = [
  // id, name, emoji, pricePerServing, cal/serving(4ppl), nutrition tags, category
  { id:"maize_flour",  name:"Nshima (Maize Meal)",          emoji:"🌽", price:6,  cal:320, tags:["carbs","energy"],                   cat:"Staple" },
  { id:"rice",         name:"Rice",                          emoji:"🍚", price:12, cal:280, tags:["carbs","energy"],                   cat:"Staple" },
  { id:"sweet_potato", name:"Boiled Sweet Potato",           emoji:"🍠", price:8,  cal:220, tags:["carbs","vitaminA","energy"],         cat:"Staple" },
  { id:"cassava",      name:"Boiled Cassava",                emoji:"🥔", price:7,  cal:200, tags:["carbs","energy"],                   cat:"Staple" },
  { id:"bread",        name:"Bread (4 slices)",              emoji:"🍞", price:10, cal:240, tags:["carbs","energy"],                   cat:"Staple" },
  { id:"kapenta",      name:"Kapenta (Dried Fish)",          emoji:"🐠", price:22, cal:120, tags:["protein","iron","calcium"],          cat:"Protein" },
  { id:"beans",        name:"Beans Relish",                  emoji:"🫘", price:18, cal:180, tags:["protein","fiber","iron","folate"],   cat:"Protein" },
  { id:"eggs",         name:"Eggs (2 eggs each)",            emoji:"🥚", price:16, cal:140, tags:["protein","vitaminA","iron"],         cat:"Protein" },
  { id:"soya",         name:"Soya Pieces",                   emoji:"🟡", price:14, cal:130, tags:["protein","fiber"],                  cat:"Protein" },
  { id:"lentils",      name:"Lentil Relish",                 emoji:"🟤", price:16, cal:160, tags:["protein","fiber","iron","folate"],   cat:"Protein" },
  { id:"groundnuts",   name:"Groundnuts (handful each)",     emoji:"🥜", price:12, cal:160, tags:["protein","fat","energy"],            cat:"Protein" },
  { id:"rape",         name:"Rape / Chomolia",               emoji:"🥬", price:7,  cal:40,  tags:["iron","folate","vitaminC","fiber"],  cat:"Vegetable" },
  { id:"cabbage",      name:"Cabbage",                       emoji:"🥦", price:8,  cal:30,  tags:["vitaminC","fiber"],                  cat:"Vegetable" },
  { id:"tomatoes",     name:"Tomatoes (3 pieces)",           emoji:"🍅", price:7,  cal:25,  tags:["vitaminC"],                         cat:"Condiment" },
  { id:"onion",        name:"Onion (1 large)",               emoji:"🧅", price:5,  cal:15,  tags:["flavor"],                           cat:"Condiment" },
  { id:"carrots",      name:"Carrots",                       emoji:"🥕", price:8,  cal:35,  tags:["vitaminA","fiber"],                  cat:"Vegetable" },
  { id:"pumpkin",      name:"Pumpkin / Chibwabwa",           emoji:"🎃", price:7,  cal:40,  tags:["vitaminA","fiber"],                  cat:"Vegetable" },
  { id:"moringa",      name:"Moringa Leaves",                emoji:"🌿", price:8,  cal:35,  tags:["iron","vitaminA","calcium","folate"], cat:"Vegetable" },
  { id:"banana",       name:"Banana (1 each)",               emoji:"🍌", price:7,  cal:90,  tags:["potassium","energy","vitaminB6"],    cat:"Fruit" },
  { id:"guava",        name:"Guava (2 each)",                emoji:"🍐", price:5,  cal:40,  tags:["vitaminC"],                          cat:"Fruit" },
  { id:"pawpaw",       name:"Pawpaw (1 slice each)",         emoji:"🍈", price:7,  cal:50,  tags:["vitaminA","vitaminC"],               cat:"Fruit" },
  { id:"cooking_oil",  name:"Cooking Oil (per meal)",        emoji:"🫙", price:3,  cal:80,  tags:["fat","energy"],                     cat:"Condiment" },
  { id:"salt",         name:"Salt (iodized)",                emoji:"🧂", price:1,  cal:0,   tags:["iodine"],                            cat:"Condiment" },
  { id:"milk",         name:"Fresh Milk (glass each)",       emoji:"🥛", price:18, cal:120, tags:["calcium","protein"],                 cat:"Dairy" },
  { id:"yoghurt",      name:"Yoghurt (small cup each)",      emoji:"🫙", price:15, cal:100, tags:["calcium","protein"],                 cat:"Dairy" },
];

// Meal templates: [required food ids, bonus food ids, meal label, meal type]
const MEAL_TEMPLATES = [
  { name:"Nshima + Bean Relish", required:["maize_flour","beans","tomatoes","onion","cooking_oil","salt"], bonus:["rape","moringa","guava"], type:"lunch" },
  { name:"Nshima + Kapenta + Rape", required:["maize_flour","kapenta","rape","tomatoes","cooking_oil","salt"], bonus:["onion","moringa","guava"], type:"lunch" },
  { name:"Rice + Soya Pieces", required:["rice","soya","tomatoes","onion","cooking_oil","salt"], bonus:["rape","moringa"], type:"lunch" },
  { name:"Nshima + Egg Relish + Rape", required:["maize_flour","eggs","rape","tomatoes","cooking_oil","salt"], bonus:["onion","moringa"], type:"lunch" },
  { name:"Nshima + Lentil Relish", required:["maize_flour","lentils","tomatoes","onion","cooking_oil","salt"], bonus:["rape","carrots"], type:"lunch" },
  { name:"Sweet Potato + Beans", required:["sweet_potato","beans","tomatoes","cooking_oil","salt"], bonus:["rape","onion"], type:"lunch" },
  { name:"Bread + Groundnuts + Banana", required:["bread","groundnuts","banana"], bonus:["guava","milk"], type:"breakfast" },
  { name:"Sorghum Porridge + Egg", required:["maize_flour","eggs","salt"], bonus:["banana","moringa","milk"], type:"breakfast" },
  { name:"Boiled Sweet Potato + Groundnuts", required:["sweet_potato","groundnuts","salt"], bonus:["banana","guava"], type:"breakfast" },
  { name:"Banana + Groundnuts", required:["banana","groundnuts"], bonus:["guava","yoghurt"], type:"snack" },
  { name:"Guava + Bread", required:["guava","bread"], bonus:["groundnuts"], type:"snack" },
  { name:"Pawpaw", required:["pawpaw"], bonus:["yoghurt","banana"], type:"snack" },
  { name:"Kapenta + Cabbage + Rice", required:["rice","kapenta","cabbage","cooking_oil","salt"], bonus:["tomatoes","onion","moringa"], type:"supper" },
  { name:"Cassava + Bean Relish", required:["cassava","beans","tomatoes","cooking_oil","salt"], bonus:["rape","onion"], type:"supper" },
  { name:"Nshima + Pumpkin (Chibwabwa) + Kapenta", required:["maize_flour","pumpkin","kapenta","cooking_oil","salt"], bonus:["tomatoes","moringa"], type:"supper" },
];

const MEAL_SLOTS = ["breakfast","lunch","snack","supper"];
const MEAL_LABELS = { breakfast:"☀️ Breakfast", lunch:"🍽️ Lunch", snack:"🌤️ Snack", supper:"🌙 Supper" };

function getFoodById(id) { return FOODS.find(f => f.id === id); }

function getMealCost(template) {
  return [...template.required, ...template.bonus]
    .map(id => getFoodById(id)?.price || 0)
    .reduce((a,b) => a+b, 0);
}

function getNutritionScore(foodIds) {
  const tags = new Set();
  foodIds.forEach(id => getFoodById(id)?.tags.forEach(t => tags.add(t)));
  return tags.size;
}

function buildDayPlan(dailyBudget) {
  const budgetPerSlot = { breakfast: 0.2, lunch: 0.4, snack: 0.1, supper: 0.3 };
  const plan = {};
  let totalUsed = 0;

  MEAL_SLOTS.forEach(slot => {
    const slotBudget = dailyBudget * budgetPerSlot[slot];
    const options = MEAL_TEMPLATES
      .filter(t => t.type === slot)
      .map(t => {
        const reqCost = t.required.map(id => getFoodById(id)?.price || 0).reduce((a,b)=>a+b,0);
        const bonusFoods = t.bonus.filter(id => {
          const food = getFoodById(id);
          return food && reqCost + food.price <= slotBudget;
        });
        const totalCost = reqCost + bonusFoods.map(id => getFoodById(id)?.price || 0).reduce((a,b)=>a+b,0);
        const allFoods = [...t.required, ...bonusFoods];
        return { ...t, bonusFoods, totalCost, allFoods, nutritionScore: getNutritionScore(allFoods) };
      })
      .filter(t => t.totalCost <= slotBudget * 1.2)
      .sort((a,b) => b.nutritionScore - a.nutritionScore || a.totalCost - b.totalCost);

    if (options.length > 0) {
      const chosen = options[0];
      plan[slot] = chosen;
      totalUsed += chosen.totalCost;
    }
  });

  return { plan, totalUsed };
}

function getNutritionSummary(plan) {
  const allTags = new Set();
  Object.values(plan).forEach(meal => meal.allFoods.forEach(id => getFoodById(id)?.tags.forEach(t => allTags.add(t))));
  const key = ["protein","iron","vitaminA","vitaminC","calcium","fiber","iodine"];
  return key.map(t => ({ tag:t, present: allTags.has(t) }));
}

export async function initMealBudgetPage() {
  try {
    await requireAuth();
    setupForm();
  } catch {}
}

function setupForm() {
  const form = document.getElementById("budget-form");
  if (!form) return;

  document.getElementById("budget-range")?.addEventListener("input", e => {
    const v = e.target.value;
    const display = document.getElementById("budget-display");
    if (display) display.textContent = `K${v}`;
  });

  form.addEventListener("submit", e => {
    e.preventDefault();
    const budget = parseInt(document.getElementById("budget-range").value, 10);
    const size   = parseInt(document.getElementById("family-size").value, 10);
    const perPerson = budget / size;
    generatePlan(budget, size, perPerson);
  });
}

function generatePlan(budget, size, perPerson) {
  const { plan, totalUsed } = buildDayPlan(budget);
  const nutrition = getNutritionSummary(plan);
  const container = document.getElementById("plan-result");
  if (!container) return;

  const remaining = budget - totalUsed;
  const tagLabels = { protein:"Protein", iron:"Iron", vitaminA:"Vit A", vitaminC:"Vit C", calcium:"Calcium", fiber:"Fiber", iodine:"Iodine" };

  container.innerHTML = `
    <div class="mb-result-header">
      <div class="mb-budget-summary">
        <div class="mb-budget-item"><span class="mb-budget-num">K${budget}</span><span class="mb-budget-lbl">Daily Budget</span></div>
        <div class="mb-budget-item"><span class="mb-budget-num">${size}</span><span class="mb-budget-lbl">Family Size</span></div>
        <div class="mb-budget-item"><span class="mb-budget-num">K${Math.round(totalUsed)}</span><span class="mb-budget-lbl">Estimated Cost</span></div>
        <div class="mb-budget-item"><span class="mb-budget-num" style="color:${remaining>=0?"var(--accent-green)":"var(--accent-red)"};">K${Math.abs(Math.round(remaining))}</span><span class="mb-budget-lbl">${remaining>=0?"Remaining":"Over budget"}</span></div>
      </div>
      <div class="mb-nutrition-pills">
        ${nutrition.map(n => `<span class="mb-nut-pill ${n.present?"mb-nut-yes":"mb-nut-no"}">${n.present?"✓":""} ${tagLabels[n.tag]}</span>`).join("")}
      </div>
    </div>

    ${MEAL_SLOTS.map(slot => {
      const meal = plan[slot];
      if (!meal) return "";
      return `
        <div class="mb-meal-card">
          <div class="mb-meal-header">
            <span class="mb-meal-name">${MEAL_LABELS[slot]} &nbsp;—&nbsp; <strong>${meal.name}</strong></span>
            <span class="mb-meal-cost">K${Math.round(meal.totalCost)}</span>
          </div>
          <div class="mb-food-list">
            ${meal.allFoods.map(id => {
              const food = getFoodById(id);
              if (!food) return "";
              return `<span class="mb-food-chip">${food.emoji} ${food.name} <em>K${food.price}</em></span>`;
            }).join("")}
          </div>
        </div>`;
    }).join("")}

    <div class="mb-tip-card">
      ${icon("info",15)}
      <div>
        <strong>Tip:</strong> Prices are approximate Lusaka market averages (2024). Prices vary by area and season.
        Buy maize meal and beans in bulk for the lowest cost per meal. Kapenta and soya pieces give the best protein value in Zambia.
      </div>
    </div>

    <div class="mb-nutrition-note">
      <strong>Nutritional rating:</strong> ${nutrition.filter(n=>n.present).length}/7 key nutrients covered in this day's plan.
      ${nutrition.filter(n=>!n.present).length > 0 ? `Missing: ${nutrition.filter(n=>!n.present).map(n=>tagLabels[n.tag]).join(", ")}. Increase your budget or add ${nutrition.filter(n=>!n.present).map(n=>n.tag==="vitaminC"?"guava":n.tag==="iron"?"moringa leaves":n.tag==="calcium"?"kapenta":n.tag==="iodine"?"iodized salt":"more vegetables").join(", ")}.` : ""}
    </div>
  `;

  container.classList.remove("hidden");
  container.scrollIntoView({ behavior:"smooth" });
}
