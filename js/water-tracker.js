import { auth, db } from "./firebase-config.js";
import { collection, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp, doc, updateDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { requireAuth, loadUserProfile, showToast, formatDateShort } from "./utils.js";
import { icon } from "./icons.js";

let currentUser = null;
let todayDoc = null;
let DAILY_GOAL = parseInt(localStorage.getItem("waterGoal") || "8", 10);
const today = new Date().toISOString().split("T")[0];

export async function initWaterTrackerPage() {
  try {
    currentUser = await requireAuth();
    await loadUserProfile(currentUser.uid);
    await loadToday();
    await loadWeekHistory();
    setupButtons();
  } catch (e) { /* redirected */ }
}

async function loadToday() {
  const docRef = doc(db, "waterLogs", `${currentUser.uid}_${today}`);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    todayDoc = { id: snap.id, ref: docRef, ...snap.data() };
  } else {
    todayDoc = { glasses: 0, goal: DAILY_GOAL, date: today, userId: currentUser.uid };
  }
  renderToday();
}

async function addGlass() {
  if (todayDoc.glasses >= 12) { showToast("Maximum 12 glasses logged per day."); return; }
  todayDoc.glasses += 1;
  renderToday();
  await saveToday();
  if (todayDoc.glasses === DAILY_GOAL) showToast("Goal reached! You drank your 8 glasses today!");
  await loadWeekHistory();
}

async function removeGlass() {
  if (todayDoc.glasses <= 0) return;
  todayDoc.glasses -= 1;
  renderToday();
  await saveToday();
  await loadWeekHistory();
}

async function saveToday() {
  const docRef = doc(db, "waterLogs", `${currentUser.uid}_${today}`);
  await setDoc(docRef, { userId: currentUser.uid, date: today, glasses: todayDoc.glasses, goal: DAILY_GOAL, updatedAt: serverTimestamp() }, { merge: true });
}

function renderToday() {
  const pct = Math.min((todayDoc.glasses / DAILY_GOAL) * 100, 100);
  const litres = (todayDoc.glasses * 0.25).toFixed(1);
  const remaining = Math.max(DAILY_GOAL - todayDoc.glasses, 0);
  const isComplete = todayDoc.glasses >= DAILY_GOAL;

  const el = document.getElementById("today-display");
  if (!el) return;

  el.innerHTML = `
    <div class="water-big-count" style="color:${isComplete ? "var(--accent-green)":"var(--primary)"};">
      ${todayDoc.glasses}<span class="water-big-unit"> / ${DAILY_GOAL}</span>
    </div>
    <div class="water-glasses-label">glasses today &nbsp;·&nbsp; ${litres} litres</div>

    <div class="water-circle-wrap">
      <svg viewBox="0 0 120 120" class="water-circle-svg">
        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" stroke-width="10"/>
        <circle cx="60" cy="60" r="52" fill="none" stroke="${isComplete?"#1E8449":"#2E86C1"}" stroke-width="10"
          stroke-dasharray="${2 * Math.PI * 52}" stroke-dashoffset="${2 * Math.PI * 52 * (1 - pct/100)}"
          stroke-linecap="round" transform="rotate(-90 60 60)" style="transition:stroke-dashoffset 0.5s ease;"/>
        <text x="60" y="64" text-anchor="middle" font-size="22" font-weight="900" fill="${isComplete?"#1E8449":"#1A5276"}">${Math.round(pct)}%</text>
      </svg>
    </div>

    <div class="water-cups-grid">
      ${Array.from({length:DAILY_GOAL}, (_, i) => `
        <div class="water-cup ${i < todayDoc.glasses ? "filled" : ""}">
          <svg viewBox="0 0 24 30" width="28" height="35">
            <path d="M4 2 L3 28 H21 L20 2 Z" fill="${i < todayDoc.glasses ? "#2E86C1":"var(--border)"}" stroke="none"/>
            <path d="M4 2 L20 2" stroke="${i < todayDoc.glasses?"#1A5276":"#C0C0C0"}" stroke-width="2" fill="none"/>
          </svg>
        </div>
      `).join("")}
    </div>

    ${isComplete
      ? `<div class="water-goal-complete">${icon("check",18)} Daily goal achieved! Great work!</div>`
      : `<div class="water-remaining">${remaining} more glass${remaining !== 1?"es":""} to reach your goal</div>`
    }
  `;
}

function updateGoalLabel() {
  const el = document.getElementById("goal-label");
  if (el) el.textContent = `Daily goal: ${DAILY_GOAL} glasses (${(DAILY_GOAL * 0.25).toFixed(1)} L)`;
}

function setupButtons() {
  document.getElementById("btn-add-glass")?.addEventListener("click", addGlass);
  document.getElementById("btn-remove-glass")?.addEventListener("click", removeGlass);
  updateGoalLabel();

  document.getElementById("btn-set-goal")?.addEventListener("click", () => {
    const val = parseInt(prompt(`Set daily water goal (4–16 glasses):\nCurrent goal: ${DAILY_GOAL} glasses`, DAILY_GOAL));
    if (val && val >= 4 && val <= 16) {
      DAILY_GOAL = val;
      localStorage.setItem("waterGoal", String(val));
      if (todayDoc) todayDoc.goal = val;
      updateGoalLabel();
      renderToday();
      showToast(`Goal updated to ${val} glasses (${(val * 0.25).toFixed(1)} L) per day.`);
    } else if (val) {
      showToast("Goal must be between 4 and 16 glasses.", "error");
    }
  });
}

async function loadWeekHistory() {
  const historyEl = document.getElementById("week-history");
  if (!historyEl) return;

  try {
    const q = query(collection(db,"waterLogs"), where("userId","==",currentUser.uid), orderBy("date","desc"), limit(7));
    const snap = await getDocs(q);
    const logs = snap.docs.map(d => d.data()).sort((a,b) => a.date < b.date ? -1 : 1);

    if (logs.length === 0) { historyEl.innerHTML = `<p style="color:var(--text-medium);font-size:0.875rem;text-align:center;padding:1rem;">No history yet. Start logging today!</p>`; return; }

    const streak = calculateStreak(logs);
    const avg = logs.length ? Math.round(logs.reduce((s,l)=>s+l.glasses,0)/logs.length) : 0;

    historyEl.innerHTML = `
      <div class="water-week-stats">
        <div class="water-week-stat"><span class="wws-val">${streak}</span><span class="wws-label">Day Streak</span></div>
        <div class="water-week-stat"><span class="wws-val">${avg}</span><span class="wws-label">Avg Glasses</span></div>
        <div class="water-week-stat"><span class="wws-val">${logs.filter(l=>l.glasses>=DAILY_GOAL).length}</span><span class="wws-label">Goals Met</span></div>
      </div>
      <div class="water-bar-chart">
        ${logs.map(l => {
          const h = Math.min((l.glasses / DAILY_GOAL) * 70, 70);
          const isGoal = l.glasses >= DAILY_GOAL;
          const dayLabel = new Date(l.date + "T00:00:00").toLocaleDateString("en-ZM", {weekday:"short"});
          return `<div class="water-bar-col">
            <div class="water-bar-value">${l.glasses}</div>
            <div class="water-bar-outer">
              <div class="water-bar-inner" style="height:${h}px;background:${isGoal?"#1E8449":"#2E86C1"};"></div>
            </div>
            <div class="water-bar-day">${dayLabel}</div>
          </div>`;
        }).join("")}
      </div>
    `;
  } catch { historyEl.innerHTML = `<p style="color:var(--text-medium);font-size:0.875rem;">Could not load history.</p>`; }
}

function calculateStreak(logs) {
  let streak = 0;
  const sorted = [...logs].sort((a,b) => b.date > a.date ? 1 : -1);
  for (const log of sorted) {
    if (log.glasses >= (log.goal || DAILY_GOAL)) streak++;
    else break;
  }
  return streak;
}
