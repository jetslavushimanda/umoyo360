import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getProfile } from "./firebase-config.js";

export function requireAuth(redirectTo = "index.html") {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, user => {
      if (user) {
        resolve(user);
      } else {
        window.location.href = redirectTo;
        reject(new Error("Not authenticated"));
      }
    });
  });
}

export function loadUserProfile(uid) {
  return getProfile(uid);
}

export function getFirstName(fullName) {
  if (!fullName) return "User";
  return fullName.split(" ")[0];
}

export function formatDate(timestamp) {
  if (!timestamp) return "Never";
  const d = new Date(typeof timestamp === "object" && timestamp.toDate ? timestamp.toDate() : timestamp);
  return d.toLocaleDateString("en-ZM", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateShort(timestamp) {
  if (!timestamp) return "—";
  const d = new Date(typeof timestamp === "object" && timestamp.toDate ? timestamp.toDate() : timestamp);
  return d.toLocaleDateString("en-ZM", { month: "short", day: "numeric", year: "numeric" });
}

export function showToast(message, type = "success") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("toast-show"));
  setTimeout(() => {
    toast.classList.remove("toast-show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

export function showLoading(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading...</p></div>';
}

export function showError(containerId, message) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="empty-state"><p class="empty-state-icon">⚠️</p><p>${message}</p></div>`;
}

export function getConditionBadgeColor(conditionId) {
  const colorMap = {
    general:"#27AE60", vitamin_a:"#F1C40F", anaemia:"#E74C3C", malnutrition:"#27AE60",
    osteoporosis:"#7F8C8D", celiac:"#1A8A50", gout:"#2E86C1", gastritis:"#F39C12",
    obesity:"#D35400", diabetes_type2:"#E67E22", diabetes_type1:"#C0392B",
    cholesterol:"#E67E22", hypertension:"#E74C3C", thyroid:"#5D6D7E",
    liver_disease:"#884EA0", colon_cancer:"#1A5276", iron_overload:"#922B21",
    kidney_disease:"#8E44AD", heart_disease:"#C0392B", stroke:"#922B21"
  };
  return colorMap[conditionId] || "#566573";
}

export function capitalizeFirst(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

export function getDayName(dayIndex) {
  return ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"][dayIndex % 7];
}

export function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getInitials(name) {
  if (!name) return "U";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

export function setPageTitle(title) {
  document.title = `${title} — Umoyo360`;
}
