// Global namespace/utils for cookieesandcakes
window.App = {
  user: null,
  cart: {},
  wishlist: {},
  _wishlistListeners: [],
  _wishlistLoaded: false,

  _wishlistPromise: null,

  // Subscribe to wishlist changes
  onWishlistChange(callback) {
    this._wishlistListeners.push(callback);
  },

  // Notify all listeners that wishlist has changed
  _emitWishlistChange() {
    this._wishlistListeners.forEach(cb => {
      try { cb(this.wishlist); } catch (_) {}
    });
  },

  // Persist wishlist to localStorage
  _persistWishlist() {
    try {
      localStorage.setItem('wishlist', JSON.stringify(this.wishlist));
    } catch (_) {}
  },

  // Restore wishlist from localStorage
  _restoreWishlist() {
    try {
      const saved = localStorage.getItem('wishlist');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          this.wishlist = parsed;
        }
      }
    } catch (_) {}
  },

  // Ensure toast system is loaded
  _toastLoaded: false,
  _toastQueue: [],
  _toastFailed: false,
  async _ensureToasts() {
    if (this._toastLoaded || this._toastFailed) return;
    this._toastLoaded = true;
    try {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = '/js/toast.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
      this._flushToastQueue();
    } catch (e) {
      this._toastFailed = true;
      this._toastLoaded = false;
      console.warn('Toast system failed to load:', e);
    }
  },

  _flushToastQueue() {
    if (!window.Toast) return;
    const queue = this._toastQueue;
    this._toastQueue = [];
    queue.forEach(({ type, message, opts }) => {
      window.Toast[type](message, opts);
    });
  },

  _queueToast(type, message, opts) {
    if (window.Toast) {
      window.Toast[type](message, opts);
    } else {
      this._toastQueue.push({ type, message, opts });
      this._ensureToasts();
    }
  },

  // Toast helpers
  toastSuccess(message, opts) { this._queueToast('success', message, opts); },
  toastError(message, opts)   { this._queueToast('error', message, opts); },
  toastWarning(message, opts) { this._queueToast('warning', message, opts); },
  toastInfo(message, opts)    { this._queueToast('info', message, opts); },

  // Format price in Indian Rupees with Indian number grouping
  formatPrice(amount) {
    const num = parseFloat(amount);
    if (Number.isNaN(num)) return '₹0.00';
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  // Helper for HTTP requests
  async fetchAPI(url, options = {}) {
    const defaultHeaders = { 'Content-Type': 'application/json' };
    options.headers = { ...defaultHeaders, ...options.headers };
    
    if (options.body && typeof options.body === 'object') {
      options.body = JSON.stringify(options.body);
    }

    try {
      const res = await fetch(url, options);
      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');

      if (!res.ok) {
        let message = `Server returned status ${res.status}.`;
        if (isJson) {
          try {
            const data = await res.json();
            message = data.error || data.message || message;
          } catch (_) {
            const text = await res.text();
            if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
              message = 'The server returned an HTML page instead of a JSON response. Please check the API URL.';
            }
          }
        } else {
          const text = await res.text();
          if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
            message = 'The server returned an HTML page instead of a JSON response. Please check the API URL.';
          }
        }
        throw new Error(message);
      }

      if (!isJson) {
        const text = await res.text();
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          throw new Error('The server returned an HTML page instead of a JSON response. Please check the API URL.');
        }
        throw new Error('Server returned a non-JSON response.');
      }

      return await res.json();
    } catch (err) {
      console.error(`API Error (${url}):`, err.message);
      throw err;
    }
  },

  // Check login session status and update UI
  async checkSession() {
    try {
      const data = await this.fetchAPI('/api/auth/session');
      if (data.loggedIn) {
        this.user = data.user;
        this.updateHeaderAuthUI(true);
      } else {
        this.user = null;
        this.updateHeaderAuthUI(false);
      }
    } catch (err) {
      this.user = null;
      this.updateHeaderAuthUI(false);
    }
  },

  // Require authentication for order-related actions.
  // Stores returnUrl and optional message, then redirects to login.
  async requireAuth(options = {}) {
    const { returnUrl, message = 'Please log in to place your order.' } = options;
    try {
      const data = await this.fetchAPI('/api/auth/session');
      if (data.loggedIn) {
        this.user = data.user;
        return true;
      }
    } catch (err) {
      // fall through to redirect
    }

    const target = returnUrl || window.location.pathname + window.location.search;
    sessionStorage.setItem('authReturnUrl', target);
    sessionStorage.setItem('authMessage', message);
    window.location.href = `/login.html?returnUrl=${encodeURIComponent(target)}&message=${encodeURIComponent(message)}`;
    return false;
  },

  // Update header icons for login state
  updateHeaderAuthUI(isLoggedIn) {
    const profileLinks = document.querySelectorAll('a[href="/account.html"]');
    profileLinks.forEach(link => {
      if (!isLoggedIn) {
        // If not logged in, point the profile icon to login page
        link.setAttribute('href', '/signin.html');
      } else {
        link.setAttribute('href', '/account.html');
      }
    });

    // Handle logout button rendering in account pages if present
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.classList.remove('hidden');
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await this.logout();
      });
    }
  },

  // Load and update cart count badge
  async updateCartBadge() {
    try {
      const cart = await this.fetchAPI('/api/cart');
      this.cart = cart;
      
      let totalQty = 0;
      Object.keys(cart).forEach(key => {
        totalQty += cart[key].quantity;
      });

      const badge = document.getElementById('header-cart-badge');
      if (badge) {
        badge.textContent = totalQty;
        if (totalQty > 0) {
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }
    } catch (err) {
      console.error('Failed to update cart badge:', err.message);
    }
  },

  // Logout action
  async logout() {
    try {
      await this.fetchAPI('/api/auth/logout', { method: 'POST' });
      this.user = null;
      window.location.href = '/signin.html';
    } catch (err) {
      this.toastError('Logout failed: ' + err.message);
    }
  },

  // Sync wishlist
  async loadWishlist() {
    if (this._wishlistPromise) return this._wishlistPromise;
    
    this._wishlistPromise = (async () => {
      try {
        const data = await this.fetchAPI('/api/wishlist');
        this.wishlist = data;
        this._persistWishlist();
        this.updateWishlistIcons();
        this._wishlistLoaded = true;
        this._emitWishlistChange();
        this.updateWishlistBadge();
      } catch (err) {
        console.error('Failed to load wishlist:', err.message);
      }
    })();
    
    return this._wishlistPromise;
  },

  // Update wishlist heart fill status across page elements
  updateWishlistIcons() {
    document.querySelectorAll('button:has(.material-symbols-outlined)').forEach(btn => {
      const span = btn.querySelector('span');
      if (span && span.textContent.trim() === 'favorite') {
        // Check if there is an associated product ID
        // Typically product cards will have a data-product-id attribute
        const card = btn.closest('[data-product-id]');
        if (card) {
          const productId = card.getAttribute('data-product-id');
          const isWishlisted = !!this.wishlist[productId];
          if (isWishlisted) {
            span.classList.add('fill-icon');
            span.style.fontVariationSettings = "'FILL' 1";
          } else {
            span.classList.remove('fill-icon');
            span.style.fontVariationSettings = "'FILL' 0";
          }
        }
      }
    });
  },

  // Update wishlist count badge in header
  async updateWishlistBadge() {
    try {
      const badge = document.getElementById('header-wishlist-badge');
      if (!badge) return;
      const count = Object.keys(this.wishlist).length;
      badge.textContent = count;
      if (count > 0) {
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    } catch (_) {}
  },

  // Include header partial
  async includeHeaders() {
    const placeholders = document.querySelectorAll('[data-include-header]');
    await Promise.all(Array.from(placeholders).map(async (el) => {
      const src = el.getAttribute('data-include-header');
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error(`Failed to load header: ${src}`);
        const html = await res.text();
        el.outerHTML = html;
      } catch (err) {
        console.error(err.message);
      }
    }));
  },

  // Adjust header for specific pages
  adjustHeaderForPage() {
    const path = window.location.pathname;
    const header = document.getElementById('site-header');
    if (!header) return;

    const backBtn = document.getElementById('header-back-btn');
    const wishlistBtn = document.getElementById('header-wishlist-btn');
    const cartBadge = document.getElementById('header-cart-badge');

    if (path.includes('rate-treats.html') || path.includes('leave-review.html')) {
      const cartIcon = header.querySelector('#header-cart-btn span');
      const accountIcon = header.querySelector('#header-account-btn span');
      if (cartIcon) cartIcon.textContent = 'shopping_cart';
      if (accountIcon) accountIcon.textContent = 'person';
    }

    if (path.includes('personalize.html')) {
      if (wishlistBtn) wishlistBtn.classList.add('hidden');
    }

    if (path.includes('order-history.html') || path.includes('track-order.html')) {
      header.classList.remove('bg-surface/80', 'dark:bg-surface-dim/80', 'backdrop-blur-md', 'shadow-[0_4px_20px_rgba(93,62,51,0.06)]');
      header.classList.add('bg-background/90', 'backdrop-blur-md', 'shadow-[0_20px_40px_rgba(93,62,51,0.05)]');
    }
  },

  // Include footer partial
  async includeFooters() {
    const placeholders = document.querySelectorAll('[data-include-footer]');
    await Promise.all(Array.from(placeholders).map(async (el) => {
      const src = el.getAttribute('data-include-footer');
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error(`Failed to load footer: ${src}`);
        const html = await res.text();
        el.outerHTML = html;
      } catch (err) {
        console.error(err.message);
      }
    }));
  },

  // Initialize
  async init() {
    await this.includeHeaders();
    await this.includeFooters();
    this.adjustHeaderForPage();
    await this.checkSession();
    await this.updateCartBadge();
    this._restoreWishlist();
    this.updateWishlistBadge();
    await this.loadWishlist();
  }
};

// Auto initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.App.init();
});
