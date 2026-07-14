// auth.js - Handles signup, login, password resets, and account dashboard updates
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;

  // 1. LOGIN PAGE LOGIC
  if (path.includes('login.html') || path.includes('signin.html')) {
    const loginMessage = document.getElementById('login-message');
    if (loginMessage) {
      const params = new URLSearchParams(window.location.search);
      const msg = params.get('message');
      if (msg) {
        loginMessage.textContent = msg;
        loginMessage.classList.remove('hidden');
      }
    }

    const loginForm = document.querySelector('form') || document.getElementById('loginForm');
    
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        
        if (!emailInput || !passwordInput) return;

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Clear previous error message if any
        let errBox = document.getElementById('error-message');
        if (errBox) errBox.remove();

        try {
          const data = await window.App.fetchAPI('/api/auth/login', {
            method: 'POST',
            body: { email, password }
          });
          
          // Check for return URL after successful login
          const params = new URLSearchParams(window.location.search);
          const returnUrl = params.get('returnUrl');
          if (returnUrl) {
            window.location.href = returnUrl;
          } else {
            window.location.href = '/account.html';
          }
        } catch (err) {
          // Display error message
          errBox = document.createElement('div');
          errBox.id = 'error-message';
          errBox.className = 'mt-md p-sm bg-error-container text-on-error-container rounded-lg text-label-sm font-semibold text-center';
          errBox.textContent = err.message || 'Invalid email or password.';
          loginForm.appendChild(errBox);
        }
      });
    }

    // Link "Sign Up" button
    const signUpLink = document.querySelector('a[href="#"]');
    if (signUpLink && signUpLink.textContent.includes('Sign Up')) {
      signUpLink.setAttribute('href', '/signup.html');
    }
  }

  // 2. SIGNUP PAGE LOGIC
  if (path.includes('signup.html')) {
    const signupForm = document.querySelector('form');
    
    if (signupForm) {
      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nameInput = document.getElementById('full_name');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const termsInput = document.getElementById('terms');

        if (!nameInput || !emailInput || !passwordInput) return;

        if (termsInput && !termsInput.checked) {
          alert('You must agree to the Terms of Service and Privacy Policy.');
          return;
        }

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Clear error
        let errBox = document.getElementById('error-message');
        if (errBox) errBox.remove();

        try {
          await window.App.fetchAPI('/api/auth/signup', {
            method: 'POST',
            body: { name, email, password }
          });

          window.location.href = '/signin.html';
        } catch (err) {
          errBox = document.createElement('div');
          errBox.id = 'error-message';
          errBox.className = 'mt-md p-sm bg-error-container text-on-error-container rounded-lg text-label-sm font-semibold text-center';
          errBox.textContent = err.message || 'Registration failed.';
          signupForm.appendChild(errBox);
        }
      });
    }

    // Link "Sign In" link
    const signInLink = document.querySelector('a[href="#"]');
    if (signInLink && signInLink.textContent.includes('Sign In')) {
      signInLink.setAttribute('href', '/signin.html');
    }
  }

  // 3. PASSWORD RESET LOGIC
  if (path.includes('reset-password.html')) {
    const resetForm = document.querySelector('form');
    if (resetForm) {
      resetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('email');
        if (emailInput) {
          const email = emailInput.value.trim();
          window.location.href = `/reset-password-sent.html?email=${encodeURIComponent(email)}`;
        }
      });
    }
  }

  // PASSWORD RESET SENT LOGIC
  if (path.includes('reset-password-sent.html')) {
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email') || 'your email';
    
    // Find text containing email template and replace it
    const bodyText = document.querySelector('p');
    if (bodyText) {
      bodyText.innerHTML = `We have sent a temporary password link to <span class="font-bold text-primary">${email}</span>. Please check your inbox and follow the instructions to secure your account.`;
    }
  }

  // 4. ACCOUNT DASHBOARD LOGIC
  if (path.includes('account.html')) {
    (async () => {
      const allowed = await window.App.requireAuth({ returnUrl: '/account.html', message: 'Your session has expired. Please log in again to continue.' });
      if (!allowed) return;
      updateDashboard();
    })();

    function updateDashboard() {
      // 1. Update Welcome Heading
      const welcomeH1 = document.querySelector('h1');
      if (welcomeH1) {
        welcomeH1.textContent = `Welcome Back, ${window.App.user.name}.`;
      }

      // 2. Setup Sign Out Button in Sidebar
      // Find Logout Link in Hub
      const navLinks = document.querySelectorAll('aside a');
      navLinks.forEach(link => {
        const span = link.querySelector('span:last-child');
        if (span && span.textContent.trim() === 'Sign Out') {
          link.addEventListener('click', async (e) => {
            e.preventDefault();
            await window.App.logout();
          });
        }
      });

      // 3. Load Order History Dynamically
      loadOrderHistory();

      // 4. Load Wishlist Dynamically
      loadWishlistItems();
    }

    async function loadOrderHistory() {
      const orderHistoryContainer = document.querySelector('main section:first-of-type div.space-y-md');
      if (!orderHistoryContainer) return;

      try {
        const orders = await window.App.fetchAPI('/api/orders');
        if (orders.length === 0) {
          orderHistoryContainer.innerHTML = `
            <div class="bg-surface-container-lowest p-lg rounded-xl butter-shadow text-center text-on-surface-variant font-body-md border border-outline-variant/20">
              No orders placed yet. <a href="/treats.html" class="text-secondary font-bold hover:underline">Browse our menu!</a>
            </div>
          `;
          return;
        }

        orderHistoryContainer.innerHTML = '';
        
        // Show up to 3 orders on dashboard
        orders.slice(0, 3).forEach(order => {
          // Determine status color
          let statusClass = 'bg-surface-container text-on-surface-variant';
          let pulseClass = 'bg-outline';
          if (order.status === 'Pending') {
            statusClass = 'bg-surface-container-high text-primary';
          } else if (order.status === 'Approved' || order.status === 'Confirmed' || order.status === 'Preparing') {
            statusClass = 'bg-primary-container text-on-primary-container';
            pulseClass = 'bg-primary animate-pulse';
          } else if (order.status === 'Out for Delivery') {
            statusClass = 'bg-secondary-fixed text-on-secondary-fixed-variant';
            pulseClass = 'bg-secondary animate-pulse';
          } else if (order.status === 'Completed' || order.status === 'Delivered') {
            statusClass = 'bg-green-100 text-green-800';
            pulseClass = 'bg-green-500';
          } else if (order.status === 'Declined' || order.status === 'Cancelled') {
            statusClass = 'bg-error-container text-on-error-container';
            pulseClass = 'bg-error';
          }

          // Get first item image/name as placeholder for order row
          const itemKeys = Object.keys(order.items);
          const firstItem = order.items[itemKeys[0]];
          const displayImg = firstItem.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuApEIdkB-VaVSLK-mnO9JqwXd5-BayuEGJVFDgyujM68DQi9AILfk9phepo58zgqVu0muQRXFvPOFi51wvuh1gFiS-BNEw0kXfS0nNNJmRyRmctg_iBtIqUfITyzplg70n4iZlV906ezK17YdnP6ARx4kBhlKGBlWaRC_P5EpXwyJkj_4JTP8Ihre4A9TuDXbGtRs3wJACJ_31jUM-cpDoOoCpKrZLQM5YTJ2-SqUMMyOta8SX8G7lQuA23_O0l2B1ecURGs9WUJ54';

          const dateStr = new Date(order.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });

          const orderRow = document.createElement('div');
          orderRow.className = 'bg-surface-container-lowest p-lg rounded-xl butter-shadow flex flex-col md:flex-row md:items-center justify-between gap-md border border-outline-variant/20 hover:scale-[1.01] transition-transform duration-300 cursor-pointer';
          orderRow.innerHTML = `
            <div class="flex gap-md items-center">
              <div class="w-16 h-16 rounded-lg bg-surface-container overflow-hidden flex-shrink-0">
                <img class="w-full h-full object-cover" src="${displayImg}" alt="${firstItem.name}"/>
              </div>
              <div>
                <p class="font-label-md text-label-md text-primary">Order #${order.id.substring(1, 8).toUpperCase()}</p>
                <p class="font-body-md text-body-md text-on-surface-variant">Placed on ${dateStr}</p>
              </div>
            </div>
            <div class="flex items-center justify-between md:justify-end gap-lg">
              <div class="flex items-center gap-xs px-md py-xs ${statusClass} rounded-full text-label-sm font-label-sm">
                <span class="w-2 h-2 rounded-full ${pulseClass}"></span>
                ${order.status}
              </div>
              <span class="material-symbols-outlined text-outline">chevron_right</span>
            </div>
          `;
          
          orderRow.addEventListener('click', () => {
            window.location.href = `/track-order.html?orderId=${order.id}`;
          });

          orderHistoryContainer.appendChild(orderRow);
        });
      } catch (err) {
        console.error('Failed to load dashboard orders:', err.message);
      }
    }

    async function loadWishlistItems() {
      const wishlistContainer = document.querySelector('main section:nth-of-type(2) div.flex.overflow-x-auto');
      if (!wishlistContainer) return;

      try {
        const wishlist = await window.App.fetchAPI('/api/wishlist');
        const itemIds = Object.keys(wishlist);

        if (itemIds.length === 0) {
          wishlistContainer.innerHTML = `
            <div class="w-full p-lg bg-surface-container-lowest rounded-xl text-center text-on-surface-variant font-body-md border border-outline-variant/20">
              Your wishlist is empty. Explore our catalog to save your favorites!
            </div>
          `;
          return;
        }

        wishlistContainer.innerHTML = '';
        
        itemIds.forEach(id => {
          const item = wishlist[id];
          const card = document.createElement('div');
          card.className = 'min-w-[280px] md:min-w-[320px] snap-start group';
          card.setAttribute('data-product-id', id);
          card.innerHTML = `
            <div class="bg-surface-container-lowest rounded-xl butter-shadow overflow-hidden group-hover:-translate-y-2 transition-transform duration-500">
              <div class="h-48 overflow-hidden relative">
                <img class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="${item.image}" alt="${item.name}"/>
                <button class="absolute top-md right-md bg-white/80 cream-blur p-xs rounded-full text-secondary wishlist-toggle-btn">
                  <span class="material-symbols-outlined fill-icon" style="font-variation-settings: 'FILL' 1;">favorite</span>
                </button>
              </div>
              <div class="p-md space-y-sm">
                <div class="flex justify-between items-start">
                  <div>
                    <h4 class="font-label-md text-label-md text-primary">${item.name}</h4>
                    <p class="font-body-md text-body-md text-on-surface-variant">Signature Treat</p>
                  </div>
                  <span class="font-label-md text-label-md text-primary">$${item.price.toFixed(2)}</span>
                </div>
                <button class="w-full py-sm bg-secondary text-white rounded-lg font-label-md text-label-md active:scale-95 transition-all duration-200 add-to-bag-btn">
                  Add to Bag
                </button>
              </div>
            </div>
          `;

          // Bind wishlist remove
          card.querySelector('.wishlist-toggle-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
              await window.App.fetchAPI('/api/wishlist/toggle', {
                method: 'POST',
                body: { productId: id }
              });
              await window.App.loadWishlist();
              loadWishlistItems(); // reload dashboard list
            } catch (err) {
              alert(err.message);
            }
          });

          // Bind add to bag
          card.querySelector('.add-to-bag-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
              await window.App.fetchAPI('/api/cart', {
                method: 'POST',
                body: { productId: id, quantity: 1 }
              });
              await window.App.updateCartBadge();
              alert(`${item.name} added to cart!`);
            } catch (err) {
              alert(err.message);
            }
          });

          wishlistContainer.appendChild(card);
        });
      } catch (err) {
        console.error('Failed to load dashboard wishlist:', err.message);
      }
    }
  }
});
