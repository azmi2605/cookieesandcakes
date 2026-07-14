// cart.js - Handles shopping bag loading, quantity edits, deletes, and dynamic checkout flow
document.addEventListener('DOMContentLoaded', () => {
  const cartContainer = document.querySelector('main div.grid div.lg\\:col-span-8');
  const summaryBox = document.querySelector('main div.grid div.lg\\:col-span-4');
  
  if (!cartContainer || !summaryBox) return; // Not on the cart page

  let cartData = {};
  let subtotal = 0;
  const shippingCost = 5.0; // Flat shipping rate
  const taxRate = 0.08; // 8% tax

  // Load and render cart
  async function loadCart() {
    try {
      const allowed = await window.App.requireAuth({ returnUrl: '/cart.html' });
      if (!allowed) return;
      
      await window.App.checkSession();
      cartData = await window.App.fetchAPI('/api/cart');
      renderCart();
    } catch (err) {
      console.error('Failed to load cart:', err.message);
    }
  }

  function renderCart() {
    const keys = Object.keys(cartData);
    
    // If cart is empty
    if (keys.length === 0) {
      cartContainer.innerHTML = `
        <div class="bg-surface-container-lowest p-lg rounded-xl butter-shadow text-center text-on-surface-variant font-body-md border border-outline-variant/20 py-xl">
          Your Shopping Bag is empty. <br/>
          <a href="/treats.html" class="inline-block mt-md bg-secondary text-white font-label-md px-lg py-md rounded-xl hover:opacity-90 active:scale-95 transition-all">
            Go to Treats Gallery
          </a>
        </div>
      `;
      updateSummary(0);
      return;
    }

    // Render list
    let listHtml = '';
    subtotal = 0;

    keys.forEach(productId => {
      const item = cartData[productId];
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;

      listHtml += `
        <div class="baker-tray-card butter-shadow transition-soft hover:translate-y-[-2px] flex flex-col md:flex-row p-md gap-md bg-surface-container-lowest rounded-xl border border-outline-variant/20" data-product-id="${productId}">
          <div class="w-full md:w-48 h-48 flex-shrink-0 rounded-lg overflow-hidden bg-surface-container">
            <img alt="${item.name}" class="w-full h-full object-cover" src="${item.image}"/>
          </div>
          <div class="flex-grow flex flex-col justify-between py-xs">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="font-headline-md text-headline-md text-primary">${item.name}</h3>
                <p class="font-body-md text-on-surface-variant">${item.unit || 'Signature Treat'}</p>
                ${item.personalization ? `
                  <div class="mt-xs bg-secondary/5 border border-secondary/20 p-xs rounded text-label-sm italic text-secondary">
                    Note: "${item.personalization}"
                  </div>
                ` : ''}
              </div>
              <button class="text-on-surface-variant hover:text-error transition-colors p-1 delete-item-btn" title="Remove">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
            <div class="flex justify-between items-end mt-md">
              <div class="flex items-center space-x-base bg-surface-container rounded-full px-sm py-xs">
                <button class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white transition-soft active:scale-95 text-primary qty-minus-btn">
                  <span class="material-symbols-outlined text-[18px]">remove</span>
                </button>
                <span class="font-label-md text-label-md w-6 text-center text-primary qty-display">${item.quantity}</span>
                <button class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white transition-soft active:scale-95 text-primary qty-plus-btn">
                  <span class="material-symbols-outlined text-[18px]">add</span>
                </button>
              </div>
              <div class="text-right">
                <span class="font-label-md text-label-md text-primary">$${itemTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    // Add Continue Shopping links
    listHtml += `
      <div class="pt-lg border-t border-outline-variant/30 mt-xl">
        <a class="flex items-center text-secondary font-label-md hover:underline group" href="/treats.html">
          <span class="material-symbols-outlined mr-xs transition-transform group-hover:-translate-x-1">arrow_back</span>
          Continue Shopping
        </a>
      </div>
    `;

    cartContainer.innerHTML = listHtml;
    updateSummary(subtotal);

    // Bind item buttons
    keys.forEach(productId => {
      const card = cartContainer.querySelector(`[data-product-id="${productId}"]`);
      if (!card) return;

      // Delete Item
      card.querySelector('.delete-item-btn').addEventListener('click', async () => {
        try {
          await window.App.fetchAPI('/api/cart/delete', {
            method: 'POST',
            body: { productId }
          });
          await window.App.updateCartBadge();
          loadCart();
        } catch (err) {
          alert(err.message);
        }
      });

      // Qty Minus
      card.querySelector('.qty-minus-btn').addEventListener('click', async () => {
        const item = cartData[productId];
        try {
          await window.App.fetchAPI('/api/cart/update', {
            method: 'POST',
            body: { productId, quantity: item.quantity - 1 }
          });
          await window.App.updateCartBadge();
          loadCart();
        } catch (err) {
          alert(err.message);
        }
      });

      // Qty Plus
      card.querySelector('.qty-plus-btn').addEventListener('click', async () => {
        const item = cartData[productId];
        try {
          await window.App.fetchAPI('/api/cart/update', {
            method: 'POST',
            body: { productId, quantity: item.quantity + 1 }
          });
          await window.App.updateCartBadge();
          loadCart();
        } catch (err) {
          alert(err.message);
        }
      });
    });
  }

  function updateSummary(sub) {
    const shipping = sub > 40 || sub === 0 ? 0 : shippingCost; // Free shipping over $40 promo
    const tax = sub * taxRate;
    const total = sub === 0 ? 0 : sub + shipping + tax;

    summaryBox.innerHTML = `
      <div class="sticky top-24 bg-surface-container rounded-xl p-lg butter-shadow border border-surface-variant">
        <h2 class="font-headline-md text-headline-md text-primary mb-lg">Order Summary</h2>
        <div class="space-y-sm mb-lg pb-lg border-b border-outline-variant/40">
          <div class="flex justify-between text-on-surface-variant">
            <span class="font-body-md">Subtotal</span>
            <span class="font-label-md">$${sub.toFixed(2)}</span>
          </div>
          <div class="flex justify-between text-on-surface-variant">
            <span class="font-body-md">Estimated Shipping</span>
            <span class="font-label-md">${shipping === 0 ? 'Free' : '$' + shipping.toFixed(2)}</span>
          </div>
          <div class="flex justify-between text-on-surface-variant">
            <span class="font-body-md">Estimated Tax (8%)</span>
            <span class="font-label-md">$${tax.toFixed(2)}</span>
          </div>
        </div>
        <div class="flex justify-between items-center mb-xl">
          <span class="font-headline-md text-headline-md text-primary">Total</span>
          <span class="font-headline-md text-headline-md text-primary">$${total.toFixed(2)}</span>
        </div>
        <div class="space-y-md">
          ${window.App.user ? `
            <button id="checkout-btn" class="w-full bg-secondary text-white py-base px-lg rounded-lg font-label-md transition-soft active:scale-[0.98] hover:shadow-lg hover:opacity-95 flex items-center justify-center" ${sub === 0 ? 'disabled' : ''}>
              Proceed to Checkout
              <span class="material-symbols-outlined ml-xs">arrow_forward</span>
            </button>
          ` : `
            <a href="/signin.html" class="w-full bg-primary text-white py-base px-lg rounded-lg font-label-md transition-soft active:scale-[0.98] hover:shadow-lg hover:opacity-95 flex items-center justify-center gap-base">
              Sign In to Checkout
              <span class="material-symbols-outlined text-[20px]">login</span>
            </a>
            <p class="text-center text-label-sm text-on-surface-variant">Please log in to your account to complete your order.</p>
          `}
          <div class="flex items-center justify-center space-x-md text-on-surface-variant/60 py-sm">
            <span class="material-symbols-outlined text-[20px]">verified_user</span>
            <span class="text-label-sm font-label-sm uppercase tracking-widest">Secure Checkout</span>
          </div>
        </div>
      </div>
    `;

    // Bind Checkout Form transition
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn && sub > 0) {
      checkoutBtn.addEventListener('click', async () => {
        const allowed = await window.App.requireAuth({ returnUrl: '/cart.html', message: 'Please log in to complete your checkout.' });
        if (!allowed) return;
        showCheckoutForm(total);
      });
    }
  }

  function showCheckoutForm(totalAmount) {
    // Populate form with logged-in user details if available
    const userName = window.App.user ? window.App.user.name : '';
    const userEmail = window.App.user ? window.App.user.email : '';
    const userPhone = window.App.user ? window.App.user.phone || '' : '';

    cartContainer.innerHTML = `
      <div class="bg-surface-container-lowest p-md md:p-lg rounded-xl butter-shadow border border-outline-variant/20 space-y-lg">
        <div>
          <h2 class="font-headline-md text-headline-md text-primary mb-xs">Delivery Details</h2>
          <p class="font-body-md text-on-surface-variant">We hand-deliver to ensure your treats arrive oven-fresh.</p>
        </div>
        <form class="space-y-md" id="checkout-details-form">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div class="space-y-xs">
              <label class="font-label-md text-label-md text-primary block" for="cust-name">Full Name</label>
              <input class="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm font-body-md focus:border-primary focus:ring-0 outline-none transition-all" id="cust-name" type="text" value="${userName}" required/>
            </div>
            <div class="space-y-xs">
              <label class="font-label-md text-label-md text-primary block" for="cust-email">Email Address</label>
              <input class="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm font-body-md focus:border-primary focus:ring-0 outline-none transition-all" id="cust-email" type="email" value="${userEmail}" required/>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div class="space-y-xs">
              <label class="font-label-md text-label-md text-primary block" for="cust-phone">Phone Number</label>
              <input class="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm font-body-md focus:border-primary focus:ring-0 outline-none transition-all" id="cust-phone" type="tel" value="${userPhone}" required/>
            </div>
            <div class="space-y-xs">
              <label class="font-label-md text-label-md text-primary block" for="deliv-date">Delivery Date</label>
              <input class="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm font-body-md focus:border-primary focus:ring-0 outline-none transition-all" id="deliv-date" type="date" required/>
            </div>
          </div>
          <div class="space-y-xs">
            <label class="font-label-md text-label-md text-primary block" for="deliv-address">Delivery Address</label>
            <input class="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm font-body-md focus:border-primary focus:ring-0 outline-none transition-all" id="deliv-address" placeholder="123 Bakery Lane, Sugar Land, TX" type="text" required/>
          </div>
          <div class="space-y-xs">
            <label class="font-label-md text-label-md text-primary block" for="cust-instructions">Special Instructions (Optional)</label>
            <textarea class="w-full bg-surface-container-low border border-outline-variant rounded-lg p-md font-body-md focus:border-primary focus:ring-0 outline-none transition-all" id="cust-instructions" placeholder="Ring bell on arrival, leave package with doorman..." rows="3"></textarea>
          </div>
          <div class="flex gap-md pt-md">
            <button type="button" id="back-to-bag-btn" class="flex-1 py-md border-2 border-primary text-primary font-label-md rounded-xl hover:bg-primary/5 active:scale-95 transition-all">
              Back to Bag
            </button>
            <button type="submit" class="flex-1 py-md bg-secondary text-white font-label-md rounded-xl hover:opacity-90 active:scale-95 transition-all butter-shadow">
              Place Order ($${totalAmount.toFixed(2)})
            </button>
          </div>
        </form>
      </div>
    `;

    // Back to Bag
    document.getElementById('back-to-bag-btn').addEventListener('click', () => {
      renderCart();
    });

    // Form submit
    document.getElementById('checkout-details-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      const orderPayload = {
        customerName: document.getElementById('cust-name').value.trim(),
        customerEmail: document.getElementById('cust-email').value.trim(),
        customerPhone: document.getElementById('cust-phone').value.trim(),
        deliveryDate: document.getElementById('deliv-date').value,
        address: document.getElementById('deliv-address').value.trim(),
        specialInstructions: document.getElementById('cust-instructions').value.trim(),
        items: cartData,
        total: totalAmount
      };

      try {
        const orderResult = await window.App.fetchAPI('/api/orders', {
          method: 'POST',
          body: orderPayload
        });

        await window.App.updateCartBadge();
        // Redirect to tracking page
        window.location.href = `/track-order.html?orderId=${orderResult.orderId}`;
      } catch (err) {
        alert('Failed to place order: ' + err.message);
      }
    });
  }

  loadCart();
});
