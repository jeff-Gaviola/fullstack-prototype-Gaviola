const app = {
    // Phase 4: Data Storage Configuration
    db: { accounts: [], departments: [], employees: [], requests: [] },
    currentUser: null,
    STORAGE_KEY: 'ipt_demo_v1',

    init() {
        this.loadFromStorage();
        window.addEventListener('hashchange', () => this.handleRouting());
        this.handleRouting();
        this.checkSession();
    },

    // --- Phase 4: Data Persistence ---
    loadFromStorage() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        if (data) {
            this.db = JSON.parse(data);
        } else {
            // Seed default data
            this.db.accounts.push({ 
                first: 'Admin', last: 'System', 
                email: 'admin@example.com', pass: 'Password123!', 
                role: 'Admin', verified: true 
            });
            this.db.departments = [
                { name: 'Engineering', desc: 'Software and Infrastructure' }, 
                { name: 'HR', desc: 'Human Resources' }
            ];
            this.saveToStorage();
        }
    },

    saveToStorage() { 
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.db)); 
    },

    // --- Phase 2: Client-Side Routing & Protection ---
    handleRouting() {
        const hash = window.location.hash || '#/login';
        const protectedRoutes = ['#/profile', '#/requests', '#/accounts', '#/departments', '#/employees'];
        const adminRoutes = ['#/accounts', '#/departments', '#/employees'];

        // Redirect unauthenticated users
        if (protectedRoutes.includes(hash) && !this.currentUser) {
            return window.location.hash = '#/login';
        }

        // Block non-admins from admin routes
        if (adminRoutes.includes(hash) && this.currentUser?.role !== 'Admin') {
            return window.location.hash = '#/profile';
        }

        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        
        const routes = {
            '#/login': 'login-page',
            '#/register': 'register-page',
            '#/verify-email': 'verify-email',
            '#/profile': 'profile',
            '#/requests': 'requests',
            '#/accounts': 'accounts',
            '#/departments': 'departments'
        };

        const pageId = routes[hash] || 'login-page';
        const target = document.getElementById(pageId);
        if (target) target.classList.add('active');

        // Render data based on current page
        if (hash === '#/profile') this.renderProfile();
        if (hash === '#/accounts') this.renderAccounts();
        if (hash === '#/departments') this.renderDepartments();
        if (hash === '#/requests') this.renderRequests();
        if (hash === '#/verify-email') {
            document.getElementById('verify-msg').innerText = `Verification sent to: ${localStorage.unverified_email}`;
        }
    },

    // --- Phase 3: Authentication Logic ---
    handleRegister(e) {
        e.preventDefault();
        const email = document.getElementById('r-email').value;
        if (this.db.accounts.find(a => a.email === email)) return alert("Email already exists!");

        const newUser = {
            first: document.getElementById('r-first').value,
            last: document.getElementById('r-last').value,
            email: email,
            pass: document.getElementById('r-pass').value,
            role: 'User',
            verified: false
        };

        this.db.accounts.push(newUser);
        localStorage.unverified_email = email;
        this.saveToStorage();
        window.location.hash = '#/verify-email';
    },

    simulateVerify() {
        const email = localStorage.unverified_email;
        const acc = this.db.accounts.find(a => a.email === email);
        if (acc) {
            acc.verified = true;
            this.saveToStorage();
            alert("Email Verified Successfully! You can now login.");
            window.location.hash = '#/login';
        }
    },

    handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('l-email').value;
        const pass = document.getElementById('l-pass').value;
        const user = this.db.accounts.find(a => a.email === email && a.pass === pass && a.verified);

        if (user) {
            localStorage.setItem('auth_token', email);
            this.setAuthState(true, user);
            window.location.hash = '#/profile';
        } else {
            alert("Invalid credentials or account not verified.");
        }
    },

    setAuthState(isAuth, user = null) {
        this.currentUser = user;
        const body = document.body;
        if (isAuth) {
            body.classList.replace('not-authenticated', 'authenticated');
            if (user.role === 'Admin') body.classList.add('is-admin');
            document.getElementById('nav-user-name').innerText = user.first;
        } else {
            body.classList.replace('authenticated', 'not-authenticated');
            body.classList.remove('is-admin');
            localStorage.removeItem('auth_token');
        }
    },

    checkSession() {
        const token = localStorage.getItem('auth_token');
        if (token) {
            const user = this.db.accounts.find(a => a.email === token);
            if (user) this.setAuthState(true, user);
        }
    },

    logout() {
        this.setAuthState(false);
        window.location.hash = '#/login';
    },

    // --- Phase 5 & 6: Feature Rendering ---
    renderProfile() {
        const u = this.currentUser;
        if (!u) return;
        document.getElementById('profile-card').innerHTML = `
            <div class="mb-2"><strong>Name:</strong> ${u.first} ${u.last}</div>
            <div class="mb-2"><strong>Email:</strong> ${u.email}</div>
            <div class="mb-4"><strong>Role:</strong> <span class="badge bg-primary">${u.role}</span></div>
            <button class="btn btn-outline-secondary btn-sm" onclick="alert('Profile Editing Not Implemented')">Edit Profile</button>
        `;
    },

    renderAccounts() {
        document.getElementById('acc-table-body').innerHTML = this.db.accounts.map((a, i) => `
            <tr>
                <td>${a.first} ${a.last}</td>
                <td>${a.email}</td>
                <td>${a.role}</td>
                <td>${a.verified ? '<span class="text-success">Verified</span>' : '<span class="text-warning">Pending</span>'}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="app.deleteAcc(${i})">Delete</button>
                </td>
            </tr>`).join('');
    },

    renderDepartments() {
        document.getElementById('dept-table-body').innerHTML = this.db.departments.map(d => `
            <tr><td>${d.name}</td><td>${d.desc}</td></tr>`).join('');
    },

    // --- Phase 7: User Requests ---
    addReqRow() {
        const div = document.createElement('div');
        div.className = 'd-flex gap-2 mb-2';
        div.innerHTML = `
            <input type="text" class="form-control item-name" placeholder="Item Name" required>
            <input type="number" class="form-control item-qty" value="1" style="width:80px" required>
            <button type="button" class="btn btn-outline-danger" onclick="this.parentElement.remove()">×</button>
        `;
        document.getElementById('req-items-container').appendChild(div);
    },

    handleRequestSubmit(e) {
        e.preventDefault();
        const names = document.querySelectorAll('.item-name');
        const qtys = document.querySelectorAll('.item-qty');
        const itemsList = Array.from(names).map((n, i) => `${qtys[i].value}x ${n.value}`);

        this.db.requests.push({
            type: document.getElementById('req-type').value,
            items: itemsList.join(', '),
            status: 'Pending',
            date: new Date().toLocaleDateString(),
            employeeEmail: this.currentUser.email
        });

        this.saveToStorage();
        const modal = bootstrap.Modal.getInstance(document.getElementById('requestModal'));
        modal.hide();
        this.renderRequests();
    },

    renderRequests() {
        const myReqs = this.db.requests.filter(r => r.employeeEmail === this.currentUser.email);
        const tbody = document.getElementById('req-table-body');
        if (myReqs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No requests found.</td></tr>';
            return;
        }
        tbody.innerHTML = myReqs.map(r => `
            <tr>
                <td>${r.type}</td><td>${r.items}</td>
                <td><span class="badge bg-warning text-dark">${r.status}</span></td>
                <td>${r.date}</td>
            </tr>`).join('');
    },

    deleteAcc(i) {
        if (this.db.accounts[i].email === this.currentUser.email) return alert("You cannot delete your own account!");
        if (confirm("Permanently delete this user?")) { 
            this.db.accounts.splice(i, 1); 
            this.saveToStorage(); 
            this.renderAccounts(); 
        }
    }
};

// Global Execution
app.init();