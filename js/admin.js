function apiUrls() {
  const urls = [];
  if (window.FOODMALL_ADMIN_API) urls.push(window.FOODMALL_ADMIN_API);
  if (!urls.includes("/api/site")) urls.push("/api/site");
  if (!urls.includes("/api/notice")) urls.push("/api/notice");
  return urls;
}

function escText(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "." + p(d.getMonth() + 1) + "." + p(d.getDate());
}

function todayInput() {
  return window.toDateInput ? window.toDateInput(today()) : today().replace(/\./g, "-");
}

function newId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

const PHOTO_SLOTS = [
  { key: "hero", label: "메인 화면 큰 사진", frame: "hero", rw: 16, rh: 9, outW: 1600, outH: 900, wide: true },
  { key: "company", label: "회사소개 사진", frame: "company", rw: 3, rh: 2, outW: 1200, outH: 800 },
  { key: "about", label: "인사말 옆 사진", frame: "about", rw: 3, rh: 2, outW: 1200, outH: 800 },
  { key: "notice", label: "공지 상단 사진", frame: "banner", rw: 5, rh: 1, outW: 1600, outH: 320, wide: true },
  { key: "products", label: "제품 목록 상단 사진", frame: "banner", rw: 5, rh: 1, outW: 1600, outH: 320, wide: true },
  { key: "productPage", label: "제품 상세 상단 사진", frame: "banner", rw: 5, rh: 1, outW: 1600, outH: 320, wide: true },
  { key: "contact", label: "문의 상단 사진", frame: "banner", rw: 5, rh: 1, outW: 1600, outH: 320, wide: true },
];
const PRODUCT_CROP = { key: "product", label: "제품 사진", rw: 4, rh: 3, outW: 1000, outH: 750 };

const state = {
  banner: { enabled: false, important: false, text: "", link: "notice.html" },
  posts: [],
  shop: {},
  company: {},
  about: { values: [{}, {}, {}], facts: [{}, {}, {}] },
  products: [],
  images: {},
  imagePos: {},
};
let editingId = null;
let editingProductId = null;
let lastAddedId = "";
let productDraftImage = "";
const crop = {
  spec: null,
  img: null,
  scale: 1,
  minScale: 1,
  ox: 0,
  oy: 0,
  drag: false,
  dx: 0,
  dy: 0,
  objectUrl: "",
  done: null,
};

function slotByKey(key) {
  return PHOTO_SLOTS.find((s) => s.key === key);
}

function clamp(n, a, b) {
  return Math.min(b, Math.max(a, n));
}

function currentData() {
  const n = window.NOTICE || {};
  const posts = Array.isArray(window.NOTICE_POSTS) ? window.NOTICE_POSTS : [];
  return {
    banner: {
      enabled: !!n.enabled,
      important: !!n.important,
      text: n.text || "",
      link: n.link || "notice.html",
    },
    posts: posts.length
      ? posts.map((p) => Object.assign({ id: p.id || newId("n") }, p))
      : n.text
        ? [{ id: "n1", title: n.text, body: "", date: "", important: !!n.important }]
        : [],
    shop: Object.assign({}, window.SHOP || {}),
    company: Object.assign({}, window.COMPANY || {}),
    about: Object.assign({ values: [], facts: [] }, window.ABOUT || {}),
    products: (window.PRODUCTS || []).map((p) => Object.assign({}, p)),
    images: Object.assign({}, window.IMAGES || {}),
    imagePos: Object.assign({}, window.IMAGE_POS || {}),
  };
}

function mergeSite(base, extra) {
  if (!extra) return base;
  return {
    banner: extra.banner || base.banner,
    posts: Array.isArray(extra.posts) ? extra.posts : base.posts,
    shop: extra.shop || base.shop,
    company: extra.company || base.company,
    about: extra.about || base.about,
    products: extra.products && extra.products.length ? extra.products : base.products,
    images: Object.assign({}, base.images || {}, extra.images || {}),
    imagePos: Object.assign({}, base.imagePos || {}, extra.imagePos || {}),
  };
}

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function setVal(id, v) {
  const el = document.getElementById(id);
  if (el) el.value = v == null ? "" : v;
}

function bannerFromPosts(posts) {
  const pinned = (posts || []).find((p) => p.important);
  if (!pinned) {
    return { enabled: false, important: false, text: "", link: "notice.html" };
  }
  return {
    enabled: true,
    important: true,
    text: pinned.title,
    link: "notice.html",
  };
}

function sortNotices(posts) {
  return (posts || []).slice().sort((a, b) => {
    if (!!a.important !== !!b.important) return a.important ? -1 : 1;
    return String(b.date || "").localeCompare(String(a.date || ""));
  });
}

function readBanner() {
  return bannerFromPosts(state.posts);
}

function readShop() {
  return {
    name: val("shop-name"),
    tagline: val("shop-tagline"),
    phone: val("shop-phone"),
    email: val("shop-email"),
    hoursWeek: val("shop-hoursWeek"),
    hoursWeekend: val("shop-hoursWeekend"),
    lunch: (state.shop && state.shop.lunch) || "",
  };
}

function readCompany() {
  return {
    name: val("company-name"),
    ceo: val("company-ceo"),
    founded: (window.digitsOnly ? window.digitsOnly(val("company-founded")) : val("company-founded")).slice(0, 4) || val("company-founded"),
    bizNo: val("company-bizNo"),
    mailOrderNo: val("company-mailOrderNo"),
    address: val("company-address"),
    factory: val("company-factory"),
    privacyOfficer: val("company-privacyOfficer"),
  };
}

function readAbout() {
  return {
    slogan: val("about-slogan"),
    lead: val("about-lead"),
    greeting: val("about-greeting"),
    story: val("about-story"),
    vision: val("about-vision"),
    values: [0, 1, 2].map((i) => ({ t: val("v" + i + "-t"), d: val("v" + i + "-d") })),
    facts: [0, 1, 2].map((i) => ({
      n: window.formatCount ? window.formatCount(val("f" + i + "-n")) : val("f" + i + "-n"),
      l: val("f" + i + "-l"),
    })),
  };
}

function payload(extra) {
  return Object.assign({
    banner: state.banner,
    posts: state.posts,
    shop: state.shop,
    company: state.company,
    about: state.about,
    products: state.products,
    images: state.images,
    imagePos: state.imagePos,
  }, extra || {});
}

function preview() {
  const n = bannerFromPosts(state.posts);
  const box = document.getElementById("pin-preview");
  if (!box) return;
  if (!n.enabled) {
    box.innerHTML = '<p class="empty" style="padding:16px">중요 공지가 없으면 상단 띠는 꺼집니다.</p>';
    return;
  }
  box.innerHTML = `<div class="notice-bar"><div class="wrap"><span class="notice-tag">중요</span><span>${escText(n.text || "")}</span></div></div>`;
}

function noticeTable(posts, attr, extraHead) {
  if (!posts.length) return '<p class="empty">등록된 항목이 없습니다.</p>';
  const head3 = extraHead || "날짜";
  return `<table class="notice-table">
    <thead><tr><th>구분</th><th>제목</th><th>${head3}</th></tr></thead>
    <tbody>
    ${posts.map((p) => {
      const kind = p.important ? "중요" : p.kind || "공지";
      const kindClass = p.important ? "col-kind important" : "col-kind";
      const on = p.id === lastAddedId ? " class=\"just-added\"" : "";
      const third = extraHead === "가격"
        ? (window.formatWon ? window.formatWon(p.price) : p.price) || ""
        : (window.formatDotDate ? window.formatDotDate(p.date) : p.date) || "";
      return `<tr${on}>
        <td class="${kindClass}">${kind}</td>
        <td class="col-title"><button class="notice-title-btn" type="button" data-${attr}="${escText(p.id)}">${escText(p.title || p.name || "[이름 없음]")}</button></td>
        <td class="col-date">${escText(third)}</td>
      </tr>`;
    }).join("")}
    </tbody>
  </table>`;
}

function showNoticeList() {
  editingId = null;
  document.getElementById("list-view").hidden = false;
  document.getElementById("edit-view").hidden = true;
  state.posts = sortNotices(state.posts);
  document.getElementById("posts").innerHTML = noticeTable(state.posts, "open");
  preview();
}

function openNotice(id) {
  const isNew = id === "new";
  const post = isNew
    ? { id: newId("n"), title: "", body: "", date: today(), important: false }
    : state.posts.find((p) => p.id === id);
  if (!post) return;
  editingId = post.id;
  document.getElementById("list-view").hidden = true;
  document.getElementById("edit-view").hidden = false;
  document.getElementById("edit-heading").textContent = isNew ? "공지 쓰기" : "공지 고치기";
  setVal("p-title", post.title);
  setVal("p-date", window.toDateInput ? window.toDateInput(post.date || today()) : (post.date || today()));
  document.getElementById("p-important").checked = !!post.important;
  setVal("p-body", post.body);
  document.getElementById("del-post").hidden = isNew;
  if (isNew) state._newNotice = true;
  else state._newNotice = false;
}

function showProductList() {
  editingProductId = null;
  productDraftImage = "";
  document.getElementById("product-list-view").hidden = false;
  document.getElementById("product-edit-view").hidden = true;
  document.getElementById("product-list").innerHTML = noticeTable(
    state.products.map((p) => ({
      id: p.id,
      title: p.name,
      kind: "제품",
      price: p.price || "",
    })),
    "product",
    "가격"
  );
}

function openProduct(id) {
  const isNew = id === "new";
  const p = isNew
    ? {
        id: newId("p"),
        name: "",
        spec: "",
        category: "",
        categoryName: "",
        price: "",
        intro: "",
        origin: "",
        volume: "",
        expiry: "",
        storage: "",
        ingredients: "",
        image: "img/p-beef.jpg",
      }
    : state.products.find((x) => x.id === id);
  if (!p) return;
  editingProductId = p.id;
  productDraftImage = p.image || "";
  state._newProduct = isNew;
  document.getElementById("product-list-view").hidden = true;
  document.getElementById("product-edit-view").hidden = false;
  document.getElementById("product-heading").textContent = isNew ? "제품 추가" : "제품 고치기";
  setVal("pr-name", p.name);
  setVal("pr-price", window.formatWon ? window.formatWon(p.price) : p.price);
  setVal("pr-categoryName", p.categoryName);
  setVal("pr-intro", p.intro);
  setVal("pr-spec", p.spec);
  setVal("pr-origin", p.origin);
  setVal("pr-volume", p.volume);
  setVal("pr-storage", p.storage);
  setVal("pr-ingredients", p.ingredients);
  document.getElementById("pr-preview").src = p.image || "";
  document.getElementById("pr-file").value = "";
  document.getElementById("del-product").hidden = isNew;
}

function fillSiteFields() {
  const s = state.shop || {};
  const c = state.company || {};
  const a = state.about || {};
  setVal("shop-name", s.name);
  setVal("shop-tagline", s.tagline);
  setVal("shop-phone", s.phone);
  setVal("shop-email", s.email);
  setVal("shop-hoursWeek", s.hoursWeek);
  setVal("shop-hoursWeekend", s.hoursWeekend);
  setVal("company-name", c.name);
  setVal("company-ceo", c.ceo);
  setVal("company-founded", c.founded);
  setVal("company-bizNo", c.bizNo);
  setVal("company-mailOrderNo", c.mailOrderNo);
  setVal("company-address", c.address);
  setVal("company-factory", c.factory);
  setVal("company-privacyOfficer", c.privacyOfficer);
  setVal("about-slogan", a.slogan);
  setVal("about-lead", a.lead);
  setVal("about-greeting", a.greeting);
  setVal("about-story", a.story);
  setVal("about-vision", a.vision);
  const values = a.values || [];
  const facts = a.facts || [];
  [0, 1, 2].forEach((i) => {
    setVal("v" + i + "-t", (values[i] && values[i].t) || "");
    setVal("v" + i + "-d", (values[i] && values[i].d) || "");
    setVal("f" + i + "-n", window.formatCount ? window.formatCount((facts[i] && facts[i].n) || "") : ((facts[i] && facts[i].n) || ""));
    setVal("f" + i + "-l", (facts[i] && facts[i].l) || "");
  });
}

function renderPhotos() {
  const grid = document.getElementById("photo-grid");
  grid.innerHTML = PHOTO_SLOTS.map((slot) => {
    const src = (state.images && state.images[slot.key]) || "";
    return `<div class="photo-card${slot.wide ? " wide" : ""}">
      <label>${escText(slot.label)}</label>
      <div class="photo-frame ${escText(slot.frame)}">
        <img id="prev-${slot.key}" src="${escText(src)}" alt="">
      </div>
      <div class="row">
        <button class="btn" type="button" data-pick="${escText(slot.key)}">사진 고르기</button>
        <button class="btn ghost" type="button" data-recrop="${escText(slot.key)}"${src ? "" : " hidden"}>다시 자르기</button>
      </div>
      <input data-photo="${escText(slot.key)}" type="file" accept="image/jpeg,image/png,image/webp" hidden />
    </div>`;
  }).join("");
}

function setMsg(ok, text) {
  const msg = document.getElementById("save-msg");
  msg.className = ok ? "ok" : "err";
  msg.textContent = text || "";
}

async function adminPost(body) {
  let unauthorized = false;
  let lastErr = new Error("저장에 실패했습니다.");
  for (const url of apiUrls()) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        unauthorized = true;
        continue;
      }
      if (!res.ok) {
        lastErr = new Error("저장에 실패했습니다.");
        continue;
      }
      return res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  if (unauthorized) throw new Error("비밀번호가 올바르지 않습니다.");
  throw lastErr;
}

function saveHint(saved) {
  if (saved && saved.localOnly) {
    return "이 사이트에는 반영했습니다. 사진을 고른 뒤 홈페이지를 새로고침해 보세요.";
  }
  return "저장했습니다. 기존 글과 사진은 그대로 두고, 이번 수정만 반영했습니다.";
}

async function persist(extra, okText) {
  const password = sessionStorage.getItem("foodmall-admin") || "";
  const patch = {};
  ["banner", "posts", "shop", "company", "about", "products", "images", "imagePos"].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(extra || {}, key)) patch[key] = extra[key];
  });
  if (patch.banner) state.banner = patch.banner;
  if ("posts" in patch) state.posts = patch.posts;
  if (patch.shop) state.shop = patch.shop;
  if (patch.company) state.company = patch.company;
  if (patch.about) state.about = patch.about;
  if ("products" in patch) state.products = patch.products;
  if (patch.images) state.images = Object.assign({}, state.images, patch.images);
  if (patch.imagePos) state.imagePos = Object.assign({}, state.imagePos, patch.imagePos);
  patch.savedAt = Date.now();
  if ("posts" in patch) patch.postsTouched = true;
  if ("products" in patch) patch.productsTouched = true;
  const local = window.patchLocalSite ? window.patchLocalSite(patch) : null;
  const view = local || Object.assign({}, payload(), patch);
  window.NOTICE = view.banner;
  window.NOTICE_POSTS = view.posts;
  window.SHOP = view.shop;
  window.COMPANY = view.company;
  window.ABOUT = view.about;
  window.PRODUCTS = view.products;
  window.IMAGES = view.images;
  window.IMAGE_POS = view.imagePos || {};
  try {
    const saved = await adminPost(Object.assign({ password }, patch));
    setMsg(true, okText || saveHint(saved));
    return saved;
  } catch (ex) {
    if (local) {
      setMsg(true, okText || saveHint({ localOnly: true }));
      return { ok: true, localOnly: true };
    }
    setMsg(false, ex.message || "저장 실패");
    throw ex;
  }
}

function bindNumberFields() {
  const price = document.getElementById("pr-price");
  if (price && !price.dataset.boundWon) {
    price.dataset.boundWon = "1";
    price.addEventListener("input", () => {
      const d = window.digitsOnly ? window.digitsOnly(price.value) : price.value.replace(/[^\d]/g, "");
      price.value = d && window.formatWon ? window.formatWon(d) : d;
    });
  }
  [0, 1, 2].forEach((i) => {
    const el = document.getElementById("f" + i + "-n");
    if (!el || el.dataset.boundCount) return;
    el.dataset.boundCount = "1";
    el.addEventListener("input", () => {
      const d = window.digitsOnly ? window.digitsOnly(el.value) : el.value.replace(/[^\d]/g, "");
      el.value = d ? Number(d).toLocaleString("ko-KR") : "";
    });
  });
  const year = document.getElementById("company-founded");
  if (year && !year.dataset.boundYear) {
    year.dataset.boundYear = "1";
    year.addEventListener("input", () => {
      year.value = (window.digitsOnly ? window.digitsOnly(year.value) : year.value.replace(/[^\d]/g, "")).slice(0, 4);
    });
  }
}

function fillForm(data) {
  state.banner = data.banner || state.banner;
  state.posts = sortNotices(data.posts || []);
  state.banner = bannerFromPosts(state.posts);
  state.shop = data.shop || {};
  state.company = data.company || {};
  state.about = data.about || { values: [], facts: [] };
  state.products = data.products || [];
  state.images = data.images || {};
  state.imagePos = data.imagePos || {};
  fillSiteFields();
  renderPhotos();
  showNoticeList();
  showProductList();
  bindNumberFields();
}

function switchTab(name) {
  document.querySelectorAll("#tabs button").forEach((btn) => {
    btn.classList.toggle("on", btn.getAttribute("data-tab") === name);
  });
  document.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.hidden = panel.getAttribute("data-panel") !== name;
  });
  setMsg(true, "");
}

function fileToUrl(file) {
  return URL.createObjectURL(file);
}

function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("사진을 읽지 못했습니다."));
    img.src = src;
  });
}

function cropStage() {
  return document.getElementById("crop-stage");
}

function cropImageEl() {
  return document.getElementById("crop-img");
}

function fitCrop() {
  const stage = cropStage();
  const img = crop.img;
  if (!stage || !img) return;
  const sw = stage.clientWidth;
  const sh = stage.clientHeight;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  crop.minScale = Math.max(sw / iw, sh / ih);
  if (crop.scale < crop.minScale) crop.scale = crop.minScale;
  const scaledW = iw * crop.scale;
  const scaledH = ih * crop.scale;
  crop.ox = clamp(crop.ox, Math.min(0, sw - scaledW), 0);
  crop.oy = clamp(crop.oy, Math.min(0, sh - scaledH), 0);
  if (scaledW <= sw) crop.ox = (sw - scaledW) / 2;
  if (scaledH <= sh) crop.oy = (sh - scaledH) / 2;
  const el = cropImageEl();
  el.style.width = iw + "px";
  el.style.height = ih + "px";
  el.style.transformOrigin = "0 0";
  el.style.transform = "translate(" + crop.ox + "px," + crop.oy + "px) scale(" + crop.scale + ")";
  const zoom = document.getElementById("crop-zoom");
  zoom.min = "100";
  zoom.max = "280";
  zoom.value = String(Math.round((crop.scale / crop.minScale) * 100));
}

function closeCrop() {
  document.getElementById("crop-modal").hidden = true;
  if (crop.objectUrl) {
    URL.revokeObjectURL(crop.objectUrl);
    crop.objectUrl = "";
  }
  crop.img = null;
  crop.done = null;
  crop.spec = null;
}

async function openCrop(spec, src, objectUrl) {
  crop.spec = spec;
  crop.objectUrl = objectUrl || "";
  crop.done = null;
  const modal = document.getElementById("crop-modal");
  const stage = cropStage();
  document.getElementById("crop-title").textContent = spec.label + " 자르기";
  stage.style.aspectRatio = spec.rw + " / " + spec.rh;
  modal.hidden = false;
  try {
    const img = await loadImg(src);
    crop.img = img;
    cropImageEl().src = src;
    crop.scale = 0;
    crop.ox = 0;
    crop.oy = 0;
    requestAnimationFrame(() => fitCrop());
  } catch (e) {
    closeCrop();
    throw e;
  }
  return new Promise((resolve) => {
    crop.done = (data) => resolve(data || "");
  });
}

function cropToData() {
  const stage = cropStage();
  const img = crop.img;
  const spec = crop.spec;
  const sw = stage.clientWidth;
  const sh = stage.clientHeight;
  const sx = -crop.ox / crop.scale;
  const sy = -crop.oy / crop.scale;
  const sWidth = sw / crop.scale;
  const sHeight = sh / crop.scale;
  const canvas = document.createElement("canvas");
  canvas.width = spec.outW;
  canvas.height = spec.outH;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, spec.outW, spec.outH);
  return window.canvasToJpeg ? window.canvasToJpeg(canvas) : canvas.toDataURL("image/jpeg", 0.82);
}

async function cropFromFile(spec, file) {
  const url = fileToUrl(file);
  try {
    return await openCrop(spec, url, url);
  } catch (e) {
    if (e && e.message === "cancelled") return "";
    throw e;
  }
}

async function cropFromSrc(spec, src) {
  try {
    return await openCrop(spec, src, "");
  } catch (e) {
    if (e && e.message === "cancelled") return "";
    throw e;
  }
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const password = document.getElementById("password").value;
  const err = document.getElementById("login-err");
  err.textContent = "";
  try {
    await adminPost({ password, check: true });
    sessionStorage.setItem("foodmall-admin", password);
    document.getElementById("login-form").hidden = true;
    document.getElementById("edit-form").hidden = false;
    let data = currentData();
    const local = window.loadLocalSite && window.loadLocalSite();
    let remote = null;
    try {
      const res = await fetch("/api/site", { cache: "no-store" });
      if (res.ok) remote = await res.json();
    } catch (loadErr) {}
    if (window.combineSite) data = window.combineSite(data, local, remote);
    else {
      if (local) data = mergeSite(data, local);
      if (remote && !remote.empty) data = mergeSite(data, remote);
    }
    fillForm(data);
  } catch (ex) {
    err.textContent = ex.message || "들어갈 수 없습니다.";
  }
});

document.getElementById("tabs").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-tab]");
  if (btn) switchTab(btn.getAttribute("data-tab"));
});

document.getElementById("posts").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-open]");
  if (!btn) return;
  openNotice(btn.getAttribute("data-open"));
});

document.getElementById("add-post").addEventListener("click", () => openNotice("new"));
document.getElementById("back-list").addEventListener("click", showNoticeList);

document.getElementById("save-post").addEventListener("click", async () => {
  const post = {
    id: editingId || newId("n"),
    title: val("p-title"),
    date: window.formatDotDate ? window.formatDotDate(val("p-date") || today()) : (val("p-date") || today()),
    important: document.getElementById("p-important").checked,
    body: val("p-body"),
  };
  if (!post.title) {
    setMsg(false, "제목을 적어 주세요.");
    return;
  }
  const idx = state.posts.findIndex((p) => p.id === post.id);
  if (idx >= 0) state.posts[idx] = post;
  else state.posts.unshift(post);
  state.posts = sortNotices(state.posts);
  state.banner = bannerFromPosts(state.posts);
  lastAddedId = post.id;
  try {
    await persist({ banner: state.banner, posts: state.posts }, "적용했습니다. 중요 공지는 맨 위와 상단에 표시됩니다.");
    showNoticeList();
  } catch (ex) {
    setMsg(false, ex.message || "저장 실패");
  }
});

document.getElementById("del-post").addEventListener("click", async () => {
  if (!editingId) return showNoticeList();
  if (!window.confirm("이 글을 삭제할까요?")) return;
  state.posts = state.posts.filter((p) => p.id !== editingId);
  state.banner = bannerFromPosts(state.posts);
  try {
    await persist({ banner: state.banner, posts: state.posts }, "삭제했습니다.");
    lastAddedId = "";
    showNoticeList();
  } catch (ex) {
    setMsg(false, ex.message || "삭제 실패");
  }
});

document.getElementById("save-site").addEventListener("click", async () => {
  state.shop = readShop();
  state.company = readCompany();
  state.about = readAbout();
  try {
    await persist({ shop: state.shop, company: state.company, about: state.about });
  } catch (ex) {
    setMsg(false, ex.message || "저장 실패");
  }
});

document.getElementById("product-list").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-product]");
  if (!btn) return;
  openProduct(btn.getAttribute("data-product"));
});

document.getElementById("add-product").addEventListener("click", () => openProduct("new"));
document.getElementById("back-products").addEventListener("click", showProductList);

document.getElementById("pr-pick").addEventListener("click", () => {
  document.getElementById("pr-file").click();
});

document.getElementById("pr-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const data = await cropFromFile(PRODUCT_CROP, file);
    if (!data) return;
    productDraftImage = data;
    document.getElementById("pr-preview").src = data;
  } catch (ex) {
    setMsg(false, ex.message);
  }
});

document.getElementById("save-product").addEventListener("click", async () => {
  const item = {
    id: editingProductId || newId("p"),
    name: val("pr-name"),
    categoryName: val("pr-categoryName"),
    category: val("pr-categoryName"),
    intro: val("pr-intro"),
    spec: val("pr-spec"),
    origin: val("pr-origin"),
    volume: val("pr-volume"),
    storage: val("pr-storage"),
    ingredients: val("pr-ingredients"),
    price: window.formatWon ? window.formatWon(val("pr-price")) : val("pr-price"),
    expiry: "",
    image: productDraftImage || "img/p-beef.jpg",
  };
  if (!item.name) {
    setMsg(false, "제품명을 적어 주세요.");
    return;
  }
  const idx = state.products.findIndex((p) => p.id === item.id);
  if (idx >= 0) state.products[idx] = Object.assign({}, state.products[idx], item);
  else state.products.push(item);
  lastAddedId = item.id;
  try {
    await persist({ products: state.products }, "제품을 저장했습니다.");
    showProductList();
  } catch (ex) {
    setMsg(false, ex.message || "저장 실패");
  }
});

document.getElementById("del-product").addEventListener("click", async () => {
  if (!editingProductId) return showProductList();
  if (!window.confirm("이 제품을 삭제할까요?")) return;
  state.products = state.products.filter((p) => p.id !== editingProductId);
  try {
    await persist({ products: state.products }, "삭제했습니다.");
    lastAddedId = "";
    showProductList();
  } catch (ex) {
    setMsg(false, ex.message || "삭제 실패");
  }
});

document.getElementById("photo-grid").addEventListener("click", (e) => {
  const pick = e.target.closest("[data-pick]");
  if (pick) {
    const key = pick.getAttribute("data-pick");
    const input = document.querySelector('[data-photo="' + key + '"]');
    if (input) input.click();
    return;
  }
  const recrop = e.target.closest("[data-recrop]");
  if (!recrop) return;
  const key = recrop.getAttribute("data-recrop");
  const spec = slotByKey(key);
  const src = state.images && state.images[key];
  if (!spec || !src) return;
  cropFromSrc(spec, src).then(async (data) => {
    if (!data) return;
    state.images = Object.assign({}, state.images, { [key]: data });
    const prev = document.getElementById("prev-" + key);
    if (prev) prev.src = data;
    await persist({ images: state.images }, "자른 사진을 저장했습니다. 홈페이지를 새로고침하면 바뀝니다.");
    renderPhotos();
  }).catch((ex) => setMsg(false, ex.message));
});

document.getElementById("photo-grid").addEventListener("change", async (e) => {
  const input = e.target.closest("[data-photo]");
  if (!input) return;
  const file = input.files[0];
  input.value = "";
  if (!file) return;
  const key = input.getAttribute("data-photo");
  const spec = slotByKey(key);
  if (!spec) return;
  try {
    const data = await cropFromFile(spec, file);
    if (!data) return;
    state.images = Object.assign({}, state.images, { [key]: data });
    const prev = document.getElementById("prev-" + key);
    if (prev) prev.src = data;
    await persist({ images: state.images }, "자른 사진을 저장했습니다. 홈페이지를 새로고침하면 바뀝니다.");
    renderPhotos();
  } catch (ex) {
    setMsg(false, ex.message);
  }
});

document.getElementById("save-photos").addEventListener("click", async () => {
  try {
    await persist({ images: state.images }, "사진을 저장했습니다.");
  } catch (ex) {
    setMsg(false, ex.message || "저장 실패");
  }
});

(function bindCropUi() {
  const stage = document.getElementById("crop-stage");
  const zoom = document.getElementById("crop-zoom");
  if (!stage || !zoom) return;
  stage.addEventListener("pointerdown", (e) => {
    if (!crop.img) return;
    crop.drag = true;
    crop.dx = e.clientX - crop.ox;
    crop.dy = e.clientY - crop.oy;
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", (e) => {
    if (!crop.drag) return;
    crop.ox = e.clientX - crop.dx;
    crop.oy = e.clientY - crop.dy;
    fitCrop();
  });
  const stopDrag = () => { crop.drag = false; };
  stage.addEventListener("pointerup", stopDrag);
  stage.addEventListener("pointercancel", stopDrag);
  stage.addEventListener("wheel", (e) => {
    if (!crop.img) return;
    e.preventDefault();
    zoom.value = String(clamp(Number(zoom.value) + (e.deltaY > 0 ? -8 : 8), 100, 280));
    zoom.dispatchEvent(new Event("input"));
  }, { passive: false });
  zoom.addEventListener("input", () => {
    if (!crop.img) return;
    const sw = stage.clientWidth;
    const sh = stage.clientHeight;
    const next = crop.minScale * (Number(zoom.value) / 100);
    const imgX = (sw / 2 - crop.ox) / crop.scale;
    const imgY = (sh / 2 - crop.oy) / crop.scale;
    crop.scale = next;
    crop.ox = sw / 2 - imgX * crop.scale;
    crop.oy = sh / 2 - imgY * crop.scale;
    fitCrop();
  });
  document.getElementById("crop-ok").addEventListener("click", () => {
    if (!crop.img || !crop.spec) return;
    const data = cropToData();
    const done = crop.done;
    closeCrop();
    if (done) done(data);
  });
  document.getElementById("crop-cancel").addEventListener("click", () => {
    const done = crop.done;
    closeCrop();
    if (done) done("");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (document.getElementById("crop-modal").hidden) return;
    const done = crop.done;
    closeCrop();
    if (done) done("");
  });
})();
