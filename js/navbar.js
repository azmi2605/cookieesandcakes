// ============================================================
// cookieesandcakes — Navbar JS
// ============================================================

import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const navbar    = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobile-nav');
const currentPath = window.location.pathname.split('/').pop() || 'index.html';

// ── Active Link ──────────────────────────────────────────────
document.querySelectorAll('.navbar__link, .navbar__mobile-link').forEach(link => {
  const href = link.getAttribute('href');
  if (href === currentPath || (currentPath === '' && href === 'index.html')) {
    link.classList.add('active');
  }
});

// ── Dynamic Navbar Login/Account state ───────────────────────────
onAuthStateChanged(auth, (user) => {
  const loginLinks = document.querySelectorAll('.nav-login');
  loginLinks.forEach(link => {
    if (user) {
      link.textContent = 'My Account';
    } else {
      link.textContent = 'Login';
    }
  });
});

// ── Scroll Shadow ────────────────────────────────────────────
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// ── Hamburger Toggle ─────────────────────────────────────────
hamburger.addEventListener('click', () => {
  const isOpen = mobileNav.classList.toggle('open');
  hamburger.classList.toggle('open', isOpen);
  hamburger.setAttribute('aria-expanded', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
});

// Close mobile nav on link click
mobileNav.querySelectorAll('.navbar__mobile-link').forEach(link => {
  link.addEventListener('click', () => {
    mobileNav.classList.remove('open');
    hamburger.classList.remove('open');
    document.body.style.overflow = '';
  });
});

// Close on outside click
document.addEventListener('click', e => {
  if (!navbar.contains(e.target) && !mobileNav.contains(e.target)) {
    mobileNav.classList.remove('open');
    hamburger.classList.remove('open');
    document.body.style.overflow = '';
  }
});
