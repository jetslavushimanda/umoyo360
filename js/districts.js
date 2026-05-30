export const PROVINCES_DISTRICTS = {
  "Central": [
    "Chibombo", "Chisamba", "Chitambo", "Kabwe", "Kapiri Mposhi",
    "Luano", "Mkushi", "Mumbwa", "Ngabwe", "Serenje"
  ],
  "Copperbelt": [
    "Chililabombwe", "Chingola", "Kalulushi", "Kitwe", "Lufwanyama",
    "Luanshya", "Masaiti", "Mpongwe", "Mufulira", "Ndola"
  ],
  "Eastern": [
    "Chadiza", "Chama", "Chipata", "Lundazi", "Lumezi",
    "Mambwe", "Msanzala", "Nyimba", "Petauke", "Sinda", "Vubwi"
  ],
  "Luapula": [
    "Bahati", "Chembe", "Chiengi", "Chipili", "Kawambwa",
    "Lunga", "Mansa", "Milenge", "Mwansabombwe", "Mwense", "Nchelenge", "Samfya"
  ],
  "Lusaka": [
    "Chilanga", "Chongwe", "Kafue", "Luangwa", "Lusaka",
    "Rufunsa", "Shibuyunji", "Chirundu"
  ],
  "Muchinga": [
    "Chinsali", "Isoka", "Kanchibiya", "Lavushimanda", "Mafinga",
    "Mpika", "Mushindamo", "Nakonde", "Shiwang'andu"
  ],
  "Northern": [
    "Chilubi", "Kaputa", "Kasama", "Luwingu", "Lunte",
    "Lupososhi", "Mbala", "Mporokoso", "Mpulungu", "Mungwi", "Nsama", "Senga Hill"
  ],
  "North-Western": [
    "Chavuma", "Ikelenge", "Kabompo", "Kalumbila", "Kasempa",
    "Kipushi", "Lumwana", "Mufumbwe", "Mushindamo", "Mwinilunga", "Solwezi", "Zambezi"
  ],
  "Southern": [
    "Chikankata", "Chirundu", "Choma", "Gwembe", "Itezhi-Tezhi",
    "Kalomo", "Kazungula", "Livingstone", "Mazabuka", "Monze",
    "Namwala", "Pemba", "Siavonga", "Sinazongwe"
  ],
  "Western": [
    "Kalabo", "Kaoma", "Limulunga", "Liyeta", "Luampa",
    "Lukulu", "Mangango", "Mitete", "Mongu", "Mulobezi",
    "Mwandi", "Nalolo", "Nkeyema", "Senanga", "Sesheke",
    "Shangombo", "Sikongo", "Sioma"
  ]
};

export function getProvinces() {
  return Object.keys(PROVINCES_DISTRICTS);
}

export function getDistricts(province) {
  return PROVINCES_DISTRICTS[province] || [];
}

export function populateProvinceDropdown(selectEl, selectedValue = "") {
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
  selectEl.innerHTML = '<option value="">-- Select District --</option>';
  getDistricts(province).forEach(d => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    if (d === selectedValue) opt.selected = true;
    selectEl.appendChild(opt);
  });
}
