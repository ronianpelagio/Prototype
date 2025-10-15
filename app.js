document.addEventListener('DOMContentLoaded', () => {
    const defaultPatients = [
        { id: 1001, name: 'Naruto D. Monki', dob: '1985-04-12', contact: '09171234567', address: 'Ermita, Manila', history: 'Hypertension, Allergic to penicillin' },
        { id: 1002, name: 'Ronian', dob: '1992-08-25', contact: '09287654321', address: 'Sampaloc, Manila', history: 'Asthma' },
        { id: 1003, name: 'Pares overload', dob: '1970-01-30', contact: '09998887777', address: 'Paco, Manila', history: 'None' }
    ];

    const defaultResults = [
        { resultId: 1, patientId: 1001, date: '2025-10-10', testName: 'CBC', result: 'Normal' },
        { resultId: 2, patientId: 1001, date: '2025-10-12', testName: 'X-Ray', result: 'Pending' },
        { resultId: 3, patientId: 1002, date: '2025-10-11', testName: 'Urinalysis', result: 'Normal' }
    ];

    const defaultBilling = [
        { invoiceId: 5001, patientId: 1001, date: '2025-10-10', amount: 500.00, status: 'Paid' },
        { invoiceId: 5002, patientId: 1002, date: '2025-10-11', amount: 350.00, status: 'Paid' },
        { invoiceId: 5003, patientId: 1001, date: '2025-10-12', amount: 1200.00, status: 'Unpaid' }
    ];

    const users = {
        doctor: { password: 'password123', role: 'Medical Staff' },
        admin: { password: 'admin123', role: 'Management' }
    };

    const LS_KEYS = {
        patients: 'ghmdc_patients_v1',
        results: 'ghmdc_results_v1',
        billing: 'ghmdc_billing_v1',
        rememberedUser: 'ghmdc_remembered_user_v1'
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

    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');
    const navLinks = document.querySelectorAll('.nav-link');
    const allViews = document.querySelectorAll('.view');
    const patientsTableBody = document.getElementById('patients-table-body');
    const billingTableBody = document.getElementById('billing-table-body');
    const patientSearch = document.getElementById('patient-search');

    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

    // Password toggle (ensure button wired and accessible)
    (function wirePasswordToggle(){
        const btn = document.getElementById('pwd-toggle');
        const pw  = document.getElementById('password');
        if (!btn || !pw) return;

        // Prevent focus loss when clicking the icon
        btn.addEventListener('mousedown', e => e.preventDefault());

        btn.addEventListener('click', () => {
            const showing = pw.type === 'text';
            pw.type = showing ? 'password' : 'text';
            btn.setAttribute('aria-pressed', String(!showing));

            const icon = btn.querySelector('i');
            if (icon) {
                icon.classList.toggle('bi-eye', showing);
                icon.classList.toggle('bi-eye-slash', !showing);
            }

            // keep focus on password field for accessibility
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

    const showView = (viewId) => {
        allViews.forEach(view => view.classList.remove('active'));
        const target = document.getElementById(viewId);
        if (target) target.classList.add('active');

        navLinks.forEach(link => {
            if (link.dataset.view === viewId) link.classList.add('active');
            else link.classList.remove('active');
        });
        currentView = viewId;
    };

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = (document.getElementById('username').value || '').trim();
        const password = document.getElementById('password').value || '';
        const rememberEl = document.getElementById('remember-me');
        const remember = rememberEl ? rememberEl.checked : false;
        const signinBtn = document.getElementById('signin-btn');

        // Show loading state
        signinBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Loading...';
        signinBtn.disabled = true;

        setTimeout(() => { // Simulate async login
            if (users[username] && users[username].password === password) {
                currentUser = { username, role: users[username].role };
                if (remember) localStorage.setItem(LS_KEYS.rememberedUser, JSON.stringify({ username }));
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
            // Reset button state
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
    };

    // --- RENDERERS ---
    const renderDashboard = () => {
        document.getElementById('total-patients-stat').textContent = patients.length;
        const pendingResults = diagnosticResults.filter(r => (r.result || '').toString().toLowerCase() === 'pending').length;
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
                    <button class="btn btn-sm btn-info view-details-btn" data-id="${patient.id}" title="View">View</button>
                    <button class="btn btn-sm btn-secondary edit-patient-btn" data-id="${patient.id}" title="Edit">Edit</button>
                    <button class="btn btn-sm btn-danger delete-patient-btn" data-id="${patient.id}" title="Delete">Delete</button>
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
                <td><span class="badge ${bill.status === 'Paid' ? 'bg-success' : 'bg-danger'}">${bill.status}</span></td>
            `;
            billingTableBody.appendChild(row);
        });
    };

    const renderReports = () => {
        document.getElementById('report-total-patients').textContent = patients.length;
        const totalBilled = billing.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
        const totalCollected = billing.filter(b => b.status === 'Paid').reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
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
                resultsBody.innerHTML += `<tr><td>${res.date}</td><td>${res.testName}</td><td>${res.result}</td></tr>`;
            });
        } else {
            resultsBody.innerHTML = '<tr><td colspan="3" class="text-center">No diagnostic results found.</td></tr>';
        }

        const billingBody = document.getElementById('patient-billing-table-body');
        billingBody.innerHTML = '';
        const patientBills = billing.filter(b => b.patientId === patientId);
        if (patientBills.length) {
            patientBills.forEach(bill => {
                billingBody.innerHTML += `<tr><td>${bill.invoiceId}</td><td>${bill.date}</td><td>${currencyFormatter.format(Number(bill.amount) || 0)}</td><td>${bill.status}</td></tr>`;
            });
        } else {
            billingBody.innerHTML = '<tr><td colspan="4" class="text-center">No billing history found.</td></tr>';
        }

        showView('patient-detail-view');
    };

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
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
        const btn = e.target;
        if (btn.closest('.view-details-btn')) {
            const patientId = Number(btn.dataset.id);
            renderPatientDetails(patientId);
            return;
        }

        if (btn.closest('.edit-patient-btn')) {
            const patientId = Number(btn.dataset.id);
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
            return;
        }

        if (btn.closest('.delete-patient-btn')) {
            const patientId = Number(btn.dataset.id);
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
            return;
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

    if (currentUser) initializeUserInterface();

    saveData(LS_KEYS.patients, patients);
    saveData(LS_KEYS.results, diagnosticResults);
    saveData(LS_KEYS.billing, billing);

    /* --- New feature implementations --- */

    /* Change password / reset */
    function changePassword(username, oldPwd, newPwd) {
        if (!username || !newPwd) throw new Error('username and new password required');
        const allUsersRaw = localStorage.getItem('ghmdc_users_v1') || null;
        let allUsers = allUsersRaw ? JSON.parse(allUsersRaw) : null;
        if (!allUsers) {
            // fallback to built-in users object if missing
            allUsers = { ...users };
        }
        if (!allUsers[username]) throw new Error('user not found');
        if (allUsers[username].password !== oldPwd) throw new Error('old password mismatch');
        allUsers[username].password = newPwd;
        localStorage.setItem('ghmdc_users_v1', JSON.stringify(allUsers));
        return true;
    }

    /* Upload patient document (file -> base64) */
    function uploadDocumentToPatient(patientId, file) {
        return new Promise((resolve, reject) => {
            const patient = patients.find(p => p.id === patientId);
            if (!patient) return reject(new Error('patient not found'));
            const reader = new FileReader();
            reader.onload = (e) => {
                patient.documents = patient.documents || [];
                const doc = { id: Date.now(), name: file.name, type: file.type, data: e.target.result, uploadedAt: new Date().toISOString() };
                patient.documents.push(doc);
                saveData(LS_KEYS.patients, patients);
                resolve(doc);
            };
            reader.onerror = () => reject(new Error('file read error'));
            reader.readAsDataURL(file);
        });
    }

    /* Export / Print patient profile */
    function exportPatientProfile(patientId) {
        const patient = patients.find(p => p.id === patientId);
        if (!patient) throw new Error('patient not found');
        const html = `
      <html><head><title>Patient ${patient.id}</title><style>body{font-family:Arial;padding:20px}h1{font-size:18px}</style></head>
      <body>
        <h1>Patient Profile — ${patient.name} (${patient.id})</h1>
        <p><strong>DOB:</strong> ${patient.dob}</p>
        <p><strong>Contact:</strong> ${patient.contact}</p>
        <p><strong>Address:</strong> ${patient.address || ''}</p>
        <h3>Medical History</h3><p>${patient.history || 'None'}</p>
      </body></html>`;
        const w = window.open('', '_blank');
        w.document.write(html);
        w.document.close();
        w.print();
        w.close();
    }

    /* Laboratory results - add, attach, update, download */
    function addLabResult({ patientId, testName, result = '', date = (new Date()).toISOString().slice(0,10), status = 'Pending', attachments = [] }) {
        const rId = diagnosticResults.length ? Math.max(...diagnosticResults.map(r=>r.resultId)) + 1 : 1;
        const item = { resultId: rId, patientId, testName, result, date, status, attachments };
        diagnosticResults.push(item);
        saveData(LS_KEYS.results, diagnosticResults);
        return item;
    }

    function attachFileToResult(resultId, file) {
        return new Promise((resolve, reject) => {
            const res = diagnosticResults.find(r => r.resultId === resultId);
            if (!res) return reject(new Error('result not found'));
            const reader = new FileReader();
            reader.onload = (e) => {
                res.attachments = res.attachments || [];
                const at = { id: Date.now(), name: file.name, type: file.type, data: e.target.result, uploadedAt: new Date().toISOString() };
                res.attachments.push(at);
                saveData(LS_KEYS.results, diagnosticResults);
                resolve(at);
            };
            reader.onerror = () => reject(new Error('file read error'));
            reader.readAsDataURL(file);
        });
    }

    function updateLabResult(resultId, updates) {
        const idx = diagnosticResults.findIndex(r => r.resultId === resultId);
        if (idx === -1) throw new Error('result not found');
        diagnosticResults[idx] = { ...diagnosticResults[idx], ...updates };
        saveData(LS_KEYS.results, diagnosticResults);
        return diagnosticResults[idx];
    }

    function downloadAttachmentBase64(item) {
        const a = document.createElement('a');
        a.href = item.data;
        a.download = item.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    /* Billing (generate invoice, record payment, reports) */
    function generateInvoiceForPatient(patientId, items = []) {
        const invoiceId = billing.length ? Math.max(...billing.map(b => b.invoiceId)) + 1 : 5001;
        const amount = items.reduce((s,i) => s + (Number(i.amount)||0), 0);
        const inv = { invoiceId, patientId, date: (new Date()).toISOString().slice(0,10), items, amount, status: amount>0 ? 'Unpaid' : 'Paid', payments: [] };
        billing.push(inv);
        saveData(LS_KEYS.billing, billing);
        return inv;
    }

    function recordPayment(invoiceId, { method = 'Cash', amount = 0, reference = '' } = {}) {
        const inv = billing.find(b => b.invoiceId === invoiceId);
        if (!inv) throw new Error('invoice not found');
        const payment = { id: Date.now(), method, amount: Number(amount)||0, reference, date: (new Date()).toISOString() };
        inv.payments = inv.payments || [];
        inv.payments.push(payment);
        const paidTotal = inv.payments.reduce((s,p) => s + (Number(p.amount)||0), 0);
        inv.status = paidTotal >= inv.amount ? 'Paid' : (paidTotal > 0 ? 'Partial' : 'Unpaid');
        saveData(LS_KEYS.billing, billing);
        return payment;
    }

    function exportBillingCSV() {
        const headers = ['InvoiceId','PatientId','Date','Amount','Status'];
        const rows = billing.map(b => [b.invoiceId, b.patientId, b.date, b.amount, b.status].join(','));
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'billing.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    }

    /* Charts: initialize/update revenue charts if canvas present */
    function initDashboardCharts() {
        try {
            const trendCtx = document.getElementById('revenueTrendChart');
            const breakdownCtx = document.getElementById('revenueBreakdownChart');
            const reportCtx = document.getElementById('financialReportChart');

            if (trendCtx && !window.revenueTrendChart) {
                window.revenueTrendChart = new Chart(trendCtx, {
                    type: 'line',
                    data: { labels: [], datasets: [{ label: 'Revenue', data: [], borderColor: '#0d6efd', backgroundColor: 'rgba(13,110,253,0.08)', fill: true, tension: 0.3 }] },
                    options: { responsive:true, plugins:{legend:{display:false}} }
                });
            }
            if (breakdownCtx && !window.revenueBreakdownChart) {
                window.revenueBreakdownChart = new Chart(breakdownCtx, {
                    type: 'doughnut',
                    data: { labels: ['Paid','Unpaid'], datasets: [{ data: [0,0], backgroundColor: ['#20c997','#ff6b6b'] }] },
                    options: { responsive:true, plugins:{legend:{position:'bottom'}} }
                });
            }

            // Financial report chart (monthly billed vs collected)
            if (reportCtx && !window.financialReportChart) {
                window.financialReportChart = new Chart(reportCtx, {
                    type: 'bar',
                    data: {
                        labels: [],
                        datasets: [
                            { label: 'Billed', data: [], backgroundColor: '#0d6efd' },
                            { label: 'Collected', data: [], backgroundColor: '#20c997' }
                        ]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            x: { stacked: false },
                            y: { beginAtZero:true }
                        },
                        plugins: { legend: { position: 'bottom' } }
                    }
                });
            }
            updateDashboardCharts();
        } catch (e) { console.warn('chart init failed', e); }
    }

    function updateDashboardCharts() {
        if (window.revenueTrendChart) {
            const byDate = {};
            billing.forEach(b => { byDate[b.date] = (byDate[b.date] || 0) + (Number(b.amount) || 0); });
            const dates = Object.keys(byDate).sort();
            window.revenueTrendChart.data.labels = dates;
            window.revenueTrendChart.data.datasets[0].data = dates.map(d => byDate[d]);
            window.revenueTrendChart.update();
        }
        if (window.revenueBreakdownChart) {
            const paid = billing.filter(b => b.status === 'Paid').reduce((s,b) => s + (Number(b.amount)||0),0);
            const unpaid = billing.filter(b => b.status !== 'Paid').reduce((s,b) => s + (Number(b.amount)||0),0);
            window.revenueBreakdownChart.data.datasets[0].data = [paid, unpaid];
            window.revenueBreakdownChart.update();
        }

        // update financial report chart (group by YYYY-MM)
        if (window.financialReportChart) {
            const byMonth = {};
            billing.forEach(b => {
                const month = (b.date || '').slice(0,7) || 'Unknown';
                byMonth[month] = byMonth[month] || { billed: 0, collected: 0 };
                const amt = Number(b.amount) || 0;
                byMonth[month].billed += amt;
                // collected: prefer payments array, fallback to status === 'Paid'
                if (Array.isArray(b.payments) && b.payments.length) {
                    byMonth[month].collected += b.payments.reduce((s,p) => s + (Number(p.amount)||0), 0);
                } else if (b.status === 'Paid') {
                    byMonth[month].collected += amt;
                }
            });
            const months = Object.keys(byMonth).sort();
            window.financialReportChart.data.labels = months;
            window.financialReportChart.data.datasets[0].data = months.map(m => byMonth[m].billed);
            window.financialReportChart.data.datasets[1].data = months.map(m => byMonth[m].collected);
            window.financialReportChart.update();
        }
    }

    /* UI wiring for new controls (minimal) */
    document.addEventListener('click', (e) => {
        const tgt = e.target;

        if (tgt && tgt.matches('#upload-doc-btn')) {
            const fileInput = document.getElementById('patient-doc-input');
            const pid = Number(document.getElementById('patient-id-detail').textContent) || null;
            if (!pid) return alert('Open a patient first');
            const file = fileInput.files && fileInput.files[0];
            if (!file) return alert('Select a file first');
            uploadDocumentToPatient(pid, file).then(doc => {
                renderPatientDocuments(pid);
                fileInput.value = '';
            }).catch(err => alert(err.message));
        }

        if (tgt && tgt.matches('#add-result-btn')) {
            const pid = Number(document.getElementById('patient-id-detail').textContent) || null;
            if (!pid) return alert('Open a patient first');
            document.getElementById('lab-patient-id').value = pid;
            const m = new bootstrap.Modal(document.getElementById('lab-result-modal'));
            m.show();
        }

        if (tgt && tgt.matches('#generate-invoice-btn')) {
            const pid = Number(document.getElementById('patient-id-detail').textContent) || null;
            if (!pid) return alert('Open a patient first');
            const inv = generateInvoiceForPatient(pid, [{desc:'Consultation', amount:500}]);
            renderBillingTable(); renderPatientBilling(pid);
            alert('Invoice generated: ' + inv.invoiceId);
            updateDashboardCharts();
        }

        if (tgt && tgt.matches('#export-patient-btn')) {
            const pid = Number(document.getElementById('patient-id-detail').textContent) || null;
            if (!pid) return alert('Open a patient first');
            exportPatientProfile(pid);
        }

        if (tgt && tgt.matches('#print-invoices-btn')) {
            exportBillingCSV();
            alert('Billing CSV exported');
        }
    });

    /* Lab result modal submit */
    const labForm = document.getElementById('lab-result-form');
    if (labForm) labForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const pid = Number(document.getElementById('lab-patient-id').value);
        const testName = document.getElementById('lab-test-name').value.trim();
        const resultText = document.getElementById('lab-result-text').value.trim();
        const status = document.getElementById('lab-status').value;
        const file = document.getElementById('lab-file-input').files[0];
        const entry = addLabResult({ patientId: pid, testName, result: resultText, status });
        if (file) {
            attachFileToResult(entry.resultId, file).catch(console.error);
        }
        saveData(LS_KEYS.results, diagnosticResults);
        renderPatientDetails(pid);
        bootstrap.Modal.getInstance(document.getElementById('lab-result-modal')).hide();
    });

    /* Helper to render patient documents in the detail view */
    function renderPatientDocuments(patientId) {
        const ul = document.getElementById('patient-doc-list');
        ul.innerHTML = '';
        const patient = patients.find(p => p.id === patientId);
        if (!patient || !patient.documents || !patient.documents.length) {
            ul.innerHTML = '<li class="list-group-item text-muted">No documents uploaded</li>'; return;
        }
        patient.documents.forEach(doc => {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.innerHTML = `<div class="flex-grow-1"><strong>${doc.name}</strong><br><small class="text-muted">${new Date(doc.uploadedAt).toLocaleString()}</small></div>
                        <div class="d-flex gap-2 align-items-center">
                          <button class="btn btn-sm btn-outline-secondary" data-doc-id="${doc.id}" data-action="download">Download</button>
                        </div>`;
            ul.appendChild(li);
        });
    }

    /* wire download document clicks */
    document.getElementById('patient-doc-list') && document.getElementById('patient-doc-list').addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const aid = Number(btn.dataset.docId);
        const pid = Number(document.getElementById('patient-id-detail').textContent) || null;
        const patient = patients.find(p => p.id === pid);
        if (!patient) return;
        const doc = (patient.documents || []).find(d => d.id === aid);
        if (!doc) return;
        downloadAttachmentBase64(doc);
    });

    /* Expose API for console */
    window.ghmdc = Object.assign(window.ghmdc || {}, {
        changePassword, uploadDocumentToPatient, exportPatientProfile,
        addLabResult, attachFileToResult, updateLabResult, downloadAttachmentBase64,
        generateInvoiceForPatient, recordPayment, exportBillingCSV
    });

    /* initialize charts after DOM ready & initial render */
    initDashboardCharts();
    updateDashboardCharts();
});
    function initDashboardCharts() {
        try {
            const trendCtx = document.getElementById('revenueTrendChart');
            const breakdownCtx = document.getElementById('revenueBreakdownChart');
            const reportCtx = document.getElementById('financialReportChart');
            const reportBreakdownCtx = document.getElementById('reportBreakdownChart');

            if (trendCtx && !window.revenueTrendChart) {
                window.revenueTrendChart = new Chart(trendCtx, {
                    type: 'line',
                    data: { labels: [], datasets: [{ label: 'Revenue', data: [], borderColor: '#0d6efd', backgroundColor: 'rgba(13,110,253,0.08)', fill: true, tension: 0.3 }] },
                    options: { responsive:true, plugins:{legend:{display:false}} }
                });
            }
            if (breakdownCtx && !window.revenueBreakdownChart) {
                window.revenueBreakdownChart = new Chart(breakdownCtx, {
                    type: 'doughnut',
                    data: { labels: ['Paid','Unpaid'], datasets: [{ data: [0,0], backgroundColor: ['#20c997','#ff6b6b'] }] },
                    options: { responsive:true, plugins:{legend:{position:'bottom'}} }
                });
            }

            if (reportCtx && !window.financialReportChart) {
                window.financialReportChart = new Chart(reportCtx, {
                    type: 'bar',
                    data: { labels: [], datasets: [
                        { label: 'Billed', data: [], backgroundColor: '#0d6efd' },
                        { label: 'Collected', data: [], backgroundColor: '#20c997' }
                    ]},
                    options: { responsive:true, scales: { y:{beginAtZero:true} }, plugins:{legend:{position:'bottom'}} }
                });
            }

            if (reportBreakdownCtx && !window.reportBreakdownChart) {
                window.reportBreakdownChart = new Chart(reportBreakdownCtx, {
                    type: 'doughnut',
                    data: { labels: ['Paid','Partial','Unpaid'], datasets: [{ data: [0,0,0], backgroundColor: ['#20c997','#ffc107','#ff6b6b'] }] },
                    options: { responsive:true, plugins:{legend:{position:'bottom'}} }
                });
            }

            updateDashboardCharts();
        } catch (e) { console.warn('chart init failed', e); }
    }

    function updateDashboardCharts() {
        // existing updates...
        if (window.financialReportChart) {
            const byMonth = {};
            billing.forEach(b => {
                const month = (b.date || '').slice(0,7) || 'Unknown';
                byMonth[month] = byMonth[month] || { billed: 0, collected: 0 };
                const amt = Number(b.amount) || 0;
                byMonth[month].billed += amt;
                if (Array.isArray(b.payments) && b.payments.length) {
                    byMonth[month].collected += b.payments.reduce((s,p) => s + (Number(p.amount)||0), 0);
                } else if (b.status === 'Paid') {
                    byMonth[month].collected += amt;
                }
            });
            const months = Object.keys(byMonth).sort();
            window.financialReportChart.data.labels = months.map(m => {
                // human-friendly label: "YYYY-MM" -> "MMM YYYY"
                try { const [y,mo] = m.split('-'); return new Date(Number(y), Number(mo)-1).toLocaleString(undefined, { month:'short', year:'numeric' }); } catch { return m; }
            });
            window.financialReportChart.data.datasets[0].data = months.map(m => byMonth[m].billed);
            window.financialReportChart.data.datasets[1].data = months.map(m => byMonth[m].collected);
            window.financialReportChart.update();
        }

        if (window.reportBreakdownChart) {
            const paid = billing.filter(b => b.status === 'Paid').reduce((s,b) => s + (Number(b.amount)||0),0);
            const partial = billing.filter(b => b.status === 'Partial').reduce((s,b) => s + (Number(b.amount)||0),0);
            const unpaid = billing.filter(b => b.status === 'Unpaid' || b.status === undefined).reduce((s,b) => s + (Number(b.amount)||0),0);
            window.reportBreakdownChart.data.datasets[0].data = [paid, partial, unpaid];
            window.reportBreakdownChart.update();
        }

        // keep existing charts in sync
        if (window.revenueTrendChart || window.revenueBreakdownChart) {
            // existing logic already present earlier in file - ensure it's called as well
            try {
                const byDate = {};
                billing.forEach(b => { byDate[b.date] = (byDate[b.date] || 0) + (Number(b.amount) || 0); });
                const dates = Object.keys(byDate).sort();
                if (window.revenueTrendChart) {
                    window.revenueTrendChart.data.labels = dates;
                    window.revenueTrendChart.data.datasets[0].data = dates.map(d => byDate[d]);
                    window.revenueTrendChart.update();
                }
                if (window.revenueBreakdownChart) {
                    const paid = billing.filter(b => b.status === 'Paid').reduce((s,b) => s + (Number(b.amount)||0),0);
                    const unpaid = billing.filter(b => b.status !== 'Paid').reduce((s,b) => s + (Number(b.amount)||0),0);
                    window.revenueBreakdownChart.data.datasets[0].data = [paid, unpaid];
                    window.revenueBreakdownChart.update();
                }
            } catch (e) { console.warn(e); }
        }
    }

// ensure reports view refreshes charts
    const originalShowView = showView;
    showView = (viewId) => {
        originalShowView(viewId);
        if (viewId === 'reports-view') {
            // initialize charts if not yet created and refresh data
            initDashboardCharts();
            updateDashboardCharts();
        }
    };
