// ==========================================================
//  PaisaTrack — expense.js (FINAL VERSION)
//  Fully structured, optimized, commented
// ==========================================================

document.addEventListener("DOMContentLoaded", async () => {
  // Disable automatic cookie handling by Axios
  axios.defaults.withCredentials = false;
  /* ==========================================================
      SECTION 1 — DOM ELEMENTS
  ========================================================== */

  const form = document.getElementById("expense-form");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");
  const hamburger = document.getElementById("hamburger");
  const dateTimeEl = document.getElementById("dateTime");
  const breadcrumbsEl = document.getElementById("breadcrumbs");
  const navLinks = document.querySelectorAll(".nav a");
  const pageContent = document.querySelectorAll(".page-content");

  // Settings page
  const detailsForm = document.getElementById("update-details-form");
  const passwordForm = document.getElementById("update-password-form");
  const showDeleteModalBtn = document.getElementById("showDeleteModalBtn");
  const deleteAccountModal = document.getElementById("deleteAccountModal");
  const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
  const deleteAccountForm = document.getElementById("deleteAccountForm");

  // Features / Premium
  const buyPremiumBtn = document.getElementById("buyPremiumBtn");
  const leaderboardBtn = document.getElementById("leaderboardBtn");
  const openReportsBtn = document.getElementById("openReportsBtn");
  const leaderboardSection = document.getElementById("leaderboard-section");
  const leaderboardList = document.getElementById("leaderboard-list");
  const leaderboardPagination = document.getElementById(
    "leaderboard-pagination"
  );

  /* ==========================================================
      SECTION 2 — STATE & HELPERS
  ========================================================== */

  let expenses = [];
  let currentToken = sessionStorage.getItem("token");
  let leaderboardListenerAdded = false;
  let socket = null;
  let currentExpensePage = 1;
  let analyticsChart = null;

  let currentUser = {
    name: "",
    phone: "",
    email: "",
    avatar: "",
    isPremium: false,
  };
  if (!currentToken) {
    window.location.href = "/login"; // Check token immediately
    return;
  }

  function formatCurrency(value) {
    return Number(value).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
    });
  }

  function showToast(message, type = "success") {
    const isError = type === "danger" || type === "error" || type === "warning";
    showNotification(message, isError);
  }

  async function refreshAllExpenseUI() {
    await fetchAllExpenses();
    renderDashboardSummary();
    renderRecentExpenses();
    renderExpensesPage();
  }

  /* ==========================================================
      SECTION 3 — FETCH USER PROFILE
  ========================================================== */

  async function fetchUserProfile() {
    try {
      const res = await axios.get(`${BASE_URL}/api/user/fetch`, {
        headers: {
          Authorization: "Bearer " + currentToken,
          "Cache-Control": "no-cache",
        },
      });

      currentUser = res.data;
      console.log("details:", currentUser);
      updateUIForUser();
    } catch (err) {
      showToast("Failed to fetch profile. Please login again.", "danger");
    }
  }

  function updateUIForUser() {
    document.getElementById(
      "username"
    ).textContent = `Welcome back, ${currentUser.name}`;

    const initials = currentUser.name
      .split(" ")
      .map((n) => n[0])
      .join("");

    document.getElementById("avatar").textContent =
      initials || currentUser.avatar;

    // Settings form
    document.getElementById("detailName").value = currentUser.name;
    document.getElementById("detailPhone").value = currentUser.phone;
    document.getElementById("detailEmail").textContent = currentUser.email;
    document.getElementById("thresholdInput").value =
      currentUser.alertThreshold || "";

    // Reports lock/unlock
    applyReportAccess();

    // Premium UI
    applyPremiumUI();
  }

  /* ==========================================================
      SECTION 4 — PAGE ROUTER
  ========================================================== */

  function renderPage(target) {
    breadcrumbsEl.innerHTML = `<span>${target}</span>`;

    pageContent.forEach((p) => {
      p.hidden = true;
      p.classList.remove("active");
    });

    const targetPage = document.getElementById(target);
    if (targetPage) {
      targetPage.hidden = false;
      targetPage.classList.add("active");
    }

    navLinks.forEach((link) => {
      link.classList.toggle(
        "active",
        link.dataset.target.toLowerCase() === target
      );
    });

    sidebar.style.transform = "";
    overlay.hidden = true;
    hamburger.setAttribute("aria-expanded", "false");

    if (target === "dashboard") {
      renderDashboardSummary();
      renderRecentExpenses();
    }
    if (target === "expenses") {
      renderExpensesPage();
    }
    if (target === "analytics") {
      populateAnalyticsMonths();
      loadAnalytics();
    }
  }

  // SINGLE NAV LISTENER (FINAL & CORRECT)
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();

      const target = e.target.dataset.target.toLowerCase();
      sessionStorage.setItem("currentPage", target);
      renderPage(target);

      if (target === "reports") {
        if (!currentUser.isPremium) {
          showToast("Become a premium user to access reports", "warning");
          return;
        }
        populateReportFilters();
        renderReportPage(1);
      }
    });
  });
  /* ==========================================================
    FETCH ALL EXPENSES FROM BACKEND (FOR DASHBOARD)
========================================================== */
  async function fetchAllExpenses() {
    try {
      const res = await axios.get(`${BASE_URL}/api/expenses/all`, {
        headers: { Authorization: "Bearer " + currentToken },
      });

      expenses = res.data || [];
    } catch (err) {
      console.error("Failed to load expenses:", err);
      expenses = [];
    }
  }

  /* ==========================================================
      SECTION 5 — DASHBOARD RENDERS
  ========================================================== */

  function getTopCategory() {
    if (expenses.length === 0) return "—";

    const totals = {};
    expenses.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });

    return Object.entries(totals).sort((a, b) => b[1] - a[1])[0][0];
  }

  function renderDashboardSummary() {
    let income = 0;
    let expense = 0;

    expenses.forEach((e) => {
      if (e.type === "income") income += e.amount;
      if (e.type === "expense") expense += e.amount;
    });

    const remaining = income - expense;

    document.getElementById("summary-total-expenses").textContent =
      "₹" + expense.toFixed(2);

    document.getElementById("summary-remaining-budget").textContent =
      "₹" + remaining.toFixed(2);

    document.getElementById("summary-total-transactions").textContent =
      expenses.length;

    document.getElementById("summary-top-category").textContent =
      getTopCategory();
  }

  function renderRecentExpenses() {
    const container = document.getElementById("recent-expenses-list");
    container.innerHTML = "";

    if (expenses.length === 0) {
      container.innerHTML = `
      <div class="recent-expense-item" style="opacity:0.6">
        <div class="expense-details">
          <div class="expense-description">No entries yet</div>
          <div class="expense-meta">Add your first entry</div>
        </div>
        <div class="expense-amount">—</div>
      </div>
    `;
      return;
    }

    const latest = [...expenses].reverse().slice(0, 5);

    latest.forEach((item) => {
      container.insertAdjacentHTML(
        "beforeend",
        `
        <div class="recent-expense-item">
          <div class="expense-details">
            <div class="expense-description">${item.description}</div>
            <div class="expense-meta">
              ${new Date(item.date).toLocaleDateString()} • ${item.category}
            </div>
          </div>
          <div class="expense-amount">
            ${item.type === "expense" ? "-" : "+"} ₹${item.amount}
          </div>
        </div>
      `
      );
    });
  }
  /* ==========================================================
    FULL EXPENSES PAGE RENDERER
========================================================== */
  function renderExpensesPage() {
    fetchPaginatedExpenses(currentExpensePage);
  }
  /* ===========================
   TABLE + PAGINATION RENDERING
=========================== */

  async function fetchPaginatedExpenses(page = 1, limit = 10) {
    currentExpensePage = page;
    try {
      const res = await axios.get(`${BASE_URL}/api/expenses/list`, {
        headers: { Authorization: "Bearer " + currentToken },
        params: { page, limit },
      });

      renderExpensesTable(res.data.expenses);
      renderExpensesPagination(res.data.totalPages, res.data.currentPage);
    } catch (err) {
      console.error("Pagination fetch error:", err);
      document.getElementById(
        "expenses-body"
      ).innerHTML = `<tr><td colspan="7">Failed to load expenses</td></tr>`;
    }
  }

  function renderExpensesTable(expenses) {
    const tbody = document.getElementById("expenses-body");
    tbody.innerHTML = "";

    if (!expenses.length) {
      tbody.innerHTML = `<tr><td colspan="7">No expenses found.</td></tr>`;
      return;
    }

    expenses.forEach((e) => {
      tbody.innerHTML += `
          <tr>
            <td><input type="checkbox" class="expense-checkbox" data-id="${
              e._id
            }"></td>
            <td>${new Date(e.date).toLocaleDateString()}</td>
            <td>${e.description}</td>
            <td>${e.category}</td>
            <td>${e.type}</td>
            <td>₹${e.amount}</td>
            <td>${e.note || ""}</td>
            <td>
              <button class="btn small" data-id="${
                e._id
              }" data-action="edit">Edit</button>
              <button class="btn small danger" data-id="${
                e._id
              }" data-action="delete">Delete</button>
            </td>
          </tr>`;
    });
  }

  function renderExpensesPagination(totalPages, currentPage) {
    const container = document.getElementById("expenses-pagination");
    container.innerHTML = "";

    const prev = document.createElement("button");
    prev.textContent = "Prev";
    prev.disabled = currentPage === 1;
    prev.onclick = () => fetchPaginatedExpenses(currentPage - 1);
    container.appendChild(prev);

    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;
      btn.disabled = i === currentPage;
      btn.onclick = () => fetchPaginatedExpenses(i);
      container.appendChild(btn);
    }

    const next = document.createElement("button");
    next.textContent = "Next";
    next.disabled = currentPage === totalPages;
    next.onclick = () => fetchPaginatedExpenses(currentPage + 1);
    container.appendChild(next);
  }

  /* ==========================================================
    EDIT & DELETE HANDLERS
========================================================== */

  document.addEventListener("click", async (e) => {
    const id = e.target.dataset.id;
    const action = e.target.dataset.action;

    if (!id || !action) return;

    // ---------------------------
    // DELETE EXPENSE
    // ---------------------------
    if (action === "delete") {
      const ok = await showConfirmationModal("Delete this entry?");
      if (!ok) return;

      await axios.delete(`${BASE_URL}/api/expenses/delete/${id}`, {
        headers: { Authorization: "Bearer " + currentToken },
      });
      socket.emit("delete_expense", { id });

      await fetchAllExpenses();

      /* -------- PAGE FIX (place here) -------- */
      if (expenses.length <= (currentExpensePage - 1) * 10) {
        currentExpensePage = Math.max(1, currentExpensePage - 1);
      }
      /* --------------------------------------- */

      fetchPaginatedExpenses(currentExpensePage);
      renderDashboardSummary();
      renderRecentExpenses();
      showToast("Deleted successfully");
    }

    // ---------------------------
    // EDIT EXPENSE — OPEN MODAL
    // ---------------------------
    if (action === "edit") {
      const exp = expenses.find((x) => x._id === id);

      document.getElementById("editId").value = exp._id;
      document.getElementById("editAmount").value = exp.amount;
      document.getElementById("editDescription").value = exp.description;
      document.getElementById("editCategory").value = exp.category;
      document.getElementById("editType").value = exp.type;
      document.getElementById("editDate").value = exp.date.split("T")[0];
      document.getElementById("editNote").value = exp.note;

      document.getElementById("editModal").classList.add("active");
    }
  });
  document
    .getElementById("bulkDeleteBtn")
    ?.addEventListener("click", async () => {
      const checkboxes = document.querySelectorAll(".expense-checkbox:checked");
      const ids = [...checkboxes].map((cb) => cb.dataset.id);

      if (ids.length === 0) {
        showToast("No expenses selected.", "warning");
        return;
      }

      const ok = await showConfirmationModal(
        `Delete ${ids.length} selected expenses?`
      );
      if (!ok) return;

      try {
        await axios.post(
          `${BASE_URL}/api/expenses/bulk-delete`,
          { ids },
          { headers: { Authorization: "Bearer " + currentToken } }
        );
        // Real-time WS bulk delete
        socket.emit("bulk_delete_expenses", { ids });
        await fetchAllExpenses();

        /* -------- PAGE FIX (place here) -------- */
        if (expenses.length <= (currentExpensePage - 1) * 10) {
          currentExpensePage = Math.max(1, currentExpensePage - 1);
        }
        /* --------------------------------------- */

        fetchPaginatedExpenses(currentExpensePage);
        renderDashboardSummary();
        renderRecentExpenses();
        showToast("Selected expenses deleted.");
      } catch (err) {
        showToast("Bulk delete failed.", "danger");
      }
    });

  /* SAVE EDIT */
  document.getElementById("editForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("editId").value;

    const updated = {
      amount: Number(document.getElementById("editAmount").value),
      description: document.getElementById("editDescription").value,
      category: document.getElementById("editCategory").value,
      type: document.getElementById("editType").value,
      date: document.getElementById("editDate").value,
      note: document.getElementById("editNote").value,
    };

    const res = await axios.put(
      `${BASE_URL}/api/expenses/update/${id}`,
      updated,
      {
        headers: { Authorization: "Bearer " + currentToken },
      }
    );
    // send updated expense to sockets
    socket.emit("edit_expense", res.data.expense);

    document.getElementById("editModal").classList.remove("active");

    await fetchAllExpenses();
    renderExpensesPage();
    renderDashboardSummary();
    renderRecentExpenses();

    showToast("Updated successfully");
  });

  /* CANCEL EDIT */
  document.getElementById("cancelEdit")?.addEventListener("click", () => {
    document.getElementById("editModal").classList.remove("active");
  });

  /* ==========================================================
      SECTION 6 — ADD EXPENSE
  ========================================================== */
  // ------------------------------------
  // TYPE TOGGLE LOGIC  (ADD HERE)
  // ------------------------------------
  const typeToggle = document.getElementById("typeToggle");
  const typeInput = document.getElementById("type");

  if (typeToggle) {
    typeToggle.addEventListener("click", (e) => {
      if (!e.target.classList.contains("toggle-btn")) return;

      document
        .querySelectorAll(".toggle-btn")
        .forEach((btn) => btn.classList.remove("active"));

      e.target.classList.add("active");

      typeInput.value = e.target.dataset.type;
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const amount = Number(document.getElementById("amount").value);
      const description = document.getElementById("description").value.trim();
      const category = document.getElementById("category").value;
      const date = document.getElementById("date").value;
      const type = document.getElementById("type").value;
      const note = document.getElementById("note").value.trim();

      if (!amount || amount <= 0 || !description) {
        showToast("Please enter valid amount and description.", "warning");
        return;
      }

      const res = await axios.post(
        `${BASE_URL}/api/expenses/add`,
        {
          amount,
          description,
          category,
          type,
          date,
          note,
        },
        { headers: { Authorization: "Bearer " + currentToken } }
      );
      // send the saved expense returned by backend
      socket.emit("add_expense", res.data.expense);

      await fetchAllExpenses();
      renderRecentExpenses();
      renderDashboardSummary();

      showToast("Expense added successfully!");
      form.reset();
    });
  }

  /* ==========================================================
      SECTION 7 — SETTINGS (NAME/PHONE/PASSWORD)
  ========================================================== */

  if (detailsForm) {
    detailsForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const newName = document.getElementById("detailName").value.trim();
      const newPhone = document.getElementById("detailPhone").value.trim();

      if (!newName) {
        showToast("Name cannot be empty.", "warning");
        return;
      }

      try {
        await axios.post(
          `${BASE_URL}/api/user/update-details`,
          { name: newName, phone: newPhone },
          { headers: { Authorization: "Bearer " + currentToken } }
        );

        currentUser.name = newName;
        currentUser.phone = newPhone;
        updateUIForUser();
        showToast("Account details updated!");
      } catch (err) {
        showToast("Failed to update details.", "danger");
      }
    });
  }
  document
    .getElementById("saveThresholdBtn")
    ?.addEventListener("click", async () => {
      const threshold = Number(document.getElementById("thresholdInput").value);

      if (threshold <= 0) {
        showToast("Threshold must be greater than zero.", "warning");
        return;
      }

      try {
        await axios.post(
          `${BASE_URL}/api/user/set-threshold`,
          { threshold },
          { headers: { Authorization: "Bearer " + currentToken } }
        );

        currentUser.alertThreshold = threshold;
        showToast("Budget threshold updated!");
      } catch (err) {
        showToast("Failed to update threshold.", "danger");
      }
    });

  if (passwordForm) {
    passwordForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const curr = document.getElementById("currentPassword").value;
      const newP = document.getElementById("newPassword").value;
      const conf = document.getElementById("confirmNewPassword").value;

      if (newP !== conf) {
        showToast("Passwords do not match.", "warning");
        return;
      }

      if (newP.length < 3) {
        showToast("Password too short.", "warning");
        return;
      }

      try {
        await axios.post(
          `${BASE_URL}/api/user/update-password`,
          { currentPassword: curr, newPassword: newP },
          { headers: { Authorization: "Bearer " + currentToken } }
        );

        showToast("Password updated successfully!");
        passwordForm.reset();
      } catch (err) {
        showToast("Incorrect current password.", "danger");
      }
    });
  }

  /* ==========================================================
      SECTION 8 — DELETE ACCOUNT
  ========================================================== */

  if (showDeleteModalBtn) {
    showDeleteModalBtn.addEventListener("click", () => {
      deleteAccountModal.classList.add("active");
    });
  }

  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener("click", () => {
      deleteAccountModal.classList.remove("active");
      deleteAccountForm.reset();
    });
  }

  if (deleteAccountForm) {
    deleteAccountForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const password = document.getElementById("deletePassword").value;

      try {
        await axios.post(
          `${BASE_URL}/api/user/delete-account`,
          { password },
          { headers: { Authorization: "Bearer " + currentToken } }
        );

        showToast("Account deleted.");

        sessionStorage.removeItem("token");
        setTimeout(() => (window.location.href = "/login"), 1000);
      } catch (err) {
        showToast("Incorrect password.", "danger");
      }
    });
  }

  /* ==========================================================
      SECTION 9 — PREMIUM SYSTEM
  ========================================================== */

  function applyPremiumUI() {
    if (!currentUser.isPremium) {
      leaderboardBtn.style.display = "none";
      openReportsBtn.style.display = "none";
      return;
    }

    // Replace upgrade button
    document.getElementById("premium-upgrade-section").innerHTML = `
      <p id="premium">You are a premium user</p>
    `;

    leaderboardBtn.style.display = "inline-block";
    openReportsBtn.style.display = "inline-block";

    if (!leaderboardListenerAdded) {
      leaderboardBtn.addEventListener("click", () => renderLeaderboard(1));
      leaderboardListenerAdded = true;
    }
  }
  /* ==========================================================
    SECTION 9.1 — PREMIUM PAYMENT FLOW (Cashfree)
========================================================== */

  buyPremiumBtn?.addEventListener("click", async () => {
    try {
      console.log("STEP 1 → Create Order request started");
      const res = await axios.post(
        `${BASE_URL}/api/premium/create-order`,
        {},
        { headers: { Authorization: `Bearer ${currentToken}` } }
      );
      console.log("STEP 1 RESPONSE →", res.data);

      const orderId = res.data.orderId;
      window.currentPremiumOrderId = orderId;
      const paymentSessionId = res.data.paymentSessionId;
      console.log("ORDER ID:", orderId);
      console.log("SESSION ID:", paymentSessionId);

      if (!paymentSessionId) {
        showToast("Unable to initiate premium payment.", "danger");
        return;
      }

      const cashfree = new Cashfree({ mode: "sandbox" });
      const result = await cashfree.checkout({
        paymentSessionId,
        redirectTarget: "_modal",
      });
      console.log("STEP 2 → Cashfree checkout RESULT:", result);

      if (result.error) {
        // use orderId variable that exists
        await axios.post(
          `${BASE_URL}/api/premium/payment-failed`,
          { orderId: window.currentPremiumOrderId },
          { headers: { Authorization: `Bearer ${currentToken}` } }
        );

        console.log("CASHFREE ERROR BLOCK → result.error =", result.error);
        showToast("Payment failed or cancelled.", "danger");
        return;
      }

      if (result.paymentDetails) {
        console.log("STEP 3 → Payment Details:", result.paymentDetails);
        // pick the right field name after checking result.paymentDetails structure
        const paymentId =
          result.paymentDetails.payment_id ||
          result.paymentDetails.paymentId ||
          result.paymentDetails.paymentIdCamel;
        console.log("STEP 4 → Sending verify-payment:");
        // send body correctly as second argument
        const verifyRes = await axios.post(
          `${BASE_URL}/api/premium/verify-payment`,
          { orderId: window.currentPremiumOrderId, paymentId: paymentId },
          { headers: { Authorization: "Bearer " + currentToken } }
        );

        console.log("VERIFY RESPONSE:", verifyRes.data);
        if (verifyRes.data.success) {
          showToast("Premium activated!");

          await fetchUserProfile();

          console.log("AFTER PAYMENT PROFILE:", currentUser);

          applyPremiumUI();
          applyReportAccess();
          // Real-time push
          socket.emit("premium_status_changed");

          // NEW: force re-render features page
          renderPage("features");
        } else {
          showToast(
            "Payment not successful: " +
              (verifyRes.data.message || verifyRes.data.status),
            "danger"
          );
        }
      }
    } catch (err) {
      console.error("Premium purchase failed:", err);
      if (err.response) {
        console.log("SERVER RESPONSE ERROR:", err.response.data);
        console.log("SERVER STATUS:", err.response.status);
      }
      showToast("Unable to complete premium payment.", "danger");
    }
  });

  /* ==========================================================
      SECTION 10 — LEADERBOARD
  ========================================================== */

  async function renderLeaderboard(page = 1) {
    //renderPage("features");

    leaderboardSection.hidden = false;
    leaderboardList.innerHTML = "<li>Loading...</li>";
    leaderboardPagination.innerHTML = "";

    try {
      const res = await axios.get(`${BASE_URL}/api/premium/leaderboard`, {
        headers: { Authorization: "Bearer " + currentToken },
        params: { page },
      });

      const { users = [], totalPages = 1 } = res.data;

      leaderboardList.innerHTML = "";
      users.forEach((u, idx) => {
        const li = document.createElement("li");

        // Rank number, even across pages
        li.setAttribute("data-rank", `#${(page - 1) * users.length + idx + 1}`);

        li.textContent = `${u.name}: ₹${u.totalExpenses}`;
        leaderboardList.appendChild(li);
      });

      renderLeaderboardPagination(totalPages, page);
    } catch (err) {
      showToast("Failed to load leaderboard", "danger");
      leaderboardList.innerHTML = "<li>Error loading leaderboard</li>";
    }
  }

  function renderLeaderboardPagination(totalPages, currentPage) {
    leaderboardPagination.innerHTML = "";

    const prev = document.createElement("button");
    prev.textContent = "Prev";
    prev.disabled = currentPage === 1;
    prev.onclick = () => renderLeaderboard(currentPage - 1);
    leaderboardPagination.appendChild(prev);

    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;
      btn.disabled = i === currentPage;
      btn.onclick = () => renderLeaderboard(i);
      leaderboardPagination.appendChild(btn);
    }

    const next = document.createElement("button");
    next.textContent = "Next";
    next.disabled = currentPage === totalPages;
    next.onclick = () => renderLeaderboard(currentPage + 1);
    leaderboardPagination.appendChild(next);
  }

  // Open Reports directly from Features
  openReportsBtn?.addEventListener("click", () => {
    if (!currentUser.isPremium) {
      showToast("Become premium to access reports", "warning");
      return;
    }
    renderPage("reports");
  });

  /* ==========================================================
      SECTION 11 — REPORTS SYSTEM
  ========================================================== */

  function applyReportAccess() {
    const locked = document.getElementById("reportsLocked");
    const content = document.getElementById("reportsContent");

    if (currentUser.isPremium) {
      locked.hidden = true;
      content.hidden = false;
      document.getElementById("downloadBtn").disabled = false;
    } else {
      locked.hidden = false;
      content.hidden = true;
      document.getElementById("downloadBtn").disabled = true;
    }
  }

  function populateReportFilters() {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const monthSel = document.getElementById("monthFilter");
    monthSel.innerHTML = `<option value="">All</option>`;
    months.forEach((m, i) => {
      monthSel.innerHTML += `<option value="${i + 1}">${m}</option>`;
    });

    const yearSel = document.getElementById("yearFilter");
    const currentYear = new Date().getFullYear();
    yearSel.innerHTML = `<option value="">All</option>`;
    for (let y = currentYear; y >= 2020; y--) {
      yearSel.innerHTML += `<option value="${y}">${y}</option>`;
    }
  }

  let reportFilteredData = [];

  async function applyReportFilters() {
    const month = document.getElementById("monthFilter").value;
    const year = document.getElementById("yearFilter").value;
    const start = document.getElementById("startDate").value;
    const end = document.getElementById("endDate").value;

    const category = document.getElementById("categoryFilter").value;
    const type = document.getElementById("typeFilter").value;
    await fetchExpensesWithFilters({
      month,
      year,
      start,
      end,
      category,
      type,
    });
  }
  // ==========================================================
  // FETCH EXPENSES FROM BACKEND WITH FILTERS
  // ==========================================================
  async function fetchExpensesWithFilters(filters = {}) {
    try {
      const res = await axios.get(`${BASE_URL}/api/expenses/filter`, {
        headers: { Authorization: "Bearer " + currentToken },
        params: filters,
      });

      reportFilteredData = res.data;
    } catch (err) {
      console.error("Filter fetch error:", err);
      reportFilteredData = [];
    }
  }

  async function renderReportPage(page = 1) {
    await applyReportFilters();

    const perPage = parseInt(document.getElementById("itemsPerPage").value);
    const start = (page - 1) * perPage;
    const end = start + perPage;

    const pageData = reportFilteredData.slice(start, end);

    const tbody = document.getElementById("expense-body");
    tbody.innerHTML = "";

    pageData.forEach((e) => {
      tbody.innerHTML += `
        <tr>
          <td>${new Date(e.date).toLocaleDateString()}</td>
          <td>${e.description}</td>
          <td>${e.category}</td>
          <td>${e.type === "income" ? e.amount : "-"}</td>
          <td>${e.type === "expense" ? e.amount : "-"}</td>
          <td>${e.note || ""}</td>
        </tr>
      `;
    });

    calculateTotals();
    renderReportPagination(page);
  }

  function renderReportPagination(currentPage) {
    const container = document.getElementById("reportPagination");
    container.innerHTML = "";

    const perPage = parseInt(document.getElementById("itemsPerPage").value);
    const totalPages = Math.ceil(reportFilteredData.length / perPage);

    const prev = document.createElement("button");
    prev.textContent = "Prev";
    prev.disabled = currentPage === 1;
    prev.onclick = () => renderReportPage(currentPage - 1);
    container.appendChild(prev);

    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;
      btn.disabled = i === currentPage;
      btn.onclick = () => renderReportPage(i);
      container.appendChild(btn);
    }

    const next = document.createElement("button");
    next.textContent = "Next";
    next.disabled = currentPage === totalPages;
    next.onclick = () => renderReportPage(currentPage + 1);
    container.appendChild(next);
  }

  function calculateTotals() {
    let income = 0;
    let expense = 0;

    reportFilteredData.forEach((e) => {
      if (e.type === "income") income += e.amount;
      if (e.type === "expense") expense += e.amount;
    });

    document.getElementById("incomeTotal").textContent = income;
    document.getElementById("expenseTotal").textContent = expense;
    document.getElementById("savingsTotal").textContent = income - expense;
  }
  document
    .getElementById("applyFilters")
    ?.addEventListener("click", async () => {
      sessionStorage.setItem(
        "reportFilters",
        JSON.stringify({
          month: document.getElementById("monthFilter").value,
          year: document.getElementById("yearFilter").value,
          start: document.getElementById("startDate").value,
          end: document.getElementById("endDate").value,
          category: document.getElementById("categoryFilter").value,
          type: document.getElementById("typeFilter").value,
          itemsPerPage: document.getElementById("itemsPerPage").value,
        })
      );

      await renderReportPage(1);
    });

  document.getElementById("itemsPerPage")?.addEventListener("change", () => {
    renderReportPage(1);
  });
  // ===============================================
  // DOWNLOAD REPORT (CSV)
  // ===============================================
  document.getElementById("downloadBtn")?.addEventListener("click", () => {
    window.location.href = `${BASE_URL}/api/expenses/download`;
  });

  /* ==========================================================
      SECTION 12 — MISC HANDLERS
  ========================================================== */
  function showConfirmationModal(message) {
    return new Promise((resolve) => {
      const modal = document.getElementById("confirmationModal");
      const confirmBtn = document.getElementById("confirmBtn");
      const cancelBtn = document.getElementById("cancelBtn");
      const messageEl = document.getElementById("confirmMessage");

      if (!modal || !confirmBtn || !cancelBtn || !messageEl) {
        console.error("Confirmation modal elements not found!");
        return resolve(false);
      }

      messageEl.textContent = message;
      modal.classList.add("active");

      const onConfirm = () => cleanup(true);
      const onCancel = () => cleanup(false);

      function cleanup(result) {
        modal.classList.remove("active");
        confirmBtn.removeEventListener("click", onConfirm);
        cancelBtn.removeEventListener("click", onCancel);
        resolve(result);
      }

      confirmBtn.addEventListener("click", onConfirm);
      cancelBtn.addEventListener("click", onCancel);
    });
  }
  function openFullExpenses() {
    renderPage("expenses");
  }
  window.openFullExpenses = openFullExpenses;

  function updateDateTime() {
    dateTimeEl.textContent = new Date().toLocaleString();
  }
  setInterval(updateDateTime, 1000);
  updateDateTime();

  hamburger.addEventListener("click", () => {
    const expanded = hamburger.getAttribute("aria-expanded") === "true";
    hamburger.setAttribute("aria-expanded", !expanded);

    if (!expanded) {
      sidebar.style.transform = "translateX(0)";
      overlay.hidden = false;
    } else {
      sidebar.style.transform = "translateX(-100%)";
      // sidebar.style.transform = "";
      overlay.hidden = true;
    }
  });

  overlay.addEventListener("click", () => {
    sidebar.style.transform = "";
    overlay.hidden = true;
    hamburger.setAttribute("aria-expanded", "false");
  });

  /* ==========================================================
      SECTION 14 — WEB SOCKETS  
  ========================================================== */
  function initSocket() {
    socket = io(BASE_URL, {
      auth: { token: currentToken },
    });

    socket.on("connect", () => {
      console.log("WS connected:", socket.id);
    });
    socket.on("expense_added", async (expense) => {
      console.log("REALTIME EXPENSE ADDED:", expense);
      refreshAllExpenseUI();
      // await fetchAllExpenses();
      // renderDashboardSummary();
      // renderRecentExpenses();
      // renderExpensesPage();

      showToast("New Expense Added (Real-Time)");
    });
    socket.on("expense_updated", async (expense) => {
      console.log("REALTIME EXPENSE UPDATED:", expense);
      refreshAllExpenseUI();
      // await fetchAllExpenses();
      // renderDashboardSummary();
      // renderRecentExpenses();
      // renderExpensesPage();

      showToast("Expense Updated (Real-Time)");
    });
    socket.on("expense_deleted", async (expense) => {
      console.log("REALTIME EXPENSE DELETED:", expense);
      refreshAllExpenseUI();
      // await fetchAllExpenses();
      // renderDashboardSummary();
      // renderRecentExpenses();
      // renderExpensesPage();

      showToast("Expense Deleted (Real-Time)");
    });
    socket.on("expenses_bulk_deleted", async (data) => {
      console.log("REALTIME BULK DELETE:", data.ids);
      refreshAllExpenseUI();
      // await fetchAllExpenses();
      // renderDashboardSummary();
      // renderRecentExpenses();
      // renderExpensesPage();

      showToast("Selected Expenses Deleted (Real-Time)");
    });
    socket.on("premium_status_changed", async (data) => {
      console.log("REALTIME PREMIUM STATUS:", data);

      // Fetch updated user profile
      await fetchUserProfile();

      applyPremiumUI();
      applyReportAccess();

      showToast("Premium status updated (Real-Time)");
    });
    socket.on("leaderboard_refresh", async () => {
      console.log("REALTIME LEADERBOARD REFRESH");

      // Only refresh if user is on the features page AND leaderboard is visible
      const leaderboardSection = document.getElementById("leaderboard-section");
      //if (!leaderboardSection || leaderboardSection.hidden) return;

      // Reload leaderboard
      await renderLeaderboard(1);

      setTimeout(() => {
        showToast("Leaderboard updated (Real-Time)");
      }, 600);
    });
    socket.on("budget_alert", async (data) => {
      console.log("REALTIME BUDGET ALERT:", data);

      // Refresh UI
      await refreshAllExpenseUI();

      showToast(`Budget Alert: ${data.message}`, "warning");
    });

    socket.on("expense_error", (err) => {
      showToast(err.message, "danger");
    });
  }

  /* ==========================================================
      SECTION 13 — Analytics
  ========================================================== */
  function populateAnalyticsMonths() {
    const sel = document.getElementById("analyticsMonth");
    sel.innerHTML = "";

    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const now = new Date();
    const currentMonth = now.getMonth() + 1;

    for (let m = 1; m <= 12; m++) {
      sel.innerHTML += `<option value="${m}" ${
        m === currentMonth ? "selected" : ""
      }>${months[m - 1]}</option>`;
    }
  }
  async function fetchMonthlyAnalytics(month) {
    try {
      const res = await axios.get(
        `${BASE_URL}/api/expenses/analytics/monthly`,
        {
          headers: { Authorization: "Bearer " + currentToken },
          params: { month },
        }
      );

      return res.data;
    } catch (err) {
      console.error("Analytics fetch failed:", err);
      return null;
    }
  }
  function renderAnalyticsChart(data) {
    const ctx = document.getElementById("analyticsChart").getContext("2d");

    if (analyticsChart) {
      analyticsChart.destroy();
    }

    analyticsChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: ["Income", "Expenses", "Remaining"],
        datasets: [
          {
            data: [data.income, data.expense, data.remaining],
            backgroundColor: [
              getComputedStyle(document.documentElement).getPropertyValue(
                "--chart-income"
              ),
              getComputedStyle(document.documentElement).getPropertyValue(
                "--chart-expense"
              ),
              getComputedStyle(document.documentElement).getPropertyValue(
                "--chart-remaining"
              ),
            ],
          },
        ],
      },
    });
  }
  function renderAnalyticsSummary(data) {
    const box = document.getElementById("analyticsSummary");

    box.innerHTML = `
    <div class="summary-card">
      <p class="summary-card-title">Income</p>
      <p class="summary-card-value">₹${data.income}</p>
    </div>

    <div class="summary-card">
      <p class="summary-card-title">Expenses</p>
      <p class="summary-card-value">₹${data.expense}</p>
    </div>

    <div class="summary-card">
      <p class="summary-card-title">Remaining</p>
      <p class="summary-card-value">₹${data.remaining}</p>
    </div>

    <div class="summary-card">
      <p class="summary-card-title">Threshold</p>
      <p class="summary-card-value">₹${data.threshold}</p>
    </div>
  `;
  }
  document
    .getElementById("analyticsMonth")
    ?.addEventListener("change", loadAnalytics);

  async function loadAnalytics() {
    const month = document.getElementById("analyticsMonth").value;

    const data = await fetchMonthlyAnalytics(month);
    if (!data) return;

    renderAnalyticsChart(data);
    renderAnalyticsSummary(data);
  }

  /* ==========================================================
      SECTION 14 — INITIAL LOAD
  ========================================================== */
  logoutBtn?.addEventListener("click", async () => {
    try {
      await axios.post(
        `${BASE_URL}/api/user/logout`,
        {},
        { withCredentials: true }
      );
    } catch (err) {
      // ignore server errors
    }

    sessionStorage.removeItem("token");
    window.location.href = "/login";
  });

  await fetchUserProfile();
  await fetchAllExpenses();
  initSocket();
  renderDashboardSummary();
  renderRecentExpenses();
  const savedPage = sessionStorage.getItem("currentPage") || "dashboard";
  renderPage(savedPage);
  if (savedPage === "reports" && currentUser.isPremium) {
    populateReportFilters();

    const saved = sessionStorage.getItem("reportFilters");
    if (saved) {
      const filters = JSON.parse(saved);

      document.getElementById("monthFilter").value = filters.month || "";
      document.getElementById("yearFilter").value = filters.year || "";
      document.getElementById("startDate").value = filters.start || "";
      document.getElementById("endDate").value = filters.end || "";
      document.getElementById("itemsPerPage").value =
        filters.itemsPerPage || 10;

      // NEW:
      document.getElementById("categoryFilter").value = filters.category || "";

      document.getElementById("typeFilter").value = filters.type || "";
    }
  }

  // renderPage("dashboard");
});
