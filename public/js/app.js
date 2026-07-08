// Global namespace/utils for cookieesandcakes
window.App = {
  user: null,
  cart: {},
  wishlist: {},

  // Helper for HTTP requests
  async fetchAPI(url, options = {}) {
    const defaultHeaders = { 'Content-Type': 'application/json' };
    options.headers = { ...defaultHeaders, ...options.headers };
    
    if (options.body && typeof options.body === 'object') {
      options.body = JSON.stringify(options.body);
    }

    try {
      const res = await fetch(url, options);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }
      return data;
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
      alert('Logout failed: ' + err.message);
    }
  },

  // Sync wishlist
  async loadWishlist() {
    try {
      const data = await this.fetchAPI('/api/wishlist');
      this.wishlist = data;
      this.updateWishlistIcons();
    } catch (err) {
      console.error('Failed to load wishlist:', err.message);
    }
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

  // Initialize
  async init() {
    await this.checkSession();
    await this.updateCartBadge();
    await this.loadWishlist();
  }
};

// Auto initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.App.init();
});
