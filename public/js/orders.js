// orders.js - Handles order history, real-time tracking, leaving reviews, and rating treats
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;

  // --- 1. ORDER HISTORY PAGE ---
  if (path.includes('order-history.html')) {
    const listContainer = document.querySelector('main .grid.gap-gutter');
    if (listContainer) {
      Skeleton.show(listContainer, Array.from({length: 6}, () => Skeleton.orderRow({columns: 5})));
      loadOrderHistoryList();
    }

    async function loadOrderHistoryList() {
      try {
        const allowed = await window.App.requireAuth({ returnUrl: '/order-history.html', message: 'Please log in to view your order history.' });
        if (!allowed) return;
        
        const orders = await window.App.fetchAPI('/api/orders');
        if (orders.length === 0) {
          Skeleton.hide(listContainer, () => {
            const div = document.createElement('div');
            div.className = 'bg-surface-container-lowest p-lg rounded-xl butter-shadow text-center text-on-surface-variant font-body-md border border-outline-variant/20 py-xl';
            div.innerHTML = `No orders placed yet. <br/><a href="/treats.html" class="inline-block mt-md bg-secondary text-white font-label-md px-lg py-md rounded-xl hover:opacity-90 active:scale-95 transition-all">Order Fresh Treats</a>`;
            return div;
          });
          return;
        }

        Skeleton.hide(listContainer, () => {
          const frag = document.createDocumentFragment();
          orders.forEach(order => {
            let statusClass = 'bg-surface-container text-on-surface-variant';
            let pulseClass = 'bg-outline';
            if (order.status === 'Pending') {
              statusClass = 'bg-surface-container-high text-primary';
            } else if (order.status === 'Approved' || order.status === 'Confirmed' || order.status === 'Preparing' || order.status === 'Shipped') {
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
                <p class="font-headline-md text-primary">${window.App.formatPrice(order.total)}</p>
                <span class="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
              </div>
            `;

            orderRow.addEventListener('click', () => {
              window.location.href = `/track-order.html?orderId=${order.id}`;
            });

            frag.appendChild(orderRow);
          });
          return frag;
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
      // Show skeleton while loading
      const headerP = document.getElementById('track-order-header');
      const statusH2 = document.getElementById('track-status');
      const itemsList = document.getElementById('order-items-list');
      
      if (headerP) headerP.textContent = 'Loading...';
      if (statusH2) {
        Skeleton.show(statusH2.parentElement, Skeleton.badge());
      }
      
      const mapContainer = document.getElementById('track-map-container');
      if (mapContainer) {
        Skeleton.show(mapContainer, Skeleton.image({height: '400px'}));
      }
      
      if (itemsList) {
        Skeleton.show(itemsList, Array.from({length: 3}, () => {
          const row = document.createElement('div');
          row.className = 'flex items-center gap-md p-md';
          row.appendChild(Skeleton.thumbnail({width: '64px', height: '64px'}));
          const details = document.createElement('div');
          details.style.flex = '1';
          details.style.display = 'flex';
          details.style.flexDirection = 'column';
          details.style.gap = '8px';
          details.appendChild(Skeleton.textLine({width: '60%', height: '16px'}));
          details.appendChild(Skeleton.textLine({width: '40%', height: '12px'}));
          row.appendChild(details);
          return row;
        }));
      }
      
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
        const headerP = document.getElementById('track-order-header');
        if (headerP) {
          const dateStr = new Date(order.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
          headerP.textContent = `Order #${order.id.substring(1, 8).toUpperCase()} • Placed on ${dateStr}`;
        }

        // 2. Update Status text
        const statusH2 = document.getElementById('track-status');
        if (statusH2) {
          statusH2.textContent = order.status;
        }

        // 3. Update ETA or delivered details
        const etaLabel = document.getElementById('eta-label');
        const etaDate = document.getElementById('eta-date');
        const etaTime = document.getElementById('eta-time');

        if (order.status === 'Delivered') {
          if (etaLabel) etaLabel.textContent = 'Delivered on';
          if (etaDate) {
            const delivDate = order.deliveryDate ? new Date(order.deliveryDate + 'T00:00:00') : new Date(order.createdAt);
            etaDate.textContent = delivDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric'
            });
          }
          if (etaTime) {
            if (order.deliveredAt) {
              const delivTime = new Date(order.deliveredAt);
              etaTime.textContent = 'at ' + delivTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit'
              });
            } else {
              etaTime.textContent = '';
            }
          }
        } else if (order.status === 'Cancelled') {
          if (etaLabel) etaLabel.textContent = 'Status';
          if (etaDate) etaDate.textContent = 'Cancelled';
          if (etaTime) etaTime.textContent = '';
        } else {
          if (etaLabel) etaLabel.textContent = 'Estimated Arrival';
          if (etaDate && order.deliveryDate) {
            const delivDate = new Date(order.deliveryDate + 'T00:00:00');
            etaDate.textContent = delivDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric'
            });
          } else if (etaDate) {
            etaDate.textContent = 'Calculating...';
          }
          if (etaTime) etaTime.textContent = 'by 4:00 PM';
        }

        // 4. Update Visual Status Steps Timeline and Map
        updateTimelineSteps(order.status);

        // 5. Render items in box
        renderItemsBox(order.items);

        // 6. Update Carrier/Tracking Number
        const trackCarrier = document.getElementById('track-carrier');
        const trackCode = document.getElementById('track-code');
        if (trackCarrier) {
          trackCarrier.textContent = order.carrier || 'Sweet Delivery Express';
        }
        if (trackCode) {
          trackCode.textContent = order.trackingNumber || `SWEET${id.substring(1, 8).toUpperCase()}`;
        }

        // 7. Setup rate treats button
        const rateBtn = document.getElementById('rate-treats-btn');
        if (rateBtn) {
          if (order.status === 'Delivered') {
            rateBtn.disabled = false;
            rateBtn.classList.remove('opacity-50', 'cursor-not-allowed');
          } else {
            rateBtn.disabled = true;
            rateBtn.classList.add('opacity-50', 'cursor-not-allowed');
          }
          rateBtn.onclick = () => {
            window.location.href = `/rate-treats.html?orderId=${id}`;
          };
        }

      } catch (err) {
        console.error('Failed to load tracking data:', err.message);
      }
    }

    function updateTimelineSteps(status) {
      const steps = document.querySelectorAll('[data-step]');
      const progressFill = document.getElementById('progress-fill');
      const statusBadge = document.getElementById('status-badge');
      
      const statusMap = {
        'Pending': 0,
        'Approved': 1,
        'Confirmed': 1,
        'Preparing': 1,
        'Shipped': 2,
        'Out for Delivery': 3,
        'Completed': 4,
        'Delivered': 4,
        'Cancelled': -1
      };

      const activeIndex = statusMap[status] !== undefined ? statusMap[status] : 0;

      if (progressFill) {
        const widths = ['0%', '25%', '50%', '75%', '100%'];
        if (activeIndex >= 0 && activeIndex < widths.length) {
          progressFill.style.width = widths[activeIndex];
        } else {
          progressFill.style.width = '0%';
        }
      }

      if (statusBadge) {
        if (status === 'Delivered') {
          statusBadge.textContent = 'Delivered';
          statusBadge.className = 'px-3 py-1 rounded-full text-label-sm font-bold bg-green-100 text-green-800 whitespace-nowrap';
        } else if (status === 'Out for Delivery') {
          statusBadge.textContent = 'Out for Delivery';
          statusBadge.className = 'px-3 py-1 rounded-full text-label-sm font-bold bg-secondary-fixed text-on-secondary-fixed-variant whitespace-nowrap';
        } else if (status === 'Cancelled') {
          statusBadge.textContent = 'Cancelled';
          statusBadge.className = 'px-3 py-1 rounded-full text-label-sm font-bold bg-error-container text-on-error-container whitespace-nowrap';
        } else if (status === 'Shipped') {
          statusBadge.textContent = 'Shipped';
          statusBadge.className = 'px-3 py-1 rounded-full text-label-sm font-bold bg-primary-container text-on-primary-container whitespace-nowrap';
        } else {
          statusBadge.textContent = status;
          statusBadge.className = 'px-3 py-1 rounded-full text-label-sm font-bold bg-surface-container-high text-primary whitespace-nowrap';
        }
      }

      if (typeof window.updateMapForStatus === 'function') {
        window.updateMapForStatus(status);
      }

      steps.forEach((step, idx) => {
        const circle = step.querySelector('.step-circle');
        const label = step.querySelector('.step-label');

        if (status === 'Cancelled') {
          step.classList.remove('opacity-40');
          if (circle) {
            circle.className = "step-circle w-10 h-10 rounded-full bg-error text-white flex items-center justify-center";
          }
          if (label) {
            label.className = "step-label font-label-sm md:text-label-md text-on-error-container whitespace-nowrap font-bold";
          }
        } else if (idx < activeIndex) {
          step.classList.remove('opacity-40');
          if (circle) {
            circle.className = "step-circle w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center";
          }
          if (label) {
            label.className = "step-label font-label-sm md:text-label-md text-primary whitespace-nowrap";
          }
        } else if (idx === activeIndex) {
          step.classList.remove('opacity-40');
          if (circle) {
            circle.className = "step-circle w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center ring-4 ring-secondary-container/30";
          }
          if (label) {
            label.className = "step-label font-label-sm md:text-label-md text-secondary font-bold whitespace-nowrap";
          }
        } else {
          step.classList.add('opacity-40');
          if (circle) {
            circle.className = "step-circle w-10 h-10 rounded-full bg-outline-variant text-white flex items-center justify-center";
          }
          if (label) {
            label.className = "step-label font-label-sm md:text-label-md text-on-surface-variant whitespace-nowrap";
          }
        }
      });
    }

    function renderItemsBox(items) {
      const itemsContainer = document.getElementById('order-items-list');
      const countLabel = document.getElementById('items-count');
      
      if (!itemsContainer || !items) return;

      const keys = Object.keys(items);
      if (countLabel) {
        const totalItems = keys.reduce((sum, k) => sum + (items[k].quantity || 0), 0);
        countLabel.textContent = `${totalItems} Item${totalItems !== 1 ? 's' : ''}`;
      }

      itemsContainer.innerHTML = '';
      keys.forEach(k => {
        const item = items[k];
        const itemRow = document.createElement('div');
        itemRow.className = 'flex items-center gap-md';
        itemRow.innerHTML = `
          <div class="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-surface-container">
            <img class="w-full h-full object-cover" src="${item.image || ''}" alt="${item.name || 'Item'}"/>
          </div>
          <div class="flex-1">
            <p class="font-body-md text-body-md text-primary font-medium">${item.name || 'Unknown Item'}</p>
            <p class="font-label-sm text-label-sm text-on-surface-variant">Qty: ${item.quantity || 0} • ${item.unit || 'Treat'}</p>
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
        const mainEl = document.querySelector('main');
        if (mainEl) {
          Skeleton.show(mainEl, () => {
            const sk = document.createElement('div');
            sk.style.maxWidth = '800px';
            sk.style.margin = '0 auto';
            sk.style.padding = '24px';
            sk.appendChild(Skeleton.image({height: '300px', borderRadius: '12px'}));
            sk.appendChild(Skeleton.textLine({width: '60%', height: '32px', marginTop: '16px'}));
            sk.appendChild(Skeleton.textLine({width: '40%', height: '24px', marginTop: '8px'}));
            sk.appendChild(Skeleton.textLine({width: '100%', height: '16px', marginTop: '8px'}));
            sk.appendChild(Skeleton.textLine({width: '90%', height: '16px'}));
            sk.appendChild(Skeleton.textarea({height: '120px', marginTop: '16px'}));
            sk.appendChild(Skeleton.button({height: '48px', marginTop: '16px'}));
            return sk;
          });
        }

        const product = await window.App.fetchAPI(`/api/products/${prodId}`);
        
        const mainContent = document.querySelector('main');
        if (mainContent) {
          Skeleton.hide(mainContent, () => {
            const img = document.querySelector('main img');
            const title = document.querySelector('main h1');
            if (img) {
              img.src = product.image;
              img.alt = product.name;
            }
            if (title) {
              title.textContent = product.name;
            }
            return mainContent;
          });
        }
      } catch (err) {
        console.error('Failed to load product for review header:', err.message);
        const mainContent = document.querySelector('main');
        if (mainContent) {
          Skeleton.hide(mainContent, () => {
            const errorEl = document.createElement('div');
            errorEl.className = 'py-xl text-center text-on-surface-variant font-body-lg';
            errorEl.textContent = 'Failed to load product. Please try again.';
            return errorEl;
          });
        }
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
          window.App.toastWarning('Please select a star rating.');
          return;
        }

        if (!commentInput || !commentInput.value.trim()) {
          window.App.toastWarning('Please write a short review.');
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

          window.App.toastSuccess('Review submitted successfully!');
          // Redirect back to product details
          window.location.href = `/treat-${productId}.html`;
        } catch (err) {
          window.App.toastError('Failed to submit review: ' + err.message);
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
        if (itemsSection) {
          Skeleton.show(itemsSection, Array.from({length: 3}, () => {
            const row = document.createElement('div');
            row.className = 'flex flex-col md:flex-row items-center md:items-start gap-md bg-surface rounded-lg p-sm border border-outline-variant/10';
            row.appendChild(Skeleton.thumbnail({width: '96px', height: '96px'}));
            const details = document.createElement('div');
            details.style.flex = '1';
            details.style.display = 'flex';
            details.style.flexDirection = 'column';
            details.style.alignItems = 'center';
            details.style.gap = '8px';
            if (window.innerWidth >= 768) {
              details.style.alignItems = 'flex-start';
            }
            details.appendChild(Skeleton.textLine({width: '60%', height: '20px'}));
            details.appendChild(Skeleton.textLine({width: '80%', height: '24px'}));
            row.appendChild(details);
            return row;
          }));
        }

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

          window.App.toastSuccess(submitted > 0 ? 'Thank you for your feedback! Your reviews have been saved.' : 'Thank you for your rating!');
          window.location.href = '/index.html';
        } catch (err) {
          window.App.toastError('Failed to submit: ' + err.message);
        }
      });
    }
  }
});
