import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// DOM Elements
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const btnLogout = document.getElementById('btn-logout');
const productList = document.getElementById('product-list');

const modal = document.getElementById('product-modal');
const productForm = document.getElementById('product-form');
const btnAddProduct = document.getElementById('btn-add-product');
const modalClose = document.getElementById('modal-close');
const modalTitle = document.getElementById('modal-title');

let currentProducts = [];

// ==========================================
// Authentication
// ==========================================

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginView.style.display = 'none';
    dashboardView.style.display = 'block';
    btnLogout.style.display = 'block';
    fetchAndRenderProducts();
  } else {
    loginView.style.display = 'flex';
    dashboardView.style.display = 'none';
    btnLogout.style.display = 'none';
  }
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.style.display = 'none';
  const btn = document.getElementById('btn-login');
  btn.textContent = 'Logging in...';
  btn.disabled = true;

  try {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    loginError.style.display = 'block';
    loginError.textContent = error.message;
  } finally {
    btn.textContent = 'Login';
    btn.disabled = false;
  }
});

btnLogout.addEventListener('click', () => {
  signOut(auth);
});

// ==========================================
// CRUD Operations
// ==========================================

async function fetchAndRenderProducts() {
  try {
    const querySnapshot = await getDocs(collection(db, "products"));
    currentProducts = [];
    querySnapshot.forEach((doc) => {
      currentProducts.push({ id: doc.id, ...doc.data() });
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
  const productData = {
    name: document.getElementById('prod-name').value,
    category: document.getElementById('prod-category').value,
    price: parseFloat(document.getElementById('prod-price').value),
    unit: document.getElementById('prod-unit').value,
    image: document.getElementById('prod-image').value,
    tags: document.getElementById('prod-tags').value.split(',').map(t => t.trim()).filter(Boolean),
    description: document.getElementById('prod-desc').value
  };

  try {
    if (id) {
      await setDoc(doc(db, "products", id), productData);
    } else {
      await addDoc(collection(db, "products"), productData);
    }
    closeModal();
    await fetchAndRenderProducts();
  } catch (error) {
    alert("Error saving product: " + error.message);
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
        await deleteDoc(doc(db, "products", id));
        await fetchAndRenderProducts();
      } catch (error) {
        alert("Error deleting product: " + error.message);
        e.target.textContent = 'Delete';
      }
    }
  }
});
