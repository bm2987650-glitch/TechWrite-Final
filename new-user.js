document.addEventListener("DOMContentLoaded", () => {
  // Role guard: if an admin is signed in and lands on the author dashboard
  // (e.g. by typing the URL directly, or a stale bookmark), send them to
  // their own dashboard instead. No session at all is allowed through, so
  // this page still works standalone for direct testing/demo purposes.
  if (window.TWStore) {
    const session = TWStore.getSession();
    if (session && session.role === "admin") {
      window.location.href = "../new-admin/new-admin.html";
      return;
    }
  }

  initTabNavigation();
  initMobileSidebar();
  initSubTabs();
  initWysiwygToolbar();
  initDashboardChartToggle();
  initCreateArticleEditor();
  initArticlesManagement();
  initAnalyticsEngine();
  initProfileSection();
  initPayoutsSection();
  initLogout();

  renderArticlesTable();
  renderPayoutHistory();
  renderProfileFromStore();

  if (window.TWStore) {
    TWStore.onChange(() => {
      renderArticlesTable();
      renderPayoutHistory();
    });
  }
});

/* ==========================================================================
   Current user (very light demo auth: falls back to a demo writer account
   if nobody actually logged in, so the dashboard still works standalone)
   ========================================================================== */
function getCurrentUser() {
  if (!window.TWStore) return null;
  const session = TWStore.getSession();
  let user = session ? TWStore.getUserByEmail(session.email) : null;
  if (!user) user = TWStore.getUserByName("Alex Morgan");
  return user;
}

function initLogout() {
  document.getElementById("logoutLink")?.addEventListener("click", () => {
    if (window.TWStore) TWStore.logout();
  });
}

/* ==========================================================================
   Tab Navigation
   ========================================================================== */
function initTabNavigation() {
  const navItems = document.querySelectorAll(".nav-menu .nav-item[data-tab]");

  navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const targetTab = item.getAttribute("data-tab");
      switchTab(targetTab);
    });
  });
}

function switchTab(tabId) {
  const navItems = document.querySelectorAll(".nav-menu .nav-item[data-tab]");
  const tabContents = document.querySelectorAll(".tab-content");
  const targetContent = document.getElementById(`tab-${tabId}`);

  if (!targetContent) return;

  navItems.forEach((nav) => {
    if (nav.getAttribute("data-tab") === tabId) {
      nav.classList.add("active");
    } else {
      nav.classList.remove("active");
    }
  });

  tabContents.forEach((content) => {
    content.classList.remove("active");
  });
  targetContent.classList.add("active");

  closeSidebar();

  if (tabId === "analytics") {
    updateAnalyticsMetrics();
  }
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
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  if (sidebar) sidebar.classList.remove("show");
  if (overlay) overlay.classList.remove("show");
}

function initSubTabs() {
  const subTabBtns = document.querySelectorAll(".sub-tab-btn");
  subTabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      subTabBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

function initWysiwygToolbar() {
  const toolbarButtons = document.querySelectorAll(".wysiwyg-toolbar button");
  toolbarButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
    });
  });
}

function initDashboardChartToggle() {
  const chartSelect = document.getElementById("dashboardChartSelect");
  const weeklyView = document.getElementById("weeklyView");
  const monthlyView = document.getElementById("monthlyView");

  if (!chartSelect || !weeklyView || !monthlyView) return;

  chartSelect.addEventListener("change", (e) => {
    if (e.target.value === "monthly") {
      weeklyView.classList.add("d-none");
      monthlyView.classList.remove("d-none");
    } else {
      monthlyView.classList.add("d-none");
      weeklyView.classList.remove("d-none");
    }
  });
}

/* ==========================================================================
   Dashboard stats + "Admin Feedback" banner - both driven by the live store
   ========================================================================== */
function formatCompact(n) {
  return n >= 1000 ? (n / 1000).toFixed(1) + "K" : String(n);
}

function renderDashboardStats(articles) {
  const user = getCurrentUser();
  if (!user) return;

  const published = articles.filter((a) => a.status === "published");
  const pending = articles.filter((a) => a.status === "review" || a.status === "changes");
  const drafts = articles.filter((a) => a.status === "draft");
  const totalViews = articles.reduce((sum, a) => sum + (a.views || 0), 0);

  const payouts = window.TWStore ? TWStore.getPayoutsByUser(user.name) : [];
  const earnings = payouts.filter((p) => p.status === "completed").reduce((sum, p) => sum + p.amount, 0);

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  set("dashboardWelcome", `Welcome, ${user.name.split(" ")[0]}!`);
  set("statPublished", published.length);
  set("statPending", pending.length);
  set("statPendingPill", pending.length);
  set("statDrafts", drafts.length);
  set("statFollowers", (user.followers || 0).toLocaleString());
  set("statViews", formatCompact(totalViews));
  set("statEarnings", "$" + earnings.toFixed(2));
}

function renderFeedbackBanner(articles) {
  const banner = document.getElementById("feedbackBanner");
  const list = document.getElementById("feedbackBannerList");
  if (!banner || !list) return;

  const needsChanges = articles.filter((a) => a.status === "changes" && a.adminNote);

  if (needsChanges.length === 0) {
    banner.style.display = "none";
    return;
  }

  banner.style.display = "block";
  list.innerHTML = needsChanges
    .map(
      (a) => `
      <div style="padding:10px 0;border-bottom:1px solid #fde68a;">
        <strong>${escapeHtml(a.title)}</strong>
        <div class="text-muted font-sm" style="margin-top:4px;">${escapeHtml(a.adminNote)}</div>
      </div>`
    )
    .join("");
}

function escapeHtml(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/* ==========================================================================
   Articles table - rendered live from TWStore, filtered to this author
   ========================================================================== */
function statusBadgeHtml(status) {
  if (status === "published") return `<span class="badge badge-published">Published</span>`;
  if (status === "review") return `<span class="badge badge-warning">Under Review</span>`;
  if (status === "changes") return `<span class="badge badge-warning" style="background:#fde8ed;color:#be185d">Changes Requested</span>`;
  return `<span class="badge" style="background:#f1f5f9;color:#64748b">Draft</span>`;
}

function articleRowHtml(a) {
  return `
    <tr data-id="${a.id}" data-status="${a.status}" data-title="${escapeHtml(a.title)}" data-category="${escapeHtml(a.category)}"
      data-views="${a.views || 0}" data-date="${a.date}" data-tags="${escapeHtml(a.tags || "")}" data-slug="${escapeHtml(a.slug || "")}"
      data-content="${escapeHtml(a.content || "")}">
      <td>
        <div class="article-title-cell">
          <img src="${a.image || "https://picsum.photos/40/40?random=" + Math.floor(Math.random() * 100)}" class="article-thumb" />
          <div>
            <strong>${escapeHtml(a.title)}</strong>
            <a href="#" class="article-link">https://tech-write.com/${escapeHtml(a.slug || "")} <i class="fa-solid fa-arrow-up-right-from-square"></i></a>
          </div>
        </div>
      </td>
      <td>${window.TWStore ? TWStore.formatDate(a.date) : a.date}</td>
      <td>${(a.tags || a.category || "").split(",").filter(Boolean).map((t) => `<span class="badge badge-tag">${escapeHtml(t.trim())}</span>`).join(" ")}</td>
      <td>${statusBadgeHtml(a.status)}</td>
      <td>${a.views || 0}</td>
      <td>
        <button class="btn btn-sm btn-outline btn-edit-article">Edit</button>
        <button class="btn btn-sm btn-outline btn-view-article">View</button>
        <button class="btn btn-sm btn-danger btn-delete-article">Delete</button>
        ${a.status === "changes" ? `<button class="btn btn-sm btn-outline btn-resubmit-article" style="border-color:#f59e0b;color:#b45309">Resubmit</button>` : ""}
      </td>
    </tr>`;
}

function renderArticlesTable() {
  const tableBody = document.getElementById("articlesTableBody");
  if (!tableBody || !window.TWStore) return;

  const user = getCurrentUser();
  if (!user) return;

  const articles = TWStore.getArticlesByAuthor(user.name).sort((a, b) => new Date(b.date) - new Date(a.date));
  tableBody.innerHTML = articles.map(articleRowHtml).join("");

  renderDashboardStats(articles);
  renderFeedbackBanner(articles);
  applyFiltersAndSortIfReady();
}

/* Lets initArticlesManagement's filter/sort re-apply after every re-render */
let __applyFiltersAndSort = null;
function applyFiltersAndSortIfReady() {
  if (__applyFiltersAndSort) __applyFiltersAndSort();
}

/* ==========================================================================
   Editor & Create Article Implementation (WYSIWYG editor logic unchanged;
   only the final "publish" / "save draft" step now writes to TWStore)
   ========================================================================== */
function initCreateArticleEditor() {
  const createTab = document.getElementById("tab-create");
  if (!createTab) return;

  const topTitleInput = createTab.querySelector(".editor-main-panel .title-input");
  const sideTitleInput = createTab.querySelector(".editor-side-panel input[placeholder='Article Title...']");
  const sideCategorySelect = createTab.querySelector(".editor-side-panel select");
  const sideTagsInput = createTab.querySelector(".editor-side-panel input[placeholder*='Tags']");
  const sideSlugInput = createTab.querySelector(".editor-side-panel input[placeholder*='image-address']");

  const publishBtn = createTab.querySelector(".editor-actions .btn-primary");
  const saveDraftBtn = createTab.querySelector(".editor-actions .btn-outline");

  let topHeading = createTab.querySelector(".editor-main-panel .live-article-heading");
  if (!topHeading) {
    topHeading = document.createElement("h1");
    topHeading.className = "live-article-heading fw-bold mt-2 mb-3";
    topHeading.style.fontSize = "1.8rem";
    topHeading.style.color = "var(--text-primary)";
    topTitleInput.parentNode.insertBefore(topHeading, topTitleInput);
  }

  function syncTitle(value) {
    if (topTitleInput && topTitleInput.value !== value) topTitleInput.value = value;
    if (sideTitleInput && sideTitleInput.value !== value) sideTitleInput.value = value;
    topHeading.textContent = value.trim() ? value : "";
  }

  if (topTitleInput) {
    topTitleInput.addEventListener("input", (e) => syncTitle(e.target.value));
  }
  if (sideTitleInput) {
    sideTitleInput.addEventListener("input", (e) => syncTitle(e.target.value));
  }

  if (topTitleInput && sideSlugInput) {
    topTitleInput.addEventListener("input", (e) => {
      sideSlugInput.value = e.target.value
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
    });
  }

  const mainPanel = createTab.querySelector(".editor-main-panel");
  const oldTextarea = mainPanel.querySelector(".content-textarea");
  let editorArea = mainPanel.querySelector(".wysiwyg-content-area");

  if (!editorArea && oldTextarea) {
    editorArea = document.createElement("div");
    editorArea.className = "form-control wysiwyg-content-area";
    editorArea.contentEditable = "true";
    editorArea.style.minHeight = "220px";
    editorArea.style.background = "#ffffff";
    editorArea.style.padding = "12px";
    editorArea.style.outline = "none";
    editorArea.style.overflowY = "auto";
    oldTextarea.parentNode.replaceChild(editorArea, oldTextarea);
  }

  const toolbar = mainPanel.querySelector(".wysiwyg-toolbar");
  if (toolbar) {
    toolbar.addEventListener("click", (e) => {
      const button = e.target.closest("button");
      if (!button) return;
      e.preventDefault();

      const icon = button.querySelector("i");
      if (!icon) return;

      if (icon.classList.contains("fa-bold")) {
        document.execCommand("bold", false, null);
      } else if (icon.classList.contains("fa-italic")) {
        document.execCommand("italic", false, null);
      } else if (icon.classList.contains("fa-underline")) {
        document.execCommand("underline", false, null);
      } else if (icon.classList.contains("fa-strikethrough")) {
        document.execCommand("strikeThrough", false, null);
      } else if (icon.classList.contains("fa-list-ul")) {
        document.execCommand("insertUnorderedList", false, null);
      } else if (icon.classList.contains("fa-list-ol")) {
        document.execCommand("insertOrderedList", false, null);
      } else if (icon.classList.contains("fa-quote-right")) {
        document.execCommand("formatBlock", false, "blockquote");
      } else if (icon.classList.contains("fa-link")) {
        const url = prompt("Enter URL:");
        if (url) document.execCommand("createLink", false, url);
      } else if (icon.classList.contains("fa-image")) {
        fileInput.click();
      }
    });
  }

  const uploadArea = mainPanel.querySelector(".upload-area");
  let fileInput = document.getElementById("editorFileInput");

  if (!fileInput) {
    fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.id = "editorFileInput";
    fileInput.accept = "image/*,.pdf,.doc,.docx";
    fileInput.style.display = "none";
    document.body.appendChild(fileInput);
  }

  if (uploadArea) {
    uploadArea.addEventListener("click", () => fileInput.click());
  }

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("File size exceeds 50 MB limits. Please select a smaller file.");
      fileInput.value = "";
      return;
    }

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        insertImageAtCursor(event.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      insertAttachmentAtCursor(file.name);
    }
    fileInput.value = "";
  });

  function insertImageAtCursor(src) {
    editorArea.focus();
    const container = document.createElement("div");
    container.className = "image-resizable-wrapper mt-2 mb-2";
    container.style.position = "relative";
    container.style.display = "inline-block";
    container.style.maxWidth = "100%";

    const img = document.createElement("img");
    img.src = src;
    img.style.maxWidth = "100%";
    img.style.height = "auto";
    img.style.borderRadius = "8px";

    const controls = document.createElement("div");
    controls.style.position = "absolute";
    controls.style.top = "6px";
    controls.style.right = "6px";
    controls.style.display = "flex";
    controls.style.gap = "4px";
    controls.style.background = "rgba(0,0,0,0.6)";
    controls.style.padding = "4px";
    controls.style.borderRadius = "4px";

    const btnSmall = createCtrlBtn("25%");
    const btnMedium = createCtrlBtn("50%");
    const btnFull = createCtrlBtn("100%");
    const btnDelete = createCtrlBtn("✕");

    btnSmall.onclick = (e) => { e.preventDefault(); img.style.width = "25%"; };
    btnMedium.onclick = (e) => { e.preventDefault(); img.style.width = "50%"; };
    btnFull.onclick = (e) => { e.preventDefault(); img.style.width = "100%"; };
    btnDelete.onclick = (e) => { e.preventDefault(); container.remove(); };

    controls.appendChild(btnSmall);
    controls.appendChild(btnMedium);
    controls.appendChild(btnFull);
    controls.appendChild(btnDelete);

    container.appendChild(img);
    container.appendChild(controls);

    insertNodeAtCursor(container);
  }

  function createCtrlBtn(label) {
    const b = document.createElement("button");
    b.textContent = label;
    b.type = "button";
    b.style.fontSize = "11px";
    b.style.padding = "2px 6px";
    b.style.cursor = "pointer";
    b.style.background = "#ffffff";
    b.style.border = "none";
    b.style.borderRadius = "3px";
    return b;
  }

  function insertAttachmentAtCursor(fileName) {
    editorArea.focus();
    const link = document.createElement("a");
    link.href = "#";
    link.textContent = `📎 ${fileName}`;
    link.style.display = "inline-block";
    link.style.margin = "4px 0";
    insertNodeAtCursor(link);
  }

  function insertNodeAtCursor(node) {
    const sel = window.getSelection();
    if (sel.getRangeAt && sel.rangeCount) {
      let range = sel.getRangeAt(0);
      if (!editorArea.contains(range.commonAncestorContainer)) {
        editorArea.appendChild(node);
        return;
      }
      range.deleteContents();
      range.insertNode(node);
    } else {
      editorArea.appendChild(node);
    }
  }

  if (publishBtn) {
    publishBtn.addEventListener("click", (e) => {
      e.preventDefault();
      publishArticle("review");
    });
  }

  if (saveDraftBtn) {
    saveDraftBtn.addEventListener("click", (e) => {
      e.preventDefault();
      publishArticle("draft");
    });
  }

  function publishArticle(status) {
    const titleVal = (sideTitleInput.value.trim() || topTitleInput.value.trim() || "Untitled Article");
    const categoryVal = sideCategorySelect ? sideCategorySelect.value : "AI Tools";
    const tagsVal = sideTagsInput ? sideTagsInput.value.trim() : "";
    const slugVal = sideSlugInput ? sideSlugInput.value.trim() : (window.TWStore ? TWStore.slugify(titleVal) : "");
    const contentHtml = editorArea ? editorArea.innerText.trim() : "";

    if (!window.TWStore) return;
    const user = getCurrentUser();
    if (!user) return;

    TWStore.addArticle({
      title: titleVal,
      slug: slugVal,
      category: categoryVal,
      tags: tagsVal,
      excerpt: contentHtml.slice(0, 160),
      content: contentHtml || "No content provided yet.",
      image: `https://picsum.photos/900/500?random=${Math.floor(Math.random() * 1000)}`,
      status: status,
      author: user.name,
    });

    syncTitle("");
    if (sideTagsInput) sideTagsInput.value = "";
    if (sideSlugInput) sideSlugInput.value = "";
    if (editorArea) editorArea.innerHTML = "";

    renderArticlesTable();
    switchTab("articles");
  }
}

/* ==========================================================================
   Full Articles Tab Logic: Search, Category Filter, Sorting, Edit Modal,
   Preview Modal, Delete, Resubmit - all writing back through TWStore.
   ========================================================================== */
function initArticlesManagement() {
  const searchInput = document.getElementById("searchInput");
  const statusFilter = document.getElementById("statusFilter");
  const categoryFilter = document.getElementById("categoryFilter");
  const sortFilter = document.getElementById("sortFilter");
  const tableBody = document.getElementById("articlesTableBody");
  if (!tableBody) return;

  let activeEditingRow = null;

  function applyFiltersAndSort() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const selectedStatus = statusFilter ? statusFilter.value : "all";
    const selectedCategory = categoryFilter ? categoryFilter.value : "all";
    const selectedSort = sortFilter ? sortFilter.value : "default";

    let rows = Array.from(tableBody.querySelectorAll("tr"));

    rows.forEach((row) => {
      const title = (row.getAttribute("data-title") || "").toLowerCase();
      const tags = (row.getAttribute("data-tags") || "").toLowerCase();
      const status = row.getAttribute("data-status");
      const category = row.getAttribute("data-category");

      const matchesSearch = title.includes(searchTerm) || tags.includes(searchTerm);
      const matchesStatus = selectedStatus === "all" || status === selectedStatus;
      const matchesCategory = selectedCategory === "all" || category === selectedCategory;

      row.classList.toggle("d-none", !(matchesSearch && matchesStatus && matchesCategory));
    });

    if (selectedSort !== "default") {
      rows.sort((a, b) => {
        if (selectedSort === "title-asc") {
          return a.getAttribute("data-title").localeCompare(b.getAttribute("data-title"));
        } else if (selectedSort === "views-desc") {
          return parseInt(b.getAttribute("data-views")) - parseInt(a.getAttribute("data-views"));
        } else if (selectedSort === "date-desc") {
          return new Date(b.getAttribute("data-date")) - new Date(a.getAttribute("data-date"));
        }
        return 0;
      });

      rows.forEach((row) => tableBody.appendChild(row));
    }
  }

  __applyFiltersAndSort = applyFiltersAndSort;

  if (searchInput) searchInput.addEventListener("input", applyFiltersAndSort);
  if (statusFilter) statusFilter.addEventListener("change", applyFiltersAndSort);
  if (categoryFilter) categoryFilter.addEventListener("change", applyFiltersAndSort);
  if (sortFilter) sortFilter.addEventListener("change", applyFiltersAndSort);

  tableBody.addEventListener("click", (e) => {
    const row = e.target.closest("tr");
    if (!row) return;
    const id = row.getAttribute("data-id");

    if (e.target.classList.contains("btn-delete-article")) {
      if (confirm("Are you sure you want to delete this article?") && window.TWStore) {
        TWStore.deleteArticle(id);
        renderArticlesTable();
      }
    } else if (e.target.classList.contains("btn-edit-article")) {
      openEditModal(row);
    } else if (e.target.classList.contains("btn-view-article")) {
      openPreviewModal(row);
    } else if (e.target.classList.contains("btn-resubmit-article")) {
      if (window.TWStore) {
        TWStore.updateArticle(id, { status: "review", adminNote: "" });
        renderArticlesTable();
      }
    }
  });

  const editModalOverlay = document.getElementById("editModalOverlay");
  const closeEditModal = document.getElementById("closeEditModal");
  const editForm = document.getElementById("editArticleForm");

  function openEditModal(row) {
    activeEditingRow = row;
    const status = row.getAttribute("data-status");

    document.getElementById("editTitle").value = row.getAttribute("data-title") || "";
    document.getElementById("editContent").value = row.getAttribute("data-content") || "";
    document.getElementById("editCategory").value = row.getAttribute("data-category") || "AI Tools";
    document.getElementById("editTags").value = row.getAttribute("data-tags") || "";
    document.getElementById("editSlug").value = row.getAttribute("data-slug") || "";
    document.getElementById("editStatus").value = status === "changes" || status === "draft" ? "review" : (status || "published");

    editModalOverlay.classList.add("active");
  }

  if (closeEditModal) {
    closeEditModal.addEventListener("click", () => editModalOverlay.classList.remove("active"));
  }

  if (editForm) {
    editForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!activeEditingRow || !window.TWStore) return;

      const id = activeEditingRow.getAttribute("data-id");
      const newTitle = document.getElementById("editTitle").value;
      const newCategory = document.getElementById("editCategory").value;
      const newTags = document.getElementById("editTags").value;
      const newSlug = document.getElementById("editSlug").value;
      const newStatus = document.getElementById("editStatus").value;
      const newContent = document.getElementById("editContent").value;

      TWStore.updateArticle(id, {
        title: newTitle,
        category: newCategory,
        tags: newTags,
        slug: newSlug,
        status: newStatus,
        content: newContent,
        adminNote: "",
      });

      editModalOverlay.classList.remove("active");
      renderArticlesTable();
    });
  }

  const previewModalOverlay = document.getElementById("previewModalOverlay");
  const closePreviewModal = document.getElementById("closePreviewModal");

  function openPreviewModal(row) {
    document.getElementById("previewTitle").textContent = row.getAttribute("data-title");
    document.getElementById("previewCategory").textContent = row.getAttribute("data-category");
    document.getElementById("previewContent").innerHTML = row.getAttribute("data-content");

    const status = row.getAttribute("data-status");
    const statusBadge = document.getElementById("previewStatusBadge");
    if (status === "published") {
      statusBadge.className = "badge badge-published";
      statusBadge.textContent = "Published";
    } else if (status === "changes") {
      statusBadge.className = "badge badge-warning";
      statusBadge.style.background = "#fde8ed";
      statusBadge.style.color = "#be185d";
      statusBadge.textContent = "Changes Requested";
    } else if (status === "draft") {
      statusBadge.className = "badge";
      statusBadge.style.background = "#f1f5f9";
      statusBadge.style.color = "#64748b";
      statusBadge.textContent = "Draft";
    } else {
      statusBadge.className = "badge badge-warning";
      statusBadge.style.background = "";
      statusBadge.style.color = "";
      statusBadge.textContent = "Under Review";
    }

    previewModalOverlay.classList.add("active");
  }

  if (closePreviewModal) {
    closePreviewModal.addEventListener("click", () => previewModalOverlay.classList.remove("active"));
  }
}

/**
 * Analytics Data Engine & Dynamic Chart Generator
 */
function initAnalyticsEngine() {
  const startDateInput = document.getElementById("analyticsStartDate");
  const endDateInput = document.getElementById("analyticsEndDate");

  if (startDateInput && endDateInput) {
    startDateInput.addEventListener("change", updateAnalyticsMetrics);
    endDateInput.addEventListener("change", updateAnalyticsMetrics);
  }

  updateAnalyticsMetrics();
}

function updateAnalyticsMetrics() {
  const tableBody = document.getElementById("articlesTableBody");
  let totalViews = 0;

  if (tableBody) {
    const rows = tableBody.querySelectorAll("tr");
    rows.forEach((row) => {
      const v = parseInt(row.getAttribute("data-views") || "0", 10);
      totalViews += v;
    });
  }

  const metricTotalViews = document.getElementById("metricTotalViews");
  if (metricTotalViews) {
    metricTotalViews.textContent = totalViews > 1000 ? (totalViews / 1000).toFixed(1) + "K" : totalViews;
  }

  const startVal = document.getElementById("analyticsStartDate")?.value || "2026-08-01";
  const endVal = document.getElementById("analyticsEndDate")?.value || "2026-08-23";

  const dStart = new Date(startVal);
  const dEnd = new Date(endVal);

  if (!isNaN(dStart) && !isNaN(dEnd) && dEnd >= dStart) {
    renderAnalyticsChart(dStart, dEnd, totalViews);
  }

  const cardAvgReadTime = document.getElementById("cardAvgReadTime");
  const cardBounceRate = document.getElementById("cardBounceRate");
  const cardActiveReaders = document.getElementById("cardActiveReaders");
  const cardTotalEarnings = document.getElementById("cardTotalEarnings");

  if (cardAvgReadTime) cardAvgReadTime.textContent = (0.5 + (totalViews % 10) * 0.1).toFixed(1) + " hrs";
  if (cardBounceRate) cardBounceRate.textContent = Math.max(20, (89 - (totalViews % 15))).toFixed(0) + "%";
  if (cardActiveReaders) cardActiveReaders.textContent = Math.max(1, Math.floor(totalViews / 15) + 3);
  if (cardTotalEarnings) {
    const user = getCurrentUser();
    const payouts = user && window.TWStore ? TWStore.getPayoutsByUser(user.name) : [];
    const earnings = payouts.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0);
    cardTotalEarnings.textContent = "$" + earnings.toFixed(2);
  }
}

function renderAnalyticsChart(startDate, endDate, baseViews) {
  const chartPath = document.getElementById("analyticsChartPath");
  const xAxis = document.getElementById("analyticsXAxis");
  if (!chartPath || !xAxis) return;

  const diffDays = Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)));
  const steps = 7;
  const dayStep = diffDays / (steps - 1);

  let pathD = "";
  let xAxisHtml = "";

  for (let i = 0; i < steps; i++) {
    const currentDate = new Date(startDate.getTime() + i * dayStep * 86400000);
    const mm = String(currentDate.getMonth() + 1).padStart(2, "0");
    const dd = String(currentDate.getDate()).padStart(2, "0");
    xAxisHtml += `<span>${mm}/${dd}</span>`;

    const x = (i / (steps - 1)) * 500;
    const randomY = 100 - (Math.sin(i + baseViews) * 35 + 45);
    const clampedY = Math.max(10, Math.min(110, randomY));

    if (i === 0) {
      pathD += `M${x.toFixed(1)},${clampedY.toFixed(1)}`;
    } else {
      pathD += ` L${x.toFixed(1)},${clampedY.toFixed(1)}`;
    }
  }

  chartPath.setAttribute("d", pathD);
  xAxis.innerHTML = xAxisHtml;
}

/*** Profile & Account Management ***/
function renderProfileFromStore() {
  const user = getCurrentUser();
  if (!user) return;

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };

  set("profileFullName", user.name);
  set("profileJobTitle", user.jobTitle || "");
  set("profileEmail", user.email);
  set("profileBio", user.bio || "");

  const avatarPreview = document.getElementById("profileAvatarPreview");
  const navbarAvatar = document.querySelector(".user-profile-dropdown .avatar");
  const navbarUserName = document.querySelector(".user-profile-dropdown .user-name");
  if (avatarPreview) avatarPreview.src = user.avatar;
  if (navbarAvatar) navbarAvatar.src = user.avatar;
  if (navbarUserName) navbarUserName.innerHTML = `${user.name} <i class="fa-solid fa-chevron-down"></i>`;

  // Pre-fill the payout method forms with whatever is already on file.
  if (user.payoutMethod) {
    if (user.payoutMethod.type === "bank") {
      set("bankHolderInput", user.payoutMethod.bankHolder || "");
      set("bankIbanInput", user.payoutMethod.bankIban || "");
      set("bankSwiftInput", user.payoutMethod.bankSwift || "");
      const countrySelect = document.getElementById("payoutCountrySelect");
      if (countrySelect && user.payoutMethod.bankCountry) {
        countrySelect.value = user.payoutMethod.bankCountry;
        countrySelect.dispatchEvent(new Event("change"));
        setTimeout(() => {
          const bankSelect = document.getElementById("payoutBankSelect");
          if (bankSelect) bankSelect.value = user.payoutMethod.bankName || "";
        }, 0);
      }
    } else if (user.payoutMethod.type === "paypal") {
      set("paypalEmailInput", user.payoutMethod.paypalEmail || "");
      set("paypalConfirmInput", user.payoutMethod.paypalEmail || "");
    }
  }
}

function initProfileSection() {
  const profilePicInput = document.getElementById("profilePicInput");
  const profileAvatarPreview = document.getElementById("profileAvatarPreview");
  const navbarAvatar = document.querySelector(".user-profile-dropdown .avatar");
  const navbarUserName = document.querySelector(".user-profile-dropdown .user-name");

  if (profilePicInput) {
    profilePicInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        if (!file.type.startsWith("image/")) {
          alert("Please select a valid image file.");
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          const imgUrl = event.target.result;
          if (profileAvatarPreview) profileAvatarPreview.src = imgUrl;
          if (navbarAvatar) navbarAvatar.src = imgUrl;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  const profileAccountForm = document.getElementById("profileAccountForm");
  const profileSaveStatus = document.getElementById("profileSaveStatus");

  if (profileAccountForm) {
    profileAccountForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const user = getCurrentUser();
      if (!user || !window.TWStore) return;

      const newName = document.getElementById("profileFullName").value.trim();
      const newJobTitle = document.getElementById("profileJobTitle").value.trim();
      const newEmail = document.getElementById("profileEmail").value.trim();
      const newBio = document.getElementById("profileBio").value.trim();
      const newAvatar = profileAvatarPreview ? profileAvatarPreview.src : user.avatar;
      const oldName = user.name;

      TWStore.upsertUser({
        id: user.id,
        name: newName || oldName,
        jobTitle: newJobTitle,
        email: newEmail || user.email,
        bio: newBio,
        avatar: newAvatar,
      });

      // Keep articles/payouts pointing at the right byline if the display name changed.
      if (newName && newName !== oldName) {
        TWStore.getArticlesByAuthor(oldName).forEach((a) => TWStore.updateArticle(a.id, { author: newName }));
      }

      TWStore.setSession({ name: newName || oldName, email: newEmail || user.email, role: user.role });

      if (navbarUserName) {
        navbarUserName.innerHTML = `${newName || oldName} <i class="fa-solid fa-chevron-down"></i>`;
      }

      if (profileSaveStatus) {
        profileSaveStatus.style.display = "inline";
        profileSaveStatus.style.color = "#155724";
        profileSaveStatus.textContent = "✓ Profile updated successfully! Your byline is updated across the site.";
        setTimeout(() => {
          profileSaveStatus.style.display = "none";
        }, 4000);
      }

      renderArticlesTable();
    });
  }

  const changePasswordForm = document.getElementById("changePasswordForm");
  const passwordAlert = document.getElementById("passwordAlert");

  if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const newPass = document.getElementById("newPassword").value;
      const confirmPass = document.getElementById("confirmNewPassword").value;

      if (newPass !== confirmPass) {
        passwordAlert.className = "alert-message mb-3 alert-danger-custom";
        passwordAlert.textContent = "Passwords do not match. Please ensure both new password fields are identical.";
        passwordAlert.style.display = "block";
        return;
      }

      const user = getCurrentUser();
      if (user && window.TWStore && newPass) {
        TWStore.upsertUser({ id: user.id, password: newPass });
      }

      passwordAlert.className = "alert-message mb-3 alert-success-custom";
      passwordAlert.textContent = "Password changed successfully!";
      passwordAlert.style.display = "block";

      changePasswordForm.reset();
      setTimeout(() => {
        passwordAlert.style.display = "none";
      }, 4000);
    });
  }

  const btnVerifyGmail = document.getElementById("btnVerifyGmail");
  const btnVerifyPhone = document.getElementById("btnVerifyPhone");

  if (btnVerifyGmail) {
    btnVerifyGmail.addEventListener("click", () => {
      const emailVal = document.getElementById("verifyGmailInput").value;
      alert(`Verification code sent to Gmail: ${emailVal}`);
    });
  }

  if (btnVerifyPhone) {
    btnVerifyPhone.addEventListener("click", () => {
      const phoneVal = document.getElementById("verifyPhoneInput").value;
      alert(`Verification SMS sent to Phone: ${phoneVal}`);
    });
  }
}

/* ==========================================================================
   Payouts: request live, save payment method live, render history live
   ========================================================================== */
function payoutStatusBadgeHtml(status) {
  if (status === "completed") return `<span class="badge badge-published">Completed</span>`;
  if (status === "processing") return `<span class="badge badge-warning">Processing</span>`;
  return `<span class="badge badge-warning">Pending</span>`;
}

function payoutMethodLabel(method) {
  if (!method) return "Not set";
  if (method.type === "paypal") return "PayPal";
  if (method.type === "bank") return "Bank Transfer";
  return "Not set";
}

function renderPayoutHistory() {
  const tbody = document.getElementById("payoutHistoryBody");
  if (!tbody || !window.TWStore) return;

  const user = getCurrentUser();
  if (!user) return;

  const payouts = TWStore.getPayoutsByUser(user.name).sort(
    (a, b) => new Date(b.requestedDate) - new Date(a.requestedDate)
  );

  tbody.innerHTML = payouts.length
    ? payouts
        .map(
          (p) => `
        <tr>
          <td>${TWStore.formatDate(p.requestedDate)}</td>
          <td class="fw-bold">$${p.amount.toFixed(2)}</td>
          <td>${payoutMethodLabel(p.method)}</td>
          <td>${payoutStatusBadgeHtml(p.status)}</td>
        </tr>`
        )
        .join("")
    : `<tr><td colspan="4" class="text-muted" style="text-align:center;padding:16px">No payout requests yet.</td></tr>`;

  const totalPaid = payouts.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0);
  const lastCompleted = payouts.find((p) => p.status === "completed");
  const totalPaidEl = document.getElementById("payoutTotalPaid");
  const lastDateEl = document.getElementById("payoutLastDate");
  if (totalPaidEl) totalPaidEl.textContent = "$" + totalPaid.toFixed(2);
  if (lastDateEl) lastDateEl.textContent = lastCompleted ? TWStore.formatDate(lastCompleted.releasedDate) : "—";
}

function initPayoutsSection() {
  const btnRequest = document.getElementById("btnRequestPayout");
  const requestMsg = document.getElementById("payoutRequestMsg");
  const btnBank = document.getElementById("btnBankMethod");
  const btnPaypal = document.getElementById("btnPaypalMethod");
  const bankForm = document.getElementById("bankPaymentForm");
  const paypalForm = document.getElementById("paypalPaymentForm");
  const countrySelect = document.getElementById("payoutCountrySelect");
  const bankSelect = document.getElementById("payoutBankSelect");

  const bankData = {
    "United States": ["JPMorgan Chase", "Bank of America", "Wells Fargo", "Citigroup"],
    "United Kingdom": ["HSBC", "Barclays", "Lloyds Bank", "NatWest"],
    "Pakistan": ["Habib Bank Limited (HBL)", "Meezan Bank", "National Bank of Pakistan (NBP)", "MCB Bank"],
    "Canada": ["Royal Bank of Canada (RBC)", "TD Bank", "Bank of Montreal (BMO)", "Scotiabank"],
  };

  if (btnRequest && requestMsg) {
    btnRequest.addEventListener("click", () => {
      const user = getCurrentUser();
      if (!user || !window.TWStore) return;

      if (!user.payoutMethod || !user.payoutMethod.type) {
        alert("Please save a payment method below before requesting a payout.");
        return;
      }

      const amountInput = document.getElementById("payoutRequestAmount");
      const amount = amountInput ? parseFloat(amountInput.value) : 0;
      if (!amount || amount <= 0) {
        alert("Please enter a valid amount to request.");
        return;
      }

      TWStore.requestPayout(user.name, amount, user.payoutMethod);
      renderPayoutHistory();

      requestMsg.style.display = "inline";
      setTimeout(() => (requestMsg.style.display = "none"), 3000);
    });
  }

  if (btnBank && btnPaypal && bankForm && paypalForm) {
    btnBank.addEventListener("click", () => {
      bankForm.classList.remove("d-none");
      paypalForm.classList.add("d-none");
      btnBank.classList.replace("btn-outline", "btn-primary");
      btnPaypal.classList.replace("btn-primary", "btn-outline");
    });

    btnPaypal.addEventListener("click", () => {
      paypalForm.classList.remove("d-none");
      bankForm.classList.add("d-none");
      btnPaypal.classList.replace("btn-outline", "btn-primary");
      btnBank.classList.replace("btn-primary", "btn-outline");
    });
  }

  if (countrySelect && bankSelect) {
    countrySelect.addEventListener("change", (e) => {
      const selectedCountry = e.target.value;
      bankSelect.innerHTML = '<option value="">Select Bank</option>';

      if (selectedCountry && bankData[selectedCountry]) {
        bankSelect.disabled = false;
        bankData[selectedCountry].forEach((bank) => {
          const opt = document.createElement("option");
          opt.value = bank;
          opt.textContent = bank;
          bankSelect.appendChild(opt);
        });
      } else {
        bankSelect.disabled = true;
      }
    });
  }

  const bankPaymentForm = document.getElementById("bankPaymentForm");
  if (bankPaymentForm) {
    bankPaymentForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const user = getCurrentUser();
      if (!user || !window.TWStore) return;

      const holder = document.getElementById("bankHolderInput")?.value.trim();
      const country = countrySelect?.value;
      const bankName = bankSelect?.value;
      const iban = document.getElementById("bankIbanInput")?.value.trim();
      const swift = document.getElementById("bankSwiftInput")?.value.trim();

      if (!holder || !country || !bankName || !iban || !swift) {
        alert("Please fill in every bank detail field.");
        return;
      }

      TWStore.upsertUser({
        id: user.id,
        payoutMethod: { type: "bank", bankHolder: holder, bankCountry: country, bankName, bankIban: iban, bankSwift: swift },
      });

      alert("Bank details saved. You can now request a payout.");
    });
  }

  const paypalPaymentForm = document.getElementById("paypalPaymentForm");
  if (paypalPaymentForm) {
    paypalPaymentForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const user = getCurrentUser();
      if (!user || !window.TWStore) return;

      const email = document.getElementById("paypalEmailInput")?.value.trim();
      const confirmEmail = document.getElementById("paypalConfirmInput")?.value.trim();

      if (!email || email !== confirmEmail) {
        alert("PayPal email addresses must match.");
        return;
      }

      TWStore.upsertUser({ id: user.id, payoutMethod: { type: "paypal", paypalEmail: email } });
      alert("PayPal details saved. You can now request a payout.");
    });
  }
}
