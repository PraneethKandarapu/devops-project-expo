/* ====================================================================
   RUPEETRACK - FULL STACK CONTROLLER WITH MONGODB & JWT
==================================================================== */

// Verify Authentication on Load
const token = localStorage.getItem('rupee_token');
if (!token) {
  window.location.href = '/login';
}

// Global State
let transactions = [];
let expenseChartInstance = null;
let categoryBarChartInstance = null;

// Category definitions
const EXPENSE_CATEGORIES = ['Food', 'Travel', 'Shopping', 'Education', 'Bills', 'Entertainment', 'Other'];
const INCOME_CATEGORIES = ['Salary', 'Other'];

// Category colors for Chart.js
const CATEGORY_COLORS = {
  Food: '#f59e0b',
  Travel: '#3b82f6',
  Shopping: '#ec4899',
  Education: '#8b5cf6',
  Bills: '#ef4444',
  Entertainment: '#06b6d4',
  Salary: '#10b981',
  Other: '#64748b'
};

// API Helper for authorized requests
async function fetchWithAuth(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    // Session expired or token invalid
    localStorage.removeItem('rupee_token');
    localStorage.removeItem('rupee_user');
    window.location.href = '/login';
    return null;
  }
  return response;
}

// Toast Notifier
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info'}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Format Currency
function formatINR(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/* ====================================================================
   INITIALIZATION & PROFILE
==================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  setupUserDisplay();
  setupNavigation();
  setupModalEvents();
  setupFilterListeners();
  setupSettingsButtons();  // <-- Loads sample data & clears data
  setupPasswordChange();   // <-- Handles password changes
  setupLogout();
  setCurrentDate();

  // Load Transactions from MongoDB
  await loadTransactionsFromDB();
});

// Setup User Info from LocalStorage / DB
async function setupUserDisplay() {
  const nameEl = document.getElementById('user-display-name') || document.querySelector('.user-name');
  const subEl = document.getElementById('user-display-sub') || document.querySelector('.user-sub');

  // 1. From local storage
  const cachedUserStr = localStorage.getItem('rupee_user');
  if (cachedUserStr) {
    try {
      const cachedUser = JSON.parse(cachedUserStr);
      if (nameEl && cachedUser.name) nameEl.textContent = cachedUser.name;
      if (subEl && cachedUser.email) subEl.textContent = cachedUser.email;
    } catch (e) {
      console.error(e);
    }
  }

  // 2. Fresh from MongoDB API
  const res = await fetchWithAuth('/api/auth/me');
  if (res && res.ok) {
    const user = await res.json();
    if (nameEl && user.name) nameEl.textContent = user.name;
    if (subEl && user.email) subEl.textContent = user.email;
    localStorage.setItem('rupee_user', JSON.stringify(user));
  }
}

// 1. DATA MANAGEMENT: Sample Data & Clear All
function setupSettingsButtons() {
  const loadBtn = document.getElementById('load-sample-btn');
  const clearBtn = document.getElementById('clear-all-btn');

  // Load predefined sample data into MongoDB
  if (loadBtn) {
    loadBtn.addEventListener('click', async () => {
      loadBtn.disabled = true;
      loadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';

      try {
        const res = await fetchWithAuth('/api/transactions/sample', { method: 'POST' });
        if (res && res.ok) {
          transactions = await res.json();
          refreshAllViews();
          showToast('Sample records added to your account!', 'success');
        } else {
          showToast('Failed to load sample data', 'error');
        }
      } catch (err) {
        showToast('Error loading sample data', 'error');
      } finally {
        loadBtn.disabled = false;
        loadBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> Load Demo Data';
      }
    });
  }

  // Clear all transactions from MongoDB
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      const confirmDelete = confirm('Are you sure you want to permanently delete all your transaction records from MongoDB?');
      if (!confirmDelete) return;

      clearBtn.disabled = true;
      clearBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';

      try {
        const res = await fetchWithAuth('/api/transactions', { method: 'DELETE' });
        if (res && res.ok) {
          transactions = [];
          refreshAllViews();
          showToast('All your transactions have been wiped', 'info');
        } else {
          showToast('Failed to clear records', 'error');
        }
      } catch (err) {
        showToast('Error clearing transactions', 'error');
      } finally {
        clearBtn.disabled = false;
        clearBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Clear All Data';
      }
    });
  }
}

// 2. PASSWORD CHANGE HANDLER
function setupPasswordChange() {
  const pwdForm = document.getElementById('change-password-form');
  if (!pwdForm) return;

  pwdForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById('current-pwd').value;
    const newPassword = document.getElementById('new-pwd').value;
    const confirmPassword = document.getElementById('confirm-pwd').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Please fill in all password fields', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters long', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    if (currentPassword === newPassword) {
      showToast('New password must be different from current password', 'error');
      return;
    }

    const saveBtn = document.getElementById('save-pwd-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';

    try {
      const res = await fetchWithAuth('/api/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to update password');
      }

      showToast(data.message, 'success');
      pwdForm.reset();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fa-solid fa-key"></i> Update Password';
    }
  });
}

function setupLogout() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('rupee_token');
      localStorage.removeItem('rupee_user');
      window.location.href = '/login';
    });
  }
}

function setCurrentDate() {
  const dayEl = document.getElementById('current-day');
  const dateEl = document.getElementById('current-date');
  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  if (dayEl) dayEl.textContent = days[now.getDay()];
  if (dateEl) dateEl.textContent = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
}

/* ====================================================================
   DATABASE OPERATIONS (CRUD)
==================================================================== */
async function loadTransactionsFromDB() {
  try {
    const res = await fetchWithAuth('/api/transactions');
    if (!res) return;
    transactions = await res.json();
    refreshAllViews();
  } catch (err) {
    showToast('Failed to load records from MongoDB', 'error');
  }
}

async function saveTransactionToDB(txData) {
  try {
    const res = await fetchWithAuth('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(txData)
    });
    if (!res || !res.ok) throw new Error('Could not save to database');
    const saved = await res.json();
    transactions.unshift(saved);
    refreshAllViews();
    showToast('Transaction saved to MongoDB!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteTransactionFromDB(id) {
  try {
    const res = await fetchWithAuth(`/api/transactions/${id}`, {
      method: 'DELETE'
    });
    if (!res || !res.ok) throw new Error('Could not delete transaction');
    transactions = transactions.filter(t => (t._id || t.id) !== id);
    refreshAllViews();
    showToast('Transaction deleted', 'info');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ====================================================================
   VIEW RENDERING & CHARTS
==================================================================== */
function refreshAllViews() {
  updateMetrics();
  renderRecentTransactions();
  renderTableRows();
  renderCharts();
  renderCategorySummary();
}

function updateMetrics() {
  let income = 0;
  let expenses = 0;

  transactions.forEach(t => {
    if (t.type === 'income') income += Number(t.amount);
    if (t.type === 'expense') expenses += Number(t.amount);
  });

  const balance = income - expenses;

  document.getElementById('card-balance').textContent = formatINR(balance);
  document.getElementById('card-income').textContent = formatINR(income);
  document.getElementById('card-expenses').textContent = formatINR(expenses);
  document.getElementById('card-count').textContent = transactions.length;
}

function renderRecentTransactions() {
  const list = document.getElementById('recent-transactions-list');
  if (!list) return;

  const recent = transactions.slice(0, 5);
  if (recent.length === 0) {
    list.innerHTML = `<li style="text-align:center;color:#94a3b8;padding:20px 0;">No transactions yet</li>`;
    return;
  }

  list.innerHTML = recent.map(tx => {
    const isIncome = tx.type === 'income';
    const sign = isIncome ? '+' : '-';
    const amountClass = isIncome ? 'income' : 'expense';
    const dateFormatted = new Date(tx.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

    return `
      <li class="recent-item">
        <div class="recent-icon" style="background:${CATEGORY_COLORS[tx.category] || '#64748b'}20; color:${CATEGORY_COLORS[tx.category] || '#64748b'}">
          <i class="fa-solid ${isIncome ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
        </div>
        <div class="recent-info">
          <h4>${escapeHTML(tx.title)}</h4>
          <span>${tx.category} • ${dateFormatted}</span>
        </div>
        <div class="recent-amount ${amountClass}">
          ${sign}${formatINR(tx.amount)}
        </div>
      </li>
    `;
  }).join('');
}

function renderTableRows() {
  const tbody = document.getElementById('transaction-rows');
  const emptyState = document.getElementById('table-empty-state');
  if (!tbody) return;

  const search = document.getElementById('search-input')?.value.toLowerCase() || '';
  const typeFilter = document.getElementById('type-filter')?.value || 'ALL';
  const categoryFilter = document.getElementById('category-filter')?.value || 'ALL';
  const sortFilter = document.getElementById('sort-filter')?.value || 'date-desc';

  let filtered = transactions.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search);
    const matchType = typeFilter === 'ALL' || t.type === typeFilter;
    const matchCategory = categoryFilter === 'ALL' || t.category === categoryFilter;
    return matchSearch && matchType && matchCategory;
  });

  filtered.sort((a, b) => {
    if (sortFilter === 'date-desc') return new Date(b.date) - new Date(a.date);
    if (sortFilter === 'date-asc') return new Date(a.date) - new Date(b.date);
    if (sortFilter === 'amount-desc') return b.amount - a.amount;
    if (sortFilter === 'amount-asc') return a.amount - b.amount;
    return 0;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  tbody.innerHTML = filtered.map(tx => {
    const id = tx._id || tx.id;
    const dateFormatted = new Date(tx.date).toISOString().split('T')[0];
    const isIncome = tx.type === 'income';

    return `
      <tr>
        <td>${dateFormatted}</td>
        <td><strong>${escapeHTML(tx.title)}</strong></td>
        <td><span class="badge">${tx.category}</span></td>
        <td><span class="type-pill ${tx.type}">${tx.type}</span></td>
        <td class="text-right ${isIncome ? 'text-income' : 'text-expense'}">
          ${isIncome ? '+' : '-'}${formatINR(tx.amount)}
        </td>
        <td class="text-center">
          <button class="delete-btn" onclick="deleteTransactionFromDB('${id}')" title="Delete Record">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderCharts() {
  const expenseMap = {};
  EXPENSE_CATEGORIES.forEach(c => expenseMap[c] = 0);

  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      expenseMap[t.category] = (expenseMap[t.category] || 0) + Number(t.amount);
    });

  const activeCategories = Object.keys(expenseMap).filter(k => expenseMap[k] > 0);
  const activeAmounts = activeCategories.map(k => expenseMap[k]);
  const activeColors = activeCategories.map(k => CATEGORY_COLORS[k]);

  // Doughnut Chart (Dashboard)
  const donutCanvas = document.getElementById('expenseChart');
  const emptyState = document.getElementById('chart-empty-state');

  if (donutCanvas) {
    if (activeAmounts.length === 0) {
      if (emptyState) emptyState.style.display = 'flex';
      if (expenseChartInstance) expenseChartInstance.destroy();
    } else {
      if (emptyState) emptyState.style.display = 'none';
      if (expenseChartInstance) expenseChartInstance.destroy();

      expenseChartInstance = new Chart(donutCanvas, {
        type: 'doughnut',
        data: {
          labels: activeCategories,
          datasets: [{
            data: activeAmounts,
            backgroundColor: activeColors,
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }
  }

  // Bar Chart (Analytics)
  const barCanvas = document.getElementById('categoryBarChart');
  if (barCanvas) {
    if (categoryBarChartInstance) categoryBarChartInstance.destroy();

    categoryBarChartInstance = new Chart(barCanvas, {
      type: 'bar',
      data: {
        labels: activeCategories.length ? activeCategories : ['No Data'],
        datasets: [{
          label: 'Spending (₹)',
          data: activeAmounts.length ? activeAmounts : [0],
          backgroundColor: activeColors.length ? activeColors : ['#cbd5e1'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }
}

function renderCategorySummary() {
  const container = document.getElementById('category-summary-container');
  if (!container) return;

  const categoryTotals = {};
  let totalExpense = 0;

  transactions.filter(t => t.type === 'expense').forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Number(t.amount);
    totalExpense += Number(t.amount);
  });

  const entries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:20px;">No expense data available.</p>';
    return;
  }

  container.innerHTML = entries.map(([category, amount]) => {
    const percent = totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : 0;
    return `
      <div style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;margin-bottom:4px;">
          <span>${category}</span>
          <span>${formatINR(amount)} (${percent}%)</span>
        </div>
        <div style="background:#e2e8f0;height:8px;border-radius:4px;overflow:hidden;">
          <div style="background:${CATEGORY_COLORS[category] || '#64748b'};width:${percent}%;height:100%;"></div>
        </div>
      </div>
    `;
  }).join('');
}

/* ====================================================================
   NAVIGATION, FILTERS, AND MODAL
==================================================================== */
function setupNavigation() {
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  const panels = document.querySelectorAll('.view-panel');
  const seeAllBtn = document.getElementById('see-all-btn');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = item.getAttribute('data-tab');

      navItems.forEach(n => n.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      item.classList.add('active');
      const targetPanel = document.getElementById(`view-${tab}`);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });

  if (seeAllBtn) {
    seeAllBtn.addEventListener('click', () => {
      const txTab = document.querySelector('[data-tab="transactions"]');
      if (txTab) txTab.click();
    });
  }

  // Mobile menu toggle
  const menuToggle = document.getElementById('menu-toggle-btn');
  const sidebar = document.getElementById('sidebar');
  const closeSidebar = document.getElementById('close-sidebar-btn');

  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => sidebar.classList.add('open'));
  }
  if (closeSidebar && sidebar) {
    closeSidebar.addEventListener('click', () => sidebar.classList.remove('open'));
  }
}

function setupModalEvents() {
  const modal = document.getElementById('modal-backdrop');
  const openBtn = document.getElementById('open-modal-btn');
  const closeBtn = document.getElementById('modal-close-btn');
  const cancelBtn = document.getElementById('cancel-modal-btn');
  const form = document.getElementById('transaction-form');

  const tabExpense = document.getElementById('tab-expense');
  const tabIncome = document.getElementById('tab-income');
  const categorySelect = document.getElementById('tx-category');

  function openAddModal() {
    form.reset();
    document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
    setTxType('expense');
    modal.classList.add('active');
  }
  window.openAddModal = openAddModal;

  function closeModal() {
    modal.classList.remove('active');
  }

  if (openBtn) openBtn.addEventListener('click', openAddModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  function setTxType(type) {
    if (type === 'expense') {
      tabExpense.classList.add('active');
      tabIncome.classList.remove('active');
      tabExpense.querySelector('input').checked = true;
      populateCategories(EXPENSE_CATEGORIES);
    } else {
      tabIncome.classList.add('active');
      tabExpense.classList.remove('active');
      tabIncome.querySelector('input').checked = true;
      populateCategories(INCOME_CATEGORIES);
    }
  }

  function populateCategories(cats) {
    categorySelect.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  tabExpense.addEventListener('click', () => setTxType('expense'));
  tabIncome.addEventListener('click', () => setTxType('income'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('tx-title').value.trim();
    const amount = parseFloat(document.getElementById('tx-amount').value);
    const category = categorySelect.value;
    const date = document.getElementById('tx-date').value;
    const type = document.querySelector('input[name="tx-type"]:checked').value;

    if (!title || !amount || amount <= 0 || !date) {
      showToast('Please fill all fields accurately', 'error');
      return;
    }

    await saveTransactionToDB({ title, amount, category, date, type });
    closeModal();
  });
}

function setupFilterListeners() {
  ['search-input', 'type-filter', 'category-filter', 'sort-filter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', renderTableRows);
  });
}

function setupPasswordChange() {
  const pwdForm = document.getElementById('change-password-form');
  if (!pwdForm) return;

  pwdForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById('current-pwd').value;
    const newPassword = document.getElementById('new-pwd').value;
    const confirmPassword = document.getElementById('confirm-pwd').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Please fill in all password fields', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters long', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    if (currentPassword === newPassword) {
      showToast('New password must be different from current password', 'error');
      return;
    }

    const saveBtn = document.getElementById('save-pwd-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';

    try {
      const res = await fetchWithAuth('/api/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to update password');
      }

      showToast(data.message, 'success');
      pwdForm.reset();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fa-solid fa-key"></i> Update Password';
    }
  });
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.innerText = str;
  return div.innerHTML;
}