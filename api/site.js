const PASSWORD = process.env.FOODMALL_ADMIN_PASS || "admin";
const fs = require("fs");
const STORE = "/tmp/foodmall-site.json";
const REPO = process.env.FOODMALL_GITHUB_REPO || "NonsenseMaker-1/food-mall";
const BRANCH = process.env.FOODMALL_GITHUB_BRANCH || "main";
const FILE_PATH = "data/site.json";
const GH_TOKEN = process.env.FOODMALL_GITHUB_TOKEN || process.env.GITHUB_TOKEN || "";

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

function ghHeaders(extra) {
  const headers = Object.assign(
    {
      Accept: "application/vnd.github+json",
      "User-Agent": "food-mall-site",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    extra || {}
  );
  if (GH_TOKEN) headers.Authorization = "Bearer " + GH_TOKEN;
  return headers;
}

function usableSite(data) {
  return data && typeof data === "object" && !data.empty;
}

async function githubGet() {
  const url =
    "https://api.github.com/repos/" +
    REPO +
    "/contents/" +
    FILE_PATH +
    "?ref=" +
    encodeURIComponent(BRANCH);
  const res = await fetch(url, { headers: ghHeaders(), cache: "no-store" });
  if (res.status === 404) return { data: null, sha: null };
  if (!res.ok) {
    const err = new Error("github-get-" + res.status);
    err.status = res.status;
    throw err;
  }
  const body = await res.json();
  if (!body || !body.content) return { data: null, sha: body && body.sha };
  const text = Buffer.from(String(body.content).replace(/\n/g, ""), "base64").toString("utf8");
  return { data: JSON.parse(text), sha: body.sha };
}

async function githubPut(data, sha) {
  if (!GH_TOKEN) {
    const err = new Error("no-github-token");
    err.status = 503;
    throw err;
  }
  const payload = {
    message: "Save homepage content from admin",
    content: Buffer.from(JSON.stringify(data)).toString("base64"),
    branch: BRANCH,
  };
  if (sha) payload.sha = sha;
  const res = await fetch("https://api.github.com/repos/" + REPO + "/contents/" + FILE_PATH, {
    method: "PUT",
    headers: ghHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = new Error("github-put-" + res.status);
    err.status = res.status;
    throw err;
  }
  const body = await res.json();
  return body && body.content && body.content.sha;
}

async function loadStored() {
  const local = loadMemory();
  try {
    const remote = await githubGet();
    if (usableSite(remote.data)) {
      const localAt = local && local.savedAt ? Number(local.savedAt) : 0;
      const remoteAt = Number(remote.data.savedAt || 0);
      if (!usableSite(local) || remoteAt >= localAt) {
        saveMemory(remote.data);
        return remote.data;
      }
    }
  } catch (e) {}
  return usableSite(local) ? local : null;
}

async function persistStored(data) {
  saveMemory(data);
  let sha = null;
  try {
    const current = await githubGet();
    sha = current.sha;
  } catch (e) {}
  try {
    await githubPut(data, sha);
    return { durable: true };
  } catch (e) {
    if (e && e.status === 409) {
      const again = await githubGet();
      await githubPut(data, again.sha);
      return { durable: true };
    }
    throw e;
  }
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
    const stored = await loadStored();
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

  const prev = (await loadStored()) || {};
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
  try {
    const saved = await persistStored(next);
    json(res, 200, { ok: true, durable: !!saved.durable });
  } catch (e) {
    json(res, 503, { error: "persist", durable: false });
  }
};
