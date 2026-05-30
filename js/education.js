import { auth, db } from "./firebase-config.js";
import { requireAuth, loadUserProfile } from "./utils.js";
import { CONDITIONS, getConditionById } from "./conditions.js";
import { getForbiddenFoodsForCondition, getRecommendedFoodsForCondition } from "./foods-database.js";

let userProfile = null;

export async function initEducationPage() {
  try {
    const user = await requireAuth();
    userProfile = await loadUserProfile(user.uid);
    renderConditionGrid();
    handleHashNavigation();
  } catch (e) { /* redirected */ }
}

function renderConditionGrid() {
  const grid = document.getElementById("condition-grid");
  if (!grid) return;
  grid.innerHTML = "";
  CONDITIONS.forEach(cond => {
    const isUserCondition = userProfile && userProfile.condition === cond.id;
    const card = document.createElement("div");
    card.className = "condition-card" + (isUserCondition ? " user-condition" : "");
    card.style.setProperty("--condition-color", cond.color);
    card.innerHTML = `
      <div class="condition-icon-circle" style="background:${cond.color}"><span>${cond.shortName.slice(0,2).toUpperCase()}</span></div>
      <div class="condition-card-body">
        <h3>${cond.name}</h3>
        <p class="condition-tagline">${cond.zambian_tip.slice(0,60)}...</p>
        <span class="meals-badge">${cond.mealsPerDay} meals/day</span>
        ${isUserCondition ? '<span class="your-condition-badge">Your Condition</span>' : ""}
      </div>
      <span class="condition-arrow">›</span>`;
    card.addEventListener("click", () => showConditionDetail(cond.id));
    grid.appendChild(card);
  });
}

function showConditionDetail(conditionId) {
  const cond = getConditionById(conditionId);
  if (!cond) return;
  const isUserCondition = userProfile && userProfile.condition === conditionId;
  const recommended = getRecommendedFoodsForCondition(conditionId).slice(0, 12);
  const forbidden = getForbiddenFoodsForCondition(conditionId).slice(0, 12);
  const panel = document.getElementById("condition-detail");
  if (!panel) return;
  panel.innerHTML = `
    <div class="detail-header" style="background:${cond.color}">
      <button class="btn-back" id="btn-back-detail">← All Conditions</button>
      <h2>${cond.name}</h2>
      <span class="meals-badge-lg">${cond.mealsPerDay} meals per day</span>
    </div>
    <div class="detail-body">
      ${isUserCondition ? `<div class="personalized-banner"><strong>This is YOUR condition.</strong> Your meal plan is already personalized for this.</div>` : ""}
      <section class="detail-section"><h3>What Is It?</h3><p>${cond.description}</p></section>
      <section class="detail-section"><h3>How Poor Diet Causes It</h3><p>${cond.howDietCausesIt}</p></section>
      <section class="detail-section"><h3>Zambian Foods That Help</h3>
        <div class="food-grid-sm">${recommended.map(f=>`<div class="food-chip food-chip-green"><span>${f.icon||"🌿"}</span><span>${f.name}</span><small>${f.localName}</small></div>`).join("")||"<p>General balanced diet recommended.</p>"}</div>
      </section>
      <section class="detail-section"><h3>Foods to Avoid</h3>
        <div class="food-grid-sm">${forbidden.map(f=>`<div class="food-chip food-chip-red"><span>${f.icon||"🚫"}</span><span>${f.name}</span><small>${f.localName}</small></div>`).join("")||"<p>No specific foods to avoid.</p>"}</div>
      </section>
      <section class="detail-section"><h3>Warning Signs</h3><p>${cond.warningSignsText}</p></section>
      <section class="detail-section tip-box"><h3>Daily Prevention Tip</h3><p>${cond.zambian_tip}</p></section>
      <section class="detail-section warning-box"><h3>When to See a Doctor</h3><p>${cond.whenToSeeDoctor}</p></section>
      <div class="detail-actions">
        <a href="meal-planner.html" class="btn-primary">Open Meal Planner</a>
        <a href="bmi-calculator.html" class="btn-secondary">Check Your BMI</a>
      </div>
    </div>`;
  document.getElementById("condition-grid-section").classList.add("hidden");
  panel.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
  document.getElementById("btn-back-detail")?.addEventListener("click", () => {
    panel.classList.add("hidden");
    document.getElementById("condition-grid-section").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function handleHashNavigation() {
  if (window.location.hash) showConditionDetail(window.location.hash.slice(1));
}
