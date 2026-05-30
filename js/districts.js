export const PROVINCES_DISTRICTS = {
  "Central": [
    "Chibombo", "Chisamba", "Chitambo", "Kabwe", "Kapiri Mposhi",
    "Luano", "Mkushi", "Mumbwa", "Ngabwe", "Serenje", "Shibuyunji"
  ],
  "Copperbelt": [
    "Chililabombwe", "Chingola", "Kalulushi", "Kitwe", "Luanshya",
    "Lufwanyama", "Masaiti", "Mpongwe", "Mufulira", "Ndola"
  ],
  "Eastern": [
    "Chadiza", "Chama", "Chasefu", "Chipangali", "Chipata",
    "Kasenengwa", "Katete", "Lumezi", "Lundazi", "Lusangazi",
    "Mambwe", "Nyimba", "Petauke", "Sinda", "Vubwi"
  ],
  "Luapula": [
    "Chembe", "Chiengi", "Chifunabuli", "Chipili", "Kawambwa",
    "Lunga", "Mansa", "Milenge", "Mwansabombwe", "Mwense",
    "Nchelenge", "Samfya"
  ],
  "Lusaka": [
    "Chilanga", "Chongwe", "Kafue", "Luangwa", "Lusaka", "Rufunsa"
  ],
  "Muchinga": [
    "Chinsali", "Isoka", "Kanchibiya", "Lavushimanda", "Mafinga",
    "Mpika", "Nakonde", "Shiwa Ng'andu"
  ],
  "Northern": [
    "Chilubi", "Kaputa", "Kasama", "Lunte", "Lupososhi",
    "Luwingu", "Mbala", "Mporokoso", "Mpulungu", "Mungwi",
    "Nsama", "Senga"
  ],
  "North-Western": [
    "Chavuma", "Ikelenge", "Kabompo", "Kalumbila", "Kasempa",
    "Manyinga", "Mufumbwe", "Mushindamo", "Mwinilunga", "Solwezi", "Zambezi"
  ],
  "Southern": [
    "Chikankata", "Chirundu", "Choma", "Gwembe", "Itezhi-Tezhi",
    "Kalomo", "Kazungula", "Livingstone", "Mazabuka", "Monze",
    "Namwala", "Pemba", "Siavonga", "Sinazongwe", "Zimba"
  ],
  "Western": [
    "Kalabo", "Kaoma", "Limulunga", "Luampa", "Lukulu",
    "Mitete", "Mongu", "Mulobezi", "Mwandi", "Nalolo",
    "Nkeyema", "Senanga", "Sesheke", "Shangombo", "Sikongo", "Sioma"
  ]
};

export function getProvinces() {
  return Object.keys(PROVINCES_DISTRICTS);
}

export function getDistricts(province) {
  return PROVINCES_DISTRICTS[province] || [];
}

export function populateProvinceDropdown(selectEl, selectedValue = "") {
  if (!selectEl) return;
  selectEl.innerHTML = '<option value="">-- Select Province --</option>';
  getProvinces().forEach(p => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    if (p === selectedValue) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

export function populateDistrictDropdown(selectEl, province, selectedValue = "") {
  if (!selectEl) return;
  selectEl.innerHTML = '<option value="">-- Select District --</option>';
  getDistricts(province).forEach(d => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    if (d === selectedValue) opt.selected = true;
    selectEl.appendChild(opt);
  });
}
