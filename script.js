'use strict';

/* ─────────────────────────────────────────────
   DATA PERSISTENCE
───────────────────────────────────────────── */
const STORAGE_KEY = 'ipt_demo_v1';
let currentUser = null;

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      window.db = JSON.parse(raw);
    } else {
      throw new Error('no data');
    }
  } catch (_) {
    window.db = {
      accounts: [],
      departments: [
        { id: 'dept-1', name: 'Engineering',     description: 'Software engineering and product development.' },
        { id: 'dept-2', name: 'Human Resources', description: 'People operations, hiring, and culture.' },
      ],
      employees: [],
      requests:  [],
    };
  }

  const adminEmail = 'admin@example.com';
  let admin = window.db.accounts.find(a => a.email === adminEmail);
  if (!admin) {
    window.db.accounts.unshift({
      firstName:  'Admin',
      lastName:   'User',
      email:      adminEmail,
      password:   'Password123!',
      role:       'admin',
      verified:   true,
      joinedDate: new Date().toISOString().split('T')[0],
    });
  } else {
    admin.verified  = true;
    admin.role      = 'admin';
    admin.password  = admin.password || 'Password123!';
    admin.firstName = admin.firstName || 'Admin';
    admin.lastName  = admin.lastName  || 'User';
  }

  saveToStorage();
}

function saveToStorage() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db)); }
  catch (e) { console.error('Storage error:', e); }
}

/* ─────────────────────────────────────────────
   ROUTING
───────────────────────────────────────────── */
const protectedRoutes = ['profile', 'requests'];
const adminRoutes     = ['employees', 'accounts', 'departments'];

function navigateTo(hash) {
  window.location.hash = hash;
}

function handleRouting() {
  let hash = window.location.hash || '#/';
  if (!hash.startsWith('#/')) hash = '#/';
  const route = hash.replace('#/', '').split('/')[0] || 'home';

  if (protectedRoutes.includes(route) && !currentUser) {
    showToast('Please log in to access that page.', 'warning');
    return navigateTo('#/login');
  }
  if (adminRoutes.includes(route) && (!currentUser || currentUser.role !== 'admin')) {
    showToast('Admin access required.', 'danger');
    return navigateTo('#/');
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pageId = route === 'home' ? 'home-page' : `${route}-page`;
  const target = document.getElementById(pageId);
  if (target) {
    target.classList.add('active');
    onPageEnter(route);
  } else {
    document.getElementById('home-page').classList.add('active');
  }
}

function onPageEnter(route) {
  switch (route) {
    case 'verify-email':  renderVerifyEmail();      break;
    case 'profile':       renderProfile();           break;
    case 'employees':     renderEmployeesTable();    break;
    case 'departments':   renderDepartmentsTable();  break;
    case 'accounts':      renderAccountsList();      break;
    case 'requests':      renderRequestsTable();     break;
  }
}

/* ─────────────────────────────────────────────
   AUTH STATE
───────────────────────────────────────────── */
function setAuthState(isAuth, user = null) {
  currentUser = user;
  const body = document.body;
  if (isAuth && user) {
    body.classList.remove('not-authenticated');
    body.classList.add('authenticated');
    if (user.role === 'admin') body.classList.add('is-admin');
    else body.classList.remove('is-admin');
    const el = document.getElementById('nav-username');
    if (el) el.textContent = user.role === 'admin' ? 'Admin' : (user.firstName || user.email || 'User');
  } else {
    body.classList.remove('authenticated', 'is-admin');
    body.classList.add('not-authenticated');
  }
}

/* ─────────────────────────────────────────────
   REGISTER
───────────────────────────────────────────── */
function handleRegister(e) {
  e.preventDefault();
  const form = document.getElementById('register-form');
  const err  = document.getElementById('register-error');
  hideError(err);
  form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

  const firstName = document.getElementById('reg-fname').value.trim();
  const lastName  = document.getElementById('reg-lname').value.trim();
  const email     = document.getElementById('reg-email').value.trim().toLowerCase();
  const password  = document.getElementById('reg-password').value;

  let valid = true;
  if (!firstName) { document.getElementById('reg-fname').classList.add('is-invalid'); valid = false; }
  if (!lastName)  { document.getElementById('reg-lname').classList.add('is-invalid'); valid = false; }
  if (!email)     { document.getElementById('reg-email').classList.add('is-invalid');  valid = false; }
  if (password.length < 6) { document.getElementById('reg-password').classList.add('is-invalid'); valid = false; }
  if (!valid) return;

  if (window.db.accounts.find(a => a.email === email)) {
    return showError(err, 'An account with that email already exists.');
  }

  window.db.accounts.push({
    firstName, lastName, email, password,
    role: 'user', verified: false,
    joinedDate: new Date().toISOString().split('T')[0],
  });
  saveToStorage();
  localStorage.setItem('unverified_email', email);
  form.reset();
  navigateTo('#/verify-email');
  setTimeout(() => renderVerifyEmail(), 50);
}

/* ─────────────────────────────────────────────
   VERIFY EMAIL
───────────────────────────────────────────── */
function renderVerifyEmail() {
  const email = localStorage.getItem('unverified_email') || '';
  const el = document.getElementById('verify-email-display');
  if (el) el.textContent = email || '(unknown email)';
}

function handleSimulateVerify() {
  const email   = localStorage.getItem('unverified_email');
  const account = window.db.accounts.find(a => a.email === email);
  if (!account) {
    showToast('No pending verification found.', 'danger');
    return navigateTo('#/register');
  }
  account.verified = true;
  saveToStorage();
  localStorage.removeItem('unverified_email');
  showToast('Email verified! You can now log in.', 'success');
  navigateTo('#/login');
}

/* ─────────────────────────────────────────────
   LOGIN
───────────────────────────────────────────── */
function handleLogin(e) {
  e.preventDefault();
  const err = document.getElementById('login-error');
  hideError(err);

  const email    = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;
  const account  = window.db.accounts.find(
    a => a.email === email && a.password === password && a.verified === true
  );

  if (!account) return showError(err, 'Invalid email or password, or email not verified.');

  localStorage.setItem('auth_token', email);
  setAuthState(true, account);
  showToast(`Welcome back, ${account.firstName}!`, 'success');
  navigateTo('#/profile');
}

/* ─────────────────────────────────────────────
   LOGOUT
───────────────────────────────────────────── */
function handleLogout(e) {
  e.preventDefault();
  localStorage.removeItem('auth_token');
  setAuthState(false);
  navigateTo('#/');
}

/* ─────────────────────────────────────────────
   RESTORE SESSION
───────────────────────────────────────────── */
function restoreSession() {
  const token = localStorage.getItem('auth_token');
  if (!token) return;
  const account = window.db.accounts.find(a => a.email === token);
  if (account && account.verified) setAuthState(true, account);
  else localStorage.removeItem('auth_token');
}

/* ─────────────────────────────────────────────
   PROFILE
───────────────────────────────────────────── */
function renderProfile() {
  if (!currentUser) return;
  const u = currentUser;
  const firstName = u.firstName || '';
  const lastName  = u.lastName  || '';
  const fullName  = (firstName + ' ' + lastName).trim() || u.email;
  document.getElementById('profile-name').textContent     = fullName;
  document.getElementById('profile-email').textContent    = u.email;
  document.getElementById('profile-role').textContent     = capitalize(u.role);
  

  // Always hide edit panel and show view card when rendering
  const editPanel = document.getElementById('profile-edit-panel');
  const viewCard  = document.getElementById('profile-view');
  if (editPanel) editPanel.classList.add('d-none');
  if (viewCard)  viewCard.classList.remove('d-none');
}

function showEditProfileForm() {
  if (!currentUser) return;
  document.getElementById('edit-fname').value    = currentUser.firstName || '';
  document.getElementById('edit-lname').value    = currentUser.lastName  || '';
  document.getElementById('edit-email').value    = currentUser.email;
  document.getElementById('edit-password').value = '';
  hideError(document.getElementById('edit-profile-error'));
  hideError(document.getElementById('edit-profile-success'));
  document.getElementById('profile-edit-panel').classList.remove('d-none');
  document.getElementById('profile-edit-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideEditProfileForm() {
  document.getElementById('profile-edit-panel').classList.add('d-none');
}

function handleEditProfileForm(e) {
  e.preventDefault();
  const errEl = document.getElementById('edit-profile-error');
  const sucEl = document.getElementById('edit-profile-success');
  hideError(errEl);
  hideError(sucEl);

  const firstName = document.getElementById('edit-fname').value.trim();
  const lastName  = document.getElementById('edit-lname').value.trim();
  const email     = document.getElementById('edit-email').value.trim().toLowerCase();
  const password  = document.getElementById('edit-password').value;

  if (!firstName || !lastName) return showError(errEl, 'First and last name are required.');
  if (!email) return showError(errEl, 'Email is required.');
  if (password && password.length < 6) return showError(errEl, 'Password must be at least 6 characters.');

  const conflict = window.db.accounts.find(a => a.email === email && a.email !== currentUser.email);
  if (conflict) return showError(errEl, 'That email is already in use by another account.');

  const acc = window.db.accounts.find(a => a.email === currentUser.email);
  if (!acc) return showError(errEl, 'Account not found.');

  const oldEmail = acc.email;
  acc.firstName = firstName;
  acc.lastName  = lastName;
  acc.email     = email;
  if (password) acc.password = password;
  if (oldEmail !== email) localStorage.setItem('auth_token', email);

  currentUser = acc;
  saveToStorage();

  document.getElementById('nav-username').textContent = acc.role === 'admin' ? 'Admin' : acc.firstName;

  sucEl.textContent = 'Profile updated successfully!';
  sucEl.classList.remove('d-none');

  setTimeout(() => {
    hideEditProfileForm();
    renderProfile();
  }, 1500);

  showToast('Profile updated!', 'success');
}

/* ─────────────────────────────────────────────
   ACCOUNTS — ROLE RADIO HELPERS
───────────────────────────────────────────── */
function getSelectedRole() {
  const radios = document.querySelectorAll('input[name="acc-role-radio"]');
  for (const r of radios) { if (r.checked) return r.value; }
  return 'user';
}

function setSelectedRole(role) {
  const radios = document.querySelectorAll('input[name="acc-role-radio"]');
  radios.forEach(r => { r.checked = r.value === role; });
  const sel = document.getElementById('acc-role');
  if (sel) sel.value = role;
}

/* ─────────────────────────────────────────────
   ACCOUNTS
───────────────────────────────────────────── */
function renderAccountsList() {
  const tbody = document.getElementById('accounts-tbody');
  const empty = document.getElementById('accounts-empty');
  tbody.innerHTML = '';

  if (!window.db.accounts.length) { empty.classList.remove('d-none'); return; }
  empty.classList.add('d-none');

  window.db.accounts.forEach(acc => {
    const isSelf = currentUser && currentUser.email === acc.email;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${esc(acc.firstName)} ${esc(acc.lastName)}</td>
      <td>${esc(acc.email)}</td>
      <td>${capitalize(acc.role)}</td>
      <td>${acc.verified ? '✅' : '❌'}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editAccount('${esc(acc.email)}')">Edit</button>
        <button class="btn btn-sm btn-outline-secondary me-1" onclick="resetPassword('${esc(acc.email)}')">Reset Password</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteAccount('${esc(acc.email)}')" ${isSelf ? 'disabled' : ''}>Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function editAccount(email) {
  const acc = window.db.accounts.find(a => a.email === email);
  if (!acc) return;
  showAccountForm();
  document.getElementById('account-form-title').textContent = 'Edit Account';
  document.getElementById('acc-edit-email').value = acc.email;
  document.getElementById('acc-fname').value      = acc.firstName;
  document.getElementById('acc-lname').value      = acc.lastName;
  document.getElementById('acc-email').value      = acc.email;
  document.getElementById('acc-password').value   = '';
  setSelectedRole(acc.role);
  document.getElementById('acc-verified').checked = acc.verified;
}

function resetPassword(email) {
  const newPw = window.prompt('Enter new password (min 6 characters):');
  if (newPw === null) return;
  if (newPw.length < 6) return showToast('Password must be at least 6 characters.', 'danger');
  const acc = window.db.accounts.find(a => a.email === email);
  if (!acc) return;
  acc.password = newPw;
  saveToStorage();
  showToast('Password reset successfully.', 'success');
}

function deleteAccount(email) {
  if (currentUser && currentUser.email === email) {
    return showToast('You cannot delete your own account.', 'danger');
  }
  if (!confirm(`Delete account for ${email}?`)) return;
  window.db.accounts  = window.db.accounts.filter(a => a.email !== email);
  window.db.employees = window.db.employees.filter(e => e.email !== email);
  saveToStorage();
  renderAccountsList();
  showToast('Account deleted.', 'success');
}

function handleAccountForm(e) {
  e.preventDefault();
  const err       = document.getElementById('account-form-error');
  const editEmail = document.getElementById('acc-edit-email').value;
  const firstName = document.getElementById('acc-fname').value.trim();
  const lastName  = document.getElementById('acc-lname').value.trim();
  const email     = document.getElementById('acc-email').value.trim().toLowerCase();
  const password  = document.getElementById('acc-password').value;
  const role      = getSelectedRole();
  const verified  = document.getElementById('acc-verified').checked;
  hideError(err);

  if (!firstName || !lastName || !email) return showError(err, 'First name, last name, and email are required.');

  if (editEmail) {
    const acc = window.db.accounts.find(a => a.email === editEmail);
    if (!acc) return showError(err, 'Account not found.');
    if (email !== editEmail && window.db.accounts.find(a => a.email === email)) {
      return showError(err, 'Another account with that email already exists.');
    }
    acc.firstName = firstName; acc.lastName = lastName; acc.email = email;
    if (password) {
      if (password.length < 6) return showError(err, 'Password must be at least 6 characters.');
      acc.password = password;
    }
    acc.role = role; acc.verified = verified;
    if (currentUser && currentUser.email === editEmail) {
      currentUser = acc;
      document.getElementById('nav-username').textContent = acc.role === 'admin' ? 'Admin' : acc.firstName;
    }
    showToast('Account updated.', 'success');
  } else {
    if (!password || password.length < 6) return showError(err, 'Password must be at least 6 characters.');
    if (window.db.accounts.find(a => a.email === email)) return showError(err, 'Email already in use.');
    window.db.accounts.push({
      firstName, lastName, email, password, role, verified,
      joinedDate: new Date().toISOString().split('T')[0],
    });
    showToast('Account created.', 'success');
  }

  saveToStorage();
  hideAccountForm();
  renderAccountsList();
}

function showAccountForm() {
  const panel = document.getElementById('account-form-panel');
  panel.classList.remove('d-none');
  document.getElementById('account-form').reset();
  document.getElementById('acc-edit-email').value = '';
  document.getElementById('account-form-title').textContent = 'Add/Edit Account';
  setSelectedRole('user');
  hideError(document.getElementById('account-form-error'));
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideAccountForm() {
  document.getElementById('account-form-panel').classList.add('d-none');
}

/* ─────────────────────────────────────────────
   DEPARTMENTS
───────────────────────────────────────────── */
function renderDepartmentsTable() {
  const tbody = document.getElementById('departments-tbody');
  const empty = document.getElementById('departments-empty');
  tbody.innerHTML = '';

  if (!window.db.departments.length) { empty.classList.remove('d-none'); return; }
  empty.classList.add('d-none');

  window.db.departments.forEach(dept => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${esc(dept.name)}</td>
      <td>${esc(dept.description || '—')}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editDept('${esc(dept.id)}')">Edit</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteDept('${esc(dept.id)}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function editDept(id) {
  const dept = window.db.departments.find(d => d.id === id);
  if (!dept) return;
  showDeptForm();
  document.getElementById('dept-form-title').textContent = 'Edit Department';
  document.getElementById('dept-edit-id').value = dept.id;
  document.getElementById('dept-name').value    = dept.name;
  document.getElementById('dept-desc').value    = dept.description || '';
}

function deleteDept(id) {
  if (!confirm('Delete this department?')) return;
  window.db.departments = window.db.departments.filter(d => d.id !== id);
  saveToStorage();
  renderDepartmentsTable();
  showToast('Department deleted.', 'success');
}

function handleDeptForm(e) {
  e.preventDefault();
  const err    = document.getElementById('dept-form-error');
  const editId = document.getElementById('dept-edit-id').value;
  const name   = document.getElementById('dept-name').value.trim();
  const desc   = document.getElementById('dept-desc').value.trim();
  hideError(err);

  if (!name) return showError(err, 'Department name is required.');

  if (editId) {
    const dept = window.db.departments.find(d => d.id === editId);
    if (!dept) return showError(err, 'Department not found.');
    dept.name = name; dept.description = desc;
    showToast('Department updated.', 'success');
  } else {
    window.db.departments.push({
      id: 'dept-' + Date.now(),
      name, description: desc,
    });
    showToast('Department added.', 'success');
  }

  saveToStorage();
  hideDeptForm();
  renderDepartmentsTable();
}

function showDeptForm() {
  const panel = document.getElementById('dept-form-panel');
  panel.classList.remove('d-none');
  document.getElementById('dept-form').reset();
  document.getElementById('dept-edit-id').value = '';
  document.getElementById('dept-form-title').textContent = 'Add Department';
  hideError(document.getElementById('dept-form-error'));
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideDeptForm() {
  document.getElementById('dept-form-panel').classList.add('d-none');
}

/* ─────────────────────────────────────────────
   EMPLOYEES
───────────────────────────────────────────── */
function renderEmployeesTable() {
  const tbody = document.getElementById('employees-tbody');
  const empty = document.getElementById('employees-empty');
  tbody.innerHTML = '';
  populateDeptDropdown('emp-dept');

  if (!window.db.employees.length) {
    empty.classList.remove('d-none');
    return;
  }
  empty.classList.add('d-none');

  window.db.employees.forEach((emp, idx) => {
    const dept = window.db.departments.find(d => d.id === emp.deptId);
    const acc  = window.db.accounts.find(a => a.email === emp.email);
    const name = acc ? `${esc(acc.firstName)} ${esc(acc.lastName)}` : '—';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${esc(emp.employeeId)}</td>
      <td>${name}</td>
      <td>${esc(emp.position)}</td>
      <td>${dept ? esc(dept.name) : '—'}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editEmployee(${idx})">Edit</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteEmployee(${idx})">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function editEmployee(idx) {
  const emp = window.db.employees[idx];
  if (!emp) return;
  showEmployeeForm();
  document.getElementById('employee-form-title').textContent = 'Edit Employee';
  document.getElementById('emp-edit-id').value   = String(idx);
  document.getElementById('emp-id').value        = emp.employeeId;
  document.getElementById('emp-email').value     = emp.email;
  document.getElementById('emp-position').value  = emp.position;
  document.getElementById('emp-dept').value      = emp.deptId;
  document.getElementById('emp-hire-date').value = emp.hireDate || '';
}

function deleteEmployee(idx) {
  if (!confirm('Delete this employee record?')) return;
  window.db.employees.splice(idx, 1);
  saveToStorage();
  renderEmployeesTable();
  showToast('Employee deleted.', 'success');
}

function handleEmployeeForm(e) {
  e.preventDefault();
  const err        = document.getElementById('employee-form-error');
  const editIdxStr = document.getElementById('emp-edit-id').value;
  const employeeId = document.getElementById('emp-id').value.trim();
  const email      = document.getElementById('emp-email').value.trim().toLowerCase();
  const position   = document.getElementById('emp-position').value.trim();
  const deptId     = document.getElementById('emp-dept').value;
  const hireDate   = document.getElementById('emp-hire-date').value;
  hideError(err);

  if (!employeeId || !email || !position || !deptId) {
    return showError(err, 'Employee ID, email, position, and department are required.');
  }
  if (!window.db.accounts.find(a => a.email === email)) {
    return showError(err, 'No account found with that email address.');
  }

  const empData = { employeeId, email, position, deptId, hireDate: hireDate || '' };

  if (editIdxStr !== '') {
    window.db.employees[parseInt(editIdxStr)] = empData;
    showToast('Employee updated.', 'success');
  } else {
    window.db.employees.push(empData);
    showToast('Employee added.', 'success');
  }

  saveToStorage();
  hideEmployeeForm();
  renderEmployeesTable();
}

function showEmployeeForm() {
  const panel = document.getElementById('employee-form-panel');
  panel.classList.remove('d-none');
  document.getElementById('employee-form').reset();
  document.getElementById('emp-edit-id').value = '';
  document.getElementById('employee-form-title').textContent = 'Add Employee';
  hideError(document.getElementById('employee-form-error'));
  populateDeptDropdown('emp-dept');
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideEmployeeForm() {
  document.getElementById('employee-form-panel').classList.add('d-none');
}

function populateDeptDropdown(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">— Select —</option>';
  window.db.departments.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = d.name;
    if (d.id === current) opt.selected = true;
    sel.appendChild(opt);
  });
}

/* ─────────────────────────────────────────────
   REQUESTS
───────────────────────────────────────────── */
function renderRequestsTable() {
  const tbody = document.getElementById('requests-tbody');
  const empty = document.getElementById('requests-empty');
  const table = document.querySelector('#requests-page .table-responsive');
  tbody.innerHTML = '';
  if (!currentUser) return;

  const mine = window.db.requests.filter(r => r.employeeEmail === currentUser.email);
  if (!mine.length) {
    empty.classList.remove('d-none');
    table.classList.add('d-none');
    return;
  }

  empty.classList.add('d-none');
  table.classList.remove('d-none');

  mine.forEach(req => {
    const badgeClass = {
      'Pending':  'bg-warning text-dark',
      'Approved': 'bg-success',
      'Rejected': 'bg-danger',
    }[req.status] || 'bg-secondary';

    const itemsSummary = req.items.map(it => `${esc(it.name)} ×${it.qty}`).join(', ');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${esc(req.type)}</td>
      <td style="max-width:260px;white-space:normal;font-size:.85rem">${itemsSummary}</td>
      <td>${esc(req.date)}</td>
      <td><span class="badge ${badgeClass}">${esc(req.status)}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

let requestItemCount = 0;

function addRequestItem() {
  requestItemCount++;
  const container = document.getElementById('req-items-container');
  const div = document.createElement('div');
  div.className = 'req-item-row';
  div.dataset.itemId = requestItemCount;
  div.innerHTML = `
    <input type="text" class="form-control form-control-sm item-name" placeholder="Item name" />
    <input type="number" class="form-control form-control-sm req-qty item-qty" placeholder="Qty" min="1" value="1" />
    <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeRequestItem(${requestItemCount})">×</button>
  `;
  container.appendChild(div);
}

function removeRequestItem(id) {
  const el = document.querySelector(`[data-item-id="${id}"]`);
  if (el) el.remove();
}

function openRequestModal() {
  document.getElementById('req-items-container').innerHTML = '';
  requestItemCount = 0;
  hideError(document.getElementById('request-form-error'));
  document.getElementById('req-type').value = '';
  addRequestItem();
  new bootstrap.Modal(document.getElementById('requestModal')).show();
}

function handleSubmitRequest() {
  const err  = document.getElementById('request-form-error');
  const type = document.getElementById('req-type').value;
  hideError(err);

  if (!type) return showError(err, 'Please select a request type.');

  const rows = document.querySelectorAll('#req-items-container .req-item-row');
  if (!rows.length) return showError(err, 'Please add at least one item.');

  const items = [];
  let valid = true;
  rows.forEach(row => {
    const name = row.querySelector('.item-name').value.trim();
    const qty  = parseInt(row.querySelector('.item-qty').value) || 1;
    if (!name) valid = false;
    else items.push({ name, qty });
  });

  if (!valid || !items.length) return showError(err, 'Please fill in all item names.');

  window.db.requests.push({
    type, items,
    status:        'Pending',
    date:          new Date().toLocaleDateString(),
    employeeEmail: currentUser.email,
  });
  saveToStorage();

  const modal = bootstrap.Modal.getInstance(document.getElementById('requestModal'));
  if (modal) modal.hide();

  showToast('Request submitted!', 'success');
  renderRequestsTable();
}

/* ─────────────────────────────────────────────
   TOASTS
───────────────────────────────────────────── */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const id = `toast-${Date.now()}`;
  const bgMap = {
    success: 'text-bg-success',
    danger:  'text-bg-danger',
    warning: 'text-bg-warning',
    info:    'text-bg-info'
  };
  const el = document.createElement('div');
  el.id = id;
  el.className = `toast align-items-center ${bgMap[type] || bgMap.info} border-0 show`;
  el.setAttribute('role', 'alert');
  el.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${esc(message)}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="document.getElementById('${id}').remove()"></button>
    </div>
  `;
  container.appendChild(el);
  setTimeout(() => { if (el.parentNode) el.remove(); }, 4000);
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function showError(el, msg) { if (!el) return; el.textContent = msg; el.classList.remove('d-none'); }
function hideError(el)      { if (!el) return; el.textContent = ''; el.classList.add('d-none'); }
function capitalize(str)    { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ─────────────────────────────────────────────
   INIT
───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  loadFromStorage();
  restoreSession();

  window.addEventListener('hashchange', handleRouting);
  if (!window.location.hash || window.location.hash === '#') window.location.hash = '#/';
  handleRouting();

  // Auth
  document.getElementById('register-form')?.addEventListener('submit', handleRegister);
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
  document.getElementById('simulate-verify-btn')?.addEventListener('click', handleSimulateVerify);

  // Profile edit — wire up the 3 profile controls
  document.getElementById('show-edit-profile-btn')?.addEventListener('click', showEditProfileForm);
  document.getElementById('cancel-edit-profile-btn')?.addEventListener('click', hideEditProfileForm);
  document.getElementById('edit-profile-form')?.addEventListener('submit', handleEditProfileForm);

  // Accounts
  document.getElementById('account-form')?.addEventListener('submit', handleAccountForm);
  document.getElementById('add-account-btn')?.addEventListener('click', showAccountForm);
  document.getElementById('cancel-account-btn')?.addEventListener('click', hideAccountForm);

  // Departments
  document.getElementById('dept-form')?.addEventListener('submit', handleDeptForm);
  document.getElementById('add-dept-btn')?.addEventListener('click', showDeptForm);
  document.getElementById('cancel-dept-btn')?.addEventListener('click', hideDeptForm);

  // Employees
  document.getElementById('employee-form')?.addEventListener('submit', handleEmployeeForm);
  document.getElementById('add-employee-btn')?.addEventListener('click', showEmployeeForm);
  document.getElementById('cancel-employee-btn')?.addEventListener('click', hideEmployeeForm);

  // Requests
  document.getElementById('new-request-btn')?.addEventListener('click', openRequestModal);
  document.getElementById('create-one-btn')?.addEventListener('click', openRequestModal);
  document.getElementById('add-item-btn')?.addEventListener('click', addRequestItem);
  document.getElementById('submit-request-btn')?.addEventListener('click', handleSubmitRequest);

  // Remove validation highlight on input
  document.addEventListener('input', e => e.target.classList.remove('is-invalid'));
});
