/* =====================================================
   cookieesandcakes – Admin JavaScript
   Handles: dashboard, orders list, order details,
            add/edit product, customers, reviews
   ===================================================== */

const ADMIN_API_BASE = (typeof window !== 'undefined' && window.API_BASE_URL) || window.location.origin;

function getAdminToken() {
    try {
        return localStorage.getItem('admin_token');
    } catch (_) {
        return null;
    }
}

function clearAdminAuth() {
    try {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
    } catch (_) {
        // ignore
    }
}

async function adminFetch(path, options = {}) {
    const token = getAdminToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    options.headers = { ...headers, ...options.headers };

    const res = await fetch(ADMIN_API_BASE + path, options);
    const contentType = res.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
        const text = await res.text();
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
            throw new Error('The server returned an HTML page instead of a JSON response. Please check the API URL.');
        }
        throw new Error('The server returned an unexpected response. Please check the API URL.');
    }

    if (res.status === 401) {
        clearAdminAuth();
        window.location.href = '/admin/login';
        throw new Error('Unauthorized. Please log in again.');
    }

    return res;
}

document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;

    if (path.includes('admin-login.html')) {
        return;
    }

    try {
        const res = await adminFetch('/api/admin/session');
        const data = await res.json();
        if (!data.loggedIn) {
            window.location.href = '/admin/login';
            return;
        }
    } catch (err) {
        window.location.href = '/admin/login';
        return;
    }

    if (path.includes('admin-dashboard.html')) {
        initDashboard();
    } else if (path.includes('admin-add-product.html')) {
        initAddProduct();
    } else if (path.includes('admin-order-details.html')) {
        initOrderDetails();
    }
});

document.addEventListener('click', async (e) => {
    const logoutLink = e.target.closest('.logout-link');
    if (logoutLink) {
        e.preventDefault();
        try {
            await adminFetch('/api/admin/logout', { method: 'POST' });
        } catch (err) {
            console.error('Logout failed:', err);
        }
        clearAdminAuth();
        window.location.href = '/admin/login';
    }
});

/* ─────────────────────────────────────────
   DASHBOARD
   ───────────────────────────────────────── */
async function initDashboard() {
    // Stat cards
    try {
            const statsRes = await adminFetch('/api/admin/stats');
        const stats = await statsRes.json();
        animateCounter('stat-total-orders', stats.totalOrders || 0);
        animateCounter('stat-pending-orders', stats.pendingOrders || 0);
        animateCounter('stat-total-users', stats.totalUsers || 0);
        const revEl = document.getElementById('stat-total-revenue');
        if (revEl) {
            animateCounter('stat-total-revenue', Math.round(stats.totalRevenue || 0), '$');
        }
    } catch (err) {
        console.error('Failed to load stats:', err);
    }

    // Recent orders table
    try {
            const ordersRes = await adminFetch('/api/admin/orders');
        const orders = await ordersRes.json();
        const tbody = document.getElementById('admin-orders-table');
        if (tbody && orders.length > 0) {
            tbody.innerHTML = '';
            orders.slice(0, 5).forEach((order, idx) => {
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-surface-container-low transition-colors';
                tr.style.opacity = '0';
                tr.style.transform = 'translateY(10px)';
                tr.style.transition = `opacity 0.4s ease ${idx * 80}ms, transform 0.4s ease ${idx * 80}ms`;
                tr.innerHTML = `
                    <td class="px-gutter py-4 font-bold text-secondary">#${(order.id || '').slice(-6).toUpperCase()}</td>
                    <td class="px-gutter py-4">${order.customerName || 'Guest'}</td>
                    <td class="px-gutter py-4">${new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td class="px-gutter py-4 font-semibold">$${(order.total || 0).toFixed(2)}</td>
                    <td class="px-gutter py-4">${statusBadge(order.status)}</td>
                    <td class="px-gutter py-4 text-right">
                        <a href="/admin-order-details.html?id=${order.id}" class="bg-secondary/10 text-secondary hover:bg-secondary hover:text-white px-4 py-2 rounded-lg text-label-sm font-bold transition-all">View Details</a>
                    </td>
                `;
                tbody.appendChild(tr);
                setTimeout(() => { tr.style.opacity = '1'; tr.style.transform = 'translateY(0)'; }, 50 + idx * 80);
            });
        }
    } catch (err) {
        console.error('Failed to load orders:', err);
    }

    // Products grid
    try {
            const prodRes = await adminFetch('/api/products');
        const products = await prodRes.json();
        const grid = document.getElementById('admin-products-grid');
        if (grid && products.length > 0) {
            grid.innerHTML = '';
            products.forEach(p => {
                const div = document.createElement('div');
                div.className = 'bg-surface-container rounded-xl shadow-sm overflow-hidden border border-primary/5 flex flex-col hover:shadow-md transition-shadow group';
                div.innerHTML = `
                    <div class="h-48 w-full overflow-hidden relative">
                        <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${p.image}" alt="${p.name}">
                        ${p.tags && p.tags.length ? `<div class="absolute top-3 left-3"><span class="bg-white/90 backdrop-blur text-secondary text-[10px] uppercase font-bold px-3 py-1 rounded-full shadow-sm">${p.tags[0]}</span></div>` : ''}
                    </div>
                    <div class="p-gutter flex flex-col flex-1">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <span class="text-outline text-label-sm capitalize">${p.category || 'misc'}</span>
                                <h4 class="font-headline-md text-[20px] text-primary">${p.name}</h4>
                            </div>
                            <span class="font-bold text-secondary">$${parseFloat(p.price || 0).toFixed(2)}</span>
                        </div>
                        <p class="text-on-surface-variant text-sm mb-gutter line-clamp-2">${p.description || ''}</p>
                        <button onclick="openEditProduct('${p.id}')" class="mt-auto w-full border border-secondary text-secondary font-bold py-2 rounded-lg hover:bg-secondary hover:text-white transition-all">Edit Product</button>
                    </div>
                `;
                grid.appendChild(div);
            });
        }
    } catch (err) {
        console.error('Failed to load products:', err);
    }

    // Recent customers
    try {
            const usersRes = await adminFetch('/api/admin/users');
        const users = await usersRes.json();
        const container = document.getElementById('admin-customers-list');
        if (container && users.length > 0) {
            container.innerHTML = '';
            const colors = ['bg-primary/10 text-primary border-primary/10', 'bg-secondary/10 text-secondary border-secondary/10', 'bg-tertiary-fixed-dim/30 text-on-tertiary-fixed-variant border-tertiary-fixed-dim/40'];
            users.slice(0, 4).forEach((u, i) => {
                const initials = (u.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                const ago = timeAgo(u.createdAt);
                const colorClass = colors[i % colors.length];
                container.insertAdjacentHTML('beforeend', `
                    <div class="flex items-center gap-4 p-3 hover:bg-surface-container-high/50 rounded-lg transition-colors group">
                        <div class="w-12 h-12 rounded-full ${colorClass} flex items-center justify-center font-bold border">${initials}</div>
                        <div class="flex-1 min-w-0">
                            <h5 class="font-bold text-on-surface truncate">${u.name || u.email}</h5>
                            <p class="text-label-sm text-outline">Joined ${ago}</p>
                        </div>
                        <button class="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full hover:bg-white">
                            <span class="material-symbols-outlined text-outline">more_vert</span>
                        </button>
                    </div>
                    <div class="dotted-line"></div>
                `);
            });
            // Remove last dotted line
            const lines = container.querySelectorAll('.dotted-line');
            if (lines.length) lines[lines.length - 1].remove();
        }
    } catch (err) {
        console.error('Failed to load customers:', err);
    }
}

/* ─────────────────────────────────────────
   ALL ORDERS PAGE
   ───────────────────────────────────────── */
async function initOrdersList() {
    let allOrders = [];
    let currentFilter = 'all';
    let searchQuery = '';

    try {
            const res = await adminFetch('/api/admin/orders');
        allOrders = await res.json();
    } catch (err) {
        console.error('Failed to load orders:', err);
    }

    function renderOrders() {
        const tbody = document.getElementById('orders-table-body');
        const emptyState = document.getElementById('orders-empty');
        const countEl = document.getElementById('orders-count');
        if (!tbody) return;

        const statusAlias = (s) => s === 'Approved' ? 'Confirmed' : s === 'Completed' ? 'Delivered' : s === 'Declined' ? 'Cancelled' : s;

        let filtered = allOrders.filter(o => {
            const matchStatus = currentFilter === 'all' || statusAlias(o.status) === currentFilter;
            const q = searchQuery.toLowerCase();
            const matchSearch = !q ||
                (o.customerName || '').toLowerCase().includes(q) ||
                (o.id || '').toLowerCase().includes(q) ||
                (o.customerEmail || '').toLowerCase().includes(q);
            return matchStatus && matchSearch;
        });

        if (countEl) countEl.textContent = `${filtered.length} order${filtered.length !== 1 ? 's' : ''}`;

        tbody.innerHTML = '';
        if (filtered.length === 0) {
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }
        if (emptyState) emptyState.classList.add('hidden');

        filtered.forEach((order, idx) => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-surface-container-low transition-colors';
            tr.style.opacity = '0';
            tr.style.transform = 'translateY(8px)';
            tr.style.transition = `opacity 0.35s ease ${idx * 50}ms, transform 0.35s ease ${idx * 50}ms`;
            tr.innerHTML = `
                <td class="px-gutter py-4 font-bold text-secondary">#${(order.id || '').slice(-6).toUpperCase()}</td>
                <td class="px-gutter py-4">
                    <div class="font-semibold text-on-surface">${order.customerName || 'Guest'}</div>
                    <div class="text-label-sm text-outline">${order.customerEmail || ''}</div>
                </td>
                <td class="px-gutter py-4">${new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                <td class="px-gutter py-4">${order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</td>
                <td class="px-gutter py-4 font-semibold">$${(order.total || 0).toFixed(2)}</td>
                <td class="px-gutter py-4">${statusBadge(order.status)}</td>
                <td class="px-gutter py-4 text-right">
                    <a href="/admin-order-details.html?id=${order.id}" class="bg-secondary/10 text-secondary hover:bg-secondary hover:text-white px-4 py-2 rounded-lg text-label-sm font-bold transition-all">Update Status</a>
                </td>
            `;
            tbody.appendChild(tr);
            setTimeout(() => { tr.style.opacity = '1'; tr.style.transform = 'translateY(0)'; }, 30 + idx * 50);
        });
    }

    // Filter tabs
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('bg-secondary', 'text-white'));
            btn.classList.add('bg-secondary', 'text-white');
            currentFilter = btn.dataset.filter;
            renderOrders();
        });
    });

    // Search
    const searchInput = document.getElementById('orders-search');
    if (searchInput) {
        searchInput.addEventListener('input', e => { searchQuery = e.target.value; renderOrders(); });
    }

    renderOrders();
}

/* ─────────────────────────────────────────
   ORDER DETAILS
   ───────────────────────────────────────── */
async function initOrderDetails() {
    const loadingEl = document.getElementById('order-loading');
    const errorEl = document.getElementById('order-error');
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (errorEl) errorEl.classList.add('hidden');

    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('id');
    if (!orderId) {
        if (loadingEl) loadingEl.classList.add('hidden');
        if (errorEl) { errorEl.textContent = 'Order ID not found in URL.'; errorEl.classList.remove('hidden'); }
        showToast('Order ID not found in URL.', 'error');
        return;
    }

    try {
            const res = await adminFetch(`/api/orders/${orderId}`);
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || 'Failed to fetch order');
        }
        const order = await res.json();

        // Header
        setEl('order-id-display', `Order #${(order.id || '').slice(-6).toUpperCase()}`);
        setEl('order-date-display', `Placed on ${new Date(order.createdAt).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}`);

        // Customer
        setEl('customer-name', order.customerName || 'Guest');
        const emailEl = document.getElementById('customer-email');
        if (emailEl) emailEl.innerHTML = `<span class="material-symbols-outlined text-sm">mail</span> ${order.customerEmail || 'N/A'}`;
        const phoneEl = document.getElementById('customer-phone');
        if (phoneEl) phoneEl.innerHTML = `<span class="material-symbols-outlined text-sm">call</span> ${order.customerPhone || 'N/A'}`;

        // Delivery
        const addrEl = document.getElementById('delivery-address');
        if (addrEl) addrEl.textContent = order.address || order.shippingAddress || 'N/A';
        const instrEl = document.getElementById('delivery-instructions');
        if (instrEl) instrEl.textContent = order.specialInstructions ? `"${order.specialInstructions}"` : 'None';

        // Items
        const itemsList = document.getElementById('order-items-list');
        if (itemsList && order.items) {
            const items = typeof order.items === 'object' ? Object.values(order.items) : order.items;
            const itemCount = items.length;
            const countEl = document.getElementById('order-item-count');
            if (countEl) countEl.textContent = `${itemCount} Item${itemCount !== 1 ? 's' : ''} Total`;
            itemsList.innerHTML = '';
            items.forEach(item => {
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-background transition-colors group';
                tr.innerHTML = `
                    <td class="px-md py-4">
                        <div class="flex items-center gap-4">
                            <div class="w-16 h-16 rounded-lg bg-surface-container-highest overflow-hidden shadow-sm group-hover:scale-105 transition-transform">
                                <img src="${item.image || ''}" alt="${item.name}" class="w-full h-full object-cover">
                            </div>
                            <div>
                                <p class="font-body-lg font-bold text-primary">${item.name}</p>
                                <p class="font-label-sm text-on-surface-variant">${item.unit || ''}</p>
                            </div>
                        </div>
                    </td>
                    <td class="px-md py-4"><span class="font-body-md text-on-surface">${item.quantity}</span></td>
                    <td class="px-md py-4"><span class="font-body-md text-on-surface">$${parseFloat(item.price || 0).toFixed(2)}</span></td>
                    <td class="px-md py-4">
                        ${item.personalization ? `<div class="flex items-center gap-2 text-secondary font-body-md italic"><span class="material-symbols-outlined text-sm">edit_note</span> "${item.personalization}"</div>` : '<span class="text-on-surface-variant font-body-md opacity-40">None</span>'}
                    </td>
                    <td class="px-md py-4 text-right"><span class="font-body-lg font-bold text-primary">$${(parseFloat(item.price || 0) * (item.quantity || 1)).toFixed(2)}</span></td>
                `;
                itemsList.appendChild(tr);
            });
        }

        // Summary
        const subtotal = order.total || 0;
        const delivery = 5.00;
        const tax = parseFloat((subtotal * 0.11).toFixed(2));
        const total = subtotal + delivery;
        setEl('order-subtotal', `$${subtotal.toFixed(2)}`);
        setEl('order-delivery', `$${delivery.toFixed(2)}`);
        setEl('order-tax', `$${tax.toFixed(2)}`);
        setEl('order-total', `$${total.toFixed(2)}`);

        // Status tracker
        const statusSteps = ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'];
        updateStatusTracker(order.status || 'Pending', statusSteps);

        const statusDisplay = document.getElementById('current-status');
        if (statusDisplay) statusDisplay.textContent = order.status || 'Pending';

        // Status update form
        const statusSelect = document.getElementById('status-select');
        if (statusSelect) {
            statusSelect.value = order.status || 'Pending';
        }

        const saveStatusBtn = document.getElementById('save-status-btn');
        const cancelStatusBtn = document.getElementById('cancel-status-btn');
        const saveStatusText = document.getElementById('save-status-text');
        const saveStatusSpinner = document.getElementById('save-status-spinner');

        if (cancelStatusBtn) {
            cancelStatusBtn.addEventListener('click', () => {
                if (statusSelect) statusSelect.value = order.status || 'Pending';
            });
        }

        if (saveStatusBtn) {
            saveStatusBtn.addEventListener('click', async () => {
                if (!statusSelect) return;
                const newStatus = statusSelect.value;
                const validStatuses = ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];
                if (!validStatuses.includes(newStatus)) {
                    showToast('Invalid status selected.', 'error');
                    return;
                }

                saveStatusBtn.disabled = true;
                if (saveStatusText) saveStatusText.textContent = 'Saving...';
                if (saveStatusSpinner) saveStatusSpinner.classList.remove('hidden');

                try {
                    const res = await adminFetch(`/api/admin/orders/${orderId}/status`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: newStatus })
                    });
                    if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        throw new Error(errData.error || 'Failed to update status');
                    }

                    showToast('Order status updated successfully.', 'success');
                    window.location.href = '/admin/orders';
                } catch (err) {
                    showToast(err.message || 'Failed to update status.', 'error');
                } finally {
                    saveStatusBtn.disabled = false;
                    if (saveStatusText) saveStatusText.textContent = 'Save';
                    if (saveStatusSpinner) saveStatusSpinner.classList.add('hidden');
                }
            });
        }

        if (loadingEl) loadingEl.classList.add('hidden');
    } catch (err) {
        console.error(err);
        if (loadingEl) loadingEl.classList.add('hidden');
        if (errorEl) { errorEl.textContent = err.message || 'Failed to load order details.'; errorEl.classList.remove('hidden'); }
        showToast(err.message || 'Failed to load order details.', 'error');
    }
}

function updateStatusTracker(currentStatus, steps) {
    const currentIdx = steps.indexOf(currentStatus);
    const stepEls = document.querySelectorAll('[data-step]');
    const activeLine = document.getElementById('status-active-line');

    stepEls.forEach((el, i) => {
        const circle = el.querySelector('.step-circle');
        const label = el.querySelector('.step-label');
        if (!circle) return;
        if (i < currentIdx) {
            circle.className = 'step-circle w-10 h-10 rounded-full bg-secondary text-on-secondary flex items-center justify-center ring-4 ring-surface';
            circle.innerHTML = '<span class="material-symbols-outlined text-sm" style="font-variation-settings: \'FILL\' 1;">check</span>';
            if (label) { label.className = 'step-label font-label-sm text-on-surface font-bold'; }
        } else if (i === currentIdx) {
            circle.className = 'step-circle w-12 h-12 rounded-full bg-secondary text-on-secondary flex items-center justify-center ring-8 ring-secondary-container shadow-lg animate-pulse';
            circle.innerHTML = `<span class="material-symbols-outlined text-xl">${stepIcon(currentStatus)}</span>`;
            if (label) { label.className = 'step-label font-label-sm text-secondary font-bold'; }
        } else {
            circle.className = 'step-circle w-10 h-10 rounded-full bg-outline-variant text-on-surface-variant flex items-center justify-center ring-4 ring-surface';
            circle.innerHTML = '<span class="material-symbols-outlined text-sm">' + stepIcon(steps[i]) + '</span>';
            if (label) { label.className = 'step-label font-label-sm text-on-surface-variant'; }
        }
    });

    if (activeLine && currentIdx >= 0) {
        const pct = steps.length > 1 ? (currentIdx / (steps.length - 1)) * 100 : 0;
        activeLine.style.width = `${pct}%`;
    }
}

function stepIcon(status) {
    const icons = { 'Pending': 'schedule', 'Confirmed': 'thumb_up', 'Preparing': 'chef_hat', 'Out for Delivery': 'local_shipping', 'Delivered': 'check_circle', 'Cancelled': 'cancel' };
    return icons[status] || 'circle';
}

/* ─────────────────────────────────────────
   ADD / EDIT PRODUCT
   ───────────────────────────────────────── */
async function initAddProduct() {
    const form = document.getElementById('add-product-form');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('product-image-upload');
    const browseBtn = document.getElementById('browse-btn');
    const previewImg = document.getElementById('image-preview');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const cancelBtn = document.getElementById('cancel-btn');

    if (cancelBtn) cancelBtn.addEventListener('click', () => { window.location.href = 'admin-dashboard.html'; });

    // Check if editing
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    if (editId) {
        try {
                const res = await adminFetch(`/api/products/${editId}`);
            const p = await res.json();
            setInputVal('product-name', p.name);
            setInputVal('product-category', p.category);
            setInputVal('product-price', p.price);
            setInputVal('product-unit', p.unit);
            setInputVal('product-description', p.description);
            if (previewImg && p.image) {
                previewImg.src = p.image;
                previewImg.classList.remove('hidden');
                if (uploadPlaceholder) uploadPlaceholder.classList.add('hidden');
            }
            const heading = document.getElementById('form-heading');
            if (heading) heading.textContent = `Edit: ${p.name}`;
            const submitBtn = document.querySelector('[type="submit"]');
            if (submitBtn) submitBtn.innerHTML = '<span class="material-symbols-outlined">save</span> Save Changes';
        } catch (err) {
            showToast('Failed to load product.', 'error');
        }
    }

    // Browse files
    if (browseBtn && fileInput) browseBtn.addEventListener('click', () => fileInput.click());
    if (dropZone && fileInput) dropZone.addEventListener('click', () => fileInput.click());

    // File input change
    if (fileInput) {
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (file) previewFile(file, previewImg, uploadPlaceholder);
        });
    }

    // Drag and drop
    if (dropZone && fileInput) dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('border-secondary', 'bg-white'); });
    if (dropZone && fileInput) dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-secondary', 'bg-white'));
    if (dropZone && fileInput) dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('border-secondary', 'bg-white');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            if (fileInput) {
                const dt = new DataTransfer();
                dt.items.add(file);
                fileInput.files = dt.files;
            }
            previewFile(file, previewImg, uploadPlaceholder);
        }
    });

    if (!form) return;
    form.addEventListener('submit', async e => {
        e.preventDefault();
        const name = document.getElementById('product-name')?.value?.trim();
        const category = document.getElementById('product-category')?.value;
        const price = document.getElementById('product-price')?.value;
        const unit = document.getElementById('product-unit')?.value?.trim();
        const description = document.getElementById('product-description')?.value?.trim();
        const imageFile = fileInput?.files[0];

        let image = previewImg?.src || '';
        if (imageFile) {
            image = await fileToDataURL(imageFile);
        }

        const submitBtn = form.querySelector('[type="submit"]');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">autorenew</span> Saving...'; }

        try {
            let res;
            if (editId) {
                res = await adminFetch(`/api/admin/products/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, category, price, unit, description, image })
                });
            } else {
                const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                res = await adminFetch('/api/admin/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, name, category, price, unit, description, image })
                });
            }
            if (res.ok) {
                showToast(editId ? 'Product updated!' : 'Product added!', 'success');
                setTimeout(() => { window.location.href = 'admin-dashboard.html'; }, 1200);
            } else {
                const data = await res.json();
                showToast('Error: ' + (data.error || 'Unknown error'), 'error');
                if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<span class="material-symbols-outlined">save</span> Save Product'; }
            }
        } catch (err) {
            showToast('Failed to save product.', 'error');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<span class="material-symbols-outlined">save</span> Save Product'; }
        }
    });

    // Delete button (edit mode only)
    const deleteBtn = document.getElementById('delete-product-btn');
    if (deleteBtn && editId) {
        deleteBtn.classList.remove('hidden');
        deleteBtn.addEventListener('click', async () => {
            if (!confirm(`Are you sure you want to delete this product? This cannot be undone.`)) return;
            try {
                const res = await adminFetch(`/api/admin/products/${editId}`, { method: 'DELETE' });
                if (res.ok) {
                    showToast('Product deleted.', 'success');
                    setTimeout(() => { window.location.href = 'admin-dashboard.html'; }, 1200);
                } else {
                    showToast('Failed to delete product.', 'error');
                }
            } catch (err) {
                showToast('Failed to delete product.', 'error');
            }
        });
    }
}

function openEditProduct(productId) {
    window.location.href = `admin-add-product.html?edit=${productId}`;
}

/* ─────────────────────────────────────────
   CUSTOMERS PAGE
   ───────────────────────────────────────── */
async function initCustomers() {
    let users = [];
    let orders = [];

    try {
        const [usersRes, ordersRes] = await Promise.all([adminFetch('/api/admin/users'), adminFetch('/api/admin/orders')]);
        users = await usersRes.json();
        orders = await ordersRes.json();
    } catch (err) {
        console.error('Failed to load customers:', err);
    }

    // Build order count map
    const orderCountMap = {};
    const totalSpentMap = {};
    orders.forEach(o => {
        const uid = o.userId;
        if (uid) {
            orderCountMap[uid] = (orderCountMap[uid] || 0) + 1;
            totalSpentMap[uid] = (totalSpentMap[uid] || 0) + (o.total || 0);
        }
    });

    const totalEl = document.getElementById('customers-total');
    if (totalEl) totalEl.textContent = users.length;

    function renderCustomers() {
        const grid = document.getElementById('customers-grid');
        if (!grid) return;
        const q = searchQuery.toLowerCase();
        const filtered = users.filter(u => !q || (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
        grid.innerHTML = '';
        if (filtered.length === 0) {
            grid.innerHTML = '<p class="text-on-surface-variant col-span-full text-center py-12">No customers found.</p>';
            return;
        }
        const colors = ['bg-primary/10 text-primary', 'bg-secondary/10 text-secondary', 'bg-tertiary-fixed-dim/30 text-on-tertiary-fixed-variant'];
        filtered.forEach((u, i) => {
            const initials = (u.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            const oCount = orderCountMap[u.id] || 0;
            const spent = totalSpentMap[u.id] || 0;
            const colorClass = colors[i % colors.length];
            const card = document.createElement('div');
            card.className = 'bg-surface-container rounded-xl p-gutter border border-primary/5 hover:shadow-md transition-all';
            card.innerHTML = `
                <div class="flex items-start gap-4 mb-4">
                    <div class="w-14 h-14 rounded-full ${colorClass} flex items-center justify-center font-bold text-lg border border-current/20 shrink-0">${initials}</div>
                    <div class="flex-1 min-w-0">
                        <h4 class="font-bold text-on-surface truncate">${u.name || 'Unknown'}</h4>
                        <p class="text-label-sm text-outline truncate">${u.email || ''}</p>
                        <p class="text-label-sm text-on-surface-variant mt-1">Joined ${timeAgo(u.createdAt)}</p>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div class="bg-surface-container-low p-3 rounded-lg text-center">
                        <div class="text-lg font-bold text-primary">${oCount}</div>
                        <div class="text-[11px] uppercase text-outline tracking-wide">Orders</div>
                    </div>
                    <div class="bg-surface-container-low p-3 rounded-lg text-center">
                        <div class="text-lg font-bold text-secondary">$${spent.toFixed(2)}</div>
                        <div class="text-[11px] uppercase text-outline tracking-wide">Spent</div>
                    </div>
                </div>
                ${u.phone ? `<p class="mt-3 text-label-sm text-outline flex items-center gap-2"><span class="material-symbols-outlined text-sm">call</span>${u.phone}</p>` : ''}
            `;
            grid.appendChild(card);
        });
    }

    const searchInput = document.getElementById('customers-search');
    let searchQuery = '';
    if (searchInput) {
        searchInput.addEventListener('input', e => { searchQuery = e.target.value; renderCustomers(); });
    }

    renderCustomers();
}

/* ─────────────────────────────────────────
   REVIEWS PAGE
   ───────────────────────────────────────── */
async function initReviews() {
    let reviews = [];
    try {
            const res = await adminFetch('/api/admin/reviews');
        reviews = await res.json();
    } catch (err) {
        console.error('Failed to load reviews:', err);
    }

    const totalEl = document.getElementById('reviews-total');
    const avgEl = document.getElementById('reviews-avg');
    if (totalEl) totalEl.textContent = reviews.length;
    if (avgEl && reviews.length) {
        const avg = reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;
        avgEl.textContent = avg.toFixed(1);
    }

    function renderReviews(filter = 'all') {
        const list = document.getElementById('reviews-list');
        if (!list) return;
        const filtered = filter === 'all' ? reviews : reviews.filter(r => String(r.rating) === filter);
        list.innerHTML = '';
        if (filtered.length === 0) {
            list.innerHTML = '<p class="text-on-surface-variant text-center py-12 col-span-full">No reviews found.</p>';
            return;
        }
        filtered.forEach((r, idx) => {
            const stars = Array.from({ length: 5 }, (_, i) =>
                `<span class="material-symbols-outlined text-[18px] text-secondary" style="font-variation-settings: 'FILL' ${i < r.rating ? 1 : 0};">star</span>`
            ).join('');
            const card = document.createElement('div');
            card.className = 'bg-surface-container rounded-xl p-gutter border border-primary/5 hover:shadow-md transition-shadow';
            card.style.opacity = '0';
            card.style.transform = 'translateY(8px)';
            card.style.transition = `opacity 0.35s ease ${idx * 50}ms, transform 0.35s ease ${idx * 50}ms`;
            card.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <div class="flex gap-0.5">${stars}</div>
                    <span class="text-[11px] text-outline italic">${timeAgo(r.createdAt)}</span>
                </div>
                <p class="text-body-md italic text-on-surface-variant mb-4">"${r.comment}"</p>
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold flex items-center justify-center">
                            ${(r.userName || 'A').slice(0, 2).toUpperCase()}
                        </div>
                        <span class="font-bold text-label-sm">${r.userName || 'Anonymous'}</span>
                    </div>
                    <span class="text-label-sm text-outline capitalize">${r.productId?.replace(/-/g, ' ') || ''}</span>
                </div>
            `;
            list.appendChild(card);
            setTimeout(() => { card.style.opacity = '1'; card.style.transform = 'translateY(0)'; }, 30 + idx * 50);
        });
    }

    document.querySelectorAll('[data-rating-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-rating-filter]').forEach(b => b.classList.remove('bg-secondary', 'text-white'));
            btn.classList.add('bg-secondary', 'text-white');
            renderReviews(btn.dataset.ratingFilter);
        });
    });

    renderReviews();
}

/* ─────────────────────────────────────────
   UTILITIES
   ───────────────────────────────────────── */
function statusBadge(status) {
    const normalizedStatus = status === 'Approved' ? 'Confirmed' : status === 'Completed' ? 'Delivered' : status === 'Declined' ? 'Cancelled' : status;
    const map = {
        'Pending': 'bg-amber-100 text-amber-800 border-amber-200',
        'Confirmed': 'bg-blue-100 text-blue-800 border-blue-200',
        'Preparing': 'bg-orange-100 text-orange-800 border-orange-200',
        'Out for Delivery': 'bg-purple-100 text-purple-800 border-purple-200',
        'Delivered': 'bg-green-100 text-green-800 border-green-200',
        'Cancelled': 'bg-red-100 text-red-800 border-red-200',
    };
    const cls = map[normalizedStatus] || 'bg-gray-100 text-gray-700 border-gray-200';
    return `<span class="${cls} text-xs px-3 py-1 rounded-full border font-semibold">${status || 'Unknown'}</span>`;
}

function setEl(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function setInputVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
}

function timeAgo(ts) {
    if (!ts) return 'Unknown';
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function animateCounter(id, target, prefix = '') {
    const el = document.getElementById(id);
    if (!el) return;
    const duration = 1000;
    const start = performance.now();
    function step(now) {
        const p = Math.min((now - start) / duration, 1);
        const val = Math.floor(p * target);
        el.textContent = prefix + val.toLocaleString();
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = prefix + target.toLocaleString();
    }
    requestAnimationFrame(step);
}

function previewFile(file, imgEl, placeholderEl) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        if (imgEl) { imgEl.src = e.target.result; imgEl.classList.remove('hidden'); }
        if (placeholderEl) placeholderEl.classList.add('hidden');
    };
    reader.readAsDataURL(file);
}

function fileToDataURL(file) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}

function showToast(message, type = 'success') {
    const existing = document.getElementById('admin-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'admin-toast';
    const bgColor = type === 'success' ? 'bg-green-700' : 'bg-red-700';
    toast.className = `fixed bottom-6 right-6 z-50 ${bgColor} text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 font-semibold text-sm transition-all`;
    toast.innerHTML = `<span class="material-symbols-outlined">${type === 'success' ? 'check_circle' : 'error'}</span> ${message}`;
    toast.style.transform = 'translateY(20px)';
    toast.style.opacity = '0';
    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.transform = 'translateY(0)'; toast.style.opacity = '1'; toast.style.transition = 'all 0.3s ease'; });
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(10px)'; setTimeout(() => toast.remove(), 400); }, 3000);
}
