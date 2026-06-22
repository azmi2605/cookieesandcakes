import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { ref, push, set, get, child, remove, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// DOM Elements
const dashboardView = document.getElementById('dashboard-view');
const btnLogout = document.getElementById('btn-logout');
const productList = document.getElementById('product-list');
const orderList = document.getElementById('order-list');
const newOrderBadge = document.getElementById('new-order-badge');

const modal = document.getElementById('product-modal');
const productForm = document.getElementById('product-form');
const btnAddProduct = document.getElementById('btn-add-product');
const modalClose = document.getElementById('modal-close');
const modalTitle = document.getElementById('modal-title');

let currentProducts = [];

// ==========================================
// Authentication
// ==========================================

onAuthStateChanged(auth, async (user) => {
  if (user) {
    // User is authenticated, show dashboard
    dashboardView.style.display = 'block';
    btnLogout.style.display = 'block';
    fetchAndRenderProducts();
    fetchAndListenOrders();
  } else {
    // Redirect unauthenticated visitor to admin login
    window.location.replace('admin-login.html');
  }
});

btnLogout.addEventListener('click', async () => {
  await signOut(auth);
});

// Request notification permission on first load
if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
  Notification.requestPermission();
}

// ==========================================
// CRUD Operations
// ==========================================

async function fetchAndRenderProducts() {
  try {
    const snapshot = await get(ref(db, 'products'));
    currentProducts = [];
    snapshot.forEach(childSnap => {
      const data = childSnap.val();
      currentProducts.push({ id: childSnap.key, ...data });
    });
    renderTable();
  } catch (error) {
    productList.innerHTML = `<tr><td colspan="5" style="color:red">Error loading products: ${error.message}</td></tr>`;
  }
}

function renderTable() {
  if (currentProducts.length === 0) {
    productList.innerHTML = `<tr><td colspan="5" style="text-align:center">No products found.</td></tr>`;
    return;
  }

  productList.innerHTML = currentProducts.map(p => `
    <tr>
      <td><img src="${p.image || 'assets/images/hero/hero.png'}" class="img-preview" alt="${p.name}"></td>
      <td style="font-weight:600">${p.name}</td>
      <td><span style="background:#eee;padding:2px 8px;border-radius:12px;font-size:0.8rem;">${p.category}</span></td>
      <td>$${p.price.toFixed(2)} ${p.unit ? p.unit : ''}</td>
      <td>
        <button class="action-btn btn-edit" data-id="${p.id}">Edit</button>
        <button class="action-btn btn-delete" data-id="${p.id}">Delete</button>
      </td>
    </tr>
  `).join('');
}

// ==========================================
// Orders Operations
// ==========================================

let isInitialOrderLoad = true;
let previousOrderCount = 0;

function fetchAndListenOrders() {
  const ordersRef = ref(db, 'orders');
  
  onValue(ordersRef, (snapshot) => {
    const orders = [];
    snapshot.forEach(childSnap => {
      orders.push({ id: childSnap.key, ...childSnap.val() });
    });
    
    // Sort orders by newest first
    orders.sort((a, b) => b.createdAt - a.createdAt);
    
    // Check for new orders if this isn't the first time loading
    if (!isInitialOrderLoad && orders.length > previousOrderCount) {
      newOrderBadge.style.display = 'inline-block';
      // Play a simple browser notification or alert if permitted
      if (Notification.permission === 'granted') {
        new Notification("New Order Placed!", { body: "Check the admin dashboard." });
      } else {
        alert("🎉 A new order has been placed!");
      }
      
      // Hide badge after 10 seconds
      setTimeout(() => { newOrderBadge.style.display = 'none'; }, 10000);
    }
    
    previousOrderCount = orders.length;
    isInitialOrderLoad = false;
    renderOrders(orders);
  }, (error) => {
    if (orderList) orderList.innerHTML = `<tr><td colspan="5" style="color:red">Error loading orders: ${error.message}</td></tr>`;
  });
}

function renderOrders(orders) {
  if (!orderList) return;
  if (orders.length === 0) {
    orderList.innerHTML = `<tr><td colspan="5" style="text-align:center">No orders found.</td></tr>`;
    return;
  }

  orderList.innerHTML = orders.map(o => {
    const date = new Date(o.createdAt).toLocaleString();
    let statusColor = '#fef08a'; // yellow
    if (o.status === 'Approved') statusColor = '#bbf7d0'; // green
    if (o.status === 'Declined') statusColor = '#fecaca'; // red
    
    let actionsHtml = '';
    if (o.status === 'Pending') {
      actionsHtml = `
        <button class="action-btn btn-approve" data-id="${o.id}" style="color: #15803d; margin-right: 4px;">Approve</button>
        <button class="action-btn btn-decline" data-id="${o.id}" style="color: #b91c1c;">Decline</button>
      `;
    }

    return `
      <tr>
        <td>${date}</td>
        <td>
          <div style="font-weight:600">${o.customerName}</div>
          <div style="font-size:0.8rem;color:var(--color-text-muted)">${o.customerEmail}</div>
        </td>
        <td>${o.product}</td>
        <td>${o.quantity}</td>
        <td><span style="background:${statusColor};padding:2px 8px;border-radius:12px;font-size:0.8rem;">${o.status}</span></td>
        <td>${actionsHtml}</td>
      </tr>
    `;
  }).join('');
}

// Event Delegation for Order Approve/Decline
if (orderList) {
  orderList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-approve')) {
      const id = e.target.dataset.id;
      if (confirm("Are you sure you want to approve this order?")) {
        e.target.textContent = '...';
        try {
          await set(ref(db, `orders/${id}/status`), 'Approved');
        } catch (err) {
          alert("Error: " + err.message);
        }
      }
    }

    if (e.target.classList.contains('btn-decline')) {
      const id = e.target.dataset.id;
      if (confirm("Are you sure you want to decline this order?")) {
        e.target.textContent = '...';
        try {
          await set(ref(db, `orders/${id}/status`), 'Declined');
        } catch (err) {
          alert("Error: " + err.message);
        }
      }
    }
  });
}

// ==========================================
// Form / Modal Logic
// ==========================================

function openModal(product = null) {
  modal.classList.add('active');
  if (product) {
    modalTitle.textContent = 'Edit Product';
    document.getElementById('prod-id').value = product.id;
    document.getElementById('prod-name').value = product.name;
    document.getElementById('prod-category').value = product.category;
    document.getElementById('prod-price').value = product.price;
    document.getElementById('prod-unit').value = product.unit || '';
    document.getElementById('prod-image').value = product.image || '';
    document.getElementById('prod-tags').value = (product.tags || []).join(', ');
    document.getElementById('prod-desc').value = product.description || '';
  } else {
    modalTitle.textContent = 'Add Product';
    productForm.reset();
    document.getElementById('prod-id').value = '';
  }
}

function closeModal() {
  modal.classList.remove('active');
  productForm.reset();
}

btnAddProduct.addEventListener('click', () => openModal());
modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btn-save');
  btn.textContent = 'Saving...';
  btn.disabled = true;

  const id = document.getElementById('prod-id').value;
  const name = document.getElementById('prod-name').value.trim();
  const category = document.getElementById('prod-category').value;
  const priceVal = document.getElementById('prod-price').value;
  const price = parseFloat(priceVal);
  const unit = document.getElementById('prod-unit').value.trim();
  const image = document.getElementById('prod-image').value.trim();
  const tags = document.getElementById('prod-tags').value.split(',').map(t => t.trim()).filter(Boolean);
  const description = document.getElementById('prod-desc').value.trim();

  // Basic validation
  if (!name || !category || isNaN(price)) {
    alert('Please fill in Name, Category, and a valid Price.');
    btn.textContent = 'Save Product';
    btn.disabled = false;
    return;
  }

  const productData = { name, category, price, unit, image, tags, description };

  try {
    if (id) {
      await set(ref(db, `products/${id}`), productData);
    } else {
      const newRef = await push(ref(db, 'products'), productData);
      console.log('New product added with key:', newRef.key);
      alert('Product saved successfully!');
    }
    closeModal();
    await fetchAndRenderProducts();
  } catch (error) {
    console.error('Error saving product:', error);
    // Show a friendly message if permission is denied
    if (error.code && error.code.includes('permission-denied')) {
      alert('You do not have permission to save products. Please ensure you are logged in as an admin.');
    } else {
      alert('Error saving product: ' + error.message);
    }
  } finally {
    btn.textContent = 'Save Product';
    btn.disabled = false;
  }
});

// Event Delegation for Edit/Delete buttons
productList.addEventListener('click', async (e) => {
  if (e.target.classList.contains('btn-edit')) {
    const id = e.target.dataset.id;
    const product = currentProducts.find(p => p.id === id);
    if (product) openModal(product);
  }
  
  if (e.target.classList.contains('btn-delete')) {
    const id = e.target.dataset.id;
    if (confirm("Are you sure you want to delete this product?")) {
      e.target.textContent = '...';
      try {
        await remove(ref(db, `products/${id}`));
        await fetchAndRenderProducts();
      } catch (error) {
        alert("Error deleting product: " + error.message);
        e.target.textContent = 'Delete';
      }
    }
  }
});
