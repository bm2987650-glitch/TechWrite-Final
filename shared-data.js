/* ==========================================================================
   TechWrite Shared Data Layer
   A tiny localStorage-backed "database" so the Main Site, the Author
   dashboard (new-user) and the Admin dashboard (new-admin) all read and
   write the same data and stay in sync live across open tabs.

   IMPORTANT: localStorage is shared per-origin. Cross-tab live updates
   (the 'storage' event) only fire when these pages are served over
   http(s) (e.g. a local dev server) from the SAME origin - opening the
   files directly with file:// may not sync live in every browser.
   ========================================================================== */
(function (global) {
  const KEYS = {
    ARTICLES: "tw_articles",
    USERS: "tw_users",
    PAYOUTS: "tw_payouts",
    CATEGORIES: "tw_categories",
    SESSION: "tw_session",
    SETTINGS: "tw_settings",
    NEWSLETTER: "tw_newsletter",
    SEEDED: "tw_seeded_v1",
  };

  /* ---------------------------- Seed Data ---------------------------- */
  const SEED_CATEGORIES = [
    { name: "AI Tools", icon: "fa-wand-magic-sparkles" },
    { name: "Guides", icon: "fa-book-open" },
    { name: "Technology", icon: "fa-microchip" },
    { name: "AI Image", icon: "fa-image" },
    { name: "Tutorials", icon: "fa-graduation-cap" },
    { name: "Productivity", icon: "fa-chart-line" },
    { name: "News", icon: "fa-newspaper" },
    { name: "Reviews", icon: "fa-star" },
  ];

  const SEED_USERS = [
    {
      id: "u-admin",
      name: "Site Admin",
      email: "admin@techwrite.com",
      password: "admin@123",
      role: "admin",
      avatar: "https://i.pravatar.cc/100?img=68",
      jobTitle: "Site Administrator",
      bio: "Keeps TechWrite running - reviews articles, manages the team and releases payouts.",
      followers: 0,
      joined: "2026-05-01",
      status: "active",
      payoutMethod: { type: null },
    },
    {
      id: "u-alex",
      name: "Alex Morgan",
      email: "user@techwrite.com",
      password: "user@123",
      role: "writer",
      avatar: "https://i.pravatar.cc/100?img=12",
      jobTitle: "Senior Tech Writer",
      bio: "Technology enthusiast and writer covering AI, software development, and modern tech trends.",
      followers: 1215,
      joined: "2026-05-04",
      status: "active",
      payoutMethod: { type: "paypal", paypalEmail: "alex.morgan@paypal.com" },
    },
    {
      id: "u-sarah",
      name: "Sarah Writer",
      email: "sarah@example.com",
      password: "sarah@123",
      role: "writer",
      avatar: "https://i.pravatar.cc/100?img=47",
      jobTitle: "Guides Editor",
      bio: "Writes practical, academic-leaning guides on AI tools and productivity software.",
      followers: 640,
      joined: "2026-05-06",
      status: "active",
      payoutMethod: {
        type: "bank",
        bankHolder: "Sarah Writer",
        bankName: "Habib Bank Limited (HBL)",
        bankCountry: "Pakistan",
        bankIban: "PK36SCBL0000001123456701",
        bankSwift: "SCBLPKKK",
      },
    },
    {
      id: "u-john",
      name: "John Doe",
      email: "john@example.com",
      password: "john@123",
      role: "writer",
      avatar: "https://i.pravatar.cc/100?img=33",
      jobTitle: "Contributing Writer",
      bio: "New to TechWrite, writing hands-on reviews and web design breakdowns.",
      followers: 84,
      joined: "2026-06-02",
      status: "active",
      payoutMethod: { type: "paypal", paypalEmail: "john.doe@paypal.com" },
    },
  ];

  const SEED_ARTICLES = [
    {
      id: "art-1",
      title: "10 Best AI Writing Tools in 2026 (Free & Paid)",
      slug: "10-best-ai-writing-tools-in-2026",
      category: "AI Tools",
      status: "published",
      author: "Alex Morgan",
      image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=900&q=85",
      excerpt: "A roundup of the best AI writing tools available in 2026, with practical use cases for each.",
      content:
        "AI writing tools have become a practical part of modern content creation. They help writers, students, marketers and businesses draft, improve and organize content faster. This roundup covers the tools worth trying in 2026, from all-purpose assistants to specialized editors, along with what each one does best and who it fits.",
      views: 5430,
      date: "2026-05-12",
      readTime: "6 min read",
      adminNote: "",
    },
    {
      id: "art-2",
      title: "ChatGPT Complete Guide for Beginners",
      slug: "chatgpt-complete-guide-for-beginners",
      category: "Guides",
      status: "published",
      author: "Alex Morgan",
      image: "https://images.unsplash.com/photo-1676299081847-824916de030a?auto=format&fit=crop&w=900&q=85",
      excerpt: "Everything a beginner needs to know to get started with ChatGPT, step by step.",
      content:
        "This guide walks new users through getting set up with ChatGPT, understanding prompts, and using it effectively for everyday writing, research and brainstorming tasks - with practical examples at every step.",
      views: 4520,
      date: "2026-05-10",
      readTime: "8 min read",
      adminNote: "",
    },
    {
      id: "art-3",
      title: "Top 7 AI Image Generators You Should Try",
      slug: "top-7-ai-image-generators",
      category: "AI Image",
      status: "published",
      author: "Sarah Writer",
      image: "https://images.unsplash.com/photo-1686191128892-3c8a4c2d2d7d?auto=format&fit=crop&w=900&q=85",
      excerpt: "A hands-on comparison of the seven most capable AI image generators on the market today.",
      content:
        "From photorealistic renders to stylized illustration, this comparison walks through seven leading AI image generators, what each is best suited for, and how their pricing and output quality stack up.",
      views: 3985,
      date: "2026-05-08",
      readTime: "7 min read",
      adminNote: "",
    },
    {
      id: "art-4",
      title: "How AI Is Changing the Future of Work",
      slug: "how-ai-is-changing-the-future-of-work",
      category: "Technology",
      status: "published",
      author: "Alex Morgan",
      image: "https://images.unsplash.com/photo-1535378917042-10a22c95931a?auto=format&fit=crop&w=900&q=85",
      excerpt: "A look at how AI tools are reshaping daily workflows across industries.",
      content:
        "AI is no longer a future concept for most workplaces - it is already reshaping how people plan, write, analyze and communicate at work. This piece looks at where the biggest shifts are happening and what to expect next.",
      views: 2870,
      date: "2026-05-06",
      readTime: "5 min read",
      adminNote: "",
    },
    {
      id: "art-5",
      title: "Top AI Tools Academic Review",
      slug: "top-ai-tools-academic-review",
      category: "Guides",
      status: "review",
      author: "Sarah Writer",
      image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=85",
      excerpt: "Comprehensive academic breakdown of leading AI tools available for modern content creation.",
      content:
        "Comprehensive academic breakdown of leading AI tools available for modern content creation, evaluated against research-backed criteria for accuracy, originality support and classroom use.",
      views: 150,
      date: "2026-08-20",
      readTime: "6 min read",
      adminNote: "",
    },
    {
      id: "art-6",
      title: "My Recent Article Test",
      slug: "my-recent-article-test",
      category: "AI Tools",
      status: "review",
      author: "John Doe",
      image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=85",
      excerpt: "Detailed insights on web development and design.",
      content:
        "This is the full article body text for My Recent Article Test. Detailed insights on web development and design, covering layout systems, accessibility basics and a few tools worth bookmarking.",
      views: 235,
      date: "2026-08-21",
      readTime: "4 min read",
      adminNote: "",
    },
    {
      id: "art-7",
      title: "Best Free AI Tools You Should Try",
      slug: "best-free-ai-tools-you-should-try",
      category: "AI Tools",
      status: "draft",
      author: "Alex Morgan",
      image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85",
      excerpt: "A running list of free AI tools worth trying this year.",
      content: "A running list of free AI tools worth trying this year, updated as new options are tested.",
      views: 0,
      date: "2026-05-05",
      readTime: "3 min read",
      adminNote: "",
    },
  ];

  const SEED_PAYOUTS = [
    {
      id: "pay-1",
      user: "John Doe",
      amount: 1.0,
      method: { type: "paypal", paypalEmail: "john.doe@paypal.com" },
      requestedDate: "2026-08-22",
      status: "pending",
    },
    {
      id: "pay-2",
      user: "Sarah Writer",
      amount: 18.0,
      method: {
        type: "bank",
        bankHolder: "Sarah Writer",
        bankName: "Habib Bank Limited (HBL)",
        bankCountry: "Pakistan",
        bankIban: "PK36SCBL0000001123456701",
        bankSwift: "SCBLPKKK",
      },
      requestedDate: "2026-08-20",
      status: "pending",
    },
    {
      id: "pay-3",
      user: "Alex Morgan",
      amount: 18.0,
      method: { type: "paypal", paypalEmail: "alex.morgan@paypal.com" },
      requestedDate: "2026-07-18",
      status: "completed",
    },
  ];

  const SEED_SETTINGS = {
    siteName: "TechWrite",
    siteDescription: "Practical technology content for curious readers.",
    requireApproval: true,
  };

  const SEED_NEWSLETTER = [
    { email: "reader@example.com", status: "active", date: "2026-05-10" },
    { email: "techfan@example.com", status: "active", date: "2026-05-08" },
  ];

  /* ---------------------------- Storage Helpers ---------------------------- */
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* storage unavailable (e.g. some file:// contexts) - fail silently */
    }
    // Notify listeners in THIS tab immediately (the native 'storage' event
    // only fires in OTHER tabs), so every page stays reactive on its own too.
    try {
      window.dispatchEvent(new CustomEvent("tw:change", { detail: { key } }));
    } catch (e) {}
  }

  function uid(prefix) {
    return prefix + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function seedIfEmpty() {
    if (read(KEYS.SEEDED, false)) return;
    write(KEYS.CATEGORIES, SEED_CATEGORIES);
    write(KEYS.USERS, SEED_USERS);
    write(KEYS.ARTICLES, SEED_ARTICLES);
    write(KEYS.PAYOUTS, SEED_PAYOUTS);
    write(KEYS.SETTINGS, SEED_SETTINGS);
    write(KEYS.NEWSLETTER, SEED_NEWSLETTER);
    write(KEYS.SEEDED, true);
  }

  seedIfEmpty();

  /* ---------------------------- Public API ---------------------------- */
  const TWStore = {
    KEYS,

    /* Categories */
    getCategories() {
      return read(KEYS.CATEGORIES, SEED_CATEGORIES);
    },
    addCategory(name, icon) {
      const cats = this.getCategories();
      if (cats.some((c) => c.name.toLowerCase() === name.toLowerCase())) return cats;
      cats.push({ name: name, icon: icon || "fa-folder" });
      write(KEYS.CATEGORIES, cats);
      return cats;
    },
    renameCategory(oldName, newName) {
      const cats = this.getCategories();
      const cat = cats.find((c) => c.name === oldName);
      if (cat) {
        cat.name = newName;
        write(KEYS.CATEGORIES, cats);
        // Keep existing articles tagged correctly under the new name
        const articles = this.getArticles();
        let touched = false;
        articles.forEach((a) => {
          if (a.category === oldName) {
            a.category = newName;
            touched = true;
          }
        });
        if (touched) write(KEYS.ARTICLES, articles);
      }
      return cats;
    },
    deleteCategory(name) {
      const cats = this.getCategories().filter((c) => c.name !== name);
      write(KEYS.CATEGORIES, cats);
      return cats;
    },

    /* Users */
    getUsers() {
      return read(KEYS.USERS, SEED_USERS);
    },
    getUserByName(name) {
      return this.getUsers().find((u) => u.name === name) || null;
    },
    getUserByEmail(email) {
      return this.getUsers().find((u) => u.email.toLowerCase() === String(email).toLowerCase()) || null;
    },
    upsertUser(user) {
      const users = this.getUsers();
      const idx = users.findIndex((u) => u.id === user.id || u.name === user.name);
      if (idx >= 0) users[idx] = Object.assign({}, users[idx], user);
      else users.push(Object.assign({ id: uid("u") }, user));
      write(KEYS.USERS, users);
      return user;
    },
    addUser(user) {
      const users = this.getUsers();
      const withId = Object.assign({ id: uid("u"), status: "active", followers: 0 }, user);
      users.push(withId);
      write(KEYS.USERS, users);
      return withId;
    },
    setUserStatus(name, status) {
      const users = this.getUsers();
      const u = users.find((x) => x.name === name);
      if (u) {
        u.status = status;
        write(KEYS.USERS, users);
      }
    },
    setUserRole(name, role) {
      const users = this.getUsers();
      const u = users.find((x) => x.name === name);
      if (u) {
        u.role = role;
        write(KEYS.USERS, users);
      }
    },

    /* Session (who is logged in, on THIS browser) */
    getSession() {
      return read(KEYS.SESSION, null);
    },
    setSession(session) {
      write(KEYS.SESSION, session);
    },
    clearSession() {
      write(KEYS.SESSION, null);
    },
    login(email, password, role) {
      const user = this.getUserByEmail(email);
      if (!user || user.password !== password) return { ok: false, error: "Invalid email or password." };
      // The public login form only offers "admin" / "author" as role choices,
      // but every non-admin account in the store is role "writer" or "editor" -
      // treat "author" as shorthand for "any non-admin creator account".
      const normalizedRole = role === "author" ? null : role;
      if (normalizedRole === "admin" && user.role !== "admin") {
        return { ok: false, error: "That account is not registered as an Admin." };
      }
      if (role === "author" && user.role === "admin") {
        return { ok: false, error: "That account is registered as an Admin, not an Author." };
      }
      if (user.status === "suspended") return { ok: false, error: "This account has been suspended." };
      const session = { name: user.name, email: user.email, role: user.role };
      this.setSession(session);
      return { ok: true, session };
    },
    logout() {
      this.clearSession();
    },

    /* Articles */
    getArticles() {
      return read(KEYS.ARTICLES, SEED_ARTICLES);
    },
    getArticleById(id) {
      return this.getArticles().find((a) => a.id === id) || null;
    },
    getPublishedArticles() {
      return this.getArticles().filter((a) => a.status === "published");
    },
    getArticlesByAuthor(author) {
      return this.getArticles().filter((a) => a.author === author);
    },
    addArticle(article) {
      const articles = this.getArticles();
      const withId = Object.assign(
        {
          id: uid("art"),
          views: 0,
          date: new Date().toISOString().slice(0, 10),
          readTime: "4 min read",
          adminNote: "",
        },
        article
      );
      articles.unshift(withId);
      write(KEYS.ARTICLES, articles);
      return withId;
    },
    updateArticle(id, patch) {
      const articles = this.getArticles();
      const idx = articles.findIndex((a) => a.id === id);
      if (idx >= 0) {
        articles[idx] = Object.assign({}, articles[idx], patch);
        write(KEYS.ARTICLES, articles);
        return articles[idx];
      }
      return null;
    },
    setArticleStatus(id, status, adminNote) {
      return this.updateArticle(id, { status: status, adminNote: adminNote || "" });
    },
    deleteArticle(id) {
      const articles = this.getArticles().filter((a) => a.id !== id);
      write(KEYS.ARTICLES, articles);
    },
    incrementViews(id) {
      const articles = this.getArticles();
      const a = articles.find((x) => x.id === id);
      if (a) {
        a.views = (a.views || 0) + 1;
        write(KEYS.ARTICLES, articles);
      }
      return a;
    },
    getArticlesByCategory(category) {
      return this.getPublishedArticles().filter((a) => a.category === category);
    },
    getCategoryCounts() {
      const cats = this.getCategories();
      const published = this.getPublishedArticles();
      return cats.map((c) => ({
        name: c.name,
        icon: c.icon,
        count: published.filter((a) => a.category === c.name).length,
      }));
    },
    slugify(title) {
      return String(title)
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    },

    /* Payouts */
    getPayouts() {
      return read(KEYS.PAYOUTS, SEED_PAYOUTS);
    },
    getPayoutsByUser(user) {
      return this.getPayouts().filter((p) => p.user === user);
    },
    requestPayout(user, amount, method) {
      const payouts = this.getPayouts();
      const payout = {
        id: uid("pay"),
        user: user,
        amount: Number(amount),
        method: method,
        requestedDate: new Date().toISOString().slice(0, 10),
        status: "pending",
      };
      payouts.unshift(payout);
      write(KEYS.PAYOUTS, payouts);
      return payout;
    },
    releasePayout(id) {
      const payouts = this.getPayouts();
      const p = payouts.find((x) => x.id === id);
      if (p) {
        p.status = "completed";
        p.releasedDate = new Date().toISOString().slice(0, 10);
        write(KEYS.PAYOUTS, payouts);
      }
      return p;
    },

    /* Newsletter */
    getSubscribers() {
      return read(KEYS.NEWSLETTER, SEED_NEWSLETTER);
    },
    addSubscriber(email) {
      const subs = this.getSubscribers();
      if (subs.some((s) => s.email.toLowerCase() === String(email).toLowerCase())) {
        return { ok: false, error: "Already subscribed." };
      }
      subs.unshift({ email: email, status: "active", date: new Date().toISOString().slice(0, 10) });
      write(KEYS.NEWSLETTER, subs);
      return { ok: true };
    },

    /* Settings */
    getSettings() {
      return read(KEYS.SETTINGS, SEED_SETTINGS);
    },
    saveSettings(patch) {
      const settings = Object.assign(this.getSettings(), patch);
      write(KEYS.SETTINGS, settings);
      return settings;
    },

    /* Live updates: fires on same-tab writes AND cross-tab storage events */
    onChange(callback) {
      window.addEventListener("tw:change", callback);
      window.addEventListener("storage", (e) => {
        if (e.key && Object.values(KEYS).indexOf(e.key) !== -1) callback(e);
      });
    },

    formatDate(isoLike) {
      const d = new Date(isoLike);
      if (isNaN(d)) return isoLike || "";
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    },
  };

  global.TWStore = TWStore;
})(window);
