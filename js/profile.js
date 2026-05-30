import { auth, db } from "./firebase-config.js";
import { doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { requireAuth, loadUserProfile, showToast, getInitials, formatDate, getConditionBadgeColor } from "./utils.js";
import { getConditionById, CONDITION_NAMES } from "./conditions.js";
import { populateProvinceDropdown, populateDistrictDropdown, getDistricts } from "./districts.js";
import { resetPassword } from "./auth.js";

let currentUser = null;
let userProfile = null;
let isEditing = false;

export async function initProfilePage() {
  try {
    currentUser = await requireAuth();
    userProfile = await loadUserProfile(currentUser.uid);
    if (!userProfile) { window.location.href = "dashboard.html"; return; }
    renderProfile();
    setupEditHandlers();
  } catch (e) { /* redirected */ }
}

function renderProfile() {
  const condition = getConditionById(userProfile.condition);

  document.getElementById("avatar-initials").textContent = getInitials(userProfile.fullName);
  document.getElementById("profile-name").textContent = userProfile.fullName || "—";
  document.getElementById("profile-email").textContent = userProfile.email || "—";
  document.getElementById("profile-since").textContent = formatDate(userProfile.createdAt);

  const badge = document.getElementById("condition-badge");
  if (badge) {
    badge.textContent = condition ? condition.name : "Unknown";
    badge.style.background = getConditionBadgeColor(userProfile.condition);
  }

  setField("field-fullname", userProfile.fullName);
  setField("field-dob", userProfile.dob || "—");
  setField("field-sex", userProfile.sex || "—");
  setField("field-email", userProfile.email);
  setField("field-province", userProfile.province || "—");
  setField("field-district", userProfile.district || "—");
  setField("field-town", userProfile.town || "—");
  setField("field-condition", condition ? condition.name : "—");
  setField("field-family-size", userProfile.familySize || "—");
  setField("field-allergies", userProfile.allergies || "None");
  setField("field-meals-per-day", condition ? `${condition.mealsPerDay} meals/day` : "—");
  setField("field-condition-desc", condition ? condition.description : "—");
}

function setField(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setupEditHandlers() {
  document.getElementById("btn-edit-profile")?.addEventListener("click", enterEditMode);
  document.getElementById("btn-save-profile")?.addEventListener("click", saveProfile);
  document.getElementById("btn-cancel-edit")?.addEventListener("click", cancelEdit);
  document.getElementById("btn-logout")?.addEventListener("click", confirmLogout);
  document.getElementById("btn-change-password")?.addEventListener("click", handlePasswordReset);

  const provinceSelect = document.getElementById("edit-province");
  if (provinceSelect) {
    provinceSelect.addEventListener("change", () => {
      populateDistrictDropdown(document.getElementById("edit-district"), provinceSelect.value);
    });
  }
}

function enterEditMode() {
  isEditing = true;
  document.getElementById("view-mode").classList.add("hidden");
  document.getElementById("edit-mode").classList.remove("hidden");

  document.getElementById("edit-fullname").value = userProfile.fullName || "";
  document.getElementById("edit-sex").value = userProfile.sex || "";
  document.getElementById("edit-town").value = userProfile.town || "";
  document.getElementById("edit-family-size").value = userProfile.familySize || 1;
  document.getElementById("edit-allergies").value = userProfile.allergies || "";

  const condSelect = document.getElementById("edit-condition");
  condSelect.innerHTML = "";
  CONDITION_NAMES.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    if (c.id === userProfile.condition) opt.selected = true;
    condSelect.appendChild(opt);
  });

  const provinceSelect = document.getElementById("edit-province");
  populateProvinceDropdown(provinceSelect, userProfile.province);
  populateDistrictDropdown(document.getElementById("edit-district"), userProfile.province, userProfile.district);
}

function cancelEdit() {
  isEditing = false;
  document.getElementById("view-mode").classList.remove("hidden");
  document.getElementById("edit-mode").classList.add("hidden");
}

async function saveProfile() {
  const btn = document.getElementById("btn-save-profile");
  btn.disabled = true;
  btn.textContent = "Saving...";

  const newCondition = document.getElementById("edit-condition").value;
  const conditionChanged = newCondition !== userProfile.condition;

  const updates = {
    fullName: document.getElementById("edit-fullname").value.trim(),
    sex: document.getElementById("edit-sex").value,
    province: document.getElementById("edit-province").value,
    district: document.getElementById("edit-district").value,
    town: document.getElementById("edit-town").value.trim(),
    familySize: parseInt(document.getElementById("edit-family-size").value, 10),
    allergies: document.getElementById("edit-allergies").value.trim(),
    condition: newCondition,
    updatedAt: serverTimestamp()
  };

  try {
    await updateDoc(doc(db, "users", currentUser.uid), updates);
    Object.assign(userProfile, updates);
    renderProfile();
    cancelEdit();
    showToast("Profile updated successfully.");
    if (conditionChanged) {
      showToast("Your health condition changed. Generate a new meal plan for updated recommendations.", "info");
    }
  } catch (err) {
    showToast("Failed to save profile. Please try again.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Save Changes";
  }
}

async function handlePasswordReset() {
  try {
    await resetPassword(currentUser.email);
    showToast("Password reset email sent. Check your inbox.");
  } catch {
    showToast("Failed to send reset email.", "error");
  }
}

function confirmLogout() {
  if (confirm("Are you sure you want to logout?")) {
    import("./auth.js").then(m => m.logoutUser());
  }
}
