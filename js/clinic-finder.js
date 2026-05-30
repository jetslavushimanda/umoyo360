import { auth, getProfile } from "./firebase-config.js";
import { requireAuth, showLoading, showError } from "./utils.js";
import { populateProvinceDropdown, populateDistrictDropdown } from "./districts.js";

let userProfile = null;
let allClinics = [];
let activeFilter = "all";

// ── Clinic data (no Firestore needed) ─────────────────────────────────────
const CLINICS = [
  { name:"Chipata Clinic", type:"Health Centre", province:"Lusaka", district:"Lusaka", area:"Chipata Compound", address:"Kasisi Road, Chipata", phone:"+260 211 234567", emergency:false, services:["Outpatient","MCH","Family Planning"] },
  { name:"Kanyama Clinic", type:"Health Centre", province:"Lusaka", district:"Lusaka", area:"Kanyama", address:"Plot 14, Kanyama", phone:"+260 211 234568", emergency:false, services:["Outpatient","ART","TB","MCH"] },
  { name:"Mtendere Clinic", type:"Health Centre", province:"Lusaka", district:"Lusaka", area:"Mtendere", address:"Mtendere East, Lusaka", phone:"+260 211 234569", emergency:false, services:["Outpatient","MCH","Family Planning"] },
  { name:"University Teaching Hospital (UTH)", type:"University Teaching Hospital", province:"Lusaka", district:"Lusaka", area:"Nationalist Road", address:"Nationalist Road, Lusaka", phone:"+260 211 254131", emergency:true, services:["Emergency","Surgery","Outpatient","Laboratory","Specialist"] },
  { name:"Levy Mwanawasa Hospital", type:"District Hospital", province:"Lusaka", district:"Lusaka", area:"Chilenje", address:"Off Great East Road, Lusaka", phone:"+260 211 254200", emergency:true, services:["Emergency","Surgery","Outpatient","Maternity"] },
  { name:"Chaisa Clinic", type:"Health Centre", province:"Lusaka", district:"Lusaka", area:"Chaisa", address:"Chaisa Compound, Lusaka", phone:"+260 211 234570", emergency:false, services:["Outpatient","MCH","ART"] },
  { name:"Kalingalinga Clinic", type:"Health Centre", province:"Lusaka", district:"Lusaka", area:"Kalingalinga", address:"Kalingalinga, Lusaka", phone:"+260 211 234571", emergency:false, services:["Outpatient","MCH","Family Planning"] },
  { name:"Bauleni Clinic", type:"Health Centre", province:"Lusaka", district:"Lusaka", area:"Bauleni", address:"Bauleni Compound, Lusaka", phone:"+260 211 234572", emergency:false, services:["Outpatient","MCH","ART","TB"] },
  { name:"Ndola Central Hospital", type:"District Hospital", province:"Copperbelt", district:"Ndola", area:"City Centre", address:"Broadway Avenue, Ndola", phone:"+260 212 612345", emergency:true, services:["Emergency","Surgery","Maternity","Laboratory","Outpatient"] },
  { name:"Twapia Clinic", type:"Health Centre", province:"Copperbelt", district:"Ndola", area:"Twapia", address:"Twapia Compound, Ndola", phone:"+260 212 612346", emergency:false, services:["Outpatient","MCH","ART"] },
  { name:"Chipulukusu Clinic", type:"Health Centre", province:"Copperbelt", district:"Ndola", area:"Chipulukusu", address:"Chipulukusu, Ndola", phone:"+260 212 612347", emergency:false, services:["Outpatient","MCH","Family Planning"] },
  { name:"Masala Clinic", type:"Health Centre", province:"Copperbelt", district:"Ndola", area:"Masala", address:"Masala, Ndola", phone:"+260 212 612349", emergency:false, services:["Outpatient","MCH","ART"] },
  { name:"Arthur Davison Children Hospital", type:"District Hospital", province:"Copperbelt", district:"Ndola", area:"Broadway", address:"Broadway, Ndola", phone:"+260 212 612350", emergency:true, services:["Emergency","Paediatrics","Laboratory"] },
  { name:"Kitwe Teaching Hospital", type:"District Hospital", province:"Copperbelt", district:"Kitwe", area:"Parklands", address:"Parklands, Kitwe", phone:"+260 212 222345", emergency:true, services:["Emergency","Surgery","Maternity","Specialist","Laboratory"] },
  { name:"Wusakile Clinic", type:"Health Centre", province:"Copperbelt", district:"Kitwe", area:"Wusakile", address:"Wusakile, Kitwe", phone:"+260 212 222346", emergency:false, services:["Outpatient","MCH","ART"] },
  { name:"Buchi Clinic", type:"Health Centre", province:"Copperbelt", district:"Kitwe", area:"Buchi", address:"Buchi, Kitwe", phone:"+260 212 222347", emergency:false, services:["Outpatient","MCH"] },
  { name:"Kamitondo Clinic", type:"Health Centre", province:"Copperbelt", district:"Kitwe", area:"Kamitondo", address:"Kamitondo, Kitwe", phone:"+260 212 222348", emergency:false, services:["Outpatient","MCH","ART","TB"] },
  { name:"Kwacha Clinic", type:"Health Centre", province:"Copperbelt", district:"Kitwe", area:"Kwacha", address:"Kwacha, Kitwe", phone:"+260 212 222349", emergency:false, services:["Outpatient","MCH"] },
  { name:"Livingstone General Hospital", type:"District Hospital", province:"Southern", district:"Livingstone", area:"City Centre", address:"Hospital Road, Livingstone", phone:"+260 213 320245", emergency:true, services:["Emergency","Surgery","Maternity","Laboratory","Outpatient"] },
  { name:"Maramba Clinic", type:"Health Centre", province:"Southern", district:"Livingstone", area:"Maramba", address:"Maramba, Livingstone", phone:"+260 213 320246", emergency:false, services:["Outpatient","MCH","ART"] },
  { name:"Libuyu Clinic", type:"Health Centre", province:"Southern", district:"Livingstone", area:"Libuyu", address:"Libuyu, Livingstone", phone:"+260 213 320247", emergency:false, services:["Outpatient","MCH","Family Planning"] },
  { name:"Dambwa North Clinic", type:"Health Centre", province:"Southern", district:"Livingstone", area:"Dambwa North", address:"Dambwa North, Livingstone", phone:"+260 213 320248", emergency:false, services:["Outpatient","MCH"] },
  { name:"Kasama General Hospital", type:"District Hospital", province:"Northern", district:"Kasama", area:"Town Centre", address:"Independence Avenue, Kasama", phone:"+260 214 221234", emergency:true, services:["Emergency","Surgery","Maternity","Laboratory","Outpatient"] },
  { name:"Kasama Urban Clinic", type:"Health Centre", province:"Northern", district:"Kasama", area:"Kasama Urban", address:"Kasama Urban, Kasama", phone:"+260 214 221235", emergency:false, services:["Outpatient","MCH","ART"] },
  { name:"Kasama Rural Health Centre", type:"Health Centre", province:"Northern", district:"Kasama", area:"Kasama Rural", address:"Kasama Rural, Kasama", phone:"+260 214 221236", emergency:false, services:["Outpatient","MCH"] },
  { name:"Chipata General Hospital", type:"District Hospital", province:"Eastern", district:"Chipata", area:"Town Centre", address:"Hospital Road, Chipata", phone:"+260 216 221234", emergency:true, services:["Emergency","Surgery","Maternity","Laboratory","Outpatient"] },
  { name:"Chipata Urban Clinic", type:"Health Centre", province:"Eastern", district:"Chipata", area:"Chipata Urban", address:"Chipata Urban", phone:"+260 216 221235", emergency:false, services:["Outpatient","MCH","ART"] },
  { name:"Kapata Clinic", type:"Health Centre", province:"Eastern", district:"Chipata", area:"Kapata", address:"Kapata, Chipata", phone:"+260 216 221236", emergency:false, services:["Outpatient","MCH","Family Planning"] },
  { name:"Lewanika General Hospital", type:"District Hospital", province:"Western", district:"Mongu", area:"Town Centre", address:"Hospital Road, Mongu", phone:"+260 217 221234", emergency:true, services:["Emergency","Surgery","Maternity","Laboratory","Outpatient"] },
  { name:"Mongu Urban Clinic", type:"Health Centre", province:"Western", district:"Mongu", area:"Mongu Urban", address:"Mongu Urban", phone:"+260 217 221235", emergency:false, services:["Outpatient","MCH","ART"] },
  { name:"Limulunga Clinic", type:"Health Centre", province:"Western", district:"Mongu", area:"Limulunga", address:"Limulunga, Mongu", phone:"+260 217 221236", emergency:false, services:["Outpatient","MCH"] },
  { name:"Solwezi General Hospital", type:"District Hospital", province:"North-Western", district:"Solwezi", area:"Town Centre", address:"Hospital Road, Solwezi", phone:"+260 218 821234", emergency:true, services:["Emergency","Surgery","Maternity","Laboratory","Outpatient"] },
  { name:"Solwezi Urban Clinic", type:"Health Centre", province:"North-Western", district:"Solwezi", area:"Solwezi Urban", address:"Solwezi Urban", phone:"+260 218 821235", emergency:false, services:["Outpatient","MCH","ART"] },
  { name:"Mushindamo Clinic", type:"Health Centre", province:"North-Western", district:"Solwezi", area:"Mushindamo", address:"Mushindamo, Solwezi", phone:"+260 218 821236", emergency:false, services:["Outpatient","MCH"] },
];

export async function initClinicFinderPage() {
  try {
    const user = await requireAuth();
    userProfile = getProfile(user.uid);
    setupLocationSelector();
    setupFilterButtons();
    loadClinicsForDistrict(userProfile.province, userProfile.district);
  } catch (e) { /* redirected */ }
}

function loadClinicsForDistrict(province, district) {
  document.getElementById("location-display").textContent =
    `Showing clinics in: ${district}, ${province}`;
  allClinics = CLINICS.filter(c => c.district === district && c.province === province);
  renderClinicList(allClinics, activeFilter);
}

function renderClinicList(clinics, filter) {
  const resultsEl = document.getElementById("clinic-results");
  if (!resultsEl) return;

  let filtered = clinics;
  if (filter === "health_post") filtered = clinics.filter(c => c.type === "Health Post");
  else if (filter === "health_centre") filtered = clinics.filter(c => c.type === "Health Centre");
  else if (filter === "hospital") filtered = clinics.filter(c => c.type.includes("Hospital"));
  else if (filter === "emergency") filtered = clinics.filter(c => c.emergency);

  const typeColors = { "Health Post":"#7F8C8D", "Health Centre":"#2E86C1", "District Hospital":"#1A5276", "University Teaching Hospital":"#1A5276" };

  if (filtered.length === 0) {
    resultsEl.innerHTML = `<div class="empty-state"><p class="empty-state-icon">🏥</p><p>No clinics found for this selection.</p><p style="margin-top:0.5rem;font-size:0.85rem;">Currently covering: Lusaka, Ndola, Kitwe, Livingstone, Kasama, Chipata, Mongu, Solwezi.</p></div>`;
    return;
  }

  resultsEl.innerHTML = `<p class="results-count">Showing ${filtered.length} facilit${filtered.length !== 1 ? "ies" : "y"}</p>`;
  filtered.forEach(clinic => {
    const card = document.createElement("div");
    card.className = "clinic-card";
    card.innerHTML = `
      <div class="clinic-card-header">
        <h3 class="clinic-name">${clinic.name}</h3>
        ${clinic.emergency ? '<span class="badge-emergency">Emergency</span>' : ""}
      </div>
      <span class="clinic-type-badge" style="background:${typeColors[clinic.type]||"#566573"}">${clinic.type}</span>
      <p class="clinic-area">${clinic.area} — ${clinic.address}</p>
      <a href="tel:${clinic.phone}" class="clinic-phone">📞 ${clinic.phone}</a>
      <div class="clinic-services">${clinic.services.map(s=>`<span class="service-tag">${s}</span>`).join("")}</div>
    `;
    resultsEl.appendChild(card);
  });
}

function setupFilterButtons() {
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter;
      renderClinicList(allClinics, activeFilter);
    });
  });
}

function setupLocationSelector() {
  const toggle = document.getElementById("btn-change-location");
  const panel = document.getElementById("location-panel");
  toggle?.addEventListener("click", () => panel?.classList.toggle("hidden"));

  const provinceSelect = document.getElementById("search-province");
  const districtSelect = document.getElementById("search-district");
  populateProvinceDropdown(provinceSelect, userProfile.province);
  populateDistrictDropdown(districtSelect, userProfile.province, userProfile.district);
  provinceSelect?.addEventListener("change", () => populateDistrictDropdown(districtSelect, provinceSelect.value));

  document.getElementById("btn-search-district")?.addEventListener("click", () => {
    const prov = provinceSelect.value;
    const dist = districtSelect.value;
    if (!prov || !dist) return;
    panel?.classList.add("hidden");
    activeFilter = "all";
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    document.querySelector('.filter-btn[data-filter="all"]')?.classList.add("active");
    loadClinicsForDistrict(prov, dist);
  });
}
