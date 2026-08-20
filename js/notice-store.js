window.FOODMALL_ADMIN_API = "/api/site";
window.FOODMALL_SITE_KEY = "foodmall-site";

function fallbackSiteData() {
  return {
    banner: window.NOTICE,
    posts: Array.isArray(window.NOTICE_POSTS) ? window.NOTICE_POSTS : [],
    shop: window.SHOP,
    company: window.COMPANY,
    about: window.ABOUT,
    products: window.PRODUCTS,
    images: window.IMAGES,
    imagePos: window.IMAGE_POS,
  };
}

window.digitsOnly = function digitsOnly(s) {
  return String(s == null ? "" : s).replace(/[^\d]/g, "");
};

window.formatWon = function formatWon(s) {
  const raw = String(s == null ? "" : s).trim();
  if (!raw || raw.indexOf("[") >= 0) return raw;
  const d = window.digitsOnly(raw);
  if (!d) return raw;
  return Number(d).toLocaleString("ko-KR") + "원";
};

window.formatDotDate = function formatDotDate(s) {
  const raw = String(s == null ? "" : s).trim();
  if (!raw || raw.indexOf("[") >= 0) return raw;
  const m = raw.match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/);
  if (m) {
    return m[1] + "." + String(m[2]).padStart(2, "0") + "." + String(m[3]).padStart(2, "0");
  }
  const d = window.digitsOnly(raw);
  if (d.length === 8) return d.slice(0, 4) + "." + d.slice(4, 6) + "." + d.slice(6, 8);
  return raw;
};

window.toDateInput = function toDateInput(s) {
  const dot = window.formatDotDate(s);
  const m = String(dot).match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  return m ? m[1] + "-" + m[2] + "-" + m[3] : "";
};

window.formatCount = function formatCount(s) {
  const raw = String(s == null ? "" : s).trim();
  if (!raw || raw.indexOf("[") >= 0) return raw;
  const m = raw.match(/^([\d,.\s]+)(.*)$/);
  if (!m) return raw;
  const d = window.digitsOnly(m[1]);
  if (!d) return raw;
  return Number(d).toLocaleString("ko-KR") + String(m[2] || "");
};

window.loadLocalSite = function loadLocalSite() {
  try {
    const raw = localStorage.getItem(window.FOODMALL_SITE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    return data;
  } catch (e) {
    return null;
  }
};

function asList(v) {
  return Array.isArray(v) ? v : [];
}

function pickList(hasKey, incoming, prev, fallback) {
  if (hasKey) return asList(incoming);
  const a = asList(prev);
  const b = asList(fallback);
  return a.length >= b.length ? a : b;
}

function pickObj(incoming, prev, fallback) {
  if (incoming && typeof incoming === "object") return incoming;
  if (prev && typeof prev === "object") return prev;
  return fallback || {};
}

function pickLiveImages(a, b) {
  const out = {};
  [b, a].forEach((im) => {
    if (!im || typeof im !== "object") return;
    Object.keys(im).forEach((k) => {
      if (window.isLiveImage && window.isLiveImage(im[k])) out[k] = im[k];
      else if (!window.isLiveImage && im[k]) out[k] = im[k];
    });
  });
  return out;
}

window.isLiveImage = function isLiveImage(url) {
  const s = String(url || "").trim();
  if (!s) return false;
  if (s.indexOf("data:image/") === 0 || s.indexOf("blob:") === 0) return true;
  if (/^img\/(banner\d+\.jpg|p-|cat-)/i.test(s)) return false;
  return true;
};

window.combineSite = function combineSite(defaults, local, remote) {
  const base = defaults && typeof defaults === "object" ? defaults : {};
  const loc = local && typeof local === "object" && !local.empty ? local : null;
  const rem = remote && typeof remote === "object" && !remote.empty ? remote : null;
  if (!loc && !rem) return base;
  const newer = loc && rem ? ((loc.savedAt || 0) >= (rem.savedAt || 0) ? loc : rem) : loc || rem;
  const older = loc && rem ? ((loc.savedAt || 0) >= (rem.savedAt || 0) ? rem : loc) : {};
  const list = (key, touched) => {
    if (newer[touched]) return asList(newer[key]);
    if (older[touched]) return asList(older[key]);
    const a = asList(newer[key]);
    const b = asList(older[key]);
    const c = asList(base[key]);
    return [a, b, c].sort((x, y) => y.length - x.length)[0];
  };
  return {
    banner: pickObj(newer.banner, older.banner, base.banner),
    posts: list("posts", "postsTouched"),
    shop: pickObj(newer.shop, older.shop, base.shop),
    company: pickObj(newer.company, older.company, base.company),
    about: pickObj(newer.about, older.about, base.about),
    products: list("products", "productsTouched"),
    images: pickLiveImages(newer.images, older.images),
    imagePos: Object.assign({}, older.imagePos || {}, newer.imagePos || {}),
    savedAt: newer.savedAt || older.savedAt || 0,
    postsTouched: !!(newer.postsTouched || older.postsTouched),
    productsTouched: !!(newer.productsTouched || older.productsTouched),
  };
};

window.patchLocalSite = function patchLocalSite(patch) {
  const prev = window.loadLocalSite() || {};
  const next = Object.assign({}, prev, { savedAt: Date.now() });
  if (patch.banner) next.banner = patch.banner;
  if ("posts" in patch) {
    next.posts = asList(patch.posts);
    next.postsTouched = true;
  }
  if (patch.shop) next.shop = patch.shop;
  if (patch.company) next.company = patch.company;
  if (patch.about) next.about = patch.about;
  if ("products" in patch) {
    next.products = asList(patch.products);
    next.productsTouched = true;
  }
  if (patch.images) next.images = Object.assign({}, prev.images || {}, patch.images);
  if (patch.imagePos) next.imagePos = Object.assign({}, prev.imagePos || {}, patch.imagePos);
  try {
    localStorage.setItem(window.FOODMALL_SITE_KEY, JSON.stringify(next));
    return next;
  } catch (e) {
    return null;
  }
};

window.saveLocalSite = function saveLocalSite(data) {
  return !!window.patchLocalSite(data || {});
};

window.canvasToJpeg = function canvasToJpeg(canvas) {
  let q = 0.82;
  let out = canvas.toDataURL("image/jpeg", q);
  while (out.length > 240000 && q > 0.42) {
    q -= 0.1;
    out = canvas.toDataURL("image/jpeg", q);
  }
  return out;
};

window.compressImageFile = function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    const img = new Image();
    const obj = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1400;
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (w > max || h > max) {
        const scale = max / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, w);
      canvas.height = Math.max(1, h);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(obj);
      resolve(window.canvasToJpeg(canvas));
    };
    img.onerror = () => {
      URL.revokeObjectURL(obj);
      reject(new Error("이 사진 형식은 쓸 수 없습니다. jpg, png 파일로 올려 주세요."));
    };
    img.src = obj;
  });
};

window.loadSiteNotice = async function loadSiteNotice() {
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = setTimeout(() => {
    if (ctrl) ctrl.abort();
  }, 8000);
  try {
    const res = await fetch(window.FOODMALL_ADMIN_API, {
      method: "GET",
      cache: "no-store",
      signal: ctrl ? ctrl.signal : undefined,
    });
    if (!res.ok) return window.combineSite(fallbackSiteData(), window.loadLocalSite(), null);
    const data = await res.json();
    return window.combineSite(fallbackSiteData(), window.loadLocalSite(), data);
  } catch (e) {
    return window.combineSite(fallbackSiteData(), window.loadLocalSite(), null);
  } finally {
    clearTimeout(timer);
  }
};
