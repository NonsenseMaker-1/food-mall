function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

function showPrice(v) {
  const formatted = window.formatWon ? window.formatWon(v) : v;
  return formatted ? `<div class="price">${esc(formatted)}</div>` : "";
}

function productCard(p) {
  const price = showPrice(p.price);
  const live = window.isLiveImage ? window.isLiveImage(p.image) : !!p.image;
  const img = live ? `<img src="${p.image}" alt="${esc(p.name)}" loading="lazy" decoding="async">` : "";
  return `
    <a class="card reveal" href="product.html?id=${p.id}">
      <div class="thumb">${img}</div>
      <div class="card-body">
        <div class="cat-name">${p.categoryName}</div>
        <h3>${p.name}</h3>
        <div class="spec">${p.intro}</div>
        ${price}
        <span class="more">자세히 보기</span>
      </div>
    </a>`;
}

function renderHeader() {
  const s = window.SHOP;
  const page = document.body.dataset.page;
  const on = (key) => (page === key ? "on" : "");
  return `
  <header class="header">
    <div class="wrap">
      <a class="logo" href="index.html">
        <div class="mark">食</div>
        <div>
          <strong>${s.name}</strong>
          <span>${s.tagline}</span>
        </div>
      </a>
      <nav class="gnb">
        <a href="index.html#company" class="${on("about")}">회사소개</a>
        <a href="index.html#products" class="${on("products")} ${on("product")}">제품소개</a>
        <a href="notice.html" class="${on("notice")}">공지</a>
        <a href="index.html#contact" class="${on("contact")}">문의</a>
      </nav>
      <button class="menu-btn" type="button" aria-label="메뉴 열기" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>
  <div class="nav-overlay" hidden></div>
  <aside class="drawer" hidden>
    <div class="drawer-head">
      <strong>목차</strong>
      <button class="drawer-close" type="button" aria-label="닫기">×</button>
    </div>
    <a href="index.html">홈</a>
    <a href="index.html#company">회사소개</a>
    <a href="index.html#products">제품소개</a>
    <a href="notice.html" class="${on("notice")}">공지</a>
    <a href="index.html#contact">문의</a>
  </aside>`;
}

function bindMenu() {
  const btn = document.querySelector(".menu-btn");
  const drawer = document.querySelector(".drawer");
  const overlay = document.querySelector(".nav-overlay");
  const closeBtn = document.querySelector(".drawer-close");
  if (!btn || !drawer || !overlay) return;

  const open = () => {
    drawer.hidden = false;
    overlay.hidden = false;
    requestAnimationFrame(() => {
      drawer.classList.add("open");
      overlay.classList.add("open");
    });
    btn.classList.add("open");
    btn.setAttribute("aria-expanded", "true");
    document.body.classList.add("menu-on");
  };
  const close = () => {
    drawer.classList.remove("open");
    overlay.classList.remove("open");
    btn.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-on");
    setTimeout(() => {
      if (!drawer.classList.contains("open")) {
        drawer.hidden = true;
        overlay.hidden = true;
      }
    }, 220);
  };

  btn.addEventListener("click", () => (btn.classList.contains("open") ? close() : open()));
  overlay.addEventListener("click", close);
  closeBtn?.addEventListener("click", close);
  drawer.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
}

function renderFooter() {
  const c = window.COMPANY;
  const s = window.SHOP;
  return `
  <footer class="footer">
    <div class="wrap">
      <div class="footer-links">
        <a href="index.html#company">회사소개</a>
        <a href="index.html#products">제품소개</a>
        <a href="notice.html">공지</a>
        <a href="index.html#contact">문의</a>
        <a href="terms.html">이용약관</a>
        <a class="em" href="privacy.html">개인정보처리방침</a>
        <a href="refund.html">교환/반품</a>
      </div>
      <div class="biz">
        상호 <b>${c.name}</b> | 대표 <b>${c.ceo}</b> | 사업자등록번호 <b>${c.bizNo}</b><br>
        통신판매업신고 <b>${c.mailOrderNo}</b> | 개인정보관리책임자 <b>${c.privacyOfficer}</b><br>
        주소 <b>${c.address}</b> | 전화 <b>${s.phone}</b> | 이메일 <b>${s.email}</b>
      </div>
    </div>
  </footer>`;
}

function fill(sel, list, instant) {
  const el = document.querySelector(sel);
  if (el) {
    el.innerHTML = list.map(productCard).join("");
    if (instant) el.querySelectorAll(".reveal").forEach((n) => n.classList.add("in"));
  }
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function noticeSig(n) {
  return (n.text || "") + "|" + (n.important ? "1" : "0");
}

function isNoticeDismissed(n) {
  try {
    const saved = JSON.parse(localStorage.getItem("foodmall-notice-dismiss") || "null");
    if (!saved || saved.sig !== noticeSig(n)) return false;
    return Date.now() - Number(saved.at) < 24 * 60 * 60 * 1000;
  } catch (e) {
    return false;
  }
}

function renderNoticeBar() {
  const n = window.NOTICE;
  document.body.classList.remove("has-notice");
  if (!n || !n.enabled || !n.text) return;
  if (isNoticeDismissed(n)) return;
  const bar = document.createElement("div");
  bar.className = "notice-bar";
  const text = esc(n.text);
  const tag = n.important ? "중요" : "공지";
  const inner = n.link
    ? `<a href="${esc(n.link)}">${text}</a>`
    : `<span>${text}</span>`;
  bar.innerHTML = `<div class="wrap"><span class="notice-tag">${tag}</span>${inner}<button class="notice-close" type="button" aria-label="공지 닫기">×</button></div>`;
  const headerRoot = document.getElementById("site-header");
  if (!headerRoot) return;
  headerRoot.prepend(bar);
  document.body.classList.add("has-notice");
  bar.querySelector(".notice-close").addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      localStorage.setItem(
        "foodmall-notice-dismiss",
        JSON.stringify({ sig: noticeSig(n), at: Date.now() })
      );
    } catch (err) {}
    bar.remove();
    document.body.classList.remove("has-notice");
  });
}

function loadScript(src) {
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

function sortNotices(posts) {
  return (posts || []).slice().sort((a, b) => {
    if (!!a.important !== !!b.important) return a.important ? -1 : 1;
    return String(b.date || "").localeCompare(String(a.date || ""));
  });
}

function applyPinnedNotice() {
  const pinned = sortNotices(window.NOTICE_POSTS).find((p) => p.important);
  if (pinned) {
    window.NOTICE = {
      enabled: true,
      important: true,
      text: pinned.title,
      link: "notice.html",
    };
    return;
  }
  if (window.NOTICE) window.NOTICE.enabled = false;
}

function liveUrl(url) {
  return window.isLiveImage ? window.isLiveImage(url) : !!String(url || "").trim();
}

function dropSampleMedia() {
  const images = window.IMAGES || {};
  const next = {};
  Object.keys(images).forEach((k) => {
    if (liveUrl(images[k])) next[k] = images[k];
  });
  window.IMAGES = next;
  window.PRODUCTS = (window.PRODUCTS || []).map((p) => {
    if (liveUrl(p.image)) return p;
    return Object.assign({}, p, { image: "" });
  });
}

function applyImages() {
  const im = window.IMAGES || {};
  const pos = window.IMAGE_POS || {};
  const at = (key) => pos[key] || "center center";
  const src = (el, url, key) => {
    if (!el) return;
    if (!liveUrl(url)) {
      el.removeAttribute("src");
      return;
    }
    el.src = url;
    el.style.objectPosition = at(key);
  };
  const bg = (el, url, key) => {
    if (!el) return;
    if (!liveUrl(url)) {
      el.style.backgroundImage = "";
      return;
    }
    el.style.backgroundImage = 'url("' + String(url).replace(/"/g, "%22") + '")';
    el.style.backgroundSize = "cover";
    el.style.backgroundRepeat = "no-repeat";
    el.style.backgroundPosition = at(key);
  };
  src(document.getElementById("img-hero"), im.hero, "hero");
  src(document.getElementById("img-company"), im.company, "company");
  src(document.getElementById("img-about"), im.about, "about");
  bg(document.getElementById("banner-about"), im.company, "company");
  bg(document.getElementById("banner-notice"), im.notice, "notice");
  bg(document.getElementById("banner-products"), im.products, "products");
  bg(document.getElementById("banner-product"), im.productPage, "productPage");
  bg(document.getElementById("banner-contact"), im.contact, "contact");
  bg(document.getElementById("img-map"), im.contact, "contact");
}

function applySiteData(site) {
  if (!site || site.empty) return;
  const merged = window.combineSite
    ? window.combineSite({
        banner: window.NOTICE,
        posts: window.NOTICE_POSTS,
        shop: window.SHOP,
        company: window.COMPANY,
        about: window.ABOUT,
        products: window.PRODUCTS,
        images: window.IMAGES,
        imagePos: window.IMAGE_POS,
      }, window.loadLocalSite && window.loadLocalSite(), site)
    : site;
  if (merged.banner) window.NOTICE = merged.banner;
  if (Array.isArray(merged.posts)) window.NOTICE_POSTS = merged.posts;
  if (merged.shop && merged.shop.name) window.SHOP = merged.shop;
  if (merged.company && merged.company.name) window.COMPANY = merged.company;
  if (merged.about && (merged.about.slogan || merged.about.story)) window.ABOUT = merged.about;
  if (Array.isArray(merged.products) && merged.products.length) window.PRODUCTS = merged.products;
  if (merged.images) window.IMAGES = merged.images;
  if (merged.imagePos) window.IMAGE_POS = Object.assign({}, window.IMAGE_POS || {}, merged.imagePos);
  dropSampleMedia();
}

function loadRemoteSite() {
  if (window.loadSiteNotice) return window.loadSiteNotice();
  return loadScript("js/notice-store.js").then(() => {
    if (!window.loadSiteNotice) return null;
    return window.loadSiteNotice();
  });
}

function siteStamp() {
  const images = window.IMAGES || {};
  const products = window.PRODUCTS || [];
  return JSON.stringify({
    posts: window.NOTICE_POSTS,
    shop: window.SHOP,
    about: window.ABOUT,
    imageKeys: Object.keys(images).map((k) => [k, String(images[k] || "").length, String(images[k] || "").slice(-24)]),
    products: products.map((p) => [p.id, p.price, p.name, String(p.image || "").length, String(p.image || "").slice(-24)]),
  });
}

function fillContact() {
  const s = window.SHOP;
  const c = window.COMPANY;
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };
  set("c-phone", s.phone);
  set("c-email", s.email);
  set("c-addr", c.address);
  set("c-hours", `평일 ${s.hoursWeek} / 주말 ${s.hoursWeekend}`);
}

function bindReveal() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
    return;
  }

  const show = (el) => {
    if (!el || el.classList.contains("in")) return;
    requestAnimationFrame(() => {
      el.classList.add("in");
    });
  };

  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    return r.top < vh * 0.9 && r.bottom > 48;
  };

  const check = () => {
    document.querySelectorAll(".reveal:not(.in)").forEach((el) => {
      if (visible(el)) show(el);
    });
  };

  if ("IntersectionObserver" in window) {
    if (!window.__revealIo) {
      window.__revealIo = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting || entry.intersectionRatio > 0) show(entry.target);
          });
        },
        { threshold: 0, rootMargin: "80px 0px -6% 0px" }
      );
    }
    document.querySelectorAll(".reveal:not(.in)").forEach((el) => window.__revealIo.observe(el));
  }

  if (!window.__revealBound) {
    ["scroll", "touchmove", "touchend", "resize", "orientationchange"].forEach((ev) => {
      window.addEventListener(ev, check, { passive: true });
    });
    window.__revealBound = true;
  }
  check();
  window.setTimeout(check, 200);
}

function renderNoticeList() {
  const list = document.getElementById("notice-list");
  if (!list) return;
  const posts = sortNotices(
    (window.NOTICE_POSTS || []).map((p, i) =>
      Object.assign({}, p, { id: p.id || "n" + (i + 1) })
    )
  );
  if (!posts.length) {
    list.innerHTML = '<p class="empty">등록된 공지가 없습니다.</p>';
    return;
  }
  const openId = qs("id");
  list.innerHTML = `<table class="notice-table">
    <thead><tr><th>구분</th><th>제목</th><th>날짜</th></tr></thead>
    <tbody>
    ${posts.map((p) => {
      const kind = p.important ? "중요" : "공지";
      const kindClass = p.important ? "col-kind important" : "col-kind";
      const body = esc(p.body || "").replace(/\n/g, "<br>") || "[내용]";
      const open = openId && openId === p.id ? " open" : "";
      return `<tr class="notice-line${open}" data-id="${esc(p.id)}">
        <td class="${kindClass}">${kind}</td>
        <td class="col-title"><button class="notice-title-btn" type="button">${esc(p.title || "")}</button></td>
        <td class="col-date">${esc((window.formatDotDate ? window.formatDotDate(p.date) : p.date) || "-")}</td>
      </tr>
      <tr class="notice-body-row${open ? " open" : ""}">
        <td colspan="3">${body}</td>
      </tr>`;
    }).join("")}
    </tbody>
  </table>`;
  list.querySelectorAll(".notice-line").forEach((row) => {
    row.addEventListener("click", () => {
      const bodyRow = row.nextElementSibling;
      const wasOpen = row.classList.contains("open");
      list.querySelectorAll(".notice-line.open, .notice-body-row.open").forEach((el) => el.classList.remove("open"));
      if (!wasOpen && bodyRow) {
        row.classList.add("open");
        bodyRow.classList.add("open");
      }
    });
  });
}

function fillPage(instant) {
  applyImages();
  applyPinnedNotice();
  document.querySelectorAll(".notice-bar").forEach((bar) => bar.remove());
  document.body.classList.remove("has-notice");
  renderNoticeBar();

  const page = document.body.dataset.page;
  if (page === "home") {
    const a = window.ABOUT;
    const c = window.COMPANY;
    const since = document.getElementById("since");
    if (since) since.textContent = `SINCE ${c.founded}`;
    document.getElementById("slogan").textContent = a.slogan;
    const lead = document.getElementById("lead");
    if (lead) lead.textContent = a.lead;
    document.getElementById("story").textContent = a.story;
    document.getElementById("ceo-line").textContent = `${c.name} 대표 ${c.ceo}`;
    document.getElementById("values").innerHTML = a.values
      .map((v) => `<div class="value"><b>${v.t}</b><span class="spec">${v.d}</span></div>`)
      .join("");
    const facts = document.getElementById("facts");
    if (facts && a.facts) {
      facts.innerHTML = a.facts
        .map((f) => {
          const n = window.formatCount ? window.formatCount(f.n) : f.n;
          return `<div class="fact"><strong>${n}</strong><span>${f.l}</span></div>`;
        })
        .join("");
    }
    fill("#home-products", window.PRODUCTS.slice(0, 3), instant);
    fillContact();
  }
  if (page === "about") {
    const a = window.ABOUT;
    const c = window.COMPANY;
    document.getElementById("greeting").textContent = a.greeting;
    document.getElementById("story").textContent = a.story;
    document.getElementById("vision").textContent = a.vision;
    document.getElementById("ceo-line").textContent = `대표이사 ${c.ceo}`;
    document.getElementById("ov-name").textContent = c.name;
    document.getElementById("ov-ceo").textContent = c.ceo;
    document.getElementById("ov-found").textContent = c.founded;
    document.getElementById("ov-addr").textContent = c.address;
    document.getElementById("ov-factory").textContent = c.factory;
    document.getElementById("ov-biz").textContent = c.bizNo;
  }
  if (page === "products") {
    fill("#product-grid", window.PRODUCTS, instant);
  }
  if (page === "product") {
    const p = window.PRODUCTS.find((x) => x.id === qs("id")) || window.PRODUCTS[0];
    document.getElementById("product-box").innerHTML = `
      ${liveUrl(p.image) ? `<img src="${p.image}" alt="${esc(p.name)}">` : `<div class="thumb"></div>`}
      <div>
        <div class="cat-name">${p.categoryName}</div>
        <h1 class="page-title">${p.name}</h1>
        <p>${p.intro}</p>
        <table class="info-table">
          <tr><th>판매가</th><td>${(window.formatWon ? window.formatWon(p.price) : p.price) || "-"}</td></tr>
          <tr><th>규격</th><td>${p.spec}</td></tr>
          <tr><th>원산지</th><td>${p.origin}</td></tr>
          <tr><th>내용량</th><td>${p.volume}</td></tr>
          <tr><th>보관</th><td>${p.storage}</td></tr>
          <tr><th>원재료</th><td>${p.ingredients}</td></tr>
        </table>
        <a class="btn" href="contact.html">제품 문의</a>
      </div>`;
    fill("#related", window.PRODUCTS.filter((x) => x.id !== p.id).slice(0, 3), instant);
  }
  if (page === "contact") fillContact();
  if (page === "notice") renderNoticeList();
  bindReveal();
}

document.addEventListener("DOMContentLoaded", () => {
  dropSampleMedia();
  const local = window.loadLocalSite && window.loadLocalSite();
  if (local) applySiteData(local);

  const paint = (instant) => {
    const header = document.getElementById("site-header");
    const footer = document.getElementById("site-footer");
    if (header) header.innerHTML = renderHeader();
    if (footer) footer.innerHTML = renderFooter();
    bindMenu();
    fillPage(instant);
  };

  paint(false);

  loadRemoteSite().then((site) => {
    if (!site || site.empty) return;
    const before = siteStamp();
    applySiteData(site);
    if (before === siteStamp()) return;
    paint(true);
  });
});

window.addEventListener("storage", (e) => {
  if (e.key !== window.FOODMALL_SITE_KEY || !e.newValue) return;
  try {
    applySiteData(JSON.parse(e.newValue));
    const header = document.getElementById("site-header");
    const footer = document.getElementById("site-footer");
    if (header) header.innerHTML = renderHeader();
    if (footer) footer.innerHTML = renderFooter();
    bindMenu();
    fillPage(true);
  } catch (err) {}
});
