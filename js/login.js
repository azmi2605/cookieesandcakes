import { auth, db } from './firebase-config.js';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut, 
  updateProfile 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
  collection, 
  getDocs, 
  query, 
  where 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// DOM Views
const authView = document.getElementById('auth-view');
const dashboardView = document.getElementById('dashboard-view');

// DOM Cards
const signinCard = document.getElementById('signin-card');
const signupCard = document.getElementById('signup-card');
const resetCard = document.getElementById('reset-card');

// DOM Forms
const signinForm = document.getElementById('signin-form');
const signupForm = document.getElementById('signup-form');
const resetForm = document.getElementById('reset-form');

// Toggle Links
const linkShowSignup = document.getElementById('link-show-signup');
const linkShowSignin = document.getElementById('link-show-signin');
const linkShowReset = document.getElementById('link-show-reset');
const linkBackToSignin = document.getElementById('link-back-to-signin');

// Dashboard Elements
const userAvatar = document.getElementById('user-avatar');
const welcomeTitle = document.getElementById('welcome-title');
const profileName = document.getElementById('profile-name');
const profileEmail = document.getElementById('profile-email');
const profileJoined = document.getElementById('profile-joined');
const btnLogoutUser = document.getElementById('btn-logout-user');

// Orders Elements
const ordersLoading = document.getElementById('orders-loading');
const ordersEmpty = document.getElementById('orders-empty');
const ordersList = document.getElementById('orders-list');

// Error/Success Messages
const signinError = document.getElementById('signin-error');
const signupError = document.getElementById('signup-error');
const resetSuccess = document.getElementById('reset-success');
const resetError = document.getElementById('reset-error');

// ==========================================
// Card Switching Logic
// ==========================================
function showCard(cardToShow) {
  // Hide all
  [signinCard, signupCard, resetCard].forEach(card => {
    card.classList.add('hidden');
  });
  // Show target
  cardToShow.classList.remove('hidden');
  
  // Clear messages & fields
  clearMessages();
}

function clearMessages() {
  [signinError, signupError, resetError, resetSuccess].forEach(el => {
    if (el) {
      el.textContent = '';
      el.classList.remove('show');
    }
  });
  
  // Clear validation classes
  document.querySelectorAll('.form-field').forEach(field => {
    field.classList.remove('has-error');
    const input = field.querySelector('.form-input');
    if (input) {
      input.classList.remove('valid', 'invalid');
    }
    const errText = field.querySelector('.field-error');
    if (errText) errText.textContent = '';
  });
}

// Attach toggles
linkShowSignup.addEventListener('click', () => showCard(signupCard));
linkShowSignin.addEventListener('click', () => showCard(signinCard));
linkShowReset.addEventListener('click', () => showCard(resetCard));
linkBackToSignin.addEventListener('click', () => showCard(signinCard));

// ==========================================
// Form Validation Logic
// ==========================================
function validateField(field) {
  const wrapper = field.closest('.form-field');
  const errorEl = wrapper?.querySelector('.field-error');
  let msg = '';

  if (field.required && !field.value.trim()) {
    msg = 'This field is required.';
  } else if (field.type === 'email' && field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
    msg = 'Please enter a valid email address.';
  } else if (field.id === 'signup-password' && field.value && field.value.length < 6) {
    msg = 'Password must be at least 6 characters.';
  } else if (field.id === 'signup-confirm') {
    const passwordVal = document.getElementById('signup-password').value;
    if (field.value !== passwordVal) {
      msg = 'Passwords do not match.';
    }
  }

  if (msg) {
    field.classList.add('invalid');
    field.classList.remove('valid');
    if (errorEl) errorEl.textContent = msg;
    wrapper?.classList.add('has-error');
    return false;
  } else {
    field.classList.remove('invalid');
    if (field.value.trim()) field.classList.add('valid');
    if (errorEl) errorEl.textContent = '';
    wrapper?.classList.remove('has-error');
    return true;
  }
}

// Attach validation handlers
[signinForm, signupForm, resetForm].forEach(form => {
  if (!form) return;
  form.querySelectorAll('input').forEach(input => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => {
      if (input.classList.contains('invalid')) validateField(input);
    });
  });
});

// ==========================================
// Firebase Authentication Actions
// ==========================================

// Sign In
signinForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const inputs = [...signinForm.querySelectorAll('input')];
  const allValid = inputs.map(validateField).every(Boolean);
  if (!allValid) return;
  
  const submitBtn = document.getElementById('signin-submit-btn');
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;
  signinError.classList.remove('show');
  signinError.textContent = '';

  const email = document.getElementById('signin-email').value;
  const password = document.getElementById('signin-password').value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    signinForm.reset();
  } catch (error) {
    signinError.classList.add('show');
    signinError.textContent = getAuthErrorMessage(error.code);
  } finally {
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
  }
});

// Sign Up
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const inputs = [...signupForm.querySelectorAll('input')];
  const allValid = inputs.map(validateField).every(Boolean);
  if (!allValid) return;
  
  const submitBtn = document.getElementById('signup-submit-btn');
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;
  signupError.classList.remove('show');
  signupError.textContent = '';

  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Set display name
    await updateProfile(userCredential.user, { displayName: name });
    signupForm.reset();
  } catch (error) {
    signupError.classList.add('show');
    signupError.textContent = getAuthErrorMessage(error.code);
  } finally {
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
  }
});

// Password Reset
resetForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const inputs = [...resetForm.querySelectorAll('input')];
  const allValid = inputs.map(validateField).every(Boolean);
  if (!allValid) return;
  
  const submitBtn = document.getElementById('reset-submit-btn');
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;
  resetError.classList.remove('show');
  resetSuccess.classList.remove('show');
  resetError.textContent = '';
  resetSuccess.textContent = '';

  const email = document.getElementById('reset-email').value;

  try {
    await sendPasswordResetEmail(auth, email);
    resetSuccess.classList.add('show');
    resetSuccess.textContent = 'Password reset email sent! Check your inbox.';
    resetForm.reset();
  } catch (error) {
    resetError.classList.add('show');
    resetError.textContent = getAuthErrorMessage(error.code);
  } finally {
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
  }
});

// Sign Out
btnLogoutUser.addEventListener('click', () => {
  signOut(auth);
});

// Helper for readable auth error messages
function getAuthErrorMessage(code) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Access to this account has been temporarily disabled due to many failed attempts. Try again later.';
    default:
      return 'An error occurred. Please try again.';
  }
}

// ==========================================
// Auth State Observer & Dashboard Loading
// ==========================================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Show Dashboard, Hide Auth Cards
    authView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    
    // Set Profile Info
    const displayName = user.displayName || 'Friend';
    welcomeTitle.textContent = `Welcome back, ${displayName}! 🎂`;
    profileName.textContent = displayName;
    profileEmail.textContent = user.email;
    
    // Format joining date
    if (user.metadata.creationTime) {
      const createdDate = new Date(user.metadata.creationTime);
      profileJoined.textContent = createdDate.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } else {
      profileJoined.textContent = 'Recently';
    }
    
    // Create avatar text
    userAvatar.textContent = displayName.charAt(0).toUpperCase();
    
    // Load Orders
    await fetchUserOrders(user.uid);
  } else {
    // Show Auth Cards, Hide Dashboard
    authView.classList.remove('hidden');
    dashboardView.classList.add('hidden');
    showCard(signinCard);
  }
});

// ==========================================
// Firestore Order Fetching & Rendering
// ==========================================
async function fetchUserOrders(userId) {
  ordersLoading.classList.remove('hidden');
  ordersEmpty.classList.add('hidden');
  ordersList.classList.add('hidden');
  ordersList.innerHTML = '';

  try {
    const q = query(
      collection(db, "orders"), 
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    
    const orders = [];
    querySnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort local array by createdAt descending (newest first)
    orders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    
    ordersLoading.classList.add('hidden');
    
    if (orders.length === 0) {
      ordersEmpty.classList.remove('hidden');
    } else {
      ordersList.classList.remove('hidden');
      renderOrdersList(orders);
    }
  } catch (error) {
    console.error("Error loading customer orders:", error);
    ordersLoading.classList.add('hidden');
    ordersList.classList.remove('hidden');
    ordersList.innerHTML = `
      <div style="color:var(--color-error); text-align:center; padding: 2rem;">
        ⚠️ Error fetching order history: ${error.message}
      </div>
    `;
  }
}

function renderOrdersList(orders) {
  ordersList.innerHTML = orders.map(order => {
    // Format date
    const orderDateStr = order.createdAt 
      ? new Date(order.createdAt).toLocaleDateString(undefined, {
          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        })
      : 'Unknown Date';
      
    const status = order.status || 'Pending';
    const statusClass = status.toLowerCase().replace(' ', '-');
    
    let specialInstrHtml = '';
    if (order.specialInstructions && order.specialInstructions.trim()) {
      specialInstrHtml = `
        <div class="order-item__instructions">
          <strong>Special Instructions:</strong><br>
          ${escapeHtml(order.specialInstructions)}
        </div>
      `;
    }
    
    const displayProduct = order.product 
      ? order.product.charAt(0).toUpperCase() + order.product.slice(1) 
      : 'Artisanal Bakes';

    return `
      <div class="order-item">
        <div class="order-item__header">
          <span class="order-item__date">${orderDateStr}</span>
          <span class="order-item__status order-item__status--${statusClass}">${status}</span>
        </div>
        <div class="order-item__details">
          <div class="order-detail-group">
            <span class="order-detail-label">Item Category</span>
            <span class="order-detail-val">${escapeHtml(displayProduct)}</span>
          </div>
          <div class="order-detail-group">
            <span class="order-detail-label">Quantity / Servings</span>
            <span class="order-detail-val">${escapeHtml(order.quantity || '1')}</span>
          </div>
          <div class="order-detail-group">
            <span class="order-detail-label">Delivery/Event Date</span>
            <span class="order-detail-val">${order.eventDate ? escapeHtml(order.eventDate) : 'Not specified'}</span>
          </div>
          <div class="order-detail-group">
            <span class="order-detail-label">Contact Details</span>
            <span class="order-detail-val">${escapeHtml(order.customerName)} (${escapeHtml(order.customerPhone || 'No phone')})</span>
          </div>
        </div>
        ${specialInstrHtml}
      </div>
    `;
  }).join('');
}

// Simple HTML escaping helper for security
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
