function whenFirebaseReady(callback){
  if(window.db && window.ref && window.onValue && window.set){
    callback();
  }else{
    window.addEventListener("firebase-ready", callback, { once:true });
  }
}

let bookings = {};
let reviews = {};
let bookingRequests = {};
let bookingsRef;
let websiteRef;
let reviewsRef;
let bookingRequestsRef;
let websiteDataCache = {};
let currentReviewRating = 5;
let activeGameConsoleFilter = "all";
let activeGameSearch = "";
let activeScheduleFilter = "all";

const DEFAULT_DATA = {
  whatsappNumber:"6287811030777",
  promoTitle:"Promo Weekend",
  promoBody:"Sewa sekarang dan konfirmasi via WhatsApp admin.",
  runningText:"NINTENDO SWITCH OLED | PLAYBOX READY | BOOKING VIA WHATSAPP | UPDATE REALTIME",
  storeStatus:"open",
  storeHours:"Buka sampai 22:00",
  nintendoPrice:"80.000",
  playboxPrice:"70.000",
  nintendoBadge:"READY",
  playboxBadge:"READY",
  gamePreviews:[
    {
      title:"Mario Kart 8 Deluxe",
      youtube:"https://www.youtube.com/watch?v=tKlRN2YpxRE"
    },
    {
      title:"Zelda: Tears of the Kingdom",
      youtube:"https://www.youtube.com/watch?v=uHGShqcAHlQ"
    },
    {
      title:"Super Smash Bros. Ultimate",
      youtube:"https://www.youtube.com/watch?v=WShCN-AYHqA"
    },
    {
      title:"Animal Crossing",
      youtube:"https://www.youtube.com/watch?v=_3YNL0OWio0"
    },
    {
      title:"FIFA / FC",
      youtube:"https://www.youtube.com/watch?v=XhP3Xh4LMA8"
    },
    {
      title:"Tekken",
      youtube:"https://www.youtube.com/watch?v=2hPuRQz6IlM"
    },
    {
      title:"GTA V",
      youtube:"https://www.youtube.com/watch?v=QkkoHAzjnUs"
    },
    {
      title:"Naruto Storm",
      youtube:"https://www.youtube.com/watch?v=K_xTet06SUo"
    }
  ],
  testimonials:[
    "Barang bagus, admin fast respon, recommended!",
    "Unit bersih dan cocok buat acara keluarga.",
    "Booking mudah, jadwalnya jelas, mantap."
  ],
  faqItems:[
    {
      question:"Apakah bisa antar jemput?",
      answer:"Bisa. Isi alamat lengkap dan jam antar pada form booking, lalu admin akan konfirmasi lewat WhatsApp."
    },
    {
      question:"Booking valid kapan?",
      answer:"Booking dianggap valid setelah admin membalas dan mengonfirmasi jadwal sewa."
    },
    {
      question:"Apakah jadwal realtime?",
      answer:"Iya. Jika admin mengubah status jadwal, tampilan di website akan ikut update otomatis."
    },
    {
      question:"Kalau ingin tanya dulu?",
      answer:"Klik tombol WhatsApp atau isi form booking. Admin akan bantu cek unit, jadwal, dan harga."
    }
  ],
  termsItems:[
    "Customer wajib mengisi data booking dengan benar.",
    "Jadwal sewa hanya valid setelah dikonfirmasi oleh admin.",
    "Kerusakan atau kehilangan unit selama masa sewa menjadi tanggung jawab penyewa.",
    "Keterlambatan pengembalian dapat dikenakan biaya tambahan sesuai konfirmasi admin.",
    "Perubahan jadwal wajib dikonfirmasi melalui WhatsApp admin."
  ],
  logo:"",
  hero:"",
  nintendoImage:"",
  playboxImage:"",
  gallery1:"",
  gallery2:"",
  gallery3:"",
  gallery4:""
};

const PLACEHOLDER = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600">
  <defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#12121e"/><stop offset="1" stop-color="#1a1a2e"/></linearGradient></defs>
  <rect width="900" height="600" fill="url(#g)"/>
  <rect x="30" y="30" width="840" height="540" fill="none" stroke="#f5c518" stroke-width="6" stroke-dasharray="18 14" opacity="0.6"/>
  <text x="450" y="285" text-anchor="middle" font-family="monospace" font-size="38" fill="#f5c518">STARZONE</text>
  <text x="450" y="335" text-anchor="middle" font-family="monospace" font-size="22" fill="#00e5ff">UPLOAD GAMBAR DI ADMIN</text>
</svg>`);

whenFirebaseReady(() => {
  bookingsRef = ref(window.db, "bookings");
  websiteRef = ref(window.db, "websiteData");
  reviewsRef = ref(window.db, "reviews");
  bookingRequestsRef = ref(window.db, "bookingRequests");

  onValue(bookingsRef, (snapshot) => {
    bookings = snapshot.val() || {};
    generateSchedules();
    generateAdminSchedule();
  });

  onValue(websiteRef, (snapshot) => {
    websiteDataCache = { ...DEFAULT_DATA, ...(snapshot.val() || {}) };
    loadWebsiteData(websiteDataCache);
    fillAdminWebsiteForm(websiteDataCache);
  });

  onValue(reviewsRef, (snapshot) => {
    reviews = snapshot.val() || {};
    renderPublicReviews();
    renderAdminReviews();
  });

  onValue(bookingRequestsRef, (snapshot) => {
    bookingRequests = snapshot.val() || {};
    renderAdminBookingRequests();
  });

  setReviewRating(5);
  initGamePreviewControls();
  setupPixelTimePicker();
});

function generateSchedules(){
  const scheduleContainer = document.getElementById("schedule-list");
  if(!scheduleContainer) return;

  scheduleContainer.innerHTML = "";
  const today = new Date();

  for(let i = 0; i < 30; i++){
    const currentDate = new Date();
    currentDate.setDate(today.getDate() + i);
    const formatted = currentDate.toISOString().split("T")[0];
    const displayDate = currentDate.toLocaleDateString("id-ID", {
      day:"numeric", month:"long", year:"numeric"
    });

    const data = bookings[formatted] || { nintendo:"Ready", playbox:"Ready" };

    const card = document.createElement("div");
    card.classList.add("schedule-card");
    card.innerHTML = `
      <h3>${displayDate}</h3>
      <p>Nintendo OLED : <span class="${data.nintendo === "Ready" ? "available" : "booked"}">${data.nintendo}</span></p>
      <p>Playbox : <span class="${data.playbox === "Ready" ? "available" : "booked"}">${data.playbox}</span></p>
    `;
    scheduleContainer.appendChild(card);
  }
}

function scheduleMatchesFilter(index, data){
  const nintendoReady = data.nintendo === "Ready";
  const playboxReady = data.playbox === "Ready";
  const anyBooked = data.nintendo === "Booked" || data.playbox === "Booked";

  if(activeScheduleFilter === "ready") return nintendoReady || playboxReady;
  if(activeScheduleFilter === "booked") return anyBooked;
  if(activeScheduleFilter === "today") return index === 0;
  if(activeScheduleFilter === "week") return index < 7;
  return true;
}

function setScheduleFilter(filter){
  activeScheduleFilter = filter || "all";
  document.querySelectorAll("[data-schedule-filter]").forEach(button => {
    button.classList.toggle("active", button.dataset.scheduleFilter === activeScheduleFilter);
  });
  generateAdminSchedule();
}

function generateAdminSchedule(){
  const adminContainer = document.getElementById("adminScheduleList");
  if(!adminContainer) return;

  adminContainer.innerHTML = "";
  const today = new Date();
  let shown = 0;

  for(let i = 0; i < 30; i++){
    const currentDate = new Date();
    currentDate.setDate(today.getDate() + i);
    const formatted = currentDate.toISOString().split("T")[0];
    const displayDate = currentDate.toLocaleDateString("id-ID", {
      day:"numeric", month:"long", year:"numeric"
    });

    if(!bookings[formatted]){
      bookings[formatted] = { nintendo:"Ready", playbox:"Ready" };
    }

    if(!scheduleMatchesFilter(i, bookings[formatted])) continue;
    shown++;

    const card = document.createElement("div");
    card.classList.add("schedule-card");
    card.innerHTML = `
      <h3>${displayDate}</h3>
      <p>Nintendo OLED</p>
      <button class="toggle-btn ${bookings[formatted].nintendo === "Ready" ? "ready" : "booked"}" onclick="toggleStatus('${formatted}','nintendo')">
        ${bookings[formatted].nintendo}
      </button>
      <p>Playbox</p>
      <button class="toggle-btn ${bookings[formatted].playbox === "Ready" ? "ready" : "booked"}" onclick="toggleStatus('${formatted}','playbox')">
        ${bookings[formatted].playbox}
      </button>
    `;
    adminContainer.appendChild(card);
  }

  if(!shown){
    adminContainer.innerHTML = `<p class="empty-text">Tidak ada jadwal sesuai filter.</p>`;
  }
}

function toggleStatus(date, product){
  if(!bookings[date]){
    bookings[date] = { nintendo:"Ready", playbox:"Ready" };
  }

  bookings[date][product] = bookings[date][product] === "Ready" ? "Booked" : "Ready";

  set(bookingsRef, bookings)
    .catch(() => alert("Gagal update jadwal. Cek rules Firebase."));
}

function normalizePhone(phone){
  let cleaned = String(phone || DEFAULT_DATA.whatsappNumber).replace(/[^0-9]/g, "");
  if(cleaned.startsWith("0")) cleaned = "62" + cleaned.slice(1);
  if(!cleaned.startsWith("62")) cleaned = "62" + cleaned;
  return cleaned;
}

function getSelectedJamAntar(){
  const jamSelect = document.getElementById("jamAntarJam");
  const menitSelect = document.getElementById("jamAntarMenit");

  if(jamSelect && menitSelect){
    const jam = jamSelect.value;
    const menit = menitSelect.value;
    return jam && menit ? `${jam}:${menit}` : "";
  }

  const oldTime = document.getElementById("jamAntar");
  return oldTime ? oldTime.value : "";
}

function setupPixelTimePicker(){
  const jamEl = document.getElementById("jamAntarJam");
  const menitEl = document.getElementById("jamAntarMenit");

  if(!jamEl || !menitEl) return;

  if(jamEl.options.length <= 1){
    for(let i = 10; i <= 20; i++){
      const val = String(i).padStart(2, "0");
      jamEl.innerHTML += `<option value="${val}">${val}</option>`;
    }
  }

  if(menitEl.options.length <= 1){
    ["00", "15", "30", "45"].forEach(val => {
      menitEl.innerHTML += `<option value="${val}">${val}</option>`;
    });
  }
}

async function saveBookingRequest(data){
  if(!bookingRequestsRef){
    throw new Error("Firebase belum siap.");
  }

  const id = `bk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await set(ref(window.db, `bookingRequests/${id}`), {
    ...data,
    status:"pending",
    createdAt: Date.now()
  });
}

async function sendWhatsApp(){
  const nama = document.getElementById("nama").value.trim();
  const nomor = document.getElementById("nomor").value.trim();
  const paket = document.getElementById("paket").value;
  const tanggal = document.getElementById("tanggal").value;
  const jamAntar = getSelectedJamAntar();
  const durasi = document.getElementById("durasi").value;
  const alamat = document.getElementById("alamat").value.trim();

  if(!nama || !nomor || !paket || !tanggal || !jamAntar || !durasi || !alamat){
    alert("Semua data wajib diisi!");
    return;
  }

  const bookingData = { nama, nomor, paket, tanggal, jamAntar, durasi, alamat };

  try{
    await saveBookingRequest(bookingData);
  }catch(error){
    alert("Gagal menyimpan riwayat booking. Cek koneksi/Firebase rules.");
    return;
  }

  const message = `Halo Admin StarZone\n\nSaya ingin booking rental.\n\nNama : ${nama}\nNo WhatsApp : ${nomor}\nPaket : ${paket}\nTanggal Sewa : ${tanggal}\nAntar Jam : ${jamAntar} WIB\nDurasi : ${durasi}\nAlamat : ${alamat}`;
  const phone = normalizePhone(websiteDataCache.whatsappNumber);
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

function readFile(file){
  return new Promise((resolve, reject) => {
    if(!file){
      resolve(null);
      return;
    }

    if(file.size > 950000){
      reject(new Error("Ukuran gambar maksimal sekitar 950KB. Kompres dulu gambarnya."));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("Gagal membaca gambar."));
    reader.readAsDataURL(file);
  });
}

function getInputValue(id, fallback = ""){
  const el = document.getElementById(id);
  if(!el) return fallback;
  return el.value.trim() || fallback;
}

function normalizeGamePreviews(items){
  const source = Array.isArray(items)
    ? items
    : Object.values(items || {});

  return source
    .map(item => ({
      title: String(item?.title || "").trim(),
      youtube: String(item?.youtube || "").trim()
    }))
    .filter(item => item.title);
}

function createGameAdminRow(item = {}, index = 1){
  const row = document.createElement("div");
  row.className = "game-admin-row";
  row.innerHTML = `
    <label>Game ${index}</label>
    <input type="text" class="game-title-input" placeholder="Nama game" value="${escapeHtml(item.title || "")}">
    <input type="text" class="game-youtube-input" placeholder="Link YouTube trailer / gameplay" value="${escapeHtml(item.youtube || "")}">
    <button class="btn btn-pink game-remove-btn" type="button" onclick="removeGamePreviewRow(this)">Hapus</button>
  `;
  return row;
}

function refreshGameAdminLabels(){
  const rows = document.querySelectorAll("#gameAdminList .game-admin-row");
  rows.forEach((row, index) => {
    const label = row.querySelector("label");
    if(label) label.textContent = `Game ${index + 1}`;
  });
}

function addGamePreviewRow(item = {}){
  const list = document.getElementById("gameAdminList");
  if(!list) return;

  const empty = list.querySelector(".empty-text");
  if(empty) empty.remove();

  list.appendChild(createGameAdminRow(item, list.querySelectorAll(".game-admin-row").length + 1));
  refreshGameAdminLabels();
}

function removeGamePreviewRow(button){
  const row = button.closest(".game-admin-row");
  if(row) row.remove();
  refreshGameAdminLabels();

  const list = document.getElementById("gameAdminList");
  if(list && !list.querySelector(".game-admin-row")){
    list.innerHTML = `<p class="empty-text">Belum ada game. Klik Tambah Game untuk membuat slot baru.</p>`;
  }
}

function collectGamePreviewInputs(fallback = DEFAULT_DATA.gamePreviews){
  const list = document.getElementById("gameAdminList");
  if(!list){
    return normalizeGamePreviews(fallback);
  }

  const result = [];
  list.querySelectorAll(".game-admin-row").forEach(row => {
    const title = row.querySelector(".game-title-input")?.value.trim() || "";
    const youtube = row.querySelector(".game-youtube-input")?.value.trim() || "";

    if(title){
      result.push({ title, youtube });
    }
  });

  return result;
}

function fillGamePreviewInputs(items){
  const list = document.getElementById("gameAdminList");
  if(!list) return;

  const previews = normalizeGamePreviews(items || DEFAULT_DATA.gamePreviews);
  list.innerHTML = "";

  if(!previews.length){
    list.innerHTML = `<p class="empty-text">Belum ada game. Klik Tambah Game untuk membuat slot baru.</p>`;
    return;
  }

  previews.forEach(item => addGamePreviewRow(item));
}

function getYoutubeId(url){
  const raw = String(url || "").trim();
  if(!raw) return "";

  try{
    const parsed = new URL(raw);

    if(parsed.hostname.includes("youtu.be")){
      return parsed.pathname.replace("/", "").split("/")[0];
    }

    if(parsed.hostname.includes("youtube.com")){
      const watchId = parsed.searchParams.get("v");
      if(watchId) return watchId;

      const embedMatch = parsed.pathname.match(/\/embed\/([^/?]+)/);
      if(embedMatch) return embedMatch[1];

      const shortsMatch = parsed.pathname.match(/\/shorts\/([^/?]+)/);
      if(shortsMatch) return shortsMatch[1];
    }
  }catch(error){
    return "";
  }

  return "";
}

function getYoutubeWatchUrl(url){
  const id = getYoutubeId(url);
  return id ? `https://www.youtube.com/watch?v=${id}` : String(url || "").trim();
}

function getYoutubeThumbnail(url){
  const id = getYoutubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
}

function getGamePreviewFilteredItems(items){
  const previews = normalizeGamePreviews(items || DEFAULT_DATA.gamePreviews);
  const search = String(activeGameSearch || "").toLowerCase().trim();

  return previews.filter(item => {
    return !search || item.title.toLowerCase().includes(search);
  });
}

function makeGamePreviewCard(item){
  const youtubeUrl = getYoutubeWatchUrl(item.youtube);
  const thumbnail = getYoutubeThumbnail(item.youtube);
  const video = thumbnail
    ? `<a class="game-thumbnail-link" href="${escapeHtml(youtubeUrl)}" target="_blank" rel="noopener">
         <img src="${escapeHtml(thumbnail)}" alt="${escapeHtml(item.title)}">
         <span class="game-play-button">▶</span>
       </a>`
    : `<div class="youtube-placeholder">Masukkan link YouTube di admin</div>`;

  return `
    <article class="game-preview-card">
      <div class="game-video-box">${video}</div>
      <div class="game-preview-content">
        <h3>${escapeHtml(item.title)}</h3>
        ${item.youtube ? `<a class="btn btn-cyan" href="${escapeHtml(youtubeUrl)}" target="_blank" rel="noopener">Buka YouTube</a>` : ""}
      </div>
    </article>
  `;
}

function renderGamePreviewPage(items){
  const list = document.getElementById("gamePreviewList");
  if(!list) return;

  const previews = normalizeGamePreviews(items || DEFAULT_DATA.gamePreviews);
  if(!previews.length){
    list.innerHTML = `<p class="empty-text">Belum ada preview game. Tambahkan lewat dashboard admin.</p>`;
    return;
  }

  const filtered = getGamePreviewFilteredItems(previews);
  if(!filtered.length){
    list.innerHTML = `<p class="empty-text">Game tidak ditemukan. Coba cari kata lain.</p>`;
    return;
  }

  list.innerHTML = filtered.map(makeGamePreviewCard).join("");
}

function renderAdminGamePreviewLive(items){
  return;
}

function previewAdminGameInputs(){
  return;
}

function openGamePreviewPage(){
  window.open("games.html", "_blank");
}

function fillDefaultGamePreviews(){
  fillGamePreviewInputs(DEFAULT_DATA.gamePreviews);
}

function setGameConsoleFilter(){
  renderGamePreviewPage(websiteDataCache.gamePreviews || DEFAULT_DATA.gamePreviews);
}

function initGamePreviewControls(){
  const searchInput = document.getElementById("gameSearchInput");
  if(searchInput){
    searchInput.addEventListener("input", () => {
      activeGameSearch = searchInput.value;
      renderGamePreviewPage(websiteDataCache.gamePreviews || DEFAULT_DATA.gamePreviews);
    });
  }
}


async function saveWebsiteData(){
  if(!websiteRef){
    alert("Firebase belum siap. Coba refresh halaman admin.");
    return;
  }

  try{
    const oldSnapshot = await get(websiteRef);
    const oldData = { ...DEFAULT_DATA, ...(oldSnapshot.val() || {}) };

    const [logo, hero, nintendoImage, playboxImage, gallery1, gallery2, gallery3, gallery4] = await Promise.all([
      readFile(document.getElementById("logoInput").files[0]),
      readFile(document.getElementById("heroInput")?.files?.[0]),
      readFile(document.getElementById("nintendoImage").files[0]),
      readFile(document.getElementById("playboxImage").files[0]),
      readFile(document.getElementById("galleryInput1").files[0]),
      readFile(document.getElementById("galleryInput2").files[0]),
      readFile(document.getElementById("galleryInput3").files[0]),
      readFile(document.getElementById("galleryInput4").files[0])
    ]);

    const data = {
      ...oldData,
      whatsappNumber: getInputValue("whatsappNumber", oldData.whatsappNumber),
      nintendoPrice: getInputValue("nintendoPrice", oldData.nintendoPrice),
      playboxPrice: getInputValue("playboxPrice", oldData.playboxPrice),
      nintendoBadge: getInputValue("nintendoBadge", oldData.nintendoBadge),
      playboxBadge: getInputValue("playboxBadge", oldData.playboxBadge),
      promoTitle: getInputValue("promoTitle", oldData.promoTitle),
      promoBody: getInputValue("promoBody", oldData.promoBody),
      runningText: getInputValue("runningText", oldData.runningText),
      storeStatus: getInputValue("storeStatus", oldData.storeStatus),
      storeHours: getInputValue("storeHours", oldData.storeHours),
      gamePreviews: collectGamePreviewInputs(oldData.gamePreviews),
      faqItems: collectFaqInputs(oldData.faqItems),
      termsItems: collectTermsInputs(oldData.termsItems)
    };

    if(logo) data.logo = logo;
    if(hero) data.hero = hero;
    if(nintendoImage) data.nintendoImage = nintendoImage;
    if(playboxImage) data.playboxImage = playboxImage;
    if(gallery1) data.gallery1 = gallery1;
    if(gallery2) data.gallery2 = gallery2;
    if(gallery3) data.gallery3 = gallery3;
    if(gallery4) data.gallery4 = gallery4;

    await set(websiteRef, data);
    alert("Website berhasil diupdate realtime!");
  }catch(error){
    alert(error.message || "Gagal simpan website. Cek koneksi/Firebase rules.");
  }
}

function setText(id, value){
  const el = document.getElementById(id);
  if(el) el.textContent = value;
}

function setImage(id, value){
  const el = document.getElementById(id);
  if(el) el.src = value || PLACEHOLDER;
}

function renderGameList(id, gameText){
  const wrap = document.getElementById(id);
  if(!wrap) return;

  const games = String(gameText || "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);

  wrap.innerHTML = games.map(game => `<span>${game}</span>`).join("");
}

function renderTicker(text){
  const ticker = document.getElementById("tickerContent");
  if(!ticker) return;

  const items = String(text || DEFAULT_DATA.runningText)
    .split("|")
    .map(item => item.trim())
    .filter(Boolean);

  const doubled = [...items, ...items];
  ticker.innerHTML = doubled.map(item => `<span>⭐ ${item}</span>`).join("");
}


function normalizeFaqItems(items){
  const source = Array.isArray(items)
    ? items
    : Object.values(items || {});

  return source
    .map(item => ({
      question: String(item?.question || "").trim(),
      answer: String(item?.answer || "").trim()
    }))
    .filter(item => item.question && item.answer);
}

function collectFaqInputs(fallback = DEFAULT_DATA.faqItems){
  if(!document.getElementById("faqQuestion1")){
    return normalizeFaqItems(fallback);
  }

  const result = [];
  for(let i = 1; i <= 4; i++){
    const question = getInputValue(`faqQuestion${i}`, "");
    const answer = getInputValue(`faqAnswer${i}`, "");
    if(question && answer){
      result.push({ question, answer });
    }
  }
  return result;
}

function fillFaqInputs(items){
  if(!document.getElementById("faqQuestion1")) return;

  const faqs = normalizeFaqItems(items || DEFAULT_DATA.faqItems);
  for(let i = 1; i <= 4; i++){
    const item = faqs[i - 1] || {};
    const q = document.getElementById(`faqQuestion${i}`);
    const a = document.getElementById(`faqAnswer${i}`);
    if(q) q.value = item.question || "";
    if(a) a.value = item.answer || "";
  }
}

function renderFaqItems(items){
  const list = document.getElementById("faqList");
  if(!list) return;

  const faqs = normalizeFaqItems(items || DEFAULT_DATA.faqItems);
  if(!faqs.length){
    list.innerHTML = `<div class="faq-card"><h3>FAQ belum tersedia</h3><p>Admin belum mengisi FAQ.</p></div>`;
    return;
  }

  list.innerHTML = faqs.map(item => `
    <div class="faq-card">
      <h3>${escapeHtml(item.question)}</h3>
      <p>${escapeHtml(item.answer)}</p>
    </div>
  `).join("");
}

function normalizeTermsItems(items){
  const source = Array.isArray(items)
    ? items
    : String(items || "").split("\n");

  return source
    .map(item => String(item || "").trim())
    .filter(Boolean);
}

function collectTermsInputs(fallback = DEFAULT_DATA.termsItems){
  const el = document.getElementById("termsText");
  if(!el){
    return normalizeTermsItems(fallback);
  }

  const items = normalizeTermsItems(el.value);
  return items.length ? items : normalizeTermsItems(fallback);
}

function fillTermsInputs(items){
  const el = document.getElementById("termsText");
  if(!el) return;
  el.value = normalizeTermsItems(items || DEFAULT_DATA.termsItems).join("\n");
}

function renderTermsItems(items){
  const list = document.getElementById("termsList");
  if(!list) return;

  const terms = normalizeTermsItems(items || DEFAULT_DATA.termsItems);
  if(!terms.length){
    list.innerHTML = `<li>Syarat dan ketentuan belum diisi admin.</li>`;
    return;
  }

  list.innerHTML = terms.map(item => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderTestimonials(items){
  const list = document.getElementById("testimonialList");
  if(!list) return;

  const valid = (Array.isArray(items) ? items : DEFAULT_DATA.testimonials)
    .map(item => String(item || "").trim())
    .filter(Boolean);

  list.innerHTML = valid.map((text, index) => `
    <div class="testimonial-card">
      <div>⭐⭐⭐⭐⭐</div>
      <p>"${escapeHtml(text)}"</p>
      <b>Customer ${index + 1}</b>
    </div>
  `).join("");
}

function stars(rating){
  const count = Math.max(1, Math.min(5, Number(rating) || 5));
  return "★".repeat(count) + "☆".repeat(5 - count);
}

function getApprovedReviews(){
  return Object.entries(reviews || {})
    .map(([id, item]) => ({ id, ...(item || {}) }))
    .filter(item => item.status === "approved")
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 6);
}

function renderReviewCards(items){
  const list = document.getElementById("testimonialList");
  if(!list) return;

  list.innerHTML = items.map(item => `
    <div class="testimonial-card">
      <div class="review-stars">${stars(item.rating)}</div>
      <p>"${escapeHtml(item.message || item.komentar || "")}"</p>
      <b>${escapeHtml(item.name || item.nama || "Customer StarZone")}</b>
    </div>
  `).join("");
}

function renderPublicReviews(){
  const approved = getApprovedReviews();
  const list = document.getElementById("testimonialList");
  if(!list) return;

  if(approved.length){
    renderReviewCards(approved);
  }else{
    list.innerHTML = `
      <div class="testimonial-card empty-review-card">
        <div>⭐</div>
        <p>Belum ada review customer.</p>
        <b>Review akan tampil realtime setelah customer mengirim ulasan.</b>
      </div>
    `;
  }
}

function getReviewLink(){
  return new URL("review.html", window.location.href).href;
}

function openReviewPage(){
  window.open(getReviewLink(), "_blank");
}


function setReviewRating(value){
  currentReviewRating = Number(value) || 5;
  const hidden = document.getElementById("reviewRating");
  if(hidden) hidden.value = currentReviewRating;

  const buttons = document.querySelectorAll("#starRating button");
  buttons.forEach((button, index) => {
    button.classList.toggle("active", index < currentReviewRating);
  });
}

async function submitReview(){
  if(!reviewsRef){
    alert("Firebase belum siap. Coba refresh halaman.");
    return;
  }

  const name = getInputValue("reviewName", "");
  const message = getInputValue("reviewMessage", "");
  const rating = Number(document.getElementById("reviewRating")?.value || currentReviewRating || 5);
  const alertBox = document.getElementById("reviewAlert");
  const successBox = document.getElementById("reviewSuccess");

  if(alertBox) alertBox.style.display = "none";
  if(successBox) successBox.style.display = "none";

  if(!name || !message){
    if(alertBox){
      alertBox.textContent = "Nama dan ulasan wajib diisi ya.";
      alertBox.style.display = "";
    }else{
      alert("Nama dan ulasan wajib diisi ya.");
    }
    return;
  }

  const id = `rv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const data = {
    name,
    rating,
    message,
    status:"approved",
    createdAt: Date.now()
  };

  try{
    await set(ref(window.db, `reviews/${id}`), data);
    document.getElementById("reviewName").value = "";
    document.getElementById("reviewMessage").value = "";
    setReviewRating(5);
    if(successBox) successBox.style.display = "";
  }catch(error){
    if(alertBox){
      alertBox.textContent = "Gagal kirim review. Cek koneksi/Firebase rules.";
      alertBox.style.display = "";
    }else{
      alert("Gagal kirim review. Cek koneksi/Firebase rules.");
    }
  }
}

function formatReviewDate(timestamp){
  if(!timestamp) return "-";
  return new Date(timestamp).toLocaleDateString("id-ID", { day:"numeric", month:"short", year:"numeric" });
}

function renderAdminReviews(){
  const list = document.getElementById("adminReviewList");
  if(!list) return;

  const items = Object.entries(reviews || {})
    .map(([id, item]) => ({ id, ...(item || {}) }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  if(!items.length){
    list.innerHTML = `<p class="empty-text">Belum ada review masuk.</p>`;
    return;
  }

  list.innerHTML = items.map(item => {
    const statusClass = item.status === "approved" ? "approved" : "pending";
    const statusText = item.status === "approved" ? "Tampil" : "Disembunyikan";
    return `
      <div class="admin-review-card">
        <div class="admin-review-top">
          <b>${escapeHtml(item.name || "Customer")}</b>
          <span class="review-status ${statusClass}">${statusText}</span>
        </div>
        <div class="review-stars small">${stars(item.rating)}</div>
        <p>"${escapeHtml(item.message || "")}"</p>
        <small>${formatReviewDate(item.createdAt)}</small>
        <div class="admin-review-actions">
          <button class="btn btn-green" type="button" onclick="setReviewStatus('${item.id}','approved')">Tampilkan</button>
          <button class="btn btn-cyan" type="button" onclick="setReviewStatus('${item.id}','pending')">Sembunyikan</button>
          <button class="btn btn-pink" type="button" onclick="deleteReview('${item.id}')">Hapus</button>
        </div>
      </div>
    `;
  }).join("");
}

async function setReviewStatus(id, status){
  try{
    await update(ref(window.db, `reviews/${id}`), { status });
  }catch(error){
    alert("Gagal update review. Cek Firebase rules.");
  }
}

async function deleteReview(id){
  if(!confirm("Hapus review ini?")) return;
  try{
    await set(ref(window.db, `reviews/${id}`), null);
  }catch(error){
    alert("Gagal hapus review. Cek Firebase rules.");
  }
}


function formatBookingDate(dateString){
  if(!dateString) return "-";
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("id-ID", { day:"numeric", month:"short", year:"numeric" });
}

function formatBookingCreated(timestamp){
  if(!timestamp) return "-";
  return new Date(timestamp).toLocaleString("id-ID", {
    day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit"
  });
}

function bookingStatusLabel(status){
  const map = {
    pending:"Pending",
    confirmed:"Dikonfirmasi",
    done:"Selesai",
    cancelled:"Batal"
  };
  return map[status] || "Pending";
}

function renderAdminBookingRequests(){
  const list = document.getElementById("adminBookingList");
  if(!list) return;

  const items = Object.entries(bookingRequests || {})
    .map(([id, item]) => ({ id, ...(item || {}) }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  if(!items.length){
    list.innerHTML = `<p class="empty-text">Belum ada booking masuk.</p>`;
    return;
  }

  list.innerHTML = items.map(item => {
    const status = item.status || "pending";
    return `
      <div class="admin-booking-card">
        <div class="admin-booking-top">
          <b>${escapeHtml(item.nama || "Customer")}</b>
          <span class="booking-status ${escapeHtml(status)}">${bookingStatusLabel(status)}</span>
        </div>
        <div class="booking-detail-grid">
          <span>Paket</span><strong>${escapeHtml(item.paket || "-")}</strong>
          <span>Tanggal</span><strong>${escapeHtml(formatBookingDate(item.tanggal))}</strong>
          <span>Jam Antar</span><strong>${escapeHtml(item.jamAntar || "-")} WIB</strong>
          <span>Durasi</span><strong>${escapeHtml(item.durasi || "-")}</strong>
          <span>No WA</span><strong>${escapeHtml(item.nomor || "-")}</strong>
          <span>Alamat</span><strong>${escapeHtml(item.alamat || "-")}</strong>
        </div>
        <small>Masuk: ${escapeHtml(formatBookingCreated(item.createdAt))}</small>
        <div class="admin-booking-actions">
          <button class="btn btn-cyan" type="button" onclick="openBookingCustomerWhatsApp('${item.id}')">Chat WA</button>
          <button class="btn btn-green" type="button" onclick="setBookingRequestStatus('${item.id}','confirmed')">Konfirmasi</button>
          <button class="btn" type="button" onclick="setBookingRequestStatus('${item.id}','done')">Selesai</button>
          <button class="btn btn-pink" type="button" onclick="setBookingRequestStatus('${item.id}','cancelled')">Batal</button>
          <button class="btn btn-pink" type="button" onclick="deleteBookingRequest('${item.id}')">Hapus</button>
        </div>
      </div>
    `;
  }).join("");
}

async function setBookingRequestStatus(id, status){
  try{
    await update(ref(window.db, `bookingRequests/${id}`), { status });
  }catch(error){
    alert("Gagal update status booking. Cek Firebase rules.");
  }
}

async function deleteBookingRequest(id){
  if(!confirm("Hapus data booking ini?")) return;
  try{
    await set(ref(window.db, `bookingRequests/${id}`), null);
  }catch(error){
    alert("Gagal hapus booking. Cek Firebase rules.");
  }
}

function openBookingCustomerWhatsApp(id){
  const item = bookingRequests[id];
  if(!item) return;

  const phone = normalizePhone(item.nomor);
  const text = `Halo kak ${item.nama || ""}, booking StarZone untuk ${item.paket || "paket"} tanggal ${item.tanggal || "-"} jam ${item.jamAntar || "-"} WIB akan kami konfirmasi ya.`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
}

function escapeHtml(text){
  return String(text).replace(/[&<>"]/g, function(match){
    return ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;"})[match];
  });
}

function loadWebsiteData(data){
  setImage("websiteLogo", data.logo || PLACEHOLDER);
  setImage("heroBanner", data.hero || data.nintendoImage || PLACEHOLDER);
  setImage("nintendoImg", data.nintendoImage || PLACEHOLDER);
  setImage("playboxImg", data.playboxImage || PLACEHOLDER);
  setImage("galleryImg1", data.gallery1 || data.nintendoImage || PLACEHOLDER);
  setImage("galleryImg2", data.gallery2 || data.playboxImage || PLACEHOLDER);
  setImage("galleryImg3", data.gallery3 || PLACEHOLDER);
  setImage("galleryImg4", data.gallery4 || PLACEHOLDER);

  setText("promoTitleText", data.promoTitle || DEFAULT_DATA.promoTitle);
  setText("promoBodyText", data.promoBody || DEFAULT_DATA.promoBody);
  setText("storeHoursText", data.storeHours || DEFAULT_DATA.storeHours);
  setText("nintendoBadgeText", data.nintendoBadge || DEFAULT_DATA.nintendoBadge);
  setText("playboxBadgeText", data.playboxBadge || DEFAULT_DATA.playboxBadge);

  const status = document.getElementById("storeStatusText");
  if(status){
    const isOpen = (data.storeStatus || "open") === "open";
    status.textContent = isOpen ? "OPEN" : "TUTUP";
    status.className = isOpen ? "store-status open" : "store-status closed";
  }

  const nintendoPrice = document.getElementById("nintendoPriceText");
  const nintendoPriceValue = data.nintendoPrice || DEFAULT_DATA.nintendoPrice;
  if(nintendoPrice) nintendoPrice.innerHTML = `Rp ${nintendoPriceValue} / hari`;
  setText("heroNintendoPriceText", `Rp ${nintendoPriceValue} / hari`);

  const playboxPrice = document.getElementById("playboxPriceText");
  const playboxPriceValue = data.playboxPrice || DEFAULT_DATA.playboxPrice;
  if(playboxPrice) playboxPrice.innerHTML = `Rp ${playboxPriceValue} / hari`;
  setText("heroPlayboxPriceText", `Rp ${playboxPriceValue} / hari`);

  setText("dashNintendoBadge", data.nintendoBadge || DEFAULT_DATA.nintendoBadge);
  setText("dashPlayboxBadge", data.playboxBadge || DEFAULT_DATA.playboxBadge);
  setText("dashNintendoPrice", `Rp ${data.nintendoPrice || DEFAULT_DATA.nintendoPrice}`);
  setText("dashPlayboxPrice", `Rp ${data.playboxPrice || DEFAULT_DATA.playboxPrice}`);

  renderGamePreviewPage(data.gamePreviews || DEFAULT_DATA.gamePreviews);
  renderTicker(data.runningText || DEFAULT_DATA.runningText);
  renderFaqItems(data.faqItems || DEFAULT_DATA.faqItems);
  renderTermsItems(data.termsItems || DEFAULT_DATA.termsItems);
  renderPublicReviews();

  const floatingWa = document.getElementById("floatingWa");
  if(floatingWa){
    const phone = normalizePhone(data.whatsappNumber);
    const text = encodeURIComponent("Halo Admin StarZone, saya mau tanya rental game.");
    floatingWa.href = `https://wa.me/${phone}?text=${text}`;
  }
}

function fillAdminWebsiteForm(data){
  const fieldMap = {
    whatsappNumber:"whatsappNumber",
    nintendoPrice:"nintendoPrice",
    playboxPrice:"playboxPrice",
    nintendoBadge:"nintendoBadge",
    playboxBadge:"playboxBadge",
    promoTitle:"promoTitle",
    promoBody:"promoBody",
    runningText:"runningText",
    storeStatus:"storeStatus",
    storeHours:"storeHours"
  };

  Object.entries(fieldMap).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if(el && data[key] !== undefined){
      el.value = data[key];
    }
  });

  fillGamePreviewInputs(data.gamePreviews || DEFAULT_DATA.gamePreviews);
  fillFaqInputs(data.faqItems || DEFAULT_DATA.faqItems);
  fillTermsInputs(data.termsItems || DEFAULT_DATA.termsItems);
}


// =========================
// STARZONE PIXEL OPENING
// Opening tidak otomatis. Klik logo untuk mulai.
// =========================
(function initStarZoneOpening(){
  let hideTimer = null;

  function resetIntroAnimations(loader){
    loader.querySelectorAll("*").forEach((el) => {
      el.style.animation = "none";
      void el.offsetWidth;
      el.style.animation = "";
    });
  }

  function hideOpening(){
    const loader = document.getElementById("szIntroLoader");
    if(!loader) return;

    if(hideTimer) window.clearTimeout(hideTimer);

    loader.classList.remove("sz-intro-active");
    loader.classList.add("sz-intro-hide");
    document.body.classList.remove("sz-intro-lock");
  }

  function createOpeningEffects(){
    const stars = document.getElementById("szIntroStars");
    const streaks = document.getElementById("szIntroStreaks");

    if(!stars || !streaks) return;

    stars.innerHTML = "";
    for(let i = 0; i < 70; i++){
      const star = document.createElement("span");
      star.className = "sz-intro-star";
      star.style.left = Math.random() * 100 + "%";
      star.style.top = 8 + Math.random() * 65 + "%";
      star.style.color = ["#00e5ff", "#ff4fcf", "#f5c518", "#39ff14"][Math.floor(Math.random() * 4)];
      star.style.animationDelay = (Math.random() * 2).toFixed(2) + "s";
      stars.appendChild(star);
    }

    streaks.innerHTML = "";
    for(let i = 0; i < 12; i++){
      const line = document.createElement("span");
      line.className = "sz-intro-streak";
      line.style.top = 14 + Math.random() * 58 + "%";
      line.style.left = "-120px";
      line.style.background = ["#00e5ff", "#ff4fcf", "#f5c518"][Math.floor(Math.random() * 3)];
      line.style.animationDelay = (Math.random() * 5).toFixed(2) + "s";
      line.style.animationDuration = (2.4 + Math.random() * 2.5).toFixed(2) + "s";
      streaks.appendChild(line);
    }
  }

  function playOpening(){
    const loader = document.getElementById("szIntroLoader");
    if(!loader) return;

    if(hideTimer) window.clearTimeout(hideTimer);

    createOpeningEffects();

    loader.classList.remove("sz-intro-hide");
    loader.classList.add("sz-intro-active");
    document.body.classList.add("sz-intro-lock");

    resetIntroAnimations(loader);

    hideTimer = window.setTimeout(hideOpening, 7200);
  }

  function setupOpeningTrigger(){
    const logoTrigger = document.getElementById("openIntroFooter");
    const skipBtn = document.getElementById("szIntroSkip");
    const loader = document.getElementById("szIntroLoader");

    if(loader){
      loader.classList.add("sz-intro-hide");
    }

    if(logoTrigger){
      logoTrigger.addEventListener("click", (event) => {
        event.preventDefault();
        playOpening();
      });
    }

    if(skipBtn){
      skipBtn.addEventListener("click", hideOpening);
    }
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", setupOpeningTrigger);
  }else{
    setupOpeningTrigger();
  }
})();


// =========================
// STARZONE PIXEL DASHBOARD LOOP
// Animasi + info di kotak hero kanan
// =========================
(function initPixelDashboardLoop(){
  function buildPixelDashboard(){
    const stars=document.getElementById("pixelDashboardStars");
    const streaks=document.getElementById("pixelDashboardStreaks");
    if(!stars||!streaks) return;
    stars.innerHTML="";
    for(let i=0;i<60;i++){
      const star=document.createElement("span");
      star.className="pixel-dashboard-star";
      star.style.left=Math.random()*100+"%";
      star.style.top=Math.random()*72+"%";
      star.style.color=["#00e5ff","#ff4fcf","#f5c518","#39ff14"][Math.floor(Math.random()*4)];
      star.style.animationDelay=(Math.random()*2).toFixed(2)+"s";
      stars.appendChild(star);
    }
    streaks.innerHTML="";
    for(let i=0;i<11;i++){
      const line=document.createElement("span");
      line.className="pixel-dashboard-streak";
      line.style.top=12+Math.random()*52+"%";
      line.style.left="-130px";
      line.style.background=["#00e5ff","#ff4fcf","#f5c518"][Math.floor(Math.random()*3)];
      line.style.animationDelay=(Math.random()*4).toFixed(2)+"s";
      line.style.animationDuration=(2.5+Math.random()*1.8).toFixed(2)+"s";
      streaks.appendChild(line);
    }
    const chips=Array.from(document.querySelectorAll(".dash-chip"));
    let activeIndex=0;
    if(window.__pixelDashboardLoopTimer){clearInterval(window.__pixelDashboardLoopTimer)}
    window.__pixelDashboardLoopTimer=setInterval(()=>{
      chips.forEach((chip,i)=>chip.classList.toggle("active",i===activeIndex));
      activeIndex=(activeIndex+1)%chips.length;
    },1400);
  }
  if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",buildPixelDashboard)}else{buildPixelDashboard()}
})();
