const key = 'cashflow-ledger-v1';
let state = JSON.parse(localStorage.getItem(key)) || { total: null, accounts: [], transactions: [] };
const $ = (id) => document.getElementById(id);
const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(value);
const save = () => localStorage.setItem(key, JSON.stringify(state));
const now = () => new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const dateKey = () => new Date().toISOString().slice(0, 10);
const available = () => state.total - state.accounts.reduce((sum, account) => sum + account.balance, 0);
const $escape = (value) => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const addTransaction = (data) => state.transactions.unshift({ id: crypto.randomUUID(), createdAt: dateKey(), time: now(), ...data });
function toast(message) { const node = $('toast'); node.textContent = message; node.classList.add('show'); setTimeout(() => node.classList.remove('show'), 2800); }
function accountOptions(selected = '') { return state.accounts.map(account => `<option value="${account.id}" ${account.id === selected ? 'selected' : ''}>${$escape(account.name)} — ${money(account.balance)}</option>`).join(''); }
function sortedAccounts() { const accounts = state.accounts.slice(), sort = $('accountSort')?.value || 'newest'; if (sort === 'name') return accounts.sort((a, b) => a.name.localeCompare(b.name)); if (sort === 'balance-high') return accounts.sort((a, b) => b.balance - a.balance); if (sort === 'balance-low') return accounts.sort((a, b) => a.balance - b.balance); return accounts.reverse(); }
function chartDistribution() {
  if (!state.accounts.length) return '<p class="chart-empty">Create accounts to see the distribution.</p>';
  const largest = Math.max(...state.accounts.map(account => account.balance), 1);
  return state.accounts.map(account => `<div class="distribution-row"><div class="distribution-label"><span>${$escape(account.name)}</span><strong>${money(account.balance)}</strong></div><div class="distribution-track"><span style="width:${Math.max(3, account.balance / largest * 100)}%"></span></div></div>`).join('');
}
function chartActivity() {
  const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - (6 - index)); return date.toISOString().slice(0, 10); });
  const data = days.map(day => ({ day, amount: state.transactions.filter(item => item.createdAt === day).reduce((sum, item) => sum + Math.abs(item.displayAmount ?? item.amount ?? 0), 0) }));
  const highest = Math.max(...data.map(item => item.amount), 1);
  return `<div class="activity-bars" aria-label="Cash activity over the last seven days">${data.map(item => `<div class="activity-column"><strong>${item.amount ? money(item.amount) : ''}</strong><div class="activity-track"><span style="height:${item.amount ? Math.max(7, item.amount / highest * 100) : 2}%"></span></div><small>${new Date(`${item.day}T00:00:00`).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}</small></div>`).join('')}</div>`;
}
function filteredTransactions() {
  const search = $('filterSearch').value.trim().toLowerCase(), accountId = $('filterAccount').value;
  const from = $('filterFromDate').value, to = $('filterToDate').value;
  const minValue = $('filterMinAmount').value, maxValue = $('filterMaxAmount').value;
  const min = minValue === '' ? null : Number(minValue), max = maxValue === '' ? null : Number(maxValue);
  return state.transactions.filter(item => {
    const amount = Math.abs(item.displayAmount ?? item.amount ?? 0);
    const accountMatch = !accountId || item.accountIds?.includes(accountId) || item.title.toLowerCase().includes((state.accounts.find(account => account.id === accountId)?.name || '').toLowerCase());
    return (!search || item.title.toLowerCase().includes(search)) && accountMatch && (!from || item.createdAt >= from) && (!to || item.createdAt <= to) && (min === null || amount >= min) && (max === null || amount <= max);
  });
}
function renderLedger() {
  const entries = filteredTransactions(), hasTransactions = state.transactions.length > 0;
  $('emptyLedger').classList.toggle('hidden', hasTransactions); $('emptyFilteredLedger').classList.toggle('hidden', !hasTransactions || entries.length > 0);
  $('ledgerList').innerHTML = entries.map(item => {
    const value = item.displayAmount ?? item.amount ?? 0;
    const isTransfer = item.type === 'transfer';
    const display = isTransfer ? money(Math.abs(value)) : `${value < 0 ? '−' : '+'}${money(Math.abs(value))}`;
    return `<div class="ledger-row"><div class="ledger-icon">${isTransfer ? '↔' : value < 0 ? '−' : '+'}</div><div class="ledger-info"><div class="ledger-title">${$escape(item.title)}</div><div class="ledger-time">${item.time}</div></div><strong class="ledger-amount ${isTransfer ? '' : value < 0 ? 'minus' : 'plus'}">${display}</strong></div>`;
  }).join('');
}
function render() {
  const isSetup = state.total === null;
  $('setupScreen').classList.toggle('hidden', !isSetup); $('dashboard').classList.toggle('hidden', isSetup);
  if (isSetup) return;
  const allocated = state.total - available(), selectedFilter = $('filterAccount').value;
  $('totalCash').textContent = money(state.total); $('allocatedCash').textContent = money(allocated); $('availableCash').textContent = money(available());
  $('accountCount').textContent = `${state.accounts.length} account${state.accounts.length === 1 ? '' : 's'}`;
  $('emptyAccounts').classList.toggle('hidden', state.accounts.length > 0);
  $('accountsList').innerHTML = sortedAccounts().map(account => `<article class="account-row"><div class="account-avatar" aria-hidden="true">${$escape(account.name.charAt(0).toUpperCase())}</div><div><div class="account-name">${$escape(account.name)}</div><div class="account-date">Created ${account.created}</div></div><strong class="account-balance">${money(account.balance)}</strong><button class="edit-account-button" type="button" data-account-id="${account.id}" aria-label="Edit ${$escape(account.name)}" title="Edit account">✎</button><button class="add-account-money-button" type="button" data-account-id="${account.id}" aria-label="Add money to ${$escape(account.name)}" title="Add money">+</button><button class="delete-account-button" type="button" data-account-id="${account.id}" aria-label="Delete ${$escape(account.name)}" title="Delete account">×</button></article>`).join('');
  $('transferFrom').innerHTML = accountOptions(); $('transferTo').innerHTML = accountOptions(); $('addMoneyAccount').innerHTML = accountOptions();
  $('filterAccount').innerHTML = `<option value="">All accounts</option>${accountOptions(selectedFilter)}`;
  const disabled = state.accounts.length < 2; $('transferForm').querySelector('button').disabled = disabled; $('transferForm').querySelector('button').style.opacity = disabled ? '.45' : '1';
  $('addMoneyButton').disabled = state.accounts.length === 0 || available() <= 0; $('addMoneyButton').style.opacity = $('addMoneyButton').disabled ? '.45' : '1';
  $('distributionChart').innerHTML = chartDistribution(); $('activityChart').innerHTML = chartActivity(); renderLedger();
}
$('setupForm').addEventListener('submit', event => { event.preventDefault(); const total = Number($('primaryAmount').value); if (!Number.isFinite(total) || total < 0) return; state.total = total; save(); render(); toast('Cash pool created.'); });
$('createAccountForm').addEventListener('submit', event => { event.preventDefault(); const name = $('accountName').value.trim(), amount = Number($('initialAmount').value); if (!name) return; if (amount < 0 || amount > available()) return toast('That amount is not available in the cash pool.'); const account = { id:crypto.randomUUID(), name, balance:amount, created:now() }; state.accounts.push(account); if (amount) addTransaction({ type:'allocation', title:`Allocated to ${name}`, amount, accountIds:[account.id] }); save(); event.target.reset(); $('initialAmount').value = 0; render(); toast(`${name} was created.`); });
$('transferForm').addEventListener('submit', event => { event.preventDefault(); const from = state.accounts.find(account => account.id === $('transferFrom').value), to = state.accounts.find(account => account.id === $('transferTo').value), amount = Number($('transferAmount').value); if (!from || !to || from.id === to.id) return toast('Choose two different accounts.'); if (!amount || amount > from.balance) return toast('The source account does not have enough cash.'); from.balance -= amount; to.balance += amount; addTransaction({ type:'transfer', title:`${from.name} → ${to.name}`, displayAmount:amount, accountIds:[from.id, to.id] }); save(); event.target.reset(); render(); toast('Transfer completed.'); });
$('addMoneyButton').addEventListener('click', () => { if ($('addMoneyButton').disabled) return; $('dialogAvailable').textContent = money(available()); $('addMoneyDialog').showModal(); });
$('closeDialog').addEventListener('click', () => $('addMoneyDialog').close());
$('addMoneyForm').addEventListener('submit', event => { event.preventDefault(); const account = state.accounts.find(item => item.id === $('addMoneyAccount').value), amount = Number($('addMoneyAmount').value); if (!account || !amount || amount > available()) return toast('That amount is not available in the cash pool.'); account.balance += amount; addTransaction({ type:'allocation', title:`Added to ${account.name}`, amount, accountIds:[account.id] }); save(); $('addMoneyDialog').close(); event.target.reset(); render(); toast('Money added to account.'); });
$('accountsList').addEventListener('click', event => { const id = event.target.closest('[data-account-id]')?.dataset.accountId, account = state.accounts.find(item => item.id === id); if (!account) return; if (event.target.closest('.add-account-money-button')) { if (available() <= 0) return toast('No cash is currently available in the main pool.'); $('dialogAvailable').textContent = money(available()); $('addMoneyAccount').innerHTML = accountOptions(account.id); $('addMoneyDialog').showModal(); return; } if (event.target.closest('.edit-account-button')) { $('editAccountId').value = account.id; $('editAccountName').value = account.name; $('editAccountBalance').value = account.balance; $('editAccountDialog').showModal(); return; } if (event.target.closest('.delete-account-button')) { if (!confirm(`Delete “${account.name}”? ${money(account.balance)} will return to the available cash pool.`)) return; state.accounts = state.accounts.filter(item => item.id !== account.id); addTransaction({ type:'allocation', title:`Deleted ${account.name}; returned cash to pool`, amount:-account.balance, accountIds:[account.id] }); save(); render(); toast(`${account.name} was deleted.`); } });
$('closeEditAccountDialog').addEventListener('click', () => $('editAccountDialog').close());
$('editAccountForm').addEventListener('submit', event => { event.preventDefault(); const account = state.accounts.find(item => item.id === $('editAccountId').value), name = $('editAccountName').value.trim(), balance = Number($('editAccountBalance').value); if (!account || !name || !Number.isFinite(balance) || balance < 0) return; const difference = balance - account.balance, oldName = account.name; if (difference > available()) return toast('There is not enough cash in the main pool for that balance.'); account.name = name; account.balance = balance; if (difference || oldName !== name) addTransaction({ type:'adjustment', title:difference ? `Balance corrected for ${name}` : `Updated ${name}`, amount:difference, accountIds:[account.id] }); save(); $('editAccountDialog').close(); render(); toast('Account updated.'); });
$('editPoolButton').addEventListener('click', () => { const allocated = state.total - available(); $('allocatedMinimum').textContent = money(allocated); $('editPoolAmount').value = state.total; $('editPoolAmount').min = allocated; $('editPoolDialog').showModal(); });
$('closeEditPoolDialog').addEventListener('click', () => $('editPoolDialog').close());
$('editPoolForm').addEventListener('submit', event => { event.preventDefault(); const total = Number($('editPoolAmount').value), allocated = state.total - available(); if (!Number.isFinite(total) || total < allocated) return toast(`Total cannot be lower than ${money(allocated)} already allocated.`); state.total = total; save(); $('editPoolDialog').close(); render(); toast('Total cash pool updated.'); });
['filterSearch','filterAccount','filterFromDate','filterToDate','filterMinAmount','filterMaxAmount'].forEach(id => $(id).addEventListener('input', renderLedger));
$('accountSort').addEventListener('change', render);
$('clearFiltersButton').addEventListener('click', () => { ['filterSearch','filterAccount','filterFromDate','filterToDate','filterMinAmount','filterMaxAmount'].forEach(id => $(id).value = ''); renderLedger(); });
$('resetButton').addEventListener('click', () => { if (confirm('Reset the cash pool, accounts, and all transaction history?')) { localStorage.removeItem(key); state = { total:null, accounts:[], transactions:[] }; render(); } });
render();
