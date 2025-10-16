document.addEventListener('DOMContentLoaded', () => {
    const defaultPatients = [
        { id: 1001, name: 'Naruto D. Monki', dob: '1985-04-12', contact: '09171234567', address: 'Ermita, Manila', history: 'Hypertension, Allergic to penicillin', documents: [] },
        { id: 1002, name: 'Ronian', dob: '1992-08-25', contact: '09287654321', address: 'Sampaloc, Manila', history: 'Asthma', documents: [] },
        { id: 1003, name: 'Pares overload', dob: '1970-01-30', contact: '09998887777', address: 'Paco, Manila', history: 'None', documents: [] }
    ];

    const defaultResults = [
        { resultId: 1, patientId: 1001, date: '2025-10-10', testName: 'CBC', result: 'Normal', status: 'Completed', files: [] },
        { resultId: 2, patientId: 1001, date: '2025-10-12', testName: 'X-Ray', result: 'Pending', status: 'Pending', files: [] },
        { resultId: 3, patientId: 1002, date: '2025-10-11', testName: 'Urinalysis', result: 'Normal', status: 'Completed', files: [] }
    ];

    const defaultBilling = [
        { invoiceId: 5001, patientId: 1001, date: '2025-10-10', amount: 500.00, status: 'Paid', payments: [] },
        { invoiceId: 5002, patientId: 1002, date: '2025-10-11', amount: 350.00, status: 'Paid', payments: [] },
        { invoiceId: 5003, patientId: 1001, date: '2025-10-12', amount: 1200.00, status: 'Unpaid', payments: [] }
    ];

    let users = localStorage.getItem('ghmdc_users_v1') ? JSON.parse(localStorage.getItem('ghmdc_users_v1')) : {
        doctor: { password: 'password123', role: 'Medical Staff' },
        admin: { password: 'admin123', role: 'Management' }
    };

    const LS_KEYS = {
        patients: 'ghmdc_patients_v1',
        results: 'ghmdc_results_v1',
        billing: 'ghmdc_billing_v1',
        rememberedUser: 'ghmdc_remembered_user_v1',
        users: 'ghmdc_users_v1',
        theme: 'ghmdc_theme_v1'
    };

    const loadData = (key, fallback) => {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(fallback));
        } catch {
            return JSON.parse(JSON.stringify(fallback));
        }
    };

    const saveData = (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save to localStorage', e);
        }
    };

    let patients = loadData(LS_KEYS.patients, defaultPatients);
    let diagnosticResults = loadData(LS_KEYS.results, defaultResults);
    let billing = loadData(LS_KEYS.billing, defaultBilling);

    let currentUser = null;
    let currentView = 'login-container';
    let patientModal = new bootstrap.Modal(document.getElementById('patient-modal'));
    let labResultModal = new bootstrap.Modal(document.getElementById('lab-result-modal'));
    let changePasswordModal = new bootstrap.Modal(document.getElementById('change-password-modal'));
    let currentEditResultId = null;

    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');
    const changePwdBtn = document.getElementById('change-pwd-btn');
    const changePwdBtnMobile = document.getElementById('change-pwd-btn-mobile');
    const navLinks = document.querySelectorAll('.nav-link');
    const allViews = document.querySelectorAll('.view');
    const patientsTableBody = document.getElementById('patients-table-body');
    const billingTableBody = document.getElementById('billing-table-body');
    const patientSearch = document.getElementById('patient-search');
    const themeToggle = document.getElementById('theme-toggle');
    const themeToggleLogin = document.getElementById('theme-toggle-login');

    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

    // Theme toggle functionality
    const setTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        const isDark = theme === 'dark';
        const toggleIcons = document.querySelectorAll('.theme-toggle-btn i');
        toggleIcons.forEach(icon => {
            icon.classList.toggle('bi-moon-stars-fill', !isDark);
            icon.classList.toggle('bi-sun-fill', isDark);
        });
        saveData(LS_KEYS.theme, theme);
    };

    const toggleTheme = () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        setTheme(currentTheme === 'light' ? 'dark' : 'light');
    };

    // Initialize theme from localStorage
    const savedTheme = loadData(LS_KEYS.theme, 'light');
    setTheme(savedTheme);

    // Theme toggle event listeners
    [themeToggle, themeToggleLogin].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', toggleTheme);
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                toggleTheme();
            });
        }
    });

    // Password toggle
    (function wirePasswordToggle() {
        const btn = document.getElementById('pwd-toggle');
        const pw = document.getElementById('password');
        if (!btn || !pw) return;

        btn.addEventListener('mousedown', e => e.preventDefault());
        btn.addEventListener('touchstart', e => e.preventDefault());

        btn.addEventListener('click', () => {
            const showing = pw.type === 'text';
            pw.type = showing ? 'password' : 'text';
            btn.setAttribute('aria-pressed', String(!showing));

            const icon = btn.querySelector('i');
            if (icon) {
                icon.classList.toggle('bi-eye', showing);
                icon.classList.toggle('bi-eye-slash', !showing);
            }

            pw.focus({ preventScroll: true });
        });
    })();

    const generatePatientId = () => {
        const max = patients.length ? Math.max(...patients.map(p => Number(p.id) || 0)) : 1000;
        return max + 1;
    };

    const generateInvoiceId = () => {
        const max = billing.length ? Math.max(...billing.map(b => Number(b.invoiceId) || 0)) : 5000;
        return max + 1;
    };

    const generateResultId = () => {
        const max = diagnosticResults.length ? Math.max(...diagnosticResults.map(r => Number(r.resultId) || 0)) : 0;
        return max + 1;
    };

    const showView = (viewId) => {
        allViews.forEach(view => view.classList.remove('active'));
        const target = document.getElementById(viewId);
        if (target) target.classList.add('active');

        navLinks.forEach(link => {
            if (link.dataset.view === viewId) link.classList.add('active');
            else link.classList.remove('active');
        });
        currentView = viewId;

        if (viewId === 'reports-view') {
            updateDashboardCharts();
        }
    };

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = (document.getElementById('username').value || '').trim();
        const password = document.getElementById('password').value || '';
        const rememberEl = document.getElementById('remember-me');
        const remember = rememberEl ? rememberEl.checked : false;
        const signinBtn = document.getElementById('signin-btn');

        signinBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Loading...';
        signinBtn.disabled = true;

        setTimeout(() => {
            if (users[username] && users[username].password === password) {
                currentUser = { username, role: users[username].role };
                if (remember) saveData(LS_KEYS.rememberedUser, { username });
                else localStorage.removeItem(LS_KEYS.rememberedUser);

                loginContainer.classList.add('d-none');
                appContainer.classList.remove('d-none');
                loginError.classList.add('d-none');
                loginForm.reset();
                initializeUserInterface();
                showView('dashboard-view');
            } else {
                loginError.classList.remove('d-none');
            }
            signinBtn.innerHTML = 'Sign in';
            signinBtn.disabled = false;
        }, 800);
    });

    // Load remembered username
    const rememberedUser = loadData(LS_KEYS.rememberedUser, {});
    if (rememberedUser.username) {
        document.getElementById('username').value = rememberedUser.username;
        document.getElementById('remember-me').checked = true;
    }

    logoutBtn.addEventListener('click', () => {
        if (!confirm('Logout now?')) return;
        currentUser = null;
        appContainer.classList.add('d-none');
        loginContainer.classList.remove('d-none');
    });

    [changePwdBtn, changePwdBtnMobile].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('pwd-user').value = currentUser ? currentUser.username : '';
                document.getElementById('pwd-old').value = '';
                document.getElementById('pwd-new').value = '';
                changePasswordModal.show();
            });
        }
    });

    const initializeUserInterface = () => {
        document.getElementById('user-role').textContent = currentUser.role;
        const isManagement = currentUser.role === 'Management';
        document.getElementById('billing-nav').style.display = isManagement ? 'block' : 'none';
        document.getElementById('reports-nav').style.display = isManagement ? 'block' : 'none';

        renderDashboard();
        renderPatientsTable();
        if (isManagement) {
            renderBillingTable();
            renderReports();
        }
        initDashboardCharts();
    };

    // --- RENDERERS ---
    const renderDashboard = () => {
        document.getElementById('total-patients-stat').textContent = patients.length;
        const pendingResults = diagnosticResults.filter(r => r.status === 'Pending').length;
        document.getElementById('pending-results-stat').textContent = pendingResults;
        const totalRevenue = billing.filter(b => b.status === 'Paid').reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
        document.getElementById('total-revenue-stat').textContent = currencyFormatter.format(totalRevenue);
    };

    const renderPatientsTable = (filteredPatients = patients) => {
        patientsTableBody.innerHTML = '';
        if (!filteredPatients.length) {
            patientsTableBody.innerHTML = '<tr><td colspan="5" class="text-center">No patients found.</td></tr>';
            return;
        }

        filteredPatients.forEach(patient => {
            const row = document.createElement('tr');
            row.setAttribute('tabindex', '0');
            row.dataset.id = patient.id;
            row.innerHTML = `
                <td>${patient.id}</td>
                <td>${patient.name}</td>
                <td>${patient.dob}</td>
                <td>${patient.contact}</td>
                <td>
                    <div class="d-flex gap-1 flex-wrap">
                        <button class="btn btn-sm btn-info view-details-btn" data-id="${patient.id}" title="View">View</button>
                        <button class="btn btn-sm btn-secondary edit-patient-btn" data-id="${patient.id}" title="Edit">Edit</button>
                        <button class="btn btn-sm btn-danger delete-patient-btn" data-id="${patient.id}" title="Delete">Delete</button>
                    </div>
                </td>
            `;
            patientsTableBody.appendChild(row);
        });
    };

    const renderBillingTable = () => {
        billingTableBody.innerHTML = '';
        if (!billing.length) {
            billingTableBody.innerHTML = '<tr><td colspan="5" class="text-center">No billing records.</td></tr>';
            return;
        }
        billing.forEach(bill => {
            const patient = patients.find(p => p.id === bill.patientId);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${bill.invoiceId}</td>
                <td>${patient ? patient.name : 'Unknown'}</td>
                <td>${bill.date}</td>
                <td>${currencyFormatter.format(Number(bill.amount) || 0)}</td>
                <td><span class="badge ${bill.status === 'Paid' ? 'bg-success' : bill.status === 'Partial' ? 'bg-warning' : 'bg-danger'}">${bill.status}</span></td>
            `;
            billingTableBody.appendChild(row);
        });
    };

    const renderReports = () => {
        document.getElementById('report-total-patients').textContent = patients.length;
        const totalBilled = billing.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
        const totalCollected = billing.reduce((sum, b) => sum + (b.payments ? b.payments.reduce((ps, p) => ps + (Number(p.amount) || 0), 0) : (b.status === 'Paid' ? Number(b.amount) || 0 : 0)), 0);
        document.getElementById('report-total-billed').textContent = currencyFormatter.format(totalBilled);
        document.getElementById('report-total-collected').textContent = currencyFormatter.format(totalCollected);
    };

    const renderPatientDetails = (patientId) => {
        const patient = patients.find(p => p.id === patientId);
        if (!patient) return;

        document.getElementById('patient-name-header').textContent = `Patient: ${patient.name}`;
        document.getElementById('patient-id-detail').textContent = patient.id;
        document.getElementById('patient-dob-detail').textContent = patient.dob;
        document.getElementById('patient-address-detail').textContent = patient.address || 'N/A';
        document.getElementById('patient-contact-detail').textContent = patient.contact;
        document.getElementById('patient-history-detail').textContent = patient.history || 'None';

        const resultsBody = document.getElementById('results-table-body');
        resultsBody.innerHTML = '';
        const patientResults = diagnosticResults.filter(r => r.patientId === patientId);
        if (patientResults.length) {
            patientResults.forEach(res => {
                const statusClass = `badge-${res.status.toLowerCase()}`;
                const filesCount = res.files ? res.files.length : 0;
                resultsBody.innerHTML += `
                    <tr>
                        <td>${res.date}</td>
                        <td>${res.testName}</td>
                        <td>${res.result}</td>
                        <td><span class="badge ${statusClass}">${res.status}</span></td>
                        <td>${filesCount}</td>
                        <td>
                            <div class="d-flex gap-1 flex-wrap">
                                <button class="btn btn-sm btn-secondary edit-result-btn" data-id="${res.resultId}">Edit</button>
                                <button class="btn btn-sm btn-danger delete-result-btn" data-id="${res.resultId}">Delete</button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        } else {
            resultsBody.innerHTML = '<tr><td colspan="6" class="text-center">No diagnostic results found.</td></tr>';
        }

        const billingBody = document.getElementById('patient-billing-table-body');
        billingBody.innerHTML = '';
        const patientBills = billing.filter(b => b.patientId === patientId);
        if (patientBills.length) {
            patientBills.forEach(bill => {
                const statusClass = bill.status === 'Paid' ? 'bg-success' : bill.status === 'Partial' ? 'bg-warning' : 'bg-danger';
                billingBody.innerHTML += `
                    <tr>
                        <td>${bill.invoiceId}</td>
                        <td>${bill.date}</td>
                        <td>${currencyFormatter.format(Number(bill.amount) || 0)}</td>
                        <td><span class="badge ${statusClass}">${bill.status}</span></td>
                        <td>
                            ${bill.status !== 'Paid' ? `<button class="btn btn-sm btn-success pay-bill-btn" data-id="${bill.invoiceId}">Pay</button>` : ''}
                        </td>
                    </tr>
                `;
            });
        } else {
            billingBody.innerHTML = '<tr><td colspan="5" class="text-center">No billing history found.</td></tr>';
        }

        renderPatientDocuments(patientId);

        showView('patient-detail-view');
    };

    const renderPatientDocuments = (patientId) => {
        const ul = document.getElementById('patient-doc-list');
        ul.innerHTML = '';
        const patient = patients.find(p => p.id === patientId);
        if (!patient || !patient.documents || !patient.documents.length) {
            ul.innerHTML = '<li class="list-group-item text-muted">No documents uploaded</li>'; return;
        }
        patient.documents.forEach(doc => {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.innerHTML = `
                <div class="flex-grow-1">
                    <strong>${doc.name}</strong><br><small class="text-muted">${new Date(doc.uploadedAt).toLocaleString()}</small>
                </div>
                <div class="d-flex gap-1 align-items-center flex-wrap">
                    <button class="btn btn-sm btn-outline-secondary download-doc-btn" data-doc-id="${doc.id}">Download</button>
                    <button class="btn btn-sm btn-outline-danger delete-doc-btn" data-doc-id="${doc.id}">Delete</button>
                </div>
            `;
            ul.appendChild(li);
        });
    };

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = link.dataset.view;
            if (viewId) showView(viewId);
        });
        link.addEventListener('touchend', (e) => {
            e.preventDefault();
            const viewId = link.dataset.view;
            if (viewId) showView(viewId);
        });
    });

    patientSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim().toLowerCase();
        if (!searchTerm) {
            renderPatientsTable();
            return;
        }
        const filtered = patients.filter(p =>
            (p.name || '').toLowerCase().includes(searchTerm) ||
            (p.id || '').toString().includes(searchTerm) ||
            (p.contact || '').toLowerCase().includes(searchTerm) ||
            (p.address || '').toLowerCase().includes(searchTerm)
        );
        renderPatientsTable(filtered);
    });

    patientsTableBody.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const patientId = Number(btn.dataset.id);
        if (btn.classList.contains('view-details-btn')) {
            renderPatientDetails(patientId);
        } else if (btn.classList.contains('edit-patient-btn')) {
            const patient = patients.find(p => p.id === patientId);
            if (!patient) return;
            document.getElementById('patient-modal-title').textContent = 'Edit Patient';
            document.getElementById('patient-id-input').value = patient.id;
            document.getElementById('patient-name').value = patient.name;
            document.getElementById('patient-dob').value = patient.dob;
            document.getElementById('patient-contact').value = patient.contact;
            document.getElementById('patient-address').value = patient.address || '';
            document.getElementById('patient-history').value = patient.history || '';
            patientModal.show();
        } else if (btn.classList.contains('delete-patient-btn')) {
            if (!confirm('Delete this patient and all related records?')) return;
            patients = patients.filter(p => p.id !== patientId);
            diagnosticResults = diagnosticResults.filter(r => r.patientId !== patientId);
            billing = billing.filter(b => b.patientId !== patientId);
            saveData(LS_KEYS.patients, patients);
            saveData(LS_KEYS.results, diagnosticResults);
            saveData(LS_KEYS.billing, billing);
            renderPatientsTable();
            renderDashboard();
            renderBillingTable();
            renderReports();
        }
    });

    patientsTableBody.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const row = e.target.closest('tr');
            if (row && row.dataset.id) renderPatientDetails(Number(row.dataset.id));
        }
    });

    document.getElementById('back-to-patients-btn').addEventListener('click', () => {
        showView('patients-view');
    });

    document.getElementById('add-patient-btn').addEventListener('click', () => {
        document.getElementById('patient-form').reset();
        document.getElementById('patient-modal-title').textContent = 'Add New Patient';
        document.getElementById('patient-id-input').value = '';
        patientModal.show();
    });

    document.getElementById('patient-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const idInput = document.getElementById('patient-id-input').value;
        const payload = {
            name: document.getElementById('patient-name').value.trim(),
            dob: document.getElementById('patient-dob').value,
            contact: document.getElementById('patient-contact').value.trim(),
            address: document.getElementById('patient-address').value.trim(),
            history: document.getElementById('patient-history').value.trim(),
            documents: idInput ? patients.find(p => p.id === Number(idInput)).documents || [] : []
        };

        if (!payload.name || !payload.dob || !payload.contact) {
            alert('Please fill required fields: Name, DOB, Contact.');
            return;
        }
        if (idInput) {
            const pid = Number(idInput);
            const idx = patients.findIndex(p => p.id === pid);
            if (idx !== -1) {
                patients[idx] = { id: pid, ...payload };
            }
        } else {
            const newId = generatePatientId();
            patients.push({ id: newId, ...payload });
        }

        saveData(LS_KEYS.patients, patients);
        renderPatientsTable();
        renderDashboard();
        patientModal.hide();
    });

    // New features
    function changePassword(username, oldPwd, newPwd) {
        if (!username || !newPwd) throw new Error('Username and new password required');
        if (users[username].password !== oldPwd) throw new Error('Incorrect old password');
        users[username].password = newPwd;
        saveData(LS_KEYS.users, users);
    }

    function uploadDocumentToPatient(patientId, file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const patient = patients.find(p => p.id === patientId);
                if (!patient) return reject(new Error('Patient not found'));
                patient.documents = patient.documents || [];
                const docId = patient.documents.length ? Math.max(...patient.documents.map(d => d.id)) + 1 : 1;
                patient.documents.push({
                    id: docId,
                    name: file.name,
                    uploadedAt: Date.now(),
                    data: reader.result
                });
                saveData(LS_KEYS.patients, patients);
                resolve(patient.documents[patient.documents.length - 1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function deleteDocumentFromPatient(patientId, docId) {
        const patient = patients.find(p => p.id === patientId);
        if (!patient) return;
        patient.documents = patient.documents.filter(d => d.id !== docId);
        saveData(LS_KEYS.patients, patients);
    }

    function addLabResult({ patientId, testName, result, status = 'Pending' }) {
        const resultId = generateResultId();
        const entry = { resultId, patientId, date: new Date().toISOString().slice(0, 10), testName, result, status, files: [] };
        diagnosticResults.push(entry);
        saveData(LS_KEYS.results, diagnosticResults);
        return entry;
    }

    function updateLabResult(resultId, updates) {
        const idx = diagnosticResults.findIndex(r => r.resultId === resultId);
        if (idx === -1) throw new Error('Result not found');
        diagnosticResults[idx] = { ...diagnosticResults[idx], ...updates };
        saveData(LS_KEYS.results, diagnosticResults);
        return diagnosticResults[idx];
    }

    function deleteLabResult(resultId) {
        diagnosticResults = diagnosticResults.filter(r => r.resultId !== resultId);
        saveData(LS_KEYS.results, diagnosticResults);
    }

    function attachFileToResult(resultId, file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = diagnosticResults.find(r => r.resultId === resultId);
                if (!result) return reject(new Error('Result not found'));
                result.files = result.files || [];
                const fileId = result.files.length + 1;
                result.files.push({
                    id: fileId,
                    name: file.name,
                    data: reader.result
                });
                saveData(LS_KEYS.results, diagnosticResults);
                resolve(result.files[result.files.length - 1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function downloadAttachmentBase64(item) {
        const a = document.createElement('a');
        a.href = item.data;
        a.download = item.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    function generateInvoiceForPatient(patientId, amount = 0) {
        const invoiceId = generateInvoiceId();
        const inv = { invoiceId, patientId, date: new Date().toISOString().slice(0, 10), amount: Number(amount), status: 'Unpaid', payments: [] };
        billing.push(inv);
        saveData(LS_KEYS.billing, billing);
        return inv;
    }

    function recordPayment(invoiceId, amount) {
        const inv = billing.find(b => b.invoiceId === invoiceId);
        if (!inv) throw new Error('Invoice not found');
        const payment = { id: Date.now(), method: 'Cash', amount: Number(amount), date: new Date().toISOString() };
        inv.payments.push(payment);
        const paidTotal = inv.payments.reduce((s, p) => s + p.amount, 0);
        inv.status = paidTotal >= inv.amount ? 'Paid' : (paidTotal > 0 ? 'Partial' : 'Unpaid');
        saveData(LS_KEYS.billing, billing);
        return payment;
    }

    function exportBillingCSV() {
        const headers = ['InvoiceId', 'PatientId', 'Date', 'Amount', 'Status'];
        const rows = billing.map(b => [b.invoiceId, b.patientId, b.date, b.amount, b.status].join(','));
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'billing.csv'; a.click(); URL.revokeObjectURL(url);
    }

    function exportPatientProfile(patientId) {
        const patient = patients.find(p => p.id === patientId);
        if (!patient) return;
        const profile = {
            ...patient,
            results: diagnosticResults.filter(r => r.patientId === patientId),
            billing: billing.filter(b => b.patientId === patientId)
        };
        const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `patient_${patientId}.json`; a.click(); URL.revokeObjectURL(url);
    }

    function initDashboardCharts() {
        try {
            const trendCtx = document.getElementById('revenueTrendChart');
            const breakdownCtx = document.getElementById('revenueBreakdownChart');
            const reportCtx = document.getElementById('financialReportChart');
            const reportBreakdownCtx = document.getElementById('reportBreakdownChart');

            if (trendCtx && !window.revenueTrendChart) {
                window.revenueTrendChart = new Chart(trendCtx, {
                    type: 'line',
                    data: { labels: [], datasets: [{ label: 'Revenue', data: [], borderColor: '#007bff', backgroundColor: 'rgba(0,123,255,0.08)', fill: true, tension: 0.3 }] },
                    options: { 
                        responsive: true, 
                        plugins: { legend: { display: false } },
                        scales: { x: { ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } } } }
                    }
                });
            }
            if (breakdownCtx && !window.revenueBreakdownChart) {
                window.revenueBreakdownChart = new Chart(breakdownCtx, {
                    type: 'doughnut',
                    data: { labels: ['Paid', 'Unpaid'], datasets: [{ data: [0, 0], backgroundColor: ['#28a745', '#dc3545'] }] },
                    options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } } }
                });
            }

            if (reportCtx && !window.financialReportChart) {
                window.financialReportChart = new Chart(reportCtx, {
                    type: 'bar',
                    data: {
                        labels: [],
                        datasets: [
                            { label: 'Billed', data: [], backgroundColor: '#007bff' },
                            { label: 'Collected', data: [], backgroundColor: '#28a745' }
                        ]
                    },
                    options: { 
                        responsive: true, 
                        scales: { 
                            y: { beginAtZero: true, ticks: { font: { size: 10 } } }, 
                            x: { ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } } } 
                        }, 
                        plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } } 
                    }
                });
            }

            if (reportBreakdownCtx && !window.reportBreakdownChart) {
                window.reportBreakdownChart = new Chart(reportBreakdownCtx, {
                    type: 'doughnut',
                    data: { labels: ['Paid', 'Partial', 'Unpaid'], datasets: [{ data: [0, 0, 0], backgroundColor: ['#28a745', '#ffc107', '#dc3545'] }] },
                    options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } } }
                });
            }

            updateDashboardCharts();
        } catch (e) { console.warn('Chart init failed', e); }
    }

    function updateDashboardCharts() {
        const byDate = {};
        billing.forEach(b => { byDate[b.date] = (byDate[b.date] || 0) + (Number(b.amount) || 0); });
        const dates = Object.keys(byDate).sort();
        if (window.revenueTrendChart) {
            window.revenueTrendChart.data.labels = dates;
            window.revenueTrendChart.data.datasets[0].data = dates.map(d => byDate[d]);
            window.revenueTrendChart.update();
        }
        if (window.revenueBreakdownChart) {
            const paid = billing.filter(b => b.status === 'Paid').reduce((s, b) => s + (Number(b.amount) || 0), 0);
            const unpaid = billing.filter(b => b.status !== 'Paid').reduce((s, b) => s + (Number(b.amount) || 0), 0);
            window.revenueBreakdownChart.data.datasets[0].data = [paid, unpaid];
            window.revenueBreakdownChart.update();
        }

        const byMonth = {};
        billing.forEach(b => {
            const month = (b.date || '').slice(0, 7) || 'Unknown';
            byMonth[month] = byMonth[month] || { billed: 0, collected: 0 };
            const amt = Number(b.amount) || 0;
            byMonth[month].billed += amt;
            byMonth[month].collected += b.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        });
        const months = Object.keys(byMonth).sort();
        if (window.financialReportChart) {
            window.financialReportChart.data.labels = months.map(m => {
                try { const [y, mo] = m.split('-'); return new Date(Number(y), Number(mo) - 1).toLocaleString(undefined, { month: 'short', year: 'numeric' }); } catch { return m; }
            });
            window.financialReportChart.data.datasets[0].data = months.map(m => byMonth[m].billed);
            window.financialReportChart.data.datasets[1].data = months.map(m => byMonth[m].collected);
            window.financialReportChart.update();
        }
        if (window.reportBreakdownChart) {
            const paid = billing.filter(b => b.status === 'Paid').reduce((s, b) => s + (Number(b.amount) || 0), 0);
            const partial = billing.filter(b => b.status === 'Partial').reduce((s, b) => s + (Number(b.amount) || 0), 0);
            const unpaid = billing.filter(b => b.status === 'Unpaid').reduce((s, b) => s + (Number(b.amount) || 0), 0);
            window.reportBreakdownChart.data.datasets[0].data = [paid, partial, unpaid];
            window.reportBreakdownChart.update();
        }
    }

    // UI wiring
    document.addEventListener('click', (e) => {
        const tgt = e.target.closest('button');
        if (!tgt) return;

        if (tgt.id === 'upload-doc-btn') {
            const fileInput = document.getElementById('patient-doc-input');
            const pid = Number(document.getElementById('patient-id-detail').textContent);
            const file = fileInput.files[0];
            if (!file) return alert('Select a file');
            uploadDocumentToPatient(pid, file).then(() => {
                renderPatientDocuments(pid);
                fileInput.value = '';
            }).catch(err => alert(err.message));
        } else if (tgt.id === 'add-result-btn') {
            const pid = Number(document.getElementById('patient-id-detail').textContent);
            document.getElementById('lab-patient-id').value = pid;
            document.getElementById('lab-test-name').value = '';
            document.getElementById('lab-result-text').value = '';
            document.getElementById('lab-status').value = 'Pending';
            document.getElementById('lab-file-input').value = '';
            currentEditResultId = null;
            labResultModal.show();
        } else if (tgt.id === 'generate-invoice-btn') {
            const pid = Number(document.getElementById('patient-id-detail').textContent);
            const amount = prompt('Enter invoice amount:');
            if (amount && !isNaN(amount) && Number(amount) > 0) {
                generateInvoiceForPatient(pid, Number(amount));
                renderPatientDetails(pid); // Refresh patient billing table
                renderBillingTable(); // Update main billing view
                renderReports(); // Update financial reports
                updateDashboardCharts(); // Update charts
                alert(`Invoice #${generateInvoiceId() - 1} generated for ${currencyFormatter.format(Number(amount))}`);
            } else {
                alert('Please enter a valid positive amount.');
            }
        } else if (tgt.classList.contains('download-doc-btn')) {
            const docId = Number(tgt.dataset.docId);
            const pid = Number(document.getElementById('patient-id-detail').textContent);
            const patient = patients.find(p => p.id === pid);
            if (patient && patient.documents) {
                const doc = patient.documents.find(d => d.id === docId);
                if (doc) downloadAttachmentBase64(doc);
            }
        } else if (tgt.classList.contains('delete-doc-btn')) {
            const docId = Number(tgt.dataset.docId);
            const pid = Number(document.getElementById('patient-id-detail').textContent);
            if (confirm('Delete this document?')) {
                deleteDocumentFromPatient(pid, docId);
                renderPatientDocuments(pid);
            }
        } else if (tgt.classList.contains('edit-result-btn')) {
            const resultId = Number(tgt.dataset.id);
            const result = diagnosticResults.find(r => r.resultId === resultId);
            if (result) {
                document.getElementById('lab-patient-id').value = result.patientId;
                document.getElementById('lab-test-name').value = result.testName;
                document.getElementById('lab-result-text').value = result.result;
                document.getElementById('lab-status').value = result.status;
                document.getElementById('lab-file-input').value = '';
                currentEditResultId = resultId;
                labResultModal.show();
            }
        } else if (tgt.classList.contains('delete-result-btn')) {
            const resultId = Number(tgt.dataset.id);
            if (confirm('Delete this lab result?')) {
                deleteLabResult(resultId);
                renderPatientDetails(Number(document.getElementById('patient-id-detail').textContent));
                renderDashboard();
            }
        } else if (tgt.classList.contains('pay-bill-btn')) {
            const invoiceId = Number(tgt.dataset.id);
            const inv = billing.find(b => b.invoiceId === invoiceId);
            if (inv) {
                const amount = prompt(`Enter payment amount (Total: ${currencyFormatter.format(inv.amount)}):`);
                if (amount && !isNaN(amount) && Number(amount) > 0) {
                    recordPayment(invoiceId, Number(amount));
                    renderPatientDetails(Number(document.getElementById('patient-id-detail').textContent));
                    renderBillingTable();
                    renderReports();
                    updateDashboardCharts();
                    alert(`Payment of ${currencyFormatter.format(Number(amount))} recorded for Invoice #${invoiceId}`);
                } else {
                    alert('Please enter a valid positive amount.');
                }
            }
        } else if (tgt.id === 'export-patient-btn') {
            const pid = Number(document.getElementById('patient-id-detail').textContent);
            exportPatientProfile(pid);
        } else if (tgt.id === 'print-invoices-btn') {
            exportBillingCSV();
        }
    });

    document.getElementById('lab-result-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const patientId = Number(document.getElementById('lab-patient-id').value);
        const testName = document.getElementById('lab-test-name').value.trim();
        const resultText = document.getElementById('lab-result-text').value.trim();
        const status = document.getElementById('lab-status').value;
        const file = document.getElementById('lab-file-input').files[0];

        if (!testName) {
            alert('Test name is required.');
            return;
        }

        if (currentEditResultId) {
            updateLabResult(currentEditResultId, { testName, result: resultText, status });
            if (file) {
                attachFileToResult(currentEditResultId, file).then(() => {
                    renderPatientDetails(patientId);
                    labResultModal.hide();
                    currentEditResultId = null;
                }).catch(err => alert(err.message));
            } else {
                renderPatientDetails(patientId);
                labResultModal.hide();
                currentEditResultId = null;
            }
        } else {
            addLabResult({ patientId, testName, result: resultText, status });
            if (file) {
                const resultId = generateResultId() - 1;
                attachFileToResult(resultId, file).then(() => {
                    renderPatientDetails(patientId);
                    labResultModal.hide();
                }).catch(err => alert(err.message));
            } else {
                renderPatientDetails(patientId);
                labResultModal.hide();
            }
        }
        renderDashboard();
    });

    document.getElementById('change-password-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('pwd-user').value;
        const oldPwd = document.getElementById('pwd-old').value;
        const newPwd = document.getElementById('pwd-new').value;

        try {
            changePassword(username, oldPwd, newPwd);
            alert('Password changed successfully.');
            changePasswordModal.hide();
        } catch (err) {
            alert(err.message);
        }
    });
});
