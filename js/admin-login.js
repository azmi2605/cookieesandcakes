import { auth } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const loginForm = document.getElementById('admin-login-form');
const loginError = document.getElementById('admin-login-error');
const submitBtn = document.getElementById('admin-submit-btn');

// Automatically redirect to admin.html if already logged in
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.replace('admin.html');
  }
});

// Check URL parameters for errors
const urlParams = new URLSearchParams(window.location.search);
const errorType = urlParams.get('error');
if (errorType === 'unauthorized') {
  showError('Access Denied. Administrator privileges required.');
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;

  // Validation
  if (!email || !password) {
    showError('Please enter both email and password.');
    return;
  }

  // Enable Loading state
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle the redirect to admin.html
    // Explicit redirect after successful admin login
    window.location.replace('admin.html');
  } catch (error) {
    console.error("Admin Login Error:", error);
    showError(getAuthErrorMessage(error.code));
  } finally {
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
  }
});

function showError(msg) {
  loginError.textContent = msg;
  loginError.classList.add('show');
}

function clearError() {
  loginError.textContent = '';
  loginError.classList.remove('show');
}

function getAuthErrorMessage(code) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid administrator email or password.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Access temporarily disabled due to multiple failed attempts. Try again later.';
    default:
      return 'An error occurred during authentication. Please try again.';
  }
}
