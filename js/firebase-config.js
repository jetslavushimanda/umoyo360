import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD0VO4thKjQFDxqCw51PxPQ2PQSmD3541s",
  authDomain: "umoyo360.firebaseapp.com",
  projectId: "umoyo360",
  storageBucket: "umoyo360.firebasestorage.app",
  messagingSenderId: "306511976845",
  appId: "1:306511976845:web:105d1df33611e3277d85c4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// ── LocalStorage helpers (replaces Firestore — no billing needed) ─────────
export function saveProfile(uid, data) {
  localStorage.setItem(`umoyo_profile_${uid}`, JSON.stringify({ ...data, updatedAt: Date.now() }));
}

export function getProfile(uid) {
  const raw = localStorage.getItem(`umoyo_profile_${uid}`);
  return raw ? JSON.parse(raw) : null;
}

export function saveMealPlan(uid, plan) {
  const key = `umoyo_plans_${uid}`;
  const existing = getMealPlans(uid);
  existing.unshift({ id: Date.now().toString(), plan, createdAt: Date.now(), conditionId: plan.conditionId, planDuration: plan.planDuration });
  if (existing.length > 10) existing.splice(10);
  localStorage.setItem(key, JSON.stringify(existing));
}

export function getMealPlans(uid) {
  const raw = localStorage.getItem(`umoyo_plans_${uid}`);
  return raw ? JSON.parse(raw) : [];
}
