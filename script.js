/**
 * RupeeTrack - Personal Expense Tracker
 * College Project Implementation
 * Vanilla ES6 JavaScript + Chart.js + LocalStorage
 */

// ==========================================================================
// 1. CONSTANTS & APPLICATION STATE
// ==========================================================================

const STORAGE_KEY = 'rupeetrack_transactions_data';

// Available categories configuration with specific UI accent colors and icons
const CATEGORIES = {
  expense: [
    { name: 'Food', icon: 'fa-utensils', color: '#f97316', bg: '#fff7ed' },
    { name: 'Travel', icon: 'fa-plane', color: '#0ea5e9', bg: '#f0f9ff' },
    { name: 'Shopping', icon: 'fa-bag-shopping', color: '#ec4899', bg: '#fdf2f8' },
    { name: 'Education', icon: 'fa-graduation-cap', color: '#8b5cf6', bg: '#f5f3ff' },
    { name: 'Bills', icon: 'fa-file-invoice-dollar', color: '#ef4444', bg: '#fef2f2' },
    { name: 'Entertainment', icon: 'fa-film', color: '#14b8a6', bg: '#f0fdfa' },
    { name: 'Other', icon: 'fa-ellipsis', color: '#64748b', bg: '#f8fafc' }
  ],
  income: [
    { name: 'Salary', icon: 'fa-money-bill-wave', color: '#10b981', bg: '#ecfdf5' },
    { name: 'Education', icon: 'fa-award', color: '#8b5cf6', bg: '#f5f3ff' },
    { name: 'Other', icon: 'fa-circle-plus', color: '#0284c7', bg: '#f0f9ff' }
  ]
};

// Initial student demo data if the user visits the website for the very first time
const SAMPLE_TRANSACTIONS = [
  {
    id: 'tx_sample_1',
    title: 'Monthly Pocket Money / Allowance',
    amount: 12000,
    type: 'income',
    category: 'Salary',
    date: getRelativeDateStr(-8)
  },
  {
    id: 'tx_sample_2',
    title: 'Computer Science Textbooks',
    amount: 1450,
    type: 'expense',
    category: 'Education',
    date: getRelativeDateStr(-6)
  },
  {
    id: 'tx_sample_3',
    title: 'Cafeteria & Snacks with Friends',
    amount: 480,
    type: 'expense',
    category: 'Food',
    date: getRelativeDateStr(-4)
  },
  {
    id: 'tx_sample_4',
    title: 'Monthly Metro SmartCard Recharge',
    amount: 800,
    type: 'expense',
    category: 'Travel',
    date: getRelativeDateStr(-2)
  },
  {
    id: 'tx_sample_5',
    title: 'Mobile Recharge & Wi-Fi Bill',
    amount: 699,
    type: 'expense',
    category: 'Bills',
    date: getRelativeDateStr(0)
  }
];

// App Global State
let transactions = [];
let expenseDoughnutChart = null;
let categoryBarChart = null;

// ==========================================================================
// 2. DOM ELEMENT REFERENCES
// ==========================================================================

// Navigation & Sidebar
const sidebar = document.getElementById('sidebar');
const menuToggleBtn = document.getElementById('menu-toggle-btn');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const navItems = document.querySelectorAll('.nav-item');
const viewPanels = document.querySelectorAll('.view-panel');
const seeAllBtn = document.getElementById('see-all-btn');

// Summary Metric Elements
const balanceEl = document.getElementById('card-balance');
const incomeEl = document.getElementById('card-income');
const expensesEl = document.getElementById('card-expenses');
const countEl = document.getElementById('card-count');

// Transactions Table & Lists
const recentListEl = document.getElementById('recent-transactions-list');
const tableBodyEl = document.getElementById('transaction-rows');
const emptyTableStateEl = document.getElementById('table-empty-state');
const emptyChartStateEl = document.getElementById('chart-empty-state');
const categorySummaryContainer = document.getElementById('category-summary-container');

// Filters & Search
const searchInput = document.getElementById('search-input');
const typeFilter = document.getElementById('type-filter');
const categoryFilter = document.getElementById('category-filter');
const sortFilter = document.getElementById('sort-filter');

// Transaction Modal Elements
const openModalBtn = document.getElementById('open-modal-btn');
const modalBackdrop = document.getElementById('modal-backdrop');
const modalCloseBtn = document.getElementById('modal-close-btn');
const cancelModalBtn = document.getElementById('cancel-modal-btn');
const txForm = document.getElementById('transaction-form');
const tabExpense = document.getElementById('tab-expense');
const tabIncome = document.getElementById('tab-income');
const txTitleInput = document.getElementById('tx-title');
const txAmountInput = document.getElementById('tx-amount');
const txCategorySelect = document.getElementById('tx-category');
const txDateInput = document.getElementById('tx-date');

// Settings Controls
const loadSampleBtn = document.getElementById('load-sample-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const confirmModalBackdrop = document.getElementById('confirm-modal-backdrop');
const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
const confirmOkBtn = document.getElementById('confirm-ok-btn');

// ==========================================================================
// 3. INITIALIZATION & LIFECYCLE
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  renderLiveDate();
  loadData();
  setupEventListeners();
  populateCategorySelect('expense');
  resetDateInputToToday();
  refreshAllUI();
});

// Format today's date dynamically for topbar header
function renderLiveDate() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formatted = now.toLocaleDateString('en-IN', options);
  const parts = formatted.split(',');
  
  if (parts.length >= 2) {
    document.getElementById('current-day').innerText = parts[0].trim();
    document.getElementById('current-date').innerText = parts.slice(1).join(',').trim();
  }
}

// Helper: produce ISO dates offset by days
function getRelativeDateStr(dayOffset) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().split('T')[0];
}

// Reset date input in modal to current day
function resetDateInputToToday() {
  txDateInput.value = new Date().toISOString().split('T')[0];
}

// ==========================================================================
// 4. STORAGE LOGIC
// ==========================================================================

function loadData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      transactions = JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse localStorage data:', e);
      transactions = [...SAMPLE_TRANSACTIONS];
      saveData();
    }
  } else {
    // First time launch: use starter demo transactions
    transactions = [...SAMPLE_TRANSACTIONS];
    saveData();
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

// ==========================================================================
// 5. CORE CALCULATIONS & UI UPDATES
// ==========================================================================

/**
 * Recalculates metrics, rebuilds lists, tables, and redraws charts.
 */
function refreshAllUI() {
  updateDashboardMetrics();
  renderRecentTransactions();
  renderTransactionsTable();
  renderExpenseCharts();
  renderAnalyticsSummary();
}

// Format numbers in standard Indian Rupee format (e.g. ₹1,23,456.00)
function formatINR(number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number);
}

function updateDashboardMetrics() {
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach(item => {
    const val = Number(item.amount) || 0;
    if (item.type === 'income') {
      totalIncome += val;
    } else {
      totalExpense += val;
    }
  });

  const balance = totalIncome - totalExpense;

  balanceEl.innerText = formatINR(balance);
  incomeEl.innerText = formatINR(totalIncome);
  expensesEl.innerText = formatINR(totalExpense);
  countEl.innerText = transactions.length.toString();

  // Subtle contextual tone for balance
  if (balance < 0) {
    balanceEl.style.color = '#dc2626';
  } else {
    balanceEl.style.color = '#0f172a';
  }
}

// Returns styling & icon metadata for any category
function getCategoryMeta(catName, type = 'expense') {
  const pool = CATEGORIES[type] || CATEGORIES.expense;
  const match = pool.find(c => c.name.toLowerCase() === catName.toLowerCase());
  if (match) return match;
  return { name: catName, icon: 'fa-tags', color: '#64748b', bg: '#f8fafc' };
}

// Render the 5 most recent activities on dashboard
function renderRecentTransactions() {
  recentListEl.innerHTML = '';
  
  if (transactions.length === 0) {
    recentListEl.innerHTML = `
      <li style="text-align: center; color: var(--text-dim); padding: 24px 0;">
        No recent activity. Click "+ Add Transaction" to begin.
      </li>
    `;
    return;
  }

  // Clone and sort descending by date
  const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const recentFive = sorted.slice(0, 5);

  recentFive.forEach(tx => {
    const meta = getCategoryMeta(tx.category, tx.type);
    const isExpense = tx.type === 'expense';
    const sign = isExpense ? '-' : '+';
    const amountClass = isExpense ? 'tx-expense-text' : 'tx-income-text';

    const li = document.createElement('li');
    li.className = 'recent-item';
    li.innerHTML = `
      <div class="recent-item-left">
        <div class="cat-badge-circle" style="background-color: ${meta.bg}; color: ${meta.color};">
          <i class="fa-solid ${meta.icon}"></i>
        </div>
        <div>
          <div class="recent-title">${escapeHTML(tx.title)}</div>
          <div class="recent-date">${formatDate(tx.date)} • <span style="font-weight: 500">${tx.category}</span></div>
        </div>
      </div>
      <div class="recent-amount ${amountClass}">
        ${sign} ${formatINR(tx.amount)}
      </div>
    `;
    recentListEl.appendChild(li);
  });
}

// Render full transactions table with active filtering, searching, and sorting
function renderTransactionsTable() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedType = typeFilter.value;
  const selectedCat = categoryFilter.value;
  const sortMethod = sortFilter.value;

  // Apply Filters
  let filtered = transactions.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm);
    const matchesType = (selectedType === 'ALL') || (item.type === selectedType);
    const matchesCategory = (selectedCat === 'ALL') || (item.category === selectedCat);
    return matchesSearch && matchesType && matchesCategory;
  });

  // Apply Sorting
  filtered.sort((a, b) => {
    if (sortMethod === 'date-desc') return new Date(b.date) - new Date(a.date);
    if (sortMethod === 'date-asc') return new Date(a.date) - new Date(b.date);
    if (sortMethod === 'amount-desc') return b.amount - a.amount;
    if (sortMethod === 'amount-asc') return a.amount - b.amount;
    return 0;
  });

  tableBodyEl.innerHTML = '';

  if (filtered.length === 0) {
    emptyTableStateEl.style.display = 'block';
    return;
  } else {
    emptyTableStateEl.style.display = 'none';
  }

  filtered.forEach(tx => {
    const isExpense = tx.type === 'expense';
    const meta = getCategoryMeta(tx.category, tx.type);
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td data-label="Date">${formatDate(tx.date)}</td>
      <td data-label="Title"><strong>${escapeHTML(tx.title)}</strong></td>
      <td data-label="Category">
        <span style="display: inline-flex; align-items: center; gap: 6px;">
          <i class="fa-solid ${meta.icon}" style="color: ${meta.color}"></i> ${tx.category}
        </span>
      </td>
      <td data-label="Type">
        <span class="badge-type ${isExpense ? 'badge-expense' : 'badge-income'}">
          ${tx.type}
        </span>
      </td>
      <td data-label="Amount" class="text-right ${isExpense ? 'tx-expense-text' : 'tx-income-text'}">
        ${isExpense ? '-' : '+'} ${formatINR(tx.amount)}
      </td>
      <td data-label="Action" class="text-center">
        <button class="delete-action-btn" title="Delete record" onclick="deleteTransaction('${tx.id}')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;
    tableBodyEl.appendChild(tr);
  });
}

// ==========================================================================
// 6. CHART.JS VISUALIZATIONS
// ==========================================================================

function renderExpenseCharts() {
  const expenseTransactions = transactions.filter(t => t.type === 'expense');

  // Group amounts by category
  const categoryTotals = {};
  expenseTransactions.forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Number(t.amount);
  });

  const labels = Object.keys(categoryTotals);
  const data = Object.values(categoryTotals);

  const canvasDoughnut = document.getElementById('expenseChart');
  const canvasBar = document.getElementById('categoryBarChart');

  if (labels.length === 0) {
    emptyChartStateEl.style.display = 'block';
    canvasDoughnut.style.display = 'none';
    if (expenseDoughnutChart) expenseDoughnutChart.destroy();
    if (categoryBarChart) categoryBarChart.destroy();
    return;
  } else {
    emptyChartStateEl.style.display = 'none';
    canvasDoughnut.style.display = 'block';
  }

  // Pre-determined colors aligned with categories
  const backgroundColors = labels.map(label => {
    const meta = getCategoryMeta(label, 'expense');
    return meta.color;
  });

  // 1. Render Dashboard Doughnut Chart
  if (expenseDoughnutChart) {
    expenseDoughnutChart.destroy();
  }

  expenseDoughnutChart = new Chart(canvasDoughnut, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: backgroundColors,
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            font: { family: "'Inter', sans-serif", size: 12 }
          }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const val = context.raw || 0;
              return ` ${context.label}: ${formatINR(val)}`;
            }
          }
        }
      },
      cutout: '68%'
    }
  });

  // 2. Render Analytics Bar Chart
  if (expenseBarChartExists()) {
    categoryBarChart.destroy();
  }

  categoryBarChart = new Chart(canvasBar, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Expenses (₹)',
        data: data,
        backgroundColor: backgroundColors,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: context => ` Amount: ${formatINR(context.raw)}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: value => '₹' + value
          },
          grid: { color: '#f1f5f9' }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

function expenseBarChartExists() {
  return categoryBarChart !== null && typeof categoryBarChart.destroy === 'function';
}

// Render percentage progress list in Analytics View
function renderAnalyticsSummary() {
  categorySummaryContainer.innerHTML = '';
  const expenseTransactions = transactions.filter(t => t.type === 'expense');

  let totalExpense = 0;
  const categoryTotals = {};

  expenseTransactions.forEach(t => {
    const amt = Number(t.amount);
    totalExpense += amt;
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amt;
  });

  if (totalExpense === 0) {
    categorySummaryContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">No expense transactions recorded yet.</p>`;
    return;
  }

  // Sort categories highest to lowest
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  sortedCategories.forEach(([cat, amount]) => {
    const pct = ((amount / totalExpense) * 100).toFixed(1);
    const meta = getCategoryMeta(cat, 'expense');

    const item = document.createElement('div');
    item.className = 'cat-progress-item';
    item.innerHTML = `
      <div class="cat-progress-header">
        <span><i class="fa-solid ${meta.icon}" style="color: ${meta.color}; width: 18px;"></i> ${cat}</span>
        <span>${formatINR(amount)} (${pct}%)</span>
      </div>
      <div class="cat-progress-bar-bg">
        <div class="cat-progress-bar-fill" style="width: ${pct}%; background-color: ${meta.color};"></div>
      </div>
    `;
    categorySummaryContainer.appendChild(item);
  });
}

// ==========================================================================
// 7. FORM VALIDATION & TRANSACTION ACTIONS
// ==========================================================================

function setupEventListeners() {
  // Mobile Sidebar Toggle
  menuToggleBtn.addEventListener('click', () => sidebar.classList.add('mobile-open'));
  closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('mobile-open'));

  // Navigation Tabs Switching
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = item.getAttribute('data-tab');
      switchView(targetTab);
      sidebar.classList.remove('mobile-open');
    });
  });

  seeAllBtn.addEventListener('click', () => switchView('transactions'));

  // Modal Open / Close
  openModalBtn.addEventListener('click', openAddModal);
  modalCloseBtn.addEventListener('click', closeAddModal);
  cancelModalBtn.addEventListener('click', closeAddModal);

  // Close modal when clicking on outer backdrop
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeAddModal();
  });

  // Modal Expense vs Income switchers
  tabExpense.addEventListener('click', () => setModalType('expense'));
  tabIncome.addEventListener('click', () => setModalType('income'));

  // Form Submission
  txForm.addEventListener('submit', handleTransactionSubmit);

  // Table Filters & Live Search
  searchInput.addEventListener('input', renderTransactionsTable);
  typeFilter.addEventListener('change', renderTransactionsTable);
  categoryFilter.addEventListener('change', renderTransactionsTable);
  sortFilter.addEventListener('change', renderTransactionsTable);

  // Settings Actions
  loadSampleBtn.addEventListener('click', () => {
    transactions = [...SAMPLE_TRANSACTIONS];
    saveData();
    refreshAllUI();
    showToast('Loaded demo student transactions!', 'success');
  });

  clearAllBtn.addEventListener('click', () => {
    confirmModalBackdrop.classList.add('active');
  });

  confirmCancelBtn.addEventListener('click', () => {
    confirmModalBackdrop.classList.remove('active');
  });

  confirmOkBtn.addEventListener('click', () => {
    transactions = [];
    saveData();
    refreshAllUI();
    confirmModalBackdrop.classList.remove('active');
    showToast('All transaction records have been erased.', 'error');
  });
}

function switchView(tabKey) {
  navItems.forEach(nav => {
    if (nav.getAttribute('data-tab') === tabKey) {
      nav.classList.add('active');
    } else {
      nav.classList.remove('active');
    }
  });

  viewPanels.forEach(panel => {
    if (panel.id === `view-${tabKey}`) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });
}

function openAddModal() {
  clearValidationErrors();
  txForm.reset();
  resetDateInputToToday();
  setModalType('expense');
  modalBackdrop.classList.add('active');
  setTimeout(() => txTitleInput.focus(), 150);
}

function closeAddModal() {
  modalBackdrop.classList.remove('active');
}

function setModalType(type) {
  if (type === 'income') {
    tabIncome.classList.add('active');
    tabIncome.querySelector('input').checked = true;
    tabExpense.classList.remove('active');
    populateCategorySelect('income');
  } else {
    tabExpense.classList.add('active');
    tabExpense.querySelector('input').checked = true;
    tabIncome.classList.remove('active');
    populateCategorySelect('expense');
  }
}

function populateCategorySelect(type) {
  txCategorySelect.innerHTML = '';
  const list = CATEGORIES[type] || CATEGORIES.expense;
  list.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.textContent = c.name;
    txCategorySelect.appendChild(opt);
  });
}

function clearValidationErrors() {
  document.getElementById('error-title').innerText = '';
  document.getElementById('error-amount').innerText = '';
  document.getElementById('error-category').innerText = '';
  document.getElementById('error-date').innerText = '';
}

function handleTransactionSubmit(e) {
  e.preventDefault();
  clearValidationErrors();

  const title = txTitleInput.value.trim();
  const amount = parseFloat(txAmountInput.value);
  const category = txCategorySelect.value;
  const date = txDateInput.value;
  const type = document.querySelector('input[name="tx-type"]:checked').value;

  let isValid = true;

  if (!title) {
    document.getElementById('error-title').innerText = 'Please enter a title or description.';
    isValid = false;
  }

  if (isNaN(amount) || amount <= 0) {
    document.getElementById('error-amount').innerText = 'Enter a valid amount greater than ₹0.';
    isValid = false;
  }

  if (!category) {
    document.getElementById('error-category').innerText = 'Please pick a category.';
    isValid = false;
  }

  if (!date) {
    document.getElementById('error-date').innerText = 'Please select a valid date.';
    isValid = false;
  }

  if (!isValid) return;

  // Create transaction object
  const newTx = {
    id: 'tx_' + Date.now() + Math.random().toString(36).substr(2, 4),
    title,
    amount,
    type,
    category,
    date
  };

  // Prepend to transaction array
  transactions.unshift(newTx);
  saveData();
  refreshAllUI();
  closeAddModal();

  showToast(`Added: ${title} (${formatINR(amount)})`, 'success');
}

// Delete transaction by ID with confirmation prompt
window.deleteTransaction = function(id) {
  const index = transactions.findIndex(t => t.id === id);
  if (index !== -1) {
    const item = transactions[index];
    transactions.splice(index, 1);
    saveData();
    refreshAllUI();
    showToast(`Removed "${item.title}"`, 'error');
  }
};

// ==========================================================================
// 8. TOAST NOTIFICATIONS & UTILITIES
// ==========================================================================

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';

  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${escapeHTML(message)}</span>
  `;

  container.appendChild(toast);

  // Automatically fade out and remove after 3.2 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

// Prevent cross-site scripting (XSS)
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}