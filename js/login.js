import { auth, db, firestore } from './firebase-config.js';
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
    if (card) card.classList.add('hidden');
  });
  // Show target
  if (cardToShow) cardToShow.classList.remove('hidden');
  
  // Clear messages & fields
  clearMessages();
}

function clearMessages() {
  [signinError, signupError, resetError, resetSuccess].forEach(el => {
    if (el) {
      el.textContent = '';
      el.classList.add('hidden');
    }
  });
  
  // Clear validation classes
  document.querySelectorAll('.form-field').forEach(wrapper => {
    wrapper.classList.remove('has-error');
    const input = wrapper.querySelector('input');
    if (input) {
      input.classList.remove('border-red-500', 'border-green-500');
    }
    const errText = wrapper.querySelector('.field-error');
    if (errText) errText.textContent = '';
  });
}

// Attach toggles
if (linkShowSignup) linkShowSignup.addEventListener('click', () => showCard(signupCard));
if (linkShowSignin) linkShowSignin.addEventListener('click', () => showCard(signinCard));
if (linkShowReset) linkShowReset.addEventListener('click', () => showCard(resetCard));
if (linkBackToSignin) linkBackToSignin.addEventListener('click', () => showCard(signinCard));

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
    field.classList.add('border-red-500');
    field.classList.remove('border-green-500');
    if (errorEl) errorEl.textContent = msg;
    wrapper?.classList.add('has-error');
    return false;
  } else {
    field.classList.remove('border-red-500');
    if (field.value.trim()) field.classList.add('border-green-500');
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
      if (input.classList.contains('border-red-500')) validateField(input);
    });
  });
});

// ==========================================
// Firebase Authentication Actions
// ==========================================

// Sign In
if (signinForm) {
  signinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const inputs = [...signinForm.querySelectorAll('input:not([type="checkbox"])')];
    const allValid = inputs.map(validateField).every(Boolean);
    if (!allValid) return;
    
    const submitBtn = document.getElementById('signin-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `Signing In...`;
    }
    signinError.classList.add('hidden');
    signinError.textContent = '';

    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      const isAdmin = document.getElementById('admin-login-checkbox')?.checked;
      if (isAdmin) {
        window.location.replace('admin.html');
      }
      signinForm.reset();
    } catch (error) {
      signinError.classList.remove('hidden');
      signinError.textContent = getAuthErrorMessage(error.code);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `Sign In`;
      }
    }
  });
}

// Sign Up
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const inputs = [...signupForm.querySelectorAll('input')];
    const allValid = inputs.map(validateField).every(Boolean);
    if (!allValid) return;
    
    const submitBtn = document.getElementById('signup-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `Registering...`;
    }
    signupError.classList.add('hidden');
    signupError.textContent = '';

    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      signupForm.reset();
    } catch (error) {
      signupError.classList.remove('hidden');
      signupError.textContent = getAuthErrorMessage(error.code);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `Sign Up`;
      }
    }
  });
}

// Password Reset
if (resetForm) {
  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const inputs = [...resetForm.querySelectorAll('input')];
    const allValid = inputs.map(validateField).every(Boolean);
    if (!allValid) return;
    
    const submitBtn = document.getElementById('reset-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `Sending...`;
    }
    resetError.classList.add('hidden');
    resetSuccess.classList.add('hidden');
    resetError.textContent = '';
    resetSuccess.textContent = '';

    const email = document.getElementById('reset-email').value;

    try {
      await sendPasswordResetEmail(auth, email);
      resetSuccess.classList.remove('hidden');
      resetSuccess.textContent = 'Password reset email sent! Check your inbox.';
      resetForm.reset();
    } catch (error) {
      resetError.classList.remove('hidden');
      resetError.textContent = getAuthErrorMessage(error.code);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `Send Reset Link`;
      }
    }
  });
}

// Sign Out
if (btnLogoutUser) {
  btnLogoutUser.addEventListener('click', () => {
    signOut(auth);
  });
}

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
    if (authView) authView.classList.add('hidden');
    if (dashboardView) dashboardView.classList.remove('hidden');
    
    // Set Profile Info
    const displayName = user.displayName || 'Friend';
    if (welcomeTitle) welcomeTitle.textContent = `Welcome back, ${displayName}! 🎂`;
    if (profileName) profileName.textContent = displayName;
    if (profileEmail) profileEmail.textContent = user.email;
    
    // Format joining date
    if (profileJoined) {
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
    }
    
    // Create avatar text
    if (userAvatar) userAvatar.textContent = displayName.charAt(0).toUpperCase();
    
    // Load Orders
    await fetchUserOrders(user.uid);
  } else {
    // Show Auth Cards, Hide Dashboard
    if (authView) authView.classList.remove('hidden');
    if (dashboardView) dashboardView.classList.add('hidden');
    showCard(signinCard);
  }
});

// ==========================================
// Firestore Order Fetching & Rendering
// ==========================================
async function fetchUserOrders(userId) {
  if (!ordersLoading) return;
  ordersLoading.classList.remove('hidden');
  if (ordersEmpty) ordersEmpty.classList.add('hidden');
  if (ordersList) {
    ordersList.classList.add('hidden');
    ordersList.innerHTML = '';
  }

  try {
    const q = query(
      collection(firestore, "orders"), 
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
      if (ordersEmpty) ordersEmpty.classList.remove('hidden');
    } else {
      if (ordersList) {
        ordersList.classList.remove('hidden');
        renderOrdersList(orders);
      }
    }
  } catch (error) {
    console.error("Error loading customer orders:", error);
    ordersLoading.classList.add('hidden');
    if (ordersList) {
      ordersList.classList.remove('hidden');
      ordersList.innerHTML = `
        <div class="text-error text-center py-8">
          ⚠️ Error fetching order history: ${error.message}
        </div>
      `;
    }
  }
}

function renderOrdersList(orders) {
  ordersList.innerHTML = orders.map(order => {
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
        <div class="bg-surface-container-low p-sm rounded-lg text-xs border border-outline-variant/10 mt-md">
          <strong>Special Instructions:</strong><br>
          <span class="text-on-surface-variant mt-1 block">${escapeHtml(order.specialInstructions)}</span>
        </div>
      `;
    }
    
    const displayProduct = order.product 
      ? order.product.charAt(0).toUpperCase() + order.product.slice(1) 
      : 'Artisanal Bakes';

    return `
      <div class="bg-surface rounded-xl p-md border border-outline-variant/30 shadow-sm mb-4">
        <div class="flex justify-between items-center border-b border-outline-variant/20 pb-base mb-md">
          <span class="font-label-md text-label-md text-primary">${orderDateStr}</span>
          <span class="px-3 py-1 rounded-full text-[12px] font-semibold uppercase tracking-wider ${
            statusClass === 'completed' 
              ? 'bg-green-100 text-green-800' 
              : statusClass === 'cancelled' 
              ? 'bg-red-100 text-red-800' 
              : 'bg-yellow-100 text-yellow-800'
          }">${status}</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-md text-sm">
          <div>
            <span class="text-on-surface-variant/60 block text-[11px] uppercase tracking-wider font-bold">Item Category</span>
            <span class="font-medium text-primary mt-xs block">${escapeHtml(displayProduct)}</span>
          </div>
          <div>
            <span class="text-on-surface-variant/60 block text-[11px] uppercase tracking-wider font-bold">Quantity</span>
            <span class="font-medium text-primary mt-xs block">${escapeHtml(order.quantity || '1')}</span>
          </div>
          <div>
            <span class="text-on-surface-variant/60 block text-[11px] uppercase tracking-wider font-bold">Event Date</span>
            <span class="font-medium text-primary mt-xs block">${order.eventDate ? escapeHtml(order.eventDate) : 'Not specified'}</span>
          </div>
          <div>
            <span class="text-on-surface-variant/60 block text-[11px] uppercase tracking-wider font-bold">Phone Number</span>
            <span class="font-medium text-primary mt-xs block">${escapeHtml(order.customerPhone || 'No phone')}</span>
          </div>
        </div>
        ${specialInstrHtml}
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
