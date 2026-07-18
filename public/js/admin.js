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

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 401) {
            clearAdminAuth();
            window.location.href = '/admin/login';
        }
        throw new Error(errData.error || `Request failed with status ${res.status}`);
    }

    return res;
}

async function initAdminPage() {
    const path = window.location.pathname;
    console.log('[admin] initAdminPage path=', path, 'readyState=', document.readyState);

    if (path.includes('admin-login.html')) {
        console.log('[admin] skipping login page');
        return;
    }

    try {
        const res = await adminFetch('/api/admin/session');
        const data = await res.json();
        console.log('[admin] session check', data);
        if (!data.loggedIn) {
            console.log('[admin] not logged in, redirecting');
            window.location.href = '/admin/login';
            return;
        }
    } catch (err) {
        console.log('[admin] session check error', err);
        window.location.href = '/admin/login';
        return;
    }

    const normalizedPath = path.replace(/\/+$/, '');
    if (normalizedPath === '/admin/dashboard' || normalizedPath.includes('admin-dashboard')) {
        console.log('[admin] initializing dashboard');
        initDashboard();
    } else if (normalizedPath === '/admin/orders' || normalizedPath.includes('admin-orders')) {
        console.log('[admin] initializing orders list');
        initOrdersList();
    } else if (normalizedPath === '/admin/add-product' || normalizedPath.includes('admin-add-product')) {
        initAddProduct();
    } else if (normalizedPath.includes('admin-order-details')) {
        initOrderDetails();
    } else if (normalizedPath.includes('admin-customers')) {
        initCustomers();
    } else if (normalizedPath.includes('admin-reviews')) {
        initReviews();
    } else {
        console.log('[admin] no matching page init for path', path, 'normalized', normalizedPath);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminPage);
} else {
    initAdminPage();
}

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

async function loadAdminProducts() {
    const grid = document.getElementById('admin-products-grid');
    if (!grid) return;

    grid.innerHTML = `
        <div class="col-span-full flex justify-center items-center py-12 text-on-surface-variant">
            <span class="material-symbols-outlined animate-spin text-secondary/40 mr-2">autorenew</span>
            <span class="font-body-md">Loading products...</span>
        </div>
    `;

    try {
        const prodRes = await adminFetch('/api/products');
        const products = await prodRes.json();

        if (!Array.isArray(products)) {
            throw new Error('Invalid products response from server.');
        }

        grid.innerHTML = '';

        if (products.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center py-12 text-center">
                    <span class="material-symbols-outlined text-5xl text-outline-variant mb-3">inventory_2</span>
                    <p class="font-headline-md text-headline-md text-primary mb-2">No products available</p>
                    <p class="font-body-md text-on-surface-variant mb-4">Get started by adding your first product.</p>
                    <a href="/admin-add-product.html" class="bg-secondary text-white px-6 py-2 rounded-full font-bold hover:opacity-90 transition-all">Add New Product</a>
                </div>
            `;
            return;
        }

        products.forEach(p => {
            const card = document.createElement('div');
            card.className = 'bg-surface-container rounded-xl shadow-sm overflow-hidden border border-primary/5 flex flex-col hover:shadow-md transition-shadow group';
            card.innerHTML = `
                <div class="h-48 w-full overflow-hidden relative">
                    <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer" src="${p.image || ''}" alt="${p.name || 'Product'}" onclick="window.open('/treat-${p.id}.html','_blank')">
                    ${p.tags && p.tags.length ? `<div class="absolute top-3 left-3"><span class="bg-white/90 backdrop-blur text-secondary text-[10px] uppercase font-bold px-3 py-1 rounded-full shadow-sm">${p.tags[0]}</span></div>` : ''}
                </div>
                <div class="p-gutter flex flex-col flex-1">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <span class="text-outline text-label-sm capitalize">${p.category || 'misc'}</span>
                            <h4 class="font-headline-md text-[20px] text-primary">${p.name}</h4>
                        </div>
                        <span class="font-bold text-secondary">${window.App.formatPrice(p.price || 0)}</span>
                    </div>
                    <p class="text-on-surface-variant text-sm mb-2 line-clamp-2">${p.description || ''}</p>
                    <div class="flex flex-wrap gap-2 mb-3 text-xs text-on-surface-variant">
                        <span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">inventory</span> Stock: ${p.stock ?? 0}</span>
                        <span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">check_circle</span> ${p.availability || 'In Stock'}</span>
                        ${p.sku ? `<span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">qr_code</span> SKU: ${p.sku}</span>` : ''}
                    </div>
                    <div class="mt-auto flex gap-2">
                        <button onclick="openEditProduct('${p.id}')" class="flex-1 border border-secondary text-secondary font-bold py-2 rounded-lg hover:bg-secondary hover:text-white transition-all text-sm">Edit</button>
                        <button onclick="openDeleteProduct('${p.id}')" class="flex-1 border border-error text-error font-bold py-2 rounded-lg hover:bg-error hover:text-white transition-all text-sm">Delete</button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (err) {
        console.error('Failed to load products:', err);
        grid.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-12 text-center">
                <span class="material-symbols-outlined text-5xl text-error mb-3">error</span>
                <p class="font-headline-md text-headline-md text-primary mb-2">Failed to load products</p>
                <p class="font-body-md text-on-surface-variant mb-4">${err.message || 'Please check your connection and try again.'}</p>
                <button onclick="loadAdminProducts()" class="bg-secondary text-white px-6 py-2 rounded-full font-bold hover:opacity-90 transition-all">Retry</button>
            </div>
        `;
    }
}

async function initDashboard() {
    // Check for product refresh signal from add/edit page
    const refreshFlag = localStorage.getItem('adminProductsRefresh');
    if (refreshFlag) {
        localStorage.removeItem('adminProductsRefresh');
    }

    // Stat cards
    try {
            const statsRes = await adminFetch('/api/admin/stats');
        const stats = await statsRes.json();
        animateCounter('stat-total-orders', stats.totalOrders || 0);
        animateCounter('stat-pending-orders', stats.pendingOrders || 0);
        animateCounter('stat-total-users', stats.totalUsers || 0);
        const revEl = document.getElementById('stat-total-revenue');
        if (revEl) {
            animateCounter('stat-total-revenue', Math.round(stats.totalRevenue || 0), '₹');
        }
    } catch (err) {
        console.error('Failed to load stats:', err);
    }

    // Recent orders table
    const tbody = document.getElementById('admin-orders-table');
    if (tbody) tbody.innerHTML = '';

    try {
            const ordersRes = await adminFetch('/api/admin/orders');
        const orders = await ordersRes.json();
        if (tbody && orders.length > 0) {
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
                    <td class="px-gutter py-4 font-semibold">${window.App.formatPrice(order.total || 0)}</td>
                    <td class="px-gutter py-4">${statusBadge(order.status)}</td>
                    <td class="px-gutter py-4 text-right">
                        <a href="/admin-order-details.html?orderId=${order.id}" class="bg-secondary/10 text-secondary hover:bg-secondary hover:text-white px-4 py-2 rounded-lg text-label-sm font-bold transition-all">View Details</a>
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
    await loadAdminProducts();

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
                <td class="px-gutter py-4 font-semibold">${window.App.formatPrice(order.total || 0)}</td>
                <td class="px-gutter py-4">${statusBadge(order.status)}</td>
                <td class="px-gutter py-4 text-right">
                    <a href="/admin-order-details.html?orderId=${order.id}" class="bg-secondary/10 text-secondary hover:bg-secondary hover:text-white px-4 py-2 rounded-lg text-label-sm font-bold transition-all">Update Status</a>
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
    const orderId = params.get('orderId');
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
                    <td class="px-md py-4"><span class="font-body-md text-on-surface">${window.App.formatPrice(item.price || 0)}</span></td>
                    <td class="px-md py-4">
                        ${item.personalization ? `<div class="flex items-center gap-2 text-secondary font-body-md italic"><span class="material-symbols-outlined text-sm">edit_note</span> "${item.personalization}"</div>` : '<span class="text-on-surface-variant font-body-md opacity-40">None</span>'}
                    </td>
                    <td class="px-md py-4 text-right"><span class="font-body-lg font-bold text-primary">${window.App.formatPrice(parseFloat(item.price || 0) * (item.quantity || 1))}</span></td>
                `;
                itemsList.appendChild(tr);
            });
        }

        // Summary
        const subtotal = order.total || 0;
        const delivery = 5.00;
        const tax = parseFloat((subtotal * 0.11).toFixed(2));
        const total = subtotal + delivery;
        setEl('order-subtotal', window.App.formatPrice(subtotal));
        setEl('order-delivery', window.App.formatPrice(delivery));
        setEl('order-tax', window.App.formatPrice(tax));
        setEl('order-total', window.App.formatPrice(total));

        // Status tracker
        const statusSteps = ['Pending', 'Confirmed', 'Preparing', 'Shipped', 'Out for Delivery', 'Delivered'];
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
                const validStatuses = ['Pending', 'Confirmed', 'Preparing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
                if (!validStatuses.includes(newStatus)) {
                    showToast('Invalid status selected.', 'error');
                    return;
                }

                const validTransitions = {
                    'Pending': ['Confirmed', 'Cancelled'],
                    'Confirmed': ['Preparing', 'Cancelled'],
                    'Preparing': ['Shipped', 'Cancelled'],
                    'Shipped': ['Out for Delivery', 'Cancelled'],
                    'Out for Delivery': ['Delivered', 'Cancelled'],
                    'Delivered': [],
                    'Cancelled': []
                };
                const allowed = validTransitions[order.status] || [];
                if (!allowed.includes(newStatus)) {
                    showToast(`Cannot change status from ${order.status} to ${newStatus}.`, 'error');
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
    const icons = { 'Pending': 'schedule', 'Confirmed': 'thumb_up', 'Preparing': 'chef_hat', 'Shipped': 'local_shipping', 'Out for Delivery': 'local_shipping', 'Delivered': 'check_circle', 'Cancelled': 'cancel' };
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
    const imagePreviews = document.getElementById('image-previews');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const cancelBtn = document.getElementById('cancel-btn');

    if (cancelBtn) cancelBtn.addEventListener('click', () => { window.location.href = 'admin-dashboard.html'; });

    // Category management
    const categorySelect = document.getElementById('product-category');
    if (categorySelect) {
        populateCategoryDropdown(categorySelect);
        categorySelect.addEventListener('change', () => {
            if (categorySelect.value === '__add_new__') {
                openAddCategoryModal();
                categorySelect.value = '';
            }
        });
    }

    const addCategoryCancelBtn = document.getElementById('add-category-cancel-btn');
    const addCategorySaveBtn = document.getElementById('add-category-save-btn');
    const addCategoryBackdrop = document.getElementById('add-category-modal-backdrop');
    if (addCategoryCancelBtn) addCategoryCancelBtn.addEventListener('click', closeAddCategoryModal);
    if (addCategoryBackdrop) addCategoryBackdrop.addEventListener('click', closeAddCategoryModal);
    if (addCategorySaveBtn) addCategorySaveBtn.addEventListener('click', handleSaveNewCategory);

    const newCategoryInput = document.getElementById('new-category-input');
    if (newCategoryInput) {
        newCategoryInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') handleSaveNewCategory();
        });
    }

    // Check if editing
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');

    // Populate Pairs Well With multi-select
    const pairsWithSelect = document.getElementById('pairs-with');
    if (pairsWithSelect) {
        try {
            const prodRes = await adminFetch('/api/products');
            const allProducts = await prodRes.json();
            pairsWithSelect.innerHTML = '';
            allProducts.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.name;
                pairsWithSelect.appendChild(opt);
            });
        } catch (_) {}
    }

    if (editId) {
        try {
                const res = await adminFetch(`/api/products/${editId}`);
            const p = await res.json();
            setInputVal('product-name', p.name);
            setInputVal('product-category', p.category);
            setInputVal('product-price', p.price);
            setInputVal('product-unit', p.unit);
            setInputVal('product-description', p.description);
            setInputVal('product-badge', p.badge || '');
            setInputVal('product-availability', p.availability || 'In Stock');
            setInputVal('product-stock', p.stock || 0);
            setInputVal('product-sku', p.sku || '');
            setInputVal('product-custom-tags', (p.tags || []).filter(t => !['House Special', 'Same-day Available', 'Seasonal', "Chef's Recommendation"].includes(t)).join(', '));

            // Set predefined tag checkboxes
            const predefinedTags = ['House Special', 'Same-day Available', 'Seasonal', "Chef's Recommendation"];
            predefinedTags.forEach(tag => {
                const cb = document.querySelector(`input[type="checkbox"][value="${tag}"]`);
                if (cb) cb.checked = (p.tags || []).includes(tag);
            });

            // Load ingredients
            const ingredientsList = document.getElementById('ingredients-list');
            if (ingredientsList && (p.ingredients || []).length) {
                ingredientsList.innerHTML = '';
                (p.ingredients || []).forEach(ing => addIngredientRow(ing));
            }

            // Load flavor profile
            const flavorList = document.getElementById('flavor-list');
            if (flavorList && (p.flavorProfile || []).length) {
                flavorList.innerHTML = '';
                (p.flavorProfile || []).forEach(flavor => addFlavorTag(flavor));
            }

            // Set pairs with
            if (pairsWithSelect && (p.pairsWith || []).length) {
                Array.from(pairsWithSelect.options).forEach(opt => {
                    opt.selected = (p.pairsWith || []).includes(opt.value);
                });
            }

            // Set status checkboxes
            const featuredCb = document.getElementById('status-featured');
            const topRatedCb = document.getElementById('status-top-rated');
            const recommendedCb = document.getElementById('status-recommended');
            const activeCb = document.getElementById('status-active');
            if (featuredCb) featuredCb.checked = !!p.featured;
            if (topRatedCb) topRatedCb.checked = !!p.topRated;
            if (recommendedCb) recommendedCb.checked = !!p.recommended;
            if (activeCb) activeCb.checked = p.active !== false;

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
            const files = fileInput.files;
            if (files && files.length > 0) {
                previewImg.classList.add('hidden');
                if (imagePreviews) {
                    imagePreviews.innerHTML = '';
                    imagePreviews.classList.remove('hidden');
                    Array.from(files).forEach(file => {
                        const reader = new FileReader();
                        reader.onload = e => {
                            const img = document.createElement('img');
                            img.src = e.target.result;
                            img.className = 'w-24 h-24 object-cover rounded-lg';
                            imagePreviews.appendChild(img);
                        };
                        reader.readAsDataURL(file);
                    });
                }
                if (files.length === 1) {
                    previewFile(files[0], previewImg, uploadPlaceholder);
                } else {
                    if (uploadPlaceholder) uploadPlaceholder.classList.add('hidden');
                }
            }
        });
    }

    // Drag and drop
    if (dropZone && fileInput) dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('border-secondary', 'bg-white'); });
    if (dropZone && fileInput) dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-secondary', 'bg-white'));
    if (dropZone && fileInput) dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('border-secondary', 'bg-white');
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            if (fileInput) {
                const dt = new DataTransfer();
                Array.from(files).forEach(f => dt.items.add(f));
                fileInput.files = dt.files;
            }
            if (imagePreviews) {
                imagePreviews.innerHTML = '';
                imagePreviews.classList.remove('hidden');
                Array.from(files).forEach(file => {
                    const reader = new FileReader();
                    reader.onload = ev => {
                        const img = document.createElement('img');
                        img.src = ev.target.result;
                        img.className = 'w-24 h-24 object-cover rounded-lg';
                        imagePreviews.appendChild(img);
                    };
                    reader.readAsDataURL(file);
                });
            }
            if (files.length === 1) {
                previewFile(files[0], previewImg, uploadPlaceholder);
            } else {
                if (previewImg) previewImg.classList.add('hidden');
                if (uploadPlaceholder) uploadPlaceholder.classList.add('hidden');
            }
        }
    });

    // Dynamic ingredients
    const addIngredientBtn = document.getElementById('add-ingredient-btn');
    if (addIngredientBtn) {
        addIngredientBtn.addEventListener('click', () => addIngredientRow());
    }

    // Dynamic flavor profile
    const addFlavorBtn = document.getElementById('add-flavor-btn');
    const flavorSelect = document.getElementById('flavor-select');
    if (addFlavorBtn && flavorSelect) {
        addFlavorBtn.addEventListener('click', () => {
            const val = flavorSelect.value;
            if (val) {
                addFlavorTag(val);
                flavorSelect.value = '';
            }
        });
    }

    if (!form) return;
    form.addEventListener('submit', async e => {
        e.preventDefault();
        const name = document.getElementById('product-name')?.value?.trim();
        const category = document.getElementById('product-category')?.value;
        const price = parseFloat(document.getElementById('product-price')?.value);
        const unit = document.getElementById('product-unit')?.value?.trim();
        const description = document.getElementById('product-description')?.value?.trim();

        if (!name || !category || isNaN(price) || price < 0 || !unit || !description) {
            showToast('Please fill in all required fields correctly.', 'error');
            return;
        }

        const imageFile = fileInput?.files[0];
        let image = previewImg?.src || '';
        if (imageFile) {
            image = await fileToDataURL(imageFile);
        }

        // Collect tags
        const tags = [];
        document.querySelectorAll('input[type="checkbox"][id^="tag-"]:checked').forEach(cb => tags.push(cb.value));
        const customTagsStr = document.getElementById('product-custom-tags')?.value?.trim() || '';
        if (customTagsStr) {
            customTagsStr.split(',').forEach(t => {
                const trimmed = t.trim();
                if (trimmed) tags.push(trimmed);
            });
        }

        // Collect ingredients
        const ingredients = [];
        document.querySelectorAll('#ingredients-list input[type="text"]').forEach(input => {
            if (input.value.trim()) ingredients.push(input.value.trim());
        });

        // Collect flavor profile
        const flavorProfile = [];
        document.querySelectorAll('#flavor-list .flavor-tag').forEach(tag => {
            flavorProfile.push(tag.dataset.flavor);
        });

        // Collect pairs with
        const pairsWith = [];
        if (pairsWithSelect) {
            Array.from(pairsWithSelect.selectedOptions).forEach(opt => pairsWith.push(opt.value));
        }

        // Collect status
        const featured = !!document.getElementById('status-featured')?.checked;
        const topRated = !!document.getElementById('status-top-rated')?.checked;
        const recommended = !!document.getElementById('status-recommended')?.checked;
        const active = !!document.getElementById('status-active')?.checked;

        const badge = document.getElementById('product-badge')?.value || '';
        const stock = document.getElementById('product-stock')?.value || 0;
        const sku = document.getElementById('product-sku')?.value?.trim() || '';
        const availability = document.getElementById('product-availability')?.value || 'In Stock';

        const submitBtn = form.querySelector('[type="submit"]');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">autorenew</span> Saving...'; }

        try {
            let res;
            const body = { name, category, price, unit, description, image, tags, badge, stock, sku, availability, ingredients, flavorProfile, pairsWith, status: active ? 'active' : 'inactive', featured, topRated, recommended, active };
            if (editId) {
                res = await adminFetch(`/api/admin/products/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
            } else {
                const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                res = await adminFetch('/api/admin/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...body, id })
                });
            }
            if (res.ok) {
                showToast(editId ? 'Product updated!' : 'Product added!', 'success');
                localStorage.setItem('adminProductsRefresh', Date.now());
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
                    localStorage.setItem('adminProductsRefresh', Date.now());
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

function addIngredientRow(value = '') {
    const list = document.getElementById('ingredients-list');
    if (!list) return;
    const row = document.createElement('div');
    row.className = 'flex gap-2 items-center';
    row.innerHTML = `
        <input type="text" value="${value}" placeholder="e.g. Organic Flour" class="flex-1 bg-background border-outline-variant/30 rounded-xl px-4 py-2 soft-inset font-body-md focus:border-secondary transition-all ingredient-input"/>
        <button type="button" class="p-2 text-error hover:bg-error/10 rounded-full transition-colors remove-ingredient-btn">
            <span class="material-symbols-outlined text-sm">remove_circle</span>
        </button>
    `;
    list.appendChild(row);
    row.querySelector('.remove-ingredient-btn').addEventListener('click', () => row.remove());
}

function addFlavorTag(flavor) {
    const list = document.getElementById('flavor-list');
    if (!list) return;
    const tag = document.createElement('span');
    tag.className = 'flavor-tag inline-flex items-center gap-1 px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full font-label-sm text-label-sm';
    tag.dataset.flavor = flavor;
    tag.innerHTML = `${flavor} <button type="button" class="hover:text-error transition-colors remove-flavor-btn">&times;</button>`;
    tag.querySelector('.remove-flavor-btn').addEventListener('click', () => tag.remove());
    list.appendChild(tag);
}

function openEditProduct(productId) {
    window.location.href = `/admin-add-product.html?edit=${productId}`;
}

function openDeleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product? This cannot be undone.')) return;
    const btn = event.target;
    if (btn) { btn.disabled = true; btn.textContent = 'Deleting...'; }
    adminFetch(`/api/admin/products/${productId}`, { method: 'DELETE' })
        .then(res => {
            if (res.ok) {
                showToast('Product deleted.', 'success');
                loadAdminProducts();
            } else {
                showToast('Failed to delete product.', 'error');
            }
        })
        .catch(() => {
            showToast('Failed to delete product.', 'error');
        })
        .finally(() => {
            if (btn) { btn.disabled = false; btn.textContent = 'Delete'; }
        });
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
                        <div class="text-lg font-bold text-secondary">${window.App.formatPrice(spent)}</div>
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
        'Shipped': 'bg-indigo-100 text-indigo-800 border-indigo-200',
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

function animateCounter(id, target, prefix = '', locale = 'en-IN') {
    const el = document.getElementById(id);
    if (!el) return;
    const duration = 1000;
    const start = performance.now();
    function step(now) {
        const p = Math.min((now - start) / duration, 1);
        const val = Math.floor(p * target);
        el.textContent = prefix + val.toLocaleString(locale);
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = prefix + target.toLocaleString(locale);
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

/* ─────────────────────────────────────────
    CATEGORY MANAGEMENT
    ───────────────────────────────────────── */
const DEFAULT_CATEGORIES = [
    { value: 'cookies', label: 'Cookies' },
    { value: 'cakes', label: 'Cakes' },
    { value: 'pastries', label: 'Pastries' }
];

const CATEGORIES_STORAGE_KEY = 'candc_product_categories';

function getDefaultCategories() {
    return DEFAULT_CATEGORIES.map(c => ({ ...c }));
}

function loadCategories() {
    try {
        const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (_) {}
    return getDefaultCategories();
}

function saveCategories(categories) {
    try {
        localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
    } catch (_) {}
}

function sortCategories(categories) {
    const defaults = getDefaultCategories();
    const defaultValues = new Set(defaults.map(c => c.value.toLowerCase()));
    const defaultItems = categories.filter(c => defaultValues.has((c.value || '').toLowerCase()));
    const customItems = categories.filter(c => !defaultValues.has((c.value || '').toLowerCase()));
    customItems.sort((a, b) => (a.label || a.value || '').localeCompare(b.label || b.value || ''));
    return [...defaultItems, ...customItems];
}

function populateCategoryDropdown(selectEl, selectedValue) {
    if (!selectEl) return;
    const categories = sortCategories(loadCategories());
    selectEl.innerHTML = '<option value="">Select a category</option>';
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.value;
        opt.textContent = cat.label;
        selectEl.appendChild(opt);
    });
    const addOpt = document.createElement('option');
    addOpt.value = '__add_new__';
    addOpt.textContent = '+ Add New Category';
    selectEl.appendChild(addOpt);
    if (selectedValue) selectEl.value = selectedValue;
}

function openAddCategoryModal() {
    const modal = document.getElementById('add-category-modal');
    const input = document.getElementById('new-category-input');
    const error = document.getElementById('new-category-error');
    if (!modal || !input) return;
    input.value = '';
    if (error) { error.classList.add('hidden'); error.textContent = ''; }
    modal.classList.remove('hidden');
    setTimeout(() => input.focus(), 50);
}

function closeAddCategoryModal() {
    const modal = document.getElementById('add-category-modal');
    if (modal) modal.classList.add('hidden');
}

function handleSaveNewCategory() {
    const input = document.getElementById('new-category-input');
    const error = document.getElementById('new-category-error');
    const select = document.getElementById('product-category');
    if (!input || !select) return;

    const raw = input.value || '';
    const trimmed = raw.trim();
    if (!trimmed) {
        if (error) { error.textContent = 'Category name cannot be empty.'; error.classList.remove('hidden'); }
        showToast('Category name cannot be empty.', 'error');
        return;
    }

    const categories = loadCategories();
    const exists = categories.some(c => (c.value || '').toLowerCase() === trimmed.toLowerCase() || (c.label || '').toLowerCase() === trimmed.toLowerCase());
    if (exists) {
        if (error) { error.textContent = 'A category with this name already exists.'; error.classList.remove('hidden'); }
        showToast('Category already exists.', 'error');
        return;
    }

    const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || trimmed.toLowerCase();
    const newCat = { value: slug, label: trimmed };
    categories.push(newCat);
    saveCategories(categories);
    populateCategoryDropdown(select, slug);
    closeAddCategoryModal();
    showToast('Category added successfully.', 'success');
}
