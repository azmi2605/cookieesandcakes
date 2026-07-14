// orders.js - Handles order history, real-time tracking, leaving reviews, and rating treats
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;

  // --- 1. ORDER HISTORY PAGE ---
  if (path.includes('order-history.html')) {
    const listContainer = document.querySelector('main .grid.gap-gutter');
    if (listContainer) {
      loadOrderHistoryList();
    }

    async function loadOrderHistoryList() {
      try {
        const allowed = await window.App.requireAuth({ returnUrl: '/order-history.html', message: 'Please log in to view your order history.' });
        if (!allowed) return;
        
        const orders = await window.App.fetchAPI('/api/orders');
        if (orders.length === 0) {
          listContainer.innerHTML = `
            <div class="bg-surface-container-lowest p-lg rounded-xl butter-shadow text-center text-on-surface-variant font-body-md border border-outline-variant/20 py-xl">
              No orders placed yet. <br/>
              <a href="/treats.html" class="inline-block mt-md bg-secondary text-white font-label-md px-lg py-md rounded-xl hover:opacity-90 active:scale-95 transition-all">
                Order Fresh Treats
              </a>
            </div>
          `;
          return;
        }

        listContainer.innerHTML = '';
        orders.forEach(order => {
          let statusClass = 'bg-surface-container text-on-surface-variant';
          let pulseClass = 'bg-outline';
          if (order.status === 'Pending') {
            statusClass = 'bg-surface-container-high text-primary';
          } else if (order.status === 'Approved' || order.status === 'Preparing') {
            statusClass = 'bg-primary-container text-on-primary-container';
            pulseClass = 'bg-primary animate-pulse';
          } else if (order.status === 'Out for Delivery') {
            statusClass = 'bg-secondary-fixed text-on-secondary-fixed-variant';
            pulseClass = 'bg-secondary animate-pulse';
          } else if (order.status === 'Completed') {
            statusClass = 'bg-green-100 text-green-800';
            pulseClass = 'bg-green-500';
          } else if (order.status === 'Declined') {
            statusClass = 'bg-error-container text-on-error-container';
            pulseClass = 'bg-error';
          }

          const itemKeys = Object.keys(order.items);
          const firstItem = order.items[itemKeys[0]];
          const displayImg = firstItem.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuApEIdkB-VaVSLK-mnO9JqwXd5-BayuEGJVFDgyujM68DQi9AILfk9phepo58zgqVu0muQRXFvPOFi51wvuh1gFiS-BNEw0kXfS0nNNJmRyRmctg_iBtIqUfITyzplg70n4iZlV906ezK17YdnP6ARx4kBhlKGBlWaRC_P5EpXwyJkj_4JTP8Ihre4A9TuDXbGtRs3wJACJ_31jUM-cpDoOoCpKrZLQM5YTJ2-SqUMMyOta8SX8G7lQuA23_O0l2B1ecURGs9WUJ54';

          const dateStr = new Date(order.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });

          const orderRow = document.createElement('div');
          orderRow.className = 'flex flex-col md:flex-row md:items-center justify-between p-md border border-outline-variant rounded-lg bg-surface-container-lowest hover:bg-surface-container-low transition-colors group cursor-pointer butter-shadow';
          orderRow.innerHTML = `
            <div class="flex gap-md items-center">
              <div class="w-16 h-16 rounded-lg bg-cover bg-center" style="background-image: url('${displayImg}')"></div>
              <div>
                <p class="font-label-md text-primary">Order #${order.id.substring(1, 8).toUpperCase()}</p>
                <p class="text-label-sm text-on-surface-variant">Placed on ${dateStr}</p>
                <div class="flex items-center gap-xs mt-xs px-2 py-0.5 rounded-full text-label-sm ${statusClass} inline-flex">
                  <span class="w-1.5 h-1.5 rounded-full ${pulseClass}"></span>
                  <span>${order.status}</span>
                </div>
              </div>
            </div>
            <div class="mt-md md:mt-0 text-right flex items-center justify-between md:justify-end gap-md">
              <p class="font-headline-md text-primary">$${order.total.toFixed(2)}</p>
              <span class="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
            </div>
          `;

          orderRow.addEventListener('click', () => {
            window.location.href = `/track-order.html?orderId=${order.id}`;
          });

          listContainer.appendChild(orderRow);
        });
      } catch (err) {
        console.error('Failed to load order history list:', err.message);
      }
    }
  }

  // --- 2. TRACK ORDER PAGE ---
  if (path.includes('track-order.html')) {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');

    if (orderId) {
      loadOrderTracking(orderId);
    } else {
      document.querySelector('main').innerHTML = `
        <div class="py-xl text-center text-on-surface-variant font-body-lg">
          No order ID provided. Check your <a href="/order-history.html" class="text-secondary font-bold hover:underline">Order History</a>.
        </div>
      `;
    }

    async function loadOrderTracking(id) {
      try {
        const allowed = await window.App.requireAuth({ returnUrl: `/track-order.html?orderId=${id}`, message: 'Your session has expired. Please log in again to continue.' });
        if (!allowed) return;
        
        const order = await window.App.fetchAPI(`/api/orders/${id}`);
        
        // 1. Update Order Header Info
        const headerP = document.querySelector('main section.mb-xl p');
        if (headerP) {
          const dateStr = new Date(order.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
          headerP.textContent = `Order #${order.id.substring(1, 8).toUpperCase()} • Placed on ${dateStr}`;
        }

        // 2. Update Status text and delivery date
        const statusH2 = document.querySelector('h2.font-headline-md');
        if (statusH2) {
          statusH2.textContent = order.status;
        }

        const dateP = document.querySelector('p.font-headline-md.text-primary');
        if (dateP && order.deliveryDate) {
          const delivDate = new Date(order.deliveryDate + 'T00:00:00');
          dateP.textContent = delivDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
          });
        }

        // 3. Update Visual Status Steps Timeline
        updateTimelineSteps(order.status);

        // 4. Render items in box
        renderItemsBox(order.items);

        // 5. Update Carrier/Tracking Number
        const trackCode = document.querySelector('code');
        if (trackCode) {
          trackCode.textContent = `SWEET${id.substring(1, 8).toUpperCase()}`;
        }

        // 6. Setup rate traits link
        const detailBtn = document.querySelector('main button.bg-primary');
        if (detailBtn) {
          detailBtn.textContent = "Rate Purchased Treats";
          detailBtn.addEventListener('click', () => {
            window.location.href = `/rate-treats.html?orderId=${id}`;
          });
        }

      } catch (err) {
        console.error('Failed to load tracking data:', err.message);
      }
    }

    function updateTimelineSteps(status) {
      const steps = document.querySelectorAll('.flex.flex-col.md\\:flex-row.justify-between.relative.z-10 > div');
      const progressLine = document.querySelector('.absolute.top-1\\/2.left-0.h-\\[3px\\].bg-secondary');
      
      // Status hierarchy maps to timeline indexes (0-4)
      const statusMap = {
        'Pending': 0,
        'Approved': 1,
        'Confirmed': 1,
        'Preparing': 2,
        'Out for Delivery': 3,
        'Completed': 4,
        'Delivered': 4,
        'Cancelled': 0
      };

      const activeIndex = statusMap[status] !== undefined ? statusMap[status] : 0;

      // Update progress line length
      if (progressLine) {
        const widths = ['0%', '25%', '50%', '75%', '100%'];
        progressLine.style.width = widths[activeIndex];
      }

      // Update truck position on dynamic map based on status
      const truck = document.getElementById('delivery-truck');
      const locationText = document.querySelector('.map-container + div + div + div p:last-child');

      if (truck) {
        if (activeIndex === 0) {
          truck.style.left = '10%';
          truck.style.bottom = '15%';
          if (locationText) locationText.textContent = "Awaiting checkout confirmation";
        } else if (activeIndex === 1) {
          truck.style.left = '25%';
          truck.style.bottom = '25%';
          if (locationText) locationText.textContent = "Order approved by baking team";
        } else if (activeIndex === 2) {
          truck.style.left = '45%';
          truck.style.bottom = '40%';
          if (locationText) locationText.textContent = "Treats are in the oven";
        } else if (activeIndex === 3) {
          truck.style.left = '70%';
          truck.style.bottom = '30%';
          if (locationText) locationText.textContent = "Out for delivery with Sweet Courier";
        } else {
          truck.style.left = '85%';
          truck.style.bottom = '20%';
          if (locationText) locationText.textContent = "Delivered warm and sweet!";
        }
      }

      steps.forEach((step, idx) => {
        const circle = step.querySelector('div');
        const text = step.querySelector('span');

        if (idx < activeIndex) {
          // Completed steps
          step.classList.remove('opacity-40');
          circle.className = "w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center";
          if (text) text.className = "font-label-md text-label-md text-primary";
        } else if (idx === activeIndex) {
          // Current step
          step.classList.remove('opacity-40');
          circle.className = "w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center ring-4 ring-secondary-container/30";
          if (text) text.className = "font-label-md text-label-md text-secondary font-bold";
          // If declined, update text to declined
          if (status === 'Declined' && text) {
            text.textContent = 'Declined';
            circle.className = "w-10 h-10 rounded-full bg-error text-white flex items-center justify-center";
          }
        } else {
          // Inactive steps
          step.classList.add('opacity-40');
          circle.className = "w-10 h-10 rounded-full bg-outline-variant text-white flex items-center justify-center";
          if (text) text.className = "font-label-md text-label-md text-on-surface-variant";
        }
      });
    }

    function renderItemsBox(items) {
      const itemsContainer = document.querySelector('main div.lg\\:col-span-4 section:nth-of-type(2) div.space-y-md');
      const countLabel = document.querySelector('main div.lg\\:col-span-4 section:nth-of-type(2) div.mt-md span');
      
      if (!itemsContainer) return;

      const keys = Object.keys(items);
      if (countLabel) {
        const totalItems = keys.reduce((sum, k) => sum + items[k].quantity, 0);
        countLabel.textContent = `${totalItems} Item${totalItems > 1 ? 's' : ''}`;
      }

      itemsContainer.innerHTML = '';
      keys.forEach(k => {
        const item = items[k];
        const itemRow = document.createElement('div');
        itemRow.className = 'flex items-center gap-md';
        itemRow.innerHTML = `
          <div class="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-surface-container">
            <img class="w-full h-full object-cover" src="${item.image}" alt="${item.name}"/>
          </div>
          <div class="flex-1">
            <p class="font-body-md text-body-md text-primary font-medium">${item.name}</p>
            <p class="font-label-sm text-label-sm text-on-surface-variant">Qty: ${item.quantity} • ${item.unit || 'Treat'}</p>
          </div>
        `;
        itemsContainer.appendChild(itemRow);
      });
    }
  }

  // --- 3. LEAVE A REVIEW PAGE ---
  if (path.includes('leave-review.html')) {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('productId');

    if (!productId) {
      document.querySelector('main').innerHTML = `
        <div class="py-xl text-center text-on-surface-variant font-body-lg">
          No product specified for review. Return to <a href="/treats.html" class="text-secondary font-bold hover:underline">Treats Gallery</a>.
        </div>
      `;
      return;
    }

    loadProductHeader(productId);

    async function loadProductHeader(prodId) {
      try {
        const product = await window.App.fetchAPI(`/api/products/${prodId}`);
        
        // Update product image and details on review card
        const img = document.querySelector('main img');
        if (img) {
          img.src = product.image;
          img.alt = product.name;
        }

        const title = document.querySelector('main h1');
        if (title) {
          title.textContent = product.name;
        }
      } catch (err) {
        console.error('Failed to load product for review header:', err.message);
      }
    }

    // Bind form submit
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
      reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const ratingInput = document.querySelector('input[name="rating"]:checked');
        const commentInput = document.getElementById('review_text');

        if (!ratingInput) {
          alert('Please select a star rating.');
          return;
        }

        if (!commentInput || !commentInput.value.trim()) {
          alert('Please write a short review.');
          return;
        }

        const rating = ratingInput.value;
        const comment = commentInput.value.trim();

        try {
          await window.App.fetchAPI('/api/reviews', {
            method: 'POST',
            body: {
              productId,
              rating,
              comment,
              userName: window.App.user ? window.App.user.name : 'Anonymous Baker'
            }
          });

          alert('Review submitted successfully!');
          // Redirect back to product details
          window.location.href = `/treat-${productId}.html`;
        } catch (err) {
          alert('Failed to submit review: ' + err.message);
        }
      });
    }
  }

  // --- 4. RATE TREATS PAGE (ORDER COMPLETION RATING) ---
  if (path.includes('rate-treats.html')) {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');

    const itemsSection = document.querySelector('main section.space-y-lg');
    const overallRatingContainer = document.getElementById('overall-rating');
    const commentsInput = document.getElementById('comments');
    const submitBtn = document.querySelector('main button.bg-primary-container');
    const skipLink = document.querySelector('main a.text-on-surface-variant');

    let overallRating = 0;
    const itemRatings = {}; // productId -> rating

    // Bind skip link to home
    if (skipLink) {
      skipLink.setAttribute('href', '/index.html');
    }

    if (orderId) {
      loadOrderItemsForRating(orderId);
    } else {
      document.querySelector('main').innerHTML = `
        <div class="py-xl text-center text-on-surface-variant font-body-lg">
          No order ID specified. Return to <a href="/order-history.html" class="text-secondary font-bold hover:underline">Order History</a>.
        </div>
      `;
    }

    // Set up overall rating star clicks
    if (overallRatingContainer) {
      const stars = overallRatingContainer.querySelectorAll('button');
      stars.forEach((star, idx) => {
        star.addEventListener('click', () => {
          overallRating = idx + 1;
          stars.forEach((s, i) => {
            if (i <= idx) {
              s.className = "star-btn material-symbols-outlined text-4xl text-secondary cursor-pointer hover:scale-110 transition-transform";
              s.style.fontVariationSettings = "'FILL' 1";
            } else {
              s.className = "star-btn material-symbols-outlined text-4xl text-outline cursor-pointer hover:scale-110 transition-transform";
              s.style.fontVariationSettings = "'FILL' 0";
            }
          });
        });
      });
    }

    async function loadOrderItemsForRating(id) {
      try {
        const order = await window.App.fetchAPI(`/api/orders/${id}`);
        if (!itemsSection) return;

        itemsSection.innerHTML = `
          <h3 class="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest mb-md">Rate individual items</h3>
        `;

        Object.keys(order.items).forEach(productId => {
          const item = order.items[productId];
          itemRatings[productId] = 0; // initialize

          const itemRow = document.createElement('div');
          itemRow.className = 'flex flex-col md:flex-row items-center md:items-start gap-md bg-surface rounded-lg p-sm border border-outline-variant/10';
          itemRow.innerHTML = `
            <div class="w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-surface-container">
              <img alt="${item.name}" class="w-full h-full object-cover" src="${item.image}"/>
            </div>
            <div class="flex-1 text-center md:text-left">
              <h4 class="font-headline-md text-primary">${item.name}</h4>
              <div class="flex justify-center md:justify-start space-x-xs mt-xs product-stars" data-product-id="${productId}">
                <button class="star-btn material-symbols-outlined text-2xl text-outline cursor-pointer">star</button>
                <button class="star-btn material-symbols-outlined text-2xl text-outline cursor-pointer">star</button>
                <button class="star-btn material-symbols-outlined text-2xl text-outline cursor-pointer">star</button>
                <button class="star-btn material-symbols-outlined text-2xl text-outline cursor-pointer">star</button>
                <button class="star-btn material-symbols-outlined text-2xl text-outline cursor-pointer">star</button>
              </div>
            </div>
          `;

          // Star click bindings
          const itemStars = itemRow.querySelectorAll('.product-stars button');
          itemStars.forEach((star, idx) => {
            star.addEventListener('click', () => {
              itemRatings[productId] = idx + 1;
              itemStars.forEach((s, i) => {
                if (i <= idx) {
                  s.className = "star-btn material-symbols-outlined text-2xl text-secondary cursor-pointer";
                  s.style.fontVariationSettings = "'FILL' 1";
                } else {
                  s.className = "star-btn material-symbols-outlined text-2xl text-outline cursor-pointer";
                  s.style.fontVariationSettings = "'FILL' 0";
                }
              });
            });
          });

          itemsSection.appendChild(itemRow);
        });

      } catch (err) {
        console.error('Failed to load order items for rating page:', err.message);
      }
    }

    // Submit review click
    if (submitBtn) {
      submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const overallComment = commentsInput ? commentsInput.value.trim() : '';
        const author = window.App.user ? window.App.user.name : 'Happy Guest';

        try {
          // Submit rating for each item that has been rated
          const keys = Object.keys(itemRatings);
          let submitted = 0;

          for (const prodId of keys) {
            const rating = itemRatings[prodId];
            if (rating > 0) {
              await window.App.fetchAPI('/api/reviews', {
                method: 'POST',
                body: {
                  productId: prodId,
                  rating: rating,
                  comment: overallComment || 'Excellent treat, baked to perfection!',
                  userName: author
                }
              });
              submitted++;
            }
          }

          alert(submitted > 0 ? 'Thank you for your feedback! Your reviews have been saved.' : 'Thank you for your rating!');
          window.location.href = '/index.html';
        } catch (err) {
          alert('Failed to submit: ' + err.message);
        }
      });
    }
  }
});
