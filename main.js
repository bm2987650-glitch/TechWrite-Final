/* ==========================================================================
   TechWrite Main Site
   Renders live data from TWStore (see shared-data.js) so articles that
   authors submit and admins approve show up here automatically, under
   the right category, with the author's byline - no page refresh needed
   if TWStore is available and a browser tab is watching for changes.
   ========================================================================== */

var __selectedCategory = "AI Tools";
var __selectedArticleId = null;

document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  initLoginForm();
  initContactForm();
  initNewsletterForms();
  initSearchPage();
  initCategoryAndArticleClicks();

  if (window.TWStore) {
    TWStore.onChange(() => renderAll());
  }
});

function renderAll() {
  renderTrending();
  renderArticlesListPage();
  renderCategoriesPage();
  renderCategoryFilteredPage();
  renderArticlePage();
  renderSearchResultsDefault();
}

/* ---------------------------- helpers ---------------------------- */
function esc(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function articleCardHtml(a) {
  const author = window.TWStore ? TWStore.getUserByName(a.author) : null;
  return `
    <article class="article-card" data-article-id="${esc(a.id)}" style="cursor:pointer">
      <img src="${esc(a.image)}" alt="">
      <div class="article-body">
        <div class="tag">${esc(a.category).toUpperCase()}</div>
        <h3><a href="#" data-article-id="${esc(a.id)}">${esc(a.title)}</a></h3>
        <div class="meta">${esc(window.TWStore ? TWStore.formatDate(a.date) : a.date)} • ${esc(a.readTime || "")}${author ? " • By " + esc(author.name) : ""}</div>
      </div>
    </article>`;
}

function articleListCardHtml(a) {
  return `
    <article class="list-card" data-article-id="${esc(a.id)}" style="cursor:pointer">
      <img src="${esc(a.image)}" alt="">
      <div class="article-body">
        <div class="tag">${esc(a.category).toUpperCase()}</div>
        <h3><a href="#" data-article-id="${esc(a.id)}">${esc(a.title)}</a></h3>
        <div class="meta">${esc(window.TWStore ? TWStore.formatDate(a.date) : a.date)} • ${esc(a.readTime || "")}</div>
        <p class="muted">${esc(a.excerpt || "")}</p>
      </div>
    </article>`;
}

function sideLinkHtml(name, count) {
  return `<div class="side-link" data-category="${esc(name)}" style="cursor:pointer"><span>${esc(name)}</span><span>(${count})</span></div>`;
}

/* ---------------------------- Home: Trending ---------------------------- */
function renderTrending() {
  const grid = document.getElementById("trendingGrid");
  if (!grid || !window.TWStore) return;
  const published = TWStore.getPublishedArticles()
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 4);
  grid.innerHTML = published.length
    ? published.map(articleCardHtml).join("")
    : `<p class="muted">No articles published yet.</p>`;
}

/* ---------------------------- All Articles page ---------------------------- */
function renderArticlesListPage() {
  const list = document.getElementById("articlesListGrid");
  const sidebar = document.getElementById("articlesPageSidebar");
  if (!list || !window.TWStore) return;

  const published = TWStore.getPublishedArticles().slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  list.innerHTML = published.length
    ? published.map(articleListCardHtml).join("")
    : `<p class="muted">No articles published yet. Check back soon.</p>`;

  if (sidebar) {
    const counts = TWStore.getCategoryCounts();
    sidebar.innerHTML = "<h3>Categories</h3>" + counts.map((c) => sideLinkHtml(c.name, c.count)).join("");
  }
}

/* ---------------------------- Categories page ---------------------------- */
function renderCategoriesPage() {
  const grid = document.getElementById("categoriesGrid");
  if (!grid || !window.TWStore) return;
  const counts = TWStore.getCategoryCounts();
  grid.innerHTML = counts
    .map(
      (c) => `
      <a class="category-card" href="#" data-category="${esc(c.name)}">
        <div class="iconbox"><i class="fa-solid ${esc(c.icon || "fa-folder")}"></i></div>
        <h3>${esc(c.name)}</h3>
        <span>${c.count} Article${c.count === 1 ? "" : "s"}</span>
      </a>`
    )
    .join("");
}

/* ---------------------------- Category filtered page ---------------------------- */
function renderCategoryFilteredPage() {
  const list = document.getElementById("categoryArticleList");
  const sidebar = document.getElementById("categoryPageSidebar");
  const title = document.getElementById("categoryPageTitle");
  const desc = document.getElementById("categoryPageDesc");
  if (!list || !window.TWStore) return;

  if (title) title.textContent = __selectedCategory;
  if (desc) desc.textContent = `Explore the latest articles in ${__selectedCategory}.`;

  const articles = TWStore.getArticlesByCategory(__selectedCategory).sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
  list.innerHTML = articles.length
    ? articles.map(articleListCardHtml).join("")
    : `<p class="muted">No articles published in this category yet.</p>`;

  if (sidebar) {
    const counts = TWStore.getCategoryCounts();
    sidebar.innerHTML = "<h3>Categories</h3>" + counts.map((c) => sideLinkHtml(c.name, c.count)).join("");
  }
}

/* ---------------------------- Single Article page ---------------------------- */
function renderArticlePage() {
  if (!window.TWStore) return;
  const el = {
    breadcrumb: document.getElementById("articleBreadcrumb"),
    tag: document.getElementById("articleTag"),
    title: document.getElementById("articleTitle"),
    meta: document.getElementById("articleMeta"),
    hero: document.getElementById("articleHero"),
    body: document.getElementById("articleBody"),
    avatar: document.getElementById("authorBoxAvatar"),
    name: document.getElementById("authorBoxName"),
    jobTitle: document.getElementById("authorBoxTitle"),
    bio: document.getElementById("authorBoxBio"),
    related: document.getElementById("relatedArticlesList"),
  };
  if (!el.title) return;

  let article = __selectedArticleId ? TWStore.getArticleById(__selectedArticleId) : null;
  if (!article) {
    // Fall back to the most recent published article so the page never looks broken.
    const published = TWStore.getPublishedArticles().sort((a, b) => new Date(b.date) - new Date(a.date));
    article = published[0] || null;
  }
  if (!article) {
    el.title.textContent = "No articles published yet";
    el.body.innerHTML = "<p>Check back soon.</p>";
    return;
  }

  const author = TWStore.getUserByName(article.author);

  if (el.breadcrumb) el.breadcrumb.innerHTML = `Home &nbsp;›&nbsp; ${esc(article.category)} &nbsp;›&nbsp; ${esc(article.title)}`;
  if (el.tag) el.tag.textContent = article.category.toUpperCase();
  el.title.textContent = article.title;
  if (el.meta) {
    el.meta.innerHTML = `By ${esc(article.author)} &nbsp;•&nbsp; ${esc(TWStore.formatDate(article.date))} &nbsp;•&nbsp; ${esc(article.readTime || "")}`;
  }
  if (el.hero) {
    el.hero.src = article.image;
    el.hero.alt = article.title;
  }
  if (el.body) {
    const paragraphs = String(article.content || "").split(/\n+/).filter(Boolean);
    el.body.innerHTML = paragraphs.map((p) => `<p>${esc(p)}</p>`).join("");
  }

  if (author) {
    if (el.avatar) el.avatar.src = author.avatar;
    if (el.name) el.name.textContent = author.name;
    if (el.jobTitle) el.jobTitle.textContent = author.jobTitle || "Contributor";
    if (el.bio) el.bio.textContent = author.bio || "";
  } else {
    if (el.name) el.name.textContent = article.author || "Unknown author";
    if (el.jobTitle) el.jobTitle.textContent = "";
    if (el.bio) el.bio.textContent = "";
  }

  if (el.related) {
    const related = TWStore.getPublishedArticles()
      .filter((a) => a.id !== article.id)
      .slice(0, 3);
    el.related.innerHTML = related
      .map(
        (a) => `
        <div class="related-card" data-article-id="${esc(a.id)}" style="cursor:pointer">
          <img src="${esc(a.image)}" alt="">
          <span>${esc(a.title)}</span>
        </div>`
      )
      .join("");
  }

  TWStore.incrementViews(article.id);
}

/* ---------------------------- Search page default content ---------------------------- */
function renderSearchResultsDefault() {
  const list = document.getElementById("searchListGrid");
  if (!list || !window.TWStore) return;
  const published = TWStore.getPublishedArticles().sort((a, b) => new Date(b.date) - new Date(a.date));
  list.innerHTML = published.map(articleListCardHtml).join("");
}

/* ---------------------------- Clicks: categories + articles ---------------------------- */
function initCategoryAndArticleClicks() {
  document.addEventListener("click", (e) => {
    const catEl = e.target.closest("[data-category]");
    if (catEl) {
      e.preventDefault();
      __selectedCategory = catEl.getAttribute("data-category");
      window.location.hash = "category.html";
      renderCategoryFilteredPage();
      return;
    }

    const artEl = e.target.closest("[data-article-id]");
    if (artEl) {
      e.preventDefault();
      __selectedArticleId = artEl.getAttribute("data-article-id");
      window.location.hash = "article.html";
      renderArticlePage();
      return;
    }
  });
}



/* ---------------------------- Unified Login Handler ---------------------------- */
function initLoginForm() {
  const loginForm = document.querySelector("#loginForm") || document.querySelector("#login-form");
  if (!loginForm) return;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const emailInput = document.querySelector("#email") || document.querySelector('#login-form input[type="email"]');
    const passwordInput = document.querySelector("#password") || document.querySelector('#login-form input[type="password"]');
    const roleSelect = document.querySelector("#role");
    const errorBox = document.getElementById("loginError");

    const showError = (msg) => {
      if (errorBox) {
        errorBox.textContent = msg;
        errorBox.style.display = "block";
      } else {
        alert(msg);
      }
    };

    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value.trim() : "";
    const role = roleSelect ? roleSelect.value : "";

    if (!email || !password) {
      showError("Please fill in all required fields.");
      return;
    }

    // Try API Login First (Backend)
    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token) localStorage.setItem("token", data.token);
        if (window.TWStore && data.user) TWStore.currentUser = data.user;

        const userRole = (data.user?.role || role || "").toLowerCase();
        redirectToDashboard(userRole);
        return;
      }
    } catch (err) {
      console.warn("Backend API not available, falling back to local TWStore authentication.");
    }

    // Fallback: TWStore Local Authentication
    if (window.TWStore) {
      const result = TWStore.login(email, password, role);
      if (result.ok && result.session) {
        if (errorBox) errorBox.style.display = "none";
        const userRole = (result.session.role || role || "").toLowerCase();
        redirectToDashboard(userRole);
        return;
      } else {
        showError(result.error || "Invalid email or password.");
        return;
      }
    }

    showError("Authentication store unavailable. Please try again.");
  });
}

/**
 * Redirects user to their appropriate dashboard based on their role.
 */
function redirectToDashboard(role) {
  const normalizedRole = role.toLowerCase();
  if (normalizedRole === "admin") {
    window.location.href = "new-admin.html";
  } else if (normalizedRole === "author" || normalizedRole === "user") {
    window.location.href = "new-user.html";
  } else {
    window.location.href = "new-user.html";
  }
}








/* ---------------------------- Contact form ---------------------------- */
function initContactForm() {
  const contactForm = document.querySelector("#contactForm");
  if (!contactForm) return;
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    alert("Thanks! Your message has been submitted in demo mode.");
    contactForm.reset();
  });
}

/* ---------------------------- Newsletter forms (all instances) ---------------------------- */
function initNewsletterForms() {
  document.querySelectorAll(".newsletter-form").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = form.querySelector("input[type='email'], input");
      const email = input ? input.value.trim() : "";
      if (!email) return;

      if (window.TWStore) {
        const result = TWStore.addSubscriber(email);
        if (!result.ok) {
          alert(result.error || "Could not subscribe.");
          return;
        }
      }
      alert("Subscribed! You'll get our next update.");
      form.reset();
    });
  });
}

/* ---------------------------- Global Actions & UI Triggers ---------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-search]").forEach((b) =>
    b.addEventListener("click", () => document.querySelector("#siteSearch")?.focus())
  );
  document.querySelectorAll("[data-demo]").forEach((b) =>
    b.addEventListener("click", (e) => {
      const msg = e.currentTarget.dataset.demo;
      if (msg) alert(msg);
    })
  );
});

/* ---------------------------- Search Functionality ---------------------------- */
function initSearchPage() {
  const input = document.querySelector("#searchInput");
  const button = document.querySelector("#searchBtn");
  const results = document.querySelector("#searchResults");
  if (!input || !button || !results) return;

  const run = () => {
    const q = input.value.trim().toLowerCase();
    results.querySelectorAll(".list-card").forEach((card) => {
      card.style.display = !q || card.innerText.toLowerCase().includes(q) ? "grid" : "none";
    });
  };

  button.addEventListener("click", run);
  input.addEventListener("input", run);
}

/* ==========================================================================
   SPA Router
   ========================================================================== */
(function () {
  var routeMap = {
    "": "page-home",
    "index.html": "page-home",
    "about.html": "page-about",
    "article.html": "page-article",
    "articles.html": "page-articles",
    "categories.html": "page-categories",
    "category.html": "page-category",
    "contact.html": "page-contact",
    "login.html": "page-login",
    "search.html": "page-search",
    "guides.html": "page-guides",
  };

  function renderRoute() {
    var hash = window.location.hash.replace("#", "").trim();
    var targetId = routeMap[hash] || "page-home";

    document.querySelectorAll(".page-view").forEach((view) => view.classList.remove("active-view"));
    var activeView = document.getElementById(targetId);
    if (activeView) activeView.classList.add("active-view");
    window.scrollTo(0, 0);

    // Re-render whichever page just became active so it reflects the latest data.
    if (targetId === "page-home") renderTrending();
    if (targetId === "page-articles") renderArticlesListPage();
    if (targetId === "page-categories") renderCategoriesPage();
    if (targetId === "page-category") renderCategoryFilteredPage();
    if (targetId === "page-article") renderArticlePage();
    if (targetId === "page-search") renderSearchResultsDefault();
  }

  document.addEventListener("click", function (e) {
    var searchBtn = e.target.closest("[data-search]");
    if (searchBtn) {
      e.preventDefault();
      window.location.hash = "search.html";
      return;
    }

    // Category / article clicks are handled by initCategoryAndArticleClicks(),
    // which already sets the hash - don't let the router re-handle those same
    // anchors here as plain nav links.
    if (e.target.closest("[data-category]") || e.target.closest("[data-article-id]")) return;

    var anchor = e.target.closest("a");
    if (!anchor) return;

    var href = anchor.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("http")) return;

    var filename = href.split("/").pop();
    if (routeMap.hasOwnProperty(filename)) {
      e.preventDefault();
      window.location.hash = filename;
    }
  });

  window.addEventListener("hashchange", renderRoute);
  window.addEventListener("DOMContentLoaded", renderRoute);
})();














// Replace local TWStore calls with API Endpoint calls:
const API_URL = 'http://localhost:5000/api';

async function fetchPublishedArticles() {
  const res = await fetch(`${API_URL}/articles`);
  const data = await res.json();
  return data.ok ? data.articles : [];
}








// Replace the existing login form submit handler in source: 22
async function handleLoginFormSubmit(event) {
  event.preventDefault();

  const emailInput = document.getElementById('login-email') || document.querySelector('#login-form input[type="email"]');
  const passwordInput = document.getElementById('login-password') || document.querySelector('#login-form input[type="password"]');

  if (!emailInput || !passwordInput) return;

  try {
    const response = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailInput.value,
        password: passwordInput.value
      })
    });

    const data = await response.json();

    if (response.ok) {
      // 1. Save token
      localStorage.setItem('token', data.token);
      
      // 2. Set current user in store
      TWStore.currentUser = data.user;

      // 3. Close Modal if open
      const loginModal = document.getElementById('login-modal');
      if (loginModal) loginModal.classList.add('hidden');

      // 4. Notify listeners so UI updates header state
      TWStore.notifyListeners();

      // 5. Redirect based on role (Case-insensitive check)
      const role = (data.user.role || '').toLowerCase();
      if (role === 'admin') {
        window.location.hash = '#page-admin';
      } else {
        window.location.hash = '#page-dashboard';
      }
    } else {
      alert(data.message || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('Could not connect to backend server.');
  }
}

// Attach the submit handler to the form
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLoginFormSubmit);
  }
});