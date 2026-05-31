import { requireAuth, loadUserProfile, showToast } from "./utils.js";
import { icon } from "./icons.js";

const INGREDIENT_CATEGORIES = {
  "Staples": [
    { id:"maize_flour", name:"Maize Flour (Mealie Meal)", emoji:"🌽" },
    { id:"rice",        name:"Rice",                       emoji:"🍚" },
    { id:"sweet_potato",name:"Sweet Potato",               emoji:"🍠" },
    { id:"cassava",     name:"Cassava / Tapioca",          emoji:"🥔" },
    { id:"sorghum",     name:"Sorghum / Millet",           emoji:"🌾" },
    { id:"bread",       name:"Bread",                      emoji:"🍞" },
    { id:"plantain",    name:"Plantain (Cooking Banana)",  emoji:"🍌" },
  ],
  "Proteins": [
    { id:"tilapia",     name:"Fresh Fish (Tilapia/Bream)", emoji:"🐟" },
    { id:"kapenta",     name:"Kapenta (Dried Small Fish)", emoji:"🐠" },
    { id:"chicken",     name:"Chicken",                    emoji:"🍗" },
    { id:"eggs",        name:"Eggs",                       emoji:"🥚" },
    { id:"beans",       name:"Beans / Kidney Beans",       emoji:"🫘" },
    { id:"lentils",     name:"Lentils",                    emoji:"🟤" },
    { id:"groundnuts",  name:"Groundnuts / Peanuts",       emoji:"🥜" },
    { id:"soya",        name:"Soya Pieces",                emoji:"🟡" },
    { id:"beef",        name:"Beef / Goat Meat",           emoji:"🥩" },
  ],
  "Vegetables": [
    { id:"rape",    name:"Rape / Impwa / Chomolia",   emoji:"🥬" },
    { id:"cabbage", name:"Cabbage",                   emoji:"🥦" },
    { id:"tomatoes",name:"Tomatoes",                  emoji:"🍅" },
    { id:"onion",   name:"Onion",                     emoji:"🧅" },
    { id:"carrots", name:"Carrots",                   emoji:"🥕" },
    { id:"pumpkin", name:"Pumpkin / Chibwabwa Leaves",emoji:"🎃" },
    { id:"moringa", name:"Moringa Leaves",            emoji:"🌿" },
    { id:"okra",    name:"Okra (Delele)",             emoji:"🫑" },
    { id:"garlic",  name:"Garlic",                    emoji:"🧄" },
  ],
  "Fruits": [
    { id:"banana",  name:"Banana",          emoji:"🍌" },
    { id:"pawpaw",  name:"Pawpaw / Papaya", emoji:"🍈" },
    { id:"mango",   name:"Mango",           emoji:"🥭" },
    { id:"guava",   name:"Guava",           emoji:"🍐" },
    { id:"orange",  name:"Orange / Lemon",  emoji:"🍊" },
  ],
  "Dairy & Other": [
    { id:"milk",         name:"Fresh Milk",    emoji:"🥛" },
    { id:"yoghurt",      name:"Yoghurt",       emoji:"🫙" },
    { id:"peanut_butter",name:"Peanut Butter", emoji:"🥜" },
  ],
};

const CONDIMENTS = [
  { id:"cooking_oil", name:"Cooking Oil",      emoji:"🫙" },
  { id:"salt",        name:"Salt (Iodized)",   emoji:"🧂" },
  { id:"chili",       name:"Chili Pepper",     emoji:"🌶️" },
  { id:"ginger",      name:"Ginger",           emoji:"🫚" },
];

const RECIPES = [
  {
    name:"Classic Nshima with Bean Relish",
    description:"The cornerstone of Zambian nutrition — filling nshima with protein-rich beans.",
    time:"35 min", servings:4, difficulty:"Easy",
    requires:["maize_flour","beans"],
    optional:["tomatoes","onion","cooking_oil","salt"],
    nutrition:{ protein:"High", fiber:"High", carbs:"High" },
    steps:[
      "Bring 4 cups of water to a boil in a large pot.",
      "Slowly pour in maize flour while stirring continuously to avoid lumps.",
      "Stir vigorously for 8–10 minutes until the nshima is thick and pulls away from the pot sides.",
      "Cover and cook on very low heat 5 more minutes. Set aside.",
      "Soak beans overnight, then boil until very soft (45 min). Drain.",
      "Fry diced onion in oil until golden. Add chopped tomatoes and cook 3 minutes.",
      "Add cooked beans, season with salt. Simmer 10 minutes. Serve with nshima.",
    ],
    tip:"Add a handful of moringa leaves to the bean relish in the last 2 minutes for extra iron and vitamins.",
  },
  {
    name:"Nshima with Rape and Groundnut Sauce",
    description:"Classic rape relish enriched with crushed groundnuts for protein and healthy fat.",
    time:"30 min", servings:4, difficulty:"Easy",
    requires:["maize_flour","rape","groundnuts"],
    optional:["tomatoes","onion","cooking_oil"],
    nutrition:{ protein:"High", iron:"High", fiber:"High" },
    steps:[
      "Make nshima: boil 4 cups water, stir in maize flour, cook 8–10 minutes until thick.",
      "Roast groundnuts in a dry pan until golden. Grind or crush into coarse powder.",
      "Fry diced onion in oil until soft. Add chopped tomatoes and cook 3 minutes.",
      "Add washed, chopped rape. Cover and cook 5 minutes — do not overcook.",
      "Stir in groundnut powder and a splash of water to form a sauce. Season with salt.",
      "Serve hot with nshima.",
    ],
    tip:"Don't overcook rape — 5 minutes keeps its iron and vitamins intact.",
  },
  {
    name:"Scrambled Eggs with Tomatoes",
    description:"Quick, protein-rich eggs cooked with fresh tomatoes — perfect breakfast or supper.",
    time:"10 min", servings:2, difficulty:"Easy",
    requires:["eggs","tomatoes"],
    optional:["onion","cooking_oil","chili"],
    nutrition:{ protein:"High", vitaminC:"Moderate" },
    steps:[
      "Crack 3–4 eggs into a bowl, beat well with a fork. Season with a pinch of salt.",
      "Heat a small amount of oil in a pan. Fry diced onion until soft, about 2 minutes.",
      "Add chopped tomatoes and optional chili. Cook until tomatoes soften, about 3 minutes.",
      "Pour in beaten eggs. Stir continuously on medium heat until just set.",
      "Remove from heat while still slightly soft — they continue cooking from residual heat.",
    ],
    tip:"Serve with bread or boiled sweet potato for a complete protein + carb meal.",
  },
  {
    name:"Rice with Kapenta and Vegetables",
    description:"Rice topped with kapenta relish — cheap, fast, and loaded with calcium and protein.",
    time:"30 min", servings:4, difficulty:"Easy",
    requires:["rice","kapenta","tomatoes"],
    optional:["onion","cooking_oil","rape","moringa"],
    nutrition:{ protein:"High", calcium:"High", iron:"Moderate" },
    steps:[
      "Rinse rice until water runs clear. Cook in 2 cups water per 1 cup rice for 18 minutes, covered.",
      "Rinse kapenta in clean water, drain well.",
      "Fry diced onion in oil until golden. Add chopped tomatoes and cook 3 minutes.",
      "Add kapenta, stir gently. Cook for 5 minutes on medium heat.",
      "Add a handful of moringa or chopped rape in the last 2 minutes if available.",
      "Serve rice topped with kapenta relish.",
    ],
    tip:"Eat kapenta whole — the tiny bones are the richest natural calcium source in Zambia.",
  },
  {
    name:"Sweet Potato and Groundnut Porridge",
    description:"Nutritious sweet potato porridge enriched with groundnuts — excellent for children and adults.",
    time:"25 min", servings:3, difficulty:"Easy",
    requires:["sweet_potato","groundnuts"],
    optional:["milk","banana","ginger"],
    nutrition:{ protein:"Moderate", vitaminA:"High", energy:"High" },
    steps:[
      "Peel and dice sweet potato into small cubes.",
      "Boil sweet potato in 3 cups of water until very soft, about 15 minutes.",
      "Mash well or blend smooth. Add more water if too thick.",
      "Toast groundnuts in a dry pan until golden, then crush roughly.",
      "Stir groundnuts and a pinch of salt into the porridge.",
      "Optional: add a splash of milk and sliced banana. Serve warm.",
    ],
    tip:"Orange-flesh sweet potato provides a full day's Vitamin A in one serving.",
  },
  {
    name:"Bean and Vegetable Stew",
    description:"A hearty, affordable stew packed with protein, fiber, and iron.",
    time:"50 min", servings:4, difficulty:"Easy",
    requires:["beans","tomatoes","onion"],
    optional:["carrots","rape","moringa","cooking_oil","garlic"],
    nutrition:{ protein:"High", fiber:"High", iron:"High" },
    steps:[
      "Soak beans 4+ hours or overnight. Boil until soft, about 45 minutes. Drain.",
      "Fry diced onion and garlic in oil until soft and golden.",
      "Add chopped tomatoes. Cook until they break down, about 5 minutes.",
      "Add cooked beans and diced carrots if available. Season with salt.",
      "Simmer 15 minutes. Add chopped rape or moringa in the last 3 minutes.",
      "Serve as a stew with nshima, rice, or bread.",
    ],
    tip:"This stew gets better the next day — make a large pot and it feeds the family for two meals.",
  },
  {
    name:"Chicken and Vegetable Soup",
    description:"A warming, nourishing soup that's perfect for sick family members or a cold evening.",
    time:"50 min", servings:5, difficulty:"Medium",
    requires:["chicken","tomatoes","onion"],
    optional:["carrots","garlic","moringa","ginger","cabbage"],
    nutrition:{ protein:"High", vitaminC:"High" },
    steps:[
      "Cut chicken into pieces and season with salt.",
      "Brown chicken in a little oil in a large pot, turning until golden on all sides.",
      "Add diced onion and garlic, fry 2 minutes.",
      "Add chopped tomatoes and 5 cups of water. Bring to a boil.",
      "Add diced carrots and optional ginger. Cover, simmer 25 minutes.",
      "Add moringa or cabbage in the last 5 minutes. Adjust seasoning.",
    ],
    tip:"Add moringa leaves in the very last minute only — longer cooking destroys its nutrients.",
  },
  {
    name:"Soya Pieces with Tomato Relish",
    description:"Affordable, high-protein soya cooked in a rich tomato base — nshima's best companion.",
    time:"20 min", servings:3, difficulty:"Easy",
    requires:["soya","tomatoes","onion"],
    optional:["cooking_oil","garlic","chili","moringa"],
    nutrition:{ protein:"Very High", fiber:"Moderate" },
    steps:[
      "Soak soya pieces in hot water for 10 minutes until soft. Drain and press out water.",
      "Fry diced onion in oil until soft. Add garlic and chili if using.",
      "Add chopped tomatoes. Cook 4 minutes until soft.",
      "Add drained soya pieces. Stir and cook 8 minutes until flavours blend.",
      "Season with salt. Add moringa leaves in the last minute.",
    ],
    tip:"Soya has more protein than beef at a fraction of the price — use it 3+ times a week.",
  },
  {
    name:"Moringa Egg Omelette",
    description:"A nutritional powerhouse omelette combining eggs and moringa — fast and very healthy.",
    time:"10 min", servings:2, difficulty:"Easy",
    requires:["eggs","moringa"],
    optional:["tomatoes","onion","cooking_oil"],
    nutrition:{ protein:"High", iron:"High", vitaminA:"High" },
    steps:[
      "Beat 3–4 eggs with a pinch of salt.",
      "Wash and finely chop fresh moringa leaves.",
      "Heat a little oil in a pan. Fry diced onion 1–2 minutes.",
      "Add chopped tomatoes if using. Cook 2 minutes.",
      "Pour in beaten eggs. Scatter moringa leaves evenly on top.",
      "Cook on medium heat until edges set, then fold in half. Serve hot.",
    ],
    tip:"This single omelette provides iron, Vitamin A, Vitamin C, and complete protein — one of the most nutritious quick meals you can make.",
  },
  {
    name:"Kapenta and Groundnut Stew",
    description:"A rich, nutritious stew combining kapenta and groundnuts — an affordable superfood combination.",
    time:"25 min", servings:4, difficulty:"Easy",
    requires:["kapenta","groundnuts","tomatoes"],
    optional:["onion","cooking_oil","chili","moringa"],
    nutrition:{ protein:"High", calcium:"High", iron:"High" },
    steps:[
      "Rinse kapenta and drain well.",
      "Roast or crush groundnuts into a coarse paste or rough pieces.",
      "Fry onion in oil until golden. Add tomatoes, cook 3 minutes.",
      "Add kapenta and groundnuts. Stir gently.",
      "Add half a cup of water. Simmer 10 minutes on low heat.",
      "Add moringa in last 2 minutes. Season with salt.",
    ],
    tip:"This combination covers protein, calcium, iron, and healthy fats in one affordable pot.",
  },
  {
    name:"Sweet Potato and Bean Curry",
    description:"A sweet and hearty one-pot meal that's both filling and nutritious.",
    time:"45 min", servings:4, difficulty:"Medium",
    requires:["sweet_potato","beans"],
    optional:["tomatoes","onion","garlic","ginger","cooking_oil","chili"],
    nutrition:{ protein:"High", vitaminA:"High", fiber:"High" },
    steps:[
      "Boil pre-soaked beans until just tender (about 40 min). Drain.",
      "Peel and cube sweet potato. Boil until just tender, about 10 minutes.",
      "Fry diced onion, garlic, and ginger in oil until fragrant.",
      "Add chopped tomatoes and chili. Cook 4 minutes.",
      "Add beans and sweet potato cubes. Stir to combine.",
      "Add a cup of water and simmer 15 minutes until sauce thickens. Season well.",
    ],
    tip:"Serve with a squeeze of orange or a side of guava to boost iron absorption from the beans.",
  },
  {
    name:"Lentil and Rice Kitchiri",
    description:"A fast, nutritious one-pot meal using lentils and rice — no soaking required.",
    time:"30 min", servings:4, difficulty:"Easy",
    requires:["rice","lentils"],
    optional:["onion","garlic","ginger","cooking_oil","carrots","chili"],
    nutrition:{ protein:"High", fiber:"High", iron:"Moderate" },
    steps:[
      "Rinse rice and lentils separately.",
      "Fry diced onion, garlic, and ginger in oil until golden.",
      "Add lentils and stir for 2 minutes.",
      "Add rice, then 4 cups of water. Bring to a boil.",
      "Reduce heat, cover and cook 20 minutes until both are soft.",
      "Stir in diced carrots in the last 10 minutes. Season generously.",
    ],
    tip:"Lentils cook faster than beans and need no soaking — great for quick nutritious meals.",
  },
  {
    name:"Groundnut Soup",
    description:"The classic Zambian groundnut soup — rich, protein-packed, and deeply satisfying.",
    time:"35 min", servings:4, difficulty:"Medium",
    requires:["groundnuts","tomatoes","onion"],
    optional:["chicken","kapenta","rape","cooking_oil","chili"],
    nutrition:{ protein:"High", fat:"Healthy" },
    steps:[
      "Toast groundnuts until golden. Grind to a fine paste or use peanut butter.",
      "Fry diced onion until soft. Add chopped tomatoes and cook 5 minutes.",
      "Add 3 cups of water and bring to a boil.",
      "Stir in groundnut paste until smooth. Add chili if using.",
      "If using chicken or kapenta, add now. Simmer 20 minutes.",
      "Season with salt. Add chopped rape in last 5 minutes.",
    ],
    tip:"Groundnut soup with chicken and rape is one of the most complete, nutritionally balanced meals in Zambian cuisine.",
  },
  {
    name:"Pawpaw and Banana Smoothie",
    description:"A quick nutritious drink packed with Vitamins A, C, and potassium.",
    time:"5 min", servings:2, difficulty:"Easy",
    requires:["pawpaw","banana"],
    optional:["milk","yoghurt","orange"],
    nutrition:{ vitaminA:"High", vitaminC:"High", potassium:"High" },
    steps:[
      "Peel and chop pawpaw and banana into chunks.",
      "Blend with milk or yoghurt until smooth.",
      "Add a squeeze of orange juice if available.",
      "Serve immediately — nutrients degrade quickly after blending.",
    ],
    tip:"This drink provides Vitamins A, C, potassium, and energy — excellent for children and recovering patients.",
  },
  {
    name:"Carrot and Pumpkin Soup",
    description:"A vibrant, Vitamin A-rich soup perfect for children and the whole family.",
    time:"25 min", servings:4, difficulty:"Easy",
    requires:["carrots","pumpkin"],
    optional:["onion","garlic","ginger","milk","cooking_oil"],
    nutrition:{ vitaminA:"Very High", fiber:"Moderate" },
    steps:[
      "Peel and roughly chop carrots and pumpkin.",
      "Fry onion and garlic in oil until soft.",
      "Add carrots and pumpkin. Stir and cook 3 minutes.",
      "Add 3 cups of water and ginger. Bring to boil, simmer 15 minutes.",
      "Blend smooth. Stir in milk for creaminess. Season with salt.",
    ],
    tip:"Orange vegetables cooked with a little oil greatly improve Vitamin A absorption.",
  },
  {
    name:"Cassava with Fish and Tomato Relish",
    description:"Boiled cassava served with fresh fried fish in tomato sauce.",
    time:"35 min", servings:3, difficulty:"Easy",
    requires:["cassava","tilapia","tomatoes"],
    optional:["onion","garlic","cooking_oil","chili"],
    nutrition:{ protein:"High", energy:"High" },
    steps:[
      "Peel cassava, cut into chunks, boil 20 minutes until soft. Drain.",
      "Clean and score the fish. Season with salt.",
      "Fry fish in a little oil until golden on both sides, about 5 minutes each.",
      "In the same pan fry onion, add tomatoes and garlic. Cook 5 minutes.",
      "Return fish to pan. Simmer in the tomato sauce 5 minutes.",
      "Serve fish and relish alongside boiled cassava.",
    ],
    tip:"Don't eat very large amounts of cassava at once — it contains natural compounds that can cause stomach discomfort in excess.",
  },
  {
    name:"Okra (Delele) Relish with Nshima",
    description:"Slippery okra stew — a traditional Zambian dish that supports digestion and blood sugar control.",
    time:"20 min", servings:4, difficulty:"Easy",
    requires:["maize_flour","okra","tomatoes"],
    optional:["onion","kapenta","cooking_oil"],
    nutrition:{ fiber:"High", vitaminC:"Moderate" },
    steps:[
      "Make nshima: boil water, stir in flour gradually, cook 8–10 min until thick.",
      "Wash and chop okra into rounds. Slice tomatoes and onion.",
      "Fry onion in a little oil. Add tomatoes, cook 3 minutes.",
      "Add okra. Stir gently and cook 8 minutes — the natural slime will thicken the sauce.",
      "Add kapenta if available. Season with salt.",
      "Serve immediately with nshima.",
    ],
    tip:"Okra (delele) is excellent for managing blood sugar and has good fiber for digestion.",
  },
];

let availableIngredients = new Set();
let expandedRecipe = null;

export async function initCookWithPage() {
  try {
    await requireAuth();
    renderIngredientSelector();
    renderRecipeResults();
  } catch (e) { /* redirected */ }
}

function renderIngredientSelector() {
  const container = document.getElementById("ingredient-selector");
  if (!container) return;

  let html = `
    <div class="cw-intro">
      <p>Select the ingredients you have at home. The app will show you all the meals you can cook right now.</p>
    </div>
    <div class="cw-condiments">
      <span class="cw-condiment-label">${icon("info",13)} Condiments available:</span>
      ${CONDIMENTS.map(c => `
        <label class="cw-condiment-chip">
          <input type="checkbox" value="${c.id}" class="cw-condiment-cb" checked>
          ${c.emoji} ${c.name}
        </label>
      `).join("")}
    </div>
  `;

  Object.entries(INGREDIENT_CATEGORIES).forEach(([cat, items]) => {
    html += `
      <div class="cw-category">
        <button class="cw-cat-header" type="button">
          <span class="cw-cat-name">${cat}</span>
          <span class="cw-cat-count" id="count-${cat.replace(/\s/g,"-")}">0 selected</span>
          <span class="cw-cat-arrow">▼</span>
        </button>
        <div class="cw-cat-body expanded">
          <div class="cw-ingredient-grid">
            ${items.map(item => `
              <label class="cw-ingredient-chip" data-id="${item.id}">
                <input type="checkbox" value="${item.id}" class="cw-ingredient-cb">
                <span class="cw-ing-emoji">${item.emoji}</span>
                <span class="cw-ing-name">${item.name}</span>
              </label>
            `).join("")}
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll(".cw-cat-header").forEach(btn => {
    btn.addEventListener("click", () => {
      const body = btn.nextElementSibling;
      const arrow = btn.querySelector(".cw-cat-arrow");
      body.classList.toggle("expanded");
      arrow.style.transform = body.classList.contains("expanded") ? "rotate(0deg)" : "rotate(-90deg)";
    });
  });

  container.querySelectorAll(".cw-ingredient-cb").forEach(cb => {
    cb.addEventListener("change", () => {
      if (cb.checked) availableIngredients.add(cb.value);
      else availableIngredients.delete(cb.value);
      updateCategoryCount(cb);
      renderRecipeResults();
    });
  });

  container.querySelectorAll(".cw-condiment-cb").forEach(cb => {
    cb.addEventListener("change", () => {
      if (cb.checked) availableIngredients.add(cb.value);
      else availableIngredients.delete(cb.value);
      renderRecipeResults();
    });
  });

  CONDIMENTS.forEach(c => availableIngredients.add(c.id));
}

function updateCategoryCount(cb) {
  const grid = cb.closest(".cw-ingredient-grid");
  const cat = cb.closest(".cw-category");
  if (!grid || !cat) return;
  const count = grid.querySelectorAll("input:checked").length;
  const catName = cat.querySelector(".cw-cat-name")?.textContent?.replace(/\s/g,"-") || "";
  const countEl = document.getElementById(`count-${catName}`);
  if (countEl) countEl.textContent = count > 0 ? `${count} selected` : "0 selected";
}

function matchRecipes() {
  return RECIPES.map(r => {
    const hasAll = r.requires.every(id => availableIngredients.has(id));
    if (!hasAll) return null;
    const optionalCount = (r.optional || []).filter(id => availableIngredients.has(id)).length;
    return { ...r, matchScore: optionalCount };
  })
  .filter(Boolean)
  .sort((a, b) => b.matchScore - a.matchScore);
}

function renderRecipeResults() {
  const container = document.getElementById("recipe-results");
  const counterEl = document.getElementById("recipe-counter");
  if (!container) return;

  const matched = matchRecipes();

  if (counterEl) {
    counterEl.textContent = matched.length > 0
      ? `${matched.length} recipe${matched.length !== 1 ? "s" : ""} you can cook now`
      : "Select ingredients to see matching recipes";
  }

  if (matched.length === 0) {
    const totalSelected = [...availableIngredients].filter(id =>
      !CONDIMENTS.find(c => c.id === id)
    ).length;

    container.innerHTML = `
      <div class="cw-empty">
        <div class="cw-empty-icon">🍳</div>
        ${totalSelected === 0
          ? `<p>Select ingredients above to see what you can cook.</p>`
          : `<p>No complete recipes match your current ingredients.</p>
             <p class="cw-empty-sub">Try adding more staples (maize flour, rice) or proteins (eggs, beans, kapenta) to unlock recipes.</p>`
        }
      </div>`;
    return;
  }

  const difficultyColors = { Easy:"#0D9954", Medium:"#E65100", Hard:"#DC2626" };
  const nutritionColors = {
    "Very High":"#0D9954","High":"#1565C0","Moderate":"#E65100",
    "Low":"#9E9E9E","Healthy":"#0D9954"
  };

  container.innerHTML = matched.map((r, i) => `
    <div class="cw-recipe-card" id="recipe-${i}">
      <div class="cw-recipe-header" onclick="toggleRecipe(${i})">
        <div class="cw-recipe-meta">
          <span class="cw-recipe-difficulty" style="color:${difficultyColors[r.difficulty]||"#666"};">${r.difficulty}</span>
          <span class="cw-recipe-time">⏱ ${r.time}</span>
          <span class="cw-recipe-servings">🍽 ${r.servings} servings</span>
        </div>
        <h3 class="cw-recipe-name">${r.name}</h3>
        <p class="cw-recipe-desc">${r.description}</p>
        <div class="cw-nutrition-pills">
          ${Object.entries(r.nutrition).map(([k,v]) => `
            <span class="cw-nut-pill" style="background:${nutritionColors[v]||"#9E9E9E"}18;color:${nutritionColors[v]||"#666"};border:1px solid ${nutritionColors[v]||"#ccc"}30;">
              ${formatNutrientKey(k)}: ${v}
            </span>
          `).join("")}
        </div>
        <span class="cw-expand-hint" id="hint-${i}">Tap to see recipe ▼</span>
      </div>
      <div class="cw-recipe-body hidden" id="body-${i}">
        <div class="cw-ingredients-section">
          <div class="cw-ing-col">
            <h4>You Need (Required)</h4>
            <ul>${r.requires.map(id => {
              const item = findIngredient(id);
              return item ? `<li>${item.emoji} ${item.name}</li>` : "";
            }).join("")}</ul>
          </div>
          ${r.optional?.length ? `
            <div class="cw-ing-col">
              <h4>Optional Extras</h4>
              <ul>${r.optional.map(id => {
                const item = findIngredient(id);
                const have = availableIngredients.has(id);
                return item ? `<li class="${have ? "have-it" : "dont-have"}">${item.emoji} ${item.name}${have ? " ✓" : ""}</li>` : "";
              }).join("")}</ul>
            </div>
          ` : ""}
        </div>
        <div class="cw-steps">
          <h4>Steps</h4>
          <ol>${r.steps.map(s => `<li>${s}</li>`).join("")}</ol>
        </div>
        <div class="cw-tip-box">
          ${icon("info",15)} <span>${r.tip}</span>
        </div>
      </div>
    </div>
  `).join("");

  window.toggleRecipe = (i) => {
    const body = document.getElementById(`body-${i}`);
    const hint = document.getElementById(`hint-${i}`);
    if (!body) return;
    const isOpen = !body.classList.contains("hidden");
    body.classList.toggle("hidden");
    if (hint) hint.textContent = isOpen ? "Tap to see recipe ▼" : "Tap to hide ▲";
  };
}

function findIngredient(id) {
  const allC = CONDIMENTS.find(c => c.id === id);
  if (allC) return allC;
  for (const items of Object.values(INGREDIENT_CATEGORIES)) {
    const found = items.find(i => i.id === id);
    if (found) return found;
  }
  return null;
}

function formatNutrientKey(key) {
  const map = {
    protein:"Protein", fiber:"Fiber", carbs:"Carbs", vitaminA:"Vit A",
    vitaminC:"Vit C", calcium:"Calcium", iron:"Iron", energy:"Energy",
    potassium:"Potassium", fat:"Fat",
  };
  return map[key] || key;
}
