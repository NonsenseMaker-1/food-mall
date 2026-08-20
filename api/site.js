const PASSWORD = process.env.FOODMALL_ADMIN_PASS || "admin";
const fs = require("fs");
const STORE = "/tmp/foodmall-site.json";

let memory = null;

function loadMemory() {
  if (memory) return memory;
  try {
    if (fs.existsSync(STORE)) {
      memory = JSON.parse(fs.readFileSync(STORE, "utf8"));
    }
  } catch (e) {}
  return memory;
}

function saveMemory(data) {
  memory = data;
  try {
    fs.writeFileSync(STORE, JSON.stringify(data));
  } catch (e) {}
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function cleanBanner(raw) {
  const b = raw && typeof raw === "object" ? raw : {};
  return {
    enabled: !!b.enabled,
    important: !!b.important,
    text: String(b.text || "").slice(0, 80),
    link: String(b.link || "notice.html").slice(0, 80),
  };
}

function cleanPosts(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return list.slice(0, 30).map((p, i) => ({
    id: String(p.id || "n" + (i + 1)).slice(0, 40),
    title: String(p.title || "").slice(0, 80),
    body: String(p.body || "").slice(0, 4000),
    date: cleanDate(p.date),
    important: !!p.important,
  })).filter((p) => p.title);
}

function clip(v, n) {
  return String(v == null ? "" : v).slice(0, n);
}

function cleanDate(s) {
  const raw = String(s == null ? "" : s).trim();
  const m = raw.match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/);
  if (!m) return raw.slice(0, 20);
  const p = (n) => String(n).padStart(2, "0");
  return m[1] + "." + p(m[2]) + "." + p(m[3]);
}

function cleanShop(raw) {
  const s = raw && typeof raw === "object" ? raw : {};
  return {
    name: clip(s.name, 40),
    tagline: clip(s.tagline, 80),
    hoursWeek: clip(s.hoursWeek, 40),
    hoursWeekend: clip(s.hoursWeekend, 40),
    lunch: clip(s.lunch, 40),
    phone: clip(s.phone, 40),
    email: clip(s.email, 80),
  };
}

function cleanCompany(raw) {
  const c = raw && typeof raw === "object" ? raw : {};
  return {
    name: clip(c.name, 40),
    ceo: clip(c.ceo, 40),
    bizNo: clip(c.bizNo, 40),
    mailOrderNo: clip(c.mailOrderNo, 40),
    address: clip(c.address, 120),
    privacyOfficer: clip(c.privacyOfficer, 40),
    founded: clip(c.founded, 20),
    factory: clip(c.factory, 120),
  };
}

function cleanAbout(raw) {
  const a = raw && typeof raw === "object" ? raw : {};
  const values = Array.isArray(a.values) ? a.values : [];
  const facts = Array.isArray(a.facts) ? a.facts : [];
  return {
    slogan: clip(a.slogan, 80),
    lead: clip(a.lead, 200),
    greeting: clip(a.greeting, 2000),
    story: clip(a.story, 4000),
    vision: clip(a.vision, 1000),
    values: values.slice(0, 3).map((v) => ({ t: clip(v.t, 40), d: clip(v.d, 120) })),
    facts: facts.slice(0, 3).map((f) => ({ n: clip(f.n, 20), l: clip(f.l, 40) })),
  };
}

function cleanProducts(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return list.slice(0, 30).map((p, i) => ({
    id: clip(p.id || "p" + (i + 1), 40),
    name: clip(p.name, 80),
    spec: clip(p.spec, 80),
    category: clip(p.category, 40),
    categoryName: clip(p.categoryName, 40),
    price: clip(p.price, 40),
    intro: clip(p.intro, 400),
    origin: clip(p.origin, 80),
    volume: clip(p.volume, 80),
    expiry: clip(p.expiry, 80),
    storage: clip(p.storage, 80),
    ingredients: clip(p.ingredients, 400),
    image: clip(p.image, 2000000),
  })).filter((p) => p.name);
}

function cleanImagePos(raw) {
  const im = raw && typeof raw === "object" ? raw : {};
  const keys = ["hero", "company", "about", "notice", "products", "productPage", "contact"];
  const allowed = {
    "center 15%": 1,
    "center 35%": 1,
    "center center": 1,
    "center 70%": 1,
    "center 90%": 1,
    "left center": 1,
    "right center": 1,
  };
  const out = {};
  keys.forEach((k) => {
    if (allowed[im[k]]) out[k] = im[k];
  });
  return out;
}

function cleanImages(raw) {
  const im = raw && typeof raw === "object" ? raw : {};
  const keys = ["hero", "company", "about", "notice", "products", "productPage", "contact"];
  const out = {};
  keys.forEach((k) => {
    if (im[k]) out[k] = clip(im[k], 2000000);
  });
  return out;
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === "GET") {
    const stored = loadMemory();
    if (stored) {
      json(res, 200, stored);
      return;
    }
    json(res, 200, { empty: true });
    return;
  }

  if (req.method !== "POST") {
    json(res, 405, { error: "method" });
    return;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  let body = {};
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch (e) {
    json(res, 400, { error: "json" });
    return;
  }

  if (String(body.password || "") !== PASSWORD) {
    json(res, 401, { error: "unauthorized" });
    return;
  }

  if (body.check) {
    json(res, 200, { ok: true });
    return;
  }

  const prev = loadMemory() || {};
  const next = {
    banner: cleanBanner(body.banner != null ? body.banner : prev.banner),
    posts: body.posts != null ? cleanPosts(body.posts) : prev.posts || [],
    shop: body.shop != null ? cleanShop(body.shop) : prev.shop,
    company: body.company != null ? cleanCompany(body.company) : prev.company,
    about: body.about != null ? cleanAbout(body.about) : prev.about,
    products: body.products != null ? cleanProducts(body.products) : prev.products,
    images: body.images != null ? Object.assign({}, prev.images || {}, cleanImages(body.images)) : prev.images,
    imagePos: body.imagePos != null ? Object.assign({}, prev.imagePos || {}, cleanImagePos(body.imagePos)) : prev.imagePos,
    savedAt: body.savedAt || Date.now(),
    postsTouched: body.postsTouched || prev.postsTouched || false,
    productsTouched: body.productsTouched || prev.productsTouched || false,
  };
  if (body.posts != null) next.postsTouched = true;
  if (body.products != null) next.productsTouched = true;
  if (!next.postsTouched && (!next.posts || !next.posts.length) && prev.posts && prev.posts.length) {
    next.posts = prev.posts;
  }
  if (!next.productsTouched && (!next.products || !next.products.length) && prev.products && prev.products.length) {
    next.products = prev.products;
  }
  saveMemory(next);
  json(res, 200, { ok: true });
};
