document.addEventListener("DOMContentLoaded", () => {
  // Role guard: if a signed-in writer/editor lands on the admin dashboard
  // (typed URL, stale bookmark, etc.), send them to their own dashboard
  // instead. No session at all is allowed through, so this page still
  // works standalone for direct testing/demo purposes.
  if (window.TWStore) {
    const session = TWStore.getSession();
    if (session && session.role !== "admin") {
      window.location.href = "../new-user/new-user.html";
      return;
    }
  }

  initTabNavigation();
  initMobileSidebar();
  initReviewQueue();
  initArticlesManagement();
  initCategories();
  initMedia();
  initComments();
  initUsers();
  initPayouts();
  initNewsletter();
  initSettings();
  initLogout();

  renderEverything();

  if (window.TWStore) {
    TWStore.onChange(() => renderEverything());
  }
});

function renderEverything() {
  renderArticlesTable();
  renderReviewQueue();
  updateSidebarCounts();
  renderDashboardAttention();
  renderCategoriesTable();
  renderUsersTable();
  renderPayoutsTable();
  updatePayoutStats();
  renderSubscribersTable();
  prefillSettings();
}

function initLogout() {
  document.getElementById("logoutLink")?.addEventListener("click", () => {
    if (window.TWStore) TWStore.logout();
  });
}

/* ==========================================================================
   Toast helper
   ========================================================================== */
function showToast(message) {
  const toast = document.getElementById("adminToast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 2600);
}

function escapeHtml(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/* ==========================================================================
   Tab Navigation
   ========================================================================== */
function initTabNavigation() {
  const navItems = document.querySelectorAll(".nav-menu .nav-item[data-tab]");
  navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      switchTab(item.getAttribute("data-tab"));
    });
  });
}

function switchTab(tabId) {
  const navItems = document.querySelectorAll(".nav-menu .nav-item[data-tab]");
  const tabContents = document.querySelectorAll(".tab-content");
  const targetContent = document.getElementById(`tab-${tabId}`);
  if (!targetContent) return;

  navItems.forEach((nav) => {
    nav.classList.toggle("active", nav.getAttribute("data-tab") === tabId);
  });

  tabContents.forEach((content) => content.classList.remove("active"));
  targetContent.classList.add("active");

  closeSidebar();

  if (tabId === "review") renderReviewQueue();
  if (tabId === "dashboard") renderDashboardAttention();
}

function initMobileSidebar() {
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  if (!menuToggle || !sidebar || !overlay) return;

  menuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("show");
    overlay.classList.toggle("show");
  });
  overlay.addEventListener("click", closeSidebar);
}

function closeSidebar() {
  document.getElementById("sidebar")?.classList.remove("show");
  document.getElementById("sidebarOverlay")?.classList.remove("show");
}

/* ==========================================================================
   Sidebar badge counts + Dashboard "Needs Your Attention" + top stats
   ========================================================================== */
function updateSidebarCounts() {
  if (!window.TWStore) return;
  const articles = TWStore.getArticles();
  const payouts = TWStore.getPayouts();
  const users = TWStore.getUsers();

  const pendingArticles = articles.filter((a) => a.status === "review").length;
  const pendingPayouts = payouts.filter((p) => p.status === "pending").length;

  const reviewBadge = document.getElementById("reviewCountBadge");
  const payoutBadge = document.getElementById("payoutCountBadge");
  if (reviewBadge) reviewBadge.textContent = pendingArticles;
  if (payoutBadge) payoutBadge.textContent = pendingPayouts;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set("statPendingReviewValue", pendingArticles);
  set("statPendingReview", pendingArticles);
  set("statTotalArticles", articles.length);
  set("statTotalUsers", users.length.toLocaleString());

  const totalViews = articles.filter((a) => a.status === "published").reduce((s, a) => s + (a.views || 0), 0);
  set("statTotalViews", totalViews.toLocaleString());
}

function renderDashboardAttention() {
  const list = document.getElementById("attentionList");
  if (!list || !window.TWStore) return;

  const items = [];

  TWStore.getArticles().filter((a) => a.status === "review").forEach((a) => {
    items.push({
      icon: "fa-file-lines",
      text: a.title,
      sub: `Submitted by ${a.author} - awaiting review`,
      action: () => switchTab("review"),
      actionLabel: "Review",
    });
  });

  TWStore.getPayouts().filter((p) => p.status === "pending").forEach((p) => {
    items.push({
      icon: "fa-sack-dollar",
      text: `${p.user} requested a payout`,
      sub: `$${p.amount.toFixed(2)} pending release`,
      action: () => switchTab("payouts"),
      actionLabel: "View",
    });
  });

  if (items.length === 0) {
    list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-champagne-glasses"></i><div>You're all caught up.</div></div>`;
    return;
  }

  list.innerHTML = "";
  items.forEach((item) => {
    const el = document.createElement("div");
    el.className = "attention-item";
    el.innerHTML = `
      <div class="attention-text">
        <strong><i class="fa-solid ${item.icon}" style="margin-right:6px;color:var(--primary-color)"></i>${escapeHtml(item.text)}</strong>
        <span>${escapeHtml(item.sub)}</span>
      </div>
      <button class="btn btn-sm btn-outline">${item.actionLabel}</button>
    `;
    el.querySelector("button").addEventListener("click", item.action);
    list.appendChild(el);
  });
}

/* ==========================================================================
   All Articles table - rendered live from TWStore (every author)
   ========================================================================== */
function articleStatusBadgeHtml(status) {
  if (status === "published") return `<span class="badge badge-published">Published</span>`;
  if (status === "review") return `<span class="badge badge-warning">Pending Review</span>`;
  if (status === "changes") return `<span class="badge badge-changes">Changes Requested</span>`;
  return `<span class="badge draft">Draft</span>`;
}

function adminArticleRowHtml(a) {
  return `
    <tr data-id="${a.id}" data-status="${a.status}" data-title="${escapeHtml(a.title)}" data-author="${escapeHtml(a.author)}"
      data-category="${escapeHtml(a.category)}" data-views="${a.views || 0}" data-date="${a.date}" data-content="${escapeHtml(a.content || "")}">
      <td><strong>${escapeHtml(a.title)}</strong></td>
      <td>${escapeHtml(a.author)}</td>
      <td><span class="badge badge-tag">${escapeHtml(a.category)}</span></td>
      <td>${articleStatusBadgeHtml(a.status)}</td>
      <td>${a.views || 0}</td>
      <td>${window.TWStore ? TWStore.formatDate(a.date) : a.date}</td>
      <td>
        <button class="btn btn-sm btn-outline btn-view-article">View</button>
        <button class="btn btn-sm btn-danger btn-delete-article">Delete</button>
      </td>
    </tr>`;
}

function renderArticlesTable() {
  const tbody = document.getElementById("articlesTableBody");
  if (!tbody || !window.TWStore) return;

  const articles = TWStore.getArticles().sort((a, b) => new Date(b.date) - new Date(a.date));
  tbody.innerHTML = articles.map(adminArticleRowHtml).join("");
  applyArticleFilters();
}

function initArticlesManagement() {
  const searchInput = document.getElementById("articleSearchInput");
  const statusFilter = document.getElementById("articleStatusFilter");
  const authorFilter = document.getElementById("articleAuthorFilter");
  const categoryFilter = document.getElementById("articleCategoryFilter");

  [searchInput, statusFilter, authorFilter, categoryFilter].forEach((el) => {
    el?.addEventListener("input", applyArticleFilters);
    el?.addEventListener("change", applyArticleFilters);
  });

  document.getElementById("articlesTableBody")?.addEventListener("click", (e) => {
    const row = e.target.closest("tr");
    if (!row || !window.TWStore) return;
    const id = row.getAttribute("data-id");

    if (e.target.classList.contains("btn-view-article")) {
      openArticlePreview(row);
    }
    if (e.target.classList.contains("btn-delete-article")) {
      if (confirm(`Delete "${row.getAttribute("data-title")}"? This cannot be undone.`)) {
        TWStore.deleteArticle(id);
        showToast("Article deleted.");
        renderEverything();
      }
    }
  });

  document.getElementById("closePreviewModal")?.addEventListener("click", () => {
    document.getElementById("previewModalOverlay").classList.remove("active");
  });
}

function applyArticleFilters() {
  const search = (document.getElementById("articleSearchInput")?.value || "").toLowerCase();
  const status = document.getElementById("articleStatusFilter")?.value || "all";
  const author = document.getElementById("articleAuthorFilter")?.value || "all";
  const category = document.getElementById("articleCategoryFilter")?.value || "all";

  document.querySelectorAll("#articlesTableBody tr").forEach((row) => {
    const title = (row.getAttribute("data-title") || "").toLowerCase();
    const rowAuthor = row.getAttribute("data-author") || "";
    const rowCategory = row.getAttribute("data-category") || "";
    const rowStatus = row.getAttribute("data-status") || "";

    const matchesSearch = !search || title.includes(search) || rowAuthor.toLowerCase().includes(search);
    const matchesStatus = status === "all" || rowStatus === status;
    const matchesAuthor = author === "all" || rowAuthor === author;
    const matchesCategory = category === "all" || rowCategory === category;

    row.style.display = matchesSearch && matchesStatus && matchesAuthor && matchesCategory ? "" : "none";
  });
}

function openArticlePreview(row) {
  document.getElementById("previewTitle").textContent = row.getAttribute("data-title") || "";
  document.getElementById("previewAuthor").textContent = row.getAttribute("data-author") || "Unknown author";
  document.getElementById("previewCategory").textContent = row.getAttribute("data-category") || "";
  document.getElementById("previewContent").textContent = row.getAttribute("data-content") || "No content available.";

  const status = row.getAttribute("data-status");
  const statusBadge = document.getElementById("previewStatusBadge");
  const map = {
    published: ["badge badge-published", "Published"],
    review: ["badge badge-warning", "Pending Review"],
    changes: ["badge badge-changes", "Changes Requested"],
    draft: ["badge draft", "Draft"],
  };
  const [cls, label] = map[status] || ["badge draft", status || "Unknown"];
  statusBadge.className = cls;
  statusBadge.textContent = label;

  document.getElementById("previewModalOverlay").classList.add("active");
}

/* ==========================================================================
   Review Queue: approve / request changes / reject - all through TWStore
   ========================================================================== */
let activeReviewId = null;

function initReviewQueue() {
  const changesModal = document.getElementById("changesModalOverlay");
  const closeChangesModal = document.getElementById("closeChangesModal");
  const cancelChangesModal = document.getElementById("cancelChangesModal");
  const sendChangesRequest = document.getElementById("sendChangesRequest");

  [closeChangesModal, cancelChangesModal].forEach((btn) => {
    btn?.addEventListener("click", () => changesModal.classList.remove("active"));
  });

  sendChangesRequest?.addEventListener("click", () => {
    const comment = document.getElementById("changesComment").value.trim();
    if (!comment) {
      alert("Please add a comment explaining what needs to change.");
      return;
    }
    if (activeReviewId && window.TWStore) {
      const article = TWStore.getArticleById(activeReviewId);
      TWStore.updateArticle(activeReviewId, { status: "changes", adminNote: comment });
      showToast(`Comment sent to ${article ? article.author : "the author"}.`);
    }
    document.getElementById("changesComment").value = "";
    changesModal.classList.remove("active");
    renderEverything();
  });
}

function renderReviewQueue() {
  const container = document.getElementById("reviewQueueList");
  if (!container || !window.TWStore) return;

  const articles = TWStore.getArticles().filter((a) => a.status === "review");

  if (articles.length === 0) {
    container.innerHTML = `
      <div class="admin-card empty-state">
        <i class="fa-solid fa-clipboard-check"></i>
        <div>No articles waiting for review right now.</div>
      </div>`;
    return;
  }

  container.innerHTML = "";
  articles.forEach((a) => {
    const author = TWStore.getUserByName(a.author);
    const card = document.createElement("div");
    card.className = "review-card";
    card.innerHTML = `
      <div class="review-card-head">
        <div>
          <h4>${escapeHtml(a.title)}</h4>
          <div class="review-meta">
            <img class="author-avatar" src="${author ? escapeHtml(author.avatar) : "https://i.pravatar.cc/60?u=" + encodeURIComponent(a.author)}" alt="">
            <span>${escapeHtml(a.author)}</span>
            <span>&bull;</span>
            <span class="badge badge-tag">${escapeHtml(a.category)}</span>
            <span>&bull;</span>
            <span>Submitted ${TWStore.formatDate(a.date)}</span>
          </div>
        </div>
        <span class="badge badge-warning">Pending Review</span>
      </div>
      <p class="review-excerpt">${escapeHtml((a.content || "").slice(0, 220))}${(a.content || "").length > 220 ? "..." : ""}</p>
      <div class="review-actions">
        <button class="btn btn-sm btn-outline btn-review-preview">Preview</button>
        <button class="btn btn-sm btn-approve btn-review-approve">Approve &amp; Publish</button>
        <button class="btn btn-sm btn-changes btn-review-changes">Request Changes</button>
        <button class="btn btn-sm btn-reject btn-review-reject">Reject</button>
      </div>
    `;

    card.querySelector(".btn-review-preview").addEventListener("click", () => {
      const fakeRow = document.createElement("tr");
      fakeRow.setAttribute("data-title", a.title);
      fakeRow.setAttribute("data-author", a.author);
      fakeRow.setAttribute("data-category", a.category);
      fakeRow.setAttribute("data-content", a.content || "");
      fakeRow.setAttribute("data-status", a.status);
      openArticlePreview(fakeRow);
    });

    card.querySelector(".btn-review-approve").addEventListener("click", () => {
      TWStore.updateArticle(a.id, { status: "published", adminNote: "" });
      showToast(`"${a.title}" approved and published.`);
      renderEverything();
    });

    card.querySelector(".btn-review-changes").addEventListener("click", () => {
      activeReviewId = a.id;
      document.getElementById("changesModalOverlay").classList.add("active");
    });

    card.querySelector(".btn-review-reject").addEventListener("click", () => {
      if (!confirm(`Reject "${a.title}"? The author will be notified.`)) return;
      TWStore.updateArticle(a.id, { status: "draft", adminNote: "Rejected by admin." });
      showToast(`"${a.title}" was rejected and returned to draft.`);
      renderEverything();
    });

    container.appendChild(card);
  });
}

/* ==========================================================================
   Categories - rendered live, edits propagate to articles + selects sitewide
   ========================================================================== */
function renderCategoriesTable() {
  const tbody = document.querySelector("#categoryTable tbody");
  if (!tbody || !window.TWStore) return;

  const cats = TWStore.getCategories();
  const articles = TWStore.getArticles();

  tbody.innerHTML = cats
    .map((c) => {
      const count = articles.filter((a) => a.category === c.name && a.status === "published").length;
      return `
      <tr data-category="${escapeHtml(c.name)}">
        <td>${escapeHtml(c.name)}</td>
        <td>${count}</td>
        <td>Live</td>
        <td>
          <button class="btn btn-sm btn-outline" data-edit>Edit</button>
          <button class="btn btn-sm btn-danger" data-delete>Delete</button>
        </td>
      </tr>`;
    })
    .join("");
}

function initCategories() {
  document.querySelector("#categoryTable tbody")?.addEventListener("click", (e) => {
    const row = e.target.closest("tr");
    if (!row || !window.TWStore) return;
    const name = row.getAttribute("data-category");

    if (e.target.hasAttribute("data-edit")) {
      const updated = prompt("Edit category name:", name);
      if (updated && updated.trim() && updated.trim() !== name) {
        TWStore.renameCategory(name, updated.trim());
        showToast("Category updated everywhere it's used.");
        renderEverything();
      }
    } else if (e.target.hasAttribute("data-delete")) {
      if (confirm(`Delete the "${name}" category?`)) {
        TWStore.deleteCategory(name);
        renderEverything();
      }
    }
  });

  document.querySelector("#addCategory")?.addEventListener("click", () => {
    const name = prompt("New category name:");
    if (!name || !window.TWStore) return;
    TWStore.addCategory(name.trim());
    renderEverything();
  });
}

/* ==========================================================================
   Media Library (local demo only - no store needed)
   ========================================================================== */
function initMedia() {
  document.querySelector("#mediaUpload")?.addEventListener("change", (e) => {
    const grid = document.querySelector("#mediaGrid");
    [...e.target.files].forEach((file) => {
      const url = URL.createObjectURL(file);
      grid.insertAdjacentHTML(
        "afterbegin",
        `<div class="media-card"><img src="${url}" alt=""><div class="media-name">${file.name}</div></div>`
      );
    });
    showToast("Media uploaded.");
  });
}

/* ==========================================================================
   Comments moderation (local demo - not tied to the article store)
   ========================================================================== */
function initComments() {
  document.querySelectorAll("[data-approve-comment]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest("tr");
      row.setAttribute("data-status", "approved");
      const statusCell = row.children[3];
      if (statusCell) statusCell.innerHTML = `<span class="badge badge-published">Approved</span>`;
      showToast("Comment approved.");
    });
  });
}

/* ==========================================================================
   Users - rendered live from TWStore
   ========================================================================== */
function renderUsersTable() {
  const tbody = document.querySelector("#usersTable tbody");
  if (!tbody || !window.TWStore) return;

  const users = TWStore.getUsers();
  tbody.innerHTML = users
    .map((u) => {
      const articleCount = TWStore.getArticlesByAuthor(u.name).length;
      const isAdmin = u.role === "admin";
      const roleCell = isAdmin
        ? `<span class="role-badge role-admin">Admin</span>`
        : `<select class="form-select user-role-select">
            <option value="writer" ${u.role === "writer" ? "selected" : ""}>Writer</option>
            <option value="editor" ${u.role === "editor" ? "selected" : ""}>Editor</option>
            <option value="admin">Admin</option>
          </select>`;
      const statusBadge = u.status === "suspended"
        ? `<span class="badge badge-suspended">Suspended</span>`
        : `<span class="badge badge-active">Active</span>`;
      const actionCell = isAdmin
        ? `<button class="btn btn-sm btn-outline" disabled>You</button>`
        : `<button class="btn btn-sm btn-outline btn-view-user-articles">View Work</button>
           <button class="btn btn-sm ${u.status === "suspended" ? "btn-outline" : "btn-danger"} btn-toggle-suspend">${u.status === "suspended" ? "Reactivate" : "Suspend"}</button>`;

      return `
      <tr data-username="${escapeHtml(u.name)}" data-status="${u.status}">
        <td>
          <div class="user-cell">
            <img src="${escapeHtml(u.avatar)}" alt="">
            <div>
              <div class="user-cell-name">${escapeHtml(u.name)}</div>
              <div class="user-cell-email">${escapeHtml(u.email)}</div>
            </div>
          </div>
        </td>
        <td>${roleCell}</td>
        <td>${articleCount}</td>
        <td>${(u.followers || 0).toLocaleString()}</td>
        <td>${TWStore.formatDate(u.joined)}</td>
        <td>${statusBadge}</td>
        <td>${actionCell}</td>
      </tr>`;
    })
    .join("");
}

function initUsers() {
  document.querySelector("#usersTable tbody")?.addEventListener("change", (e) => {
    if (!e.target.classList.contains("user-role-select") || !window.TWStore) return;
    const row = e.target.closest("tr");
    const name = row.getAttribute("data-username");
    TWStore.setUserRole(name, e.target.value);
    showToast(`${name}'s role updated to ${e.target.options[e.target.selectedIndex].text}.`);
  });

  document.querySelector("#usersTable tbody")?.addEventListener("click", (e) => {
    const row = e.target.closest("tr");
    if (!row || !window.TWStore) return;
    const name = row.getAttribute("data-username");

    if (e.target.classList.contains("btn-toggle-suspend")) {
      const isSuspended = row.getAttribute("data-status") === "suspended";
      if (!isSuspended && !confirm(`Suspend ${name}? They won't be able to log in or publish.`)) return;
      TWStore.setUserStatus(name, isSuspended ? "active" : "suspended");
      renderUsersTable();
    }

    if (e.target.classList.contains("btn-view-user-articles")) {
      openUserArticlesModal(name);
    }
  });

  document.getElementById("closeUserArticlesModal")?.addEventListener("click", () => {
    document.getElementById("userArticlesModalOverlay").classList.remove("active");
  });
}

function openUserArticlesModal(username) {
  document.getElementById("userArticlesModalTitle").textContent = `${username}'s Work`;
  const body = document.getElementById("userArticlesTableBody");
  body.innerHTML = "";

  const articles = window.TWStore ? TWStore.getArticlesByAuthor(username) : [];

  if (articles.length === 0) {
    body.innerHTML = `<tr><td colspan="5" class="text-muted" style="text-align:center;padding:20px;">No articles from this user yet.</td></tr>`;
  } else {
    articles.forEach((a) => {
      body.insertAdjacentHTML(
        "beforeend",
        `<tr>
          <td>${escapeHtml(a.title)}</td>
          <td><span class="badge badge-tag">${escapeHtml(a.category)}</span></td>
          <td>${articleStatusBadgeHtml(a.status)}</td>
          <td>${a.views || 0}</td>
          <td>${TWStore.formatDate(a.date)}</td>
        </tr>`
      );
    });
  }

  document.getElementById("userArticlesModalOverlay").classList.add("active");
}

/* ==========================================================================
   Payouts - rendered live from TWStore
   ========================================================================== */
function payoutStatusBadgeHtml(status) {
  if (status === "completed") return `<span class="badge badge-completed">Completed</span>`;
  if (status === "processing") return `<span class="badge badge-processing">Processing</span>`;
  return `<span class="badge badge-pending">Pending</span>`;
}

function renderPayoutsTable() {
  const tbody = document.querySelector("#payoutsTable tbody");
  if (!tbody || !window.TWStore) return;

  const payouts = TWStore.getPayouts().sort((a, b) => new Date(b.requestedDate) - new Date(a.requestedDate));
  const users = TWStore.getUsers();

  tbody.innerHTML = payouts
    .map((p) => {
      const user = users.find((u) => u.name === p.user);
      const methodLabel = p.method?.type === "paypal"
        ? `<div class="payout-method-cell"><i class="fa-brands fa-paypal"></i> PayPal</div>`
        : p.method?.type === "bank"
        ? `<div class="payout-method-cell"><i class="fa-solid fa-building-columns"></i> Bank Transfer</div>`
        : "Not set";
      const actionCell = p.status === "pending"
        ? `<button class="btn btn-sm btn-outline btn-view-payout-method">View Method</button>
           <button class="btn btn-sm btn-approve btn-release-payout">Release Payment</button>`
        : `<button class="btn btn-sm btn-outline btn-view-payout-method">View Method</button>`;

      return `
      <tr data-id="${p.id}" data-status="${p.status}" data-user="${escapeHtml(p.user)}" data-amount="${p.amount}">
        <td>
          <div class="user-cell">
            <img src="${user ? escapeHtml(user.avatar) : "https://i.pravatar.cc/100"}" alt="">
            <div class="user-cell-name">${escapeHtml(p.user)}</div>
          </div>
        </td>
        <td>${TWStore.formatDate(p.requestedDate)}</td>
        <td class="fw-bold">$${p.amount.toFixed(2)}</td>
        <td>${methodLabel}</td>
        <td>${payoutStatusBadgeHtml(p.status)}</td>
        <td>${actionCell}</td>
      </tr>`;
    })
    .join("");
}

function initPayouts() {
  document.querySelector("#payoutsTable tbody")?.addEventListener("click", (e) => {
    const row = e.target.closest("tr");
    if (!row || !window.TWStore) return;
    const id = row.getAttribute("data-id");

    if (e.target.classList.contains("btn-view-payout-method")) {
      const payout = TWStore.getPayouts().find((p) => p.id === id);
      if (payout) openPaymentMethodModal(payout);
    }

    if (e.target.classList.contains("btn-release-payout")) {
      const user = row.getAttribute("data-user");
      const amount = row.getAttribute("data-amount");
      if (!confirm(`Release $${amount} to ${user}? This will be sent to their payment method on file.`)) return;
      TWStore.releasePayout(id);
      showToast(`$${amount} released to ${user}.`);
      renderEverything();
    }
  });

  document.getElementById("closePaymentMethodModal")?.addEventListener("click", () => {
    document.getElementById("paymentMethodModalOverlay").classList.remove("active");
  });
}

function openPaymentMethodModal(payout) {
  const body = document.getElementById("paymentMethodBody");
  let html = `<div class="payment-detail-row"><span>Writer</span><span>${escapeHtml(payout.user)}</span></div>`;

  if (payout.method?.type === "paypal") {
    html += `
      <div class="payment-detail-row"><span>Method</span><span><i class="fa-brands fa-paypal"></i> PayPal</span></div>
      <div class="payment-detail-row"><span>PayPal Email</span><span>${escapeHtml(payout.method.paypalEmail || "Not provided")}</span></div>
    `;
  } else if (payout.method?.type === "bank") {
    const m = payout.method;
    html += `
      <div class="payment-detail-row"><span>Method</span><span><i class="fa-solid fa-building-columns"></i> Bank Transfer</span></div>
      <div class="payment-detail-row"><span>Account Holder</span><span>${escapeHtml(m.bankHolder || "Not provided")}</span></div>
      <div class="payment-detail-row"><span>Bank</span><span>${escapeHtml(m.bankName || "Not provided")}</span></div>
      <div class="payment-detail-row"><span>IBAN</span><span>${escapeHtml(m.bankIban || "Not provided")}</span></div>
      <div class="payment-detail-row"><span>SWIFT / BIC</span><span>${escapeHtml(m.bankSwift || "Not provided")}</span></div>
    `;
  } else {
    html += `<div class="payment-detail-row"><span>Method</span><span>Not set up yet</span></div>`;
  }

  body.innerHTML = html;
  document.getElementById("paymentMethodModalOverlay").classList.add("active");
}

function updatePayoutStats() {
  if (!window.TWStore) return;
  const payouts = TWStore.getPayouts();
  const pending = payouts.filter((p) => p.status === "pending");
  const completed = payouts.filter((p) => p.status === "completed");
  const totalPending = pending.reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = completed.reduce((sum, p) => sum + p.amount, 0);

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set("payoutPendingCount", pending.length);
  set("payoutPendingAmount", `$${totalPending.toFixed(2)}`);
  set("statPendingPayouts", `$${totalPending.toFixed(2)}`);
  set("statPendingPayoutsCount", `${pending.length} request${pending.length === 1 ? "" : "s"}`);
  set("statPaidOut", `$${totalPaid.toFixed(2)}`);
}

/* ==========================================================================
   Newsletter - subscriber list rendered live from TWStore
   ========================================================================== */
function renderSubscribersTable() {
  const tbody = document.getElementById("subscribersTableBody");
  if (!tbody || !window.TWStore) return;

  const subs = TWStore.getSubscribers();
  tbody.innerHTML = subs
    .map(
      (s) => `
      <tr>
        <td>${escapeHtml(s.email)}</td>
        <td><span class="badge badge-published">Active</span></td>
        <td>${TWStore.formatDate(s.date)}</td>
      </tr>`
    )
    .join("");

  const countEl = document.getElementById("subscriberCount");
  if (countEl) countEl.textContent = `${subs.length} active`;
}

function initNewsletter() {
  document.getElementById("btnSendNewsletter")?.addEventListener("click", () => {
    const subject = document.getElementById("newsletterSubject").value.trim();
    const body = document.getElementById("newsletterBody").value.trim();
    if (!subject || !body) {
      alert("Please add both a subject and a message before sending.");
      return;
    }
    showToast("Newsletter sent to all active subscribers.");
    document.getElementById("newsletterSubject").value = "";
    document.getElementById("newsletterBody").value = "";
  });
}

/* ==========================================================================
   Settings: site settings, permissions, add team member
   ========================================================================== */
function prefillSettings() {
  if (!window.TWStore) return;
  const settings = TWStore.getSettings();
  const nameEl = document.getElementById("settingSiteName");
  const descEl = document.getElementById("settingSiteDescription");
  const approvalEl = document.getElementById("settingRequireApproval");
  if (nameEl && document.activeElement !== nameEl) nameEl.value = settings.siteName;
  if (descEl && document.activeElement !== descEl) descEl.value = settings.siteDescription;
  if (approvalEl) approvalEl.checked = !!settings.requireApproval;
}

function initSettings() {
  document.getElementById("btnSaveSettings")?.addEventListener("click", () => {
    if (window.TWStore) {
      TWStore.saveSettings({
        siteName: document.getElementById("settingSiteName").value,
        siteDescription: document.getElementById("settingSiteDescription").value,
        requireApproval: document.getElementById("settingRequireApproval").checked,
      });
    }
    const status = document.getElementById("settingsSaveStatus");
    if (status) {
      status.style.display = "inline";
      status.textContent = "\u2713 Settings saved.";
      setTimeout(() => (status.style.display = "none"), 3000);
    }
  });

  document.getElementById("btnSavePermissions")?.addEventListener("click", () => {
    showToast("Role permissions updated.");
  });

  document.getElementById("addTeamMemberForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("newMemberName").value.trim();
    const email = document.getElementById("newMemberEmail").value.trim();
    const role = document.getElementById("newMemberRole").value;
    if (!name || !email || !window.TWStore) return;

    TWStore.addUser({
      name,
      email,
      role,
      avatar: `https://i.pravatar.cc/100?u=${encodeURIComponent(email)}`,
      jobTitle: role === "editor" ? "Editor" : "Writer",
      bio: "",
      followers: 0,
      status: "active",
      joined: new Date().toISOString().slice(0, 10),
      payoutMethod: { type: null },
    });

    showToast(`Invite sent to ${email}.`);
    renderUsersTable();
    e.target.reset();
  });
}








// Inside source: 23 - Admin Dashboard Access Check
function checkAdminAccess() {
  const user = TWStore.currentUser;

  // Convert role to lowercase so 'Admin' and 'admin' both pass
  if (!user || !user.role || user.role.toLowerCase() !== 'admin') {
    alert('Access denied. Admin rights required.');
    window.location.hash = '#page-home';
    return false;
  }
  return true;
}