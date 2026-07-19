// product.js - Handles Product details page actions, reviews dynamic loading, wishlist page, and personalization success page
document.addEventListener('DOMContentLoaded', async () => {
  const path = window.location.pathname;

  // Extract product ID from URL for both /product-details.html?id= and /treat-{slug}.html
  const productSlugMatch = path.match(/\/treat-([^\/]+)\.html/);
  const urlParams = new URLSearchParams(window.location.search);
  const productIdParam = urlParams.get('id');
  let productId = productSlugMatch ? productSlugMatch[1] : (productIdParam || '');

  // --- 1. PRODUCT DETAILS PAGE FLOW ---
  if (productId) {
    const qtyInput = document.querySelector('input[type="number"]');
    let addToBagBtn = document.querySelector('button:has(.material-symbols-outlined[data-icon="shopping_bag"])') || 
                      document.querySelector('button.flex-1.bg-secondary');
    if (!addToBagBtn) addToBagBtn = document.getElementById('add-to-cart-btn');
    const messageInput = document.getElementById('message');

    window.increment = () => {
      const qty = document.getElementById('qty');
      if (qty) qty.value = Math.min(+(qty.max || 10), parseInt(qty.value || 1) + 1);
    };

    window.decrement = () => {
      const qty = document.getElementById('qty');
      if (qty) qty.value = Math.max(+(qty.min || 1), parseInt(qty.value || 1) - 1);
    };

    // Product navigation with History API support
    window.navigateToProduct = function(targetProductId) {
      if (!targetProductId || targetProductId === productId) return;
      const isDetailsPage = path.includes('product-details.html');
      const targetUrl = isDetailsPage ? `/product-details.html?id=${targetProductId}` : `/treat-${targetProductId}.html`;
      if (window.location.pathname + window.location.search !== targetUrl) {
        history.pushState({ productId: targetProductId }, '', targetUrl);
      }
      loadProduct(targetProductId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Handle browser back/forward
    window.addEventListener('popstate', async (e) => {
      if (e.state && e.state.productId) {
        await loadProduct(e.state.productId);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    // Load product data dynamically from API and enrich the static page
    await loadProduct(productId);

    // Bind Add to Cart / Tray Button
    if (addToBagBtn) {
      addToBagBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const allowed = await window.App.requireAuth({ returnUrl: window.location.pathname + window.location.search, message: 'Please log in to add items to your cart.' });
        if (!allowed) return;
        
        const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
        const message = messageInput ? messageInput.value.trim() : '';

        try {
          await window.App.fetchAPI('/api/cart', {
            method: 'POST',
            body: { productId, quantity, personalization: message }
          });
          
          await window.App.updateCartBadge();

          if (message) {
            window.location.href = `/message-added.html?productId=${productId}&message=${encodeURIComponent(message)}`;
          } else {
            window.App.toastSuccess('Added to cart!');
          }
        } catch (err) {
          window.App.toastError('Failed to add item to cart: ' + err.message);
        }
      });
    }
  } else {
    const notFoundEl = document.getElementById('product-not-found');
    if (notFoundEl) notFoundEl.classList.remove('hidden');
    const productContent = document.getElementById('product-content');
    if (productContent) productContent.classList.add('hidden');
    document.title = 'Product Not Found | cookieesandcakes';
  }

    async function loadProduct(prodId) {
      productId = prodId;
      
      // Update URL if needed
      const isDetailsPage = path.includes('product-details.html');
      const expectedUrl = isDetailsPage ? `/product-details.html?id=${prodId}` : `/treat-${prodId}.html`;
      const currentUrl = window.location.pathname + window.location.search;
      if (currentUrl !== expectedUrl && !history.state?.productId) {
        history.replaceState({ productId: prodId }, '', expectedUrl);
      }

      // Clear existing dynamic sections
      const existingBadge = document.querySelector('.product-badge');
      if (existingBadge) existingBadge.remove();
      
      const existingReviews = document.getElementById('product-reviews-section');
      if (existingReviews) existingReviews.remove();
      
      const existingStockInfo = document.querySelector('.stock-info');
      if (existingStockInfo) existingStockInfo.remove();

      // Show skeleton overlay while loading
      const productContent = document.getElementById('product-content');
      if (productContent && !productContent.querySelector('.skeleton-overlay')) {
        productContent.style.opacity = '0.3';
        productContent.style.pointerEvents = 'none';
        
        const overlay = document.createElement('div');
        overlay.className = 'skeleton-overlay';
        overlay.style.cssText = 'position:absolute;top:0;left:0;right:0;z-index:10;pointer-events:none;';
        
        const sk = Skeleton.productDetails();
        overlay.appendChild(sk);
        
        const parent = productContent.parentElement;
        if (parent) {
          parent.style.position = parent.style.position || 'relative';
          parent.appendChild(overlay);
        }
      }

      // Load product data
      await loadProductData(prodId);
      
      // Hide skeleton overlay
      const overlay = document.querySelector('.skeleton-overlay');
      if (overlay) overlay.remove();
      if (productContent) {
        productContent.style.opacity = '1';
        productContent.style.pointerEvents = 'auto';
        productContent.style.transition = 'opacity 0.3s ease';
      }
      
      // Load and render product reviews
      await loadProductReviews(prodId);
    }

    async function loadProductReviews(prodId) {
      // Find main container and append a reviews section before the footer
      const mainContainer = document.querySelector('main');
      if (!mainContainer) return;

      // Remove existing reviews section if present
      const existingReviews = document.getElementById('product-reviews-section');
      if (existingReviews) existingReviews.remove();

      // Create a nice review section
      const reviewsSection = document.createElement('section');
      reviewsSection.id = 'product-reviews-section';
      reviewsSection.className = 'mt-xl border-t border-outline-variant/30 pt-xl';
      reviewsSection.innerHTML = `
        <div class="max-w-[1200px] mx-auto">
          <div class="flex flex-col md:flex-row md:items-center justify-between mb-lg">
            <div>
              <h2 class="font-headline-lg text-headline-lg text-primary">Guest Reviews</h2>
              <div class="flex items-center gap-sm mt-xs">
                <div class="flex text-secondary" id="average-stars-display">
                  <!-- stars injected here -->
                </div>
                <span class="font-label-md text-label-md text-on-surface-variant" id="reviews-count-display">Loading reviews...</span>
              </div>
            </div>
            <a href="/leave-review.html?productId=${prodId}" class="mt-md md:mt-0 inline-flex items-center justify-center px-lg py-md bg-primary text-white font-label-md text-label-md rounded-xl hover:bg-primary-container active:scale-95 transition-all butter-shadow">
              Write a Review
            </a>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-lg" id="reviews-list-container">
            <!-- Review cards injected here -->
          </div>
        </div>
      `;

      // Insert before footer so reviews appear above it
      const footer = mainContainer.querySelector('footer');
      if (footer) {
        mainContainer.insertBefore(reviewsSection, footer);
      } else {
        mainContainer.appendChild(reviewsSection);
      }

      const listContainer = document.getElementById('reviews-list-container');
      if (listContainer) {
        Skeleton.show(listContainer, Array.from({length: 4}, () => {
          const card = document.createElement('div');
          card.className = 'bg-surface-container-low p-md md:p-lg rounded-xl border border-outline-variant/20 butter-shadow space-y-sm';
          card.appendChild(Skeleton.avatar({size: '32px'}));
          card.appendChild(Skeleton.textLine({width: '40%', height: '14px', marginTop: '8px'}));
          card.appendChild(Skeleton.textLine({width: '100%', height: '12px', marginTop: '8px'}));
          card.appendChild(Skeleton.textLine({width: '90%', height: '12px'}));
          return card;
        }));
      }

      try {
        const reviews = await window.App.fetchAPI(`/api/reviews/${prodId}`);
        const avgStarsDisplay = document.getElementById('average-stars-display');
        const reviewsCountDisplay = document.getElementById('reviews-count-display');
        const reviewsListContainer = document.getElementById('reviews-list-container');

        if (reviews.length === 0) {
          reviewsCountDisplay.textContent = 'No reviews yet. Be the first to share your thoughts!';
          avgStarsDisplay.innerHTML = '☆☆☆☆☆';
          Skeleton.hide(reviewsListContainer, () => {
            const div = document.createElement('div');
            div.className = 'col-span-full bg-surface-container-low p-lg rounded-xl text-center text-on-surface-variant font-body-md border border-outline-variant/10';
            div.textContent = 'No reviews submitted yet for this signature bake.';
            return div;
          });
          return;
        }

        // Calculate average rating
        let sum = 0;
        reviews.forEach(r => sum += r.rating);
        const avgRating = (sum / reviews.length).toFixed(1);

        reviewsCountDisplay.textContent = `${avgRating} out of 5 stars (based on ${reviews.length} review${reviews.length > 1 ? 's' : ''})`;

        // Build average stars HTML
        let starsHtml = '';
        const fullStars = Math.round(avgRating);
        for (let i = 1; i <= 5; i++) {
          starsHtml += `<span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' ${i <= fullStars ? 1 : 0};">star</span>`;
        }
        avgStarsDisplay.innerHTML = starsHtml;

        // Render reviews list
        Skeleton.hide(listContainer, () => {
          const frag = document.createDocumentFragment();
          reviews.forEach(review => {
            const dateStr = new Date(review.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            let reviewStars = '';
            for (let i = 1; i <= 5; i++) {
              reviewStars += `<span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' ${i <= review.rating ? 1 : 0};">star</span>`;
            }

            const card = document.createElement('div');
            card.className = 'bg-surface-container-low p-md md:p-lg rounded-xl border border-outline-variant/20 butter-shadow space-y-sm';
            card.innerHTML = `
              <div class="flex justify-between items-start">
                <div>
                  <h4 class="font-label-md text-label-md text-primary">${review.userName}</h4>
                  <p class="text-[12px] text-on-surface-variant">${dateStr}</p>
                </div>
                <div class="flex text-secondary">${reviewStars}</div>
              </div>
              <p class="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                "${review.comment}"
              </p>
            `;
            frag.appendChild(card);
          });
          return frag;
        });
      } catch (err) {
        console.error('Failed to load reviews:', err.message);
      }
    }

    // Dynamically enrich product detail page with data from the API
    async function loadProductData(prodId) {
      try {
        const product = await window.App.fetchAPI(`/api/products/${prodId}`);
        
        // Handle product not found
        if (!product) {
          showProductNotFound();
          return;
        }

        // Hide not found message if visible
        const notFoundEl = document.getElementById('product-not-found');
        if (notFoundEl) notFoundEl.classList.add('hidden');
        const productContent = document.getElementById('product-content');
        if (productContent) productContent.classList.remove('hidden');

        // Update page title
        if (product.name) {
          document.title = `${product.name} | cookieesandcakes`;
        }

        // Update hero image
        if (product.image) {
            let heroImg = document.querySelector('main .grid > div:first-child img');
            if (!heroImg) heroImg = document.getElementById('product-hero-image');
            if (heroImg) {
                heroImg.src = product.image;
                heroImg.alt = product.name;
            }
        }

        // Update product name
        if (product.name) {
            let nameEl = document.querySelector('main h1');
            if (!nameEl) nameEl = document.getElementById('product-name');
            if (nameEl) nameEl.textContent = product.name;
        }

        // Update breadcrumb name
        if (product.name) {
            const breadcrumbName = document.getElementById('breadcrumb-name');
            if (breadcrumbName) breadcrumbName.textContent = product.name;
        }

        // Update product price
        if (product.price !== undefined) {
            let priceEl = document.querySelector('main .font-headline-md.text-secondary');
            if (!priceEl) priceEl = document.getElementById('product-price');
            if (priceEl) priceEl.textContent = window.App.formatPrice(product.price);
        }

        // Update product description
        if (product.description) {
            let descEl = document.querySelector('main .grid > div:last-child .font-body-lg');
            if (!descEl) descEl = document.getElementById('product-description');
            if (descEl) descEl.textContent = product.description;
        }

        // Update badge if present
        if (product.badge) {
            let heroSection = document.querySelector('main .grid > div:first-child');
            if (!heroSection) heroSection = document.querySelector('#product-hero-image')?.closest('.relative');
            if (heroSection && !heroSection.querySelector('.product-badge')) {
                const badgeContainer = document.getElementById('product-badge-container');
                if (badgeContainer) {
                    badgeContainer.classList.remove('hidden');
                    const badgeText = document.getElementById('product-badge-text');
                    if (badgeText) badgeText.textContent = product.badge;
                } else {
                    const badgeEl = document.createElement('div');
                    badgeEl.className = 'product-badge absolute top-4 left-4 bg-surface/90 backdrop-blur-sm px-md py-xs rounded-full border border-primary/10 flex items-center gap-xs z-10';
                    badgeEl.innerHTML = `<span class="material-symbols-outlined text-secondary text-sm" style="font-variation-settings: 'FILL' 1;">star</span><span class="font-label-md text-label-md text-primary">${product.badge}</span>`;
                    heroSection.appendChild(badgeEl);
                }
            }
        }

        // Update tags if present
        if (product.tags && product.tags.length) {
            let tagsContainer = document.querySelector('main .grid > div:last-child .flex.flex-wrap.gap-sm');
            if (!tagsContainer) tagsContainer = document.getElementById('product-tags');
            if (tagsContainer) {
                tagsContainer.innerHTML = product.tags.map(tag => {
                    const icon = tag.includes('Special') ? 'emoji_nature' : tag.includes('Same-day') ? 'bolt' : tag.includes('Seasonal') ? 'wb_sunny' : tag.includes('Chef') ? 'restaurant' : 'label';
                    return `<span class="px-md py-xs bg-surface-container-low text-primary border border-outline-variant rounded-full font-label-md text-label-md flex items-center gap-xs"><span class="material-symbols-outlined text-sm">${icon}</span> ${tag}</span>`;
                }).join('');
            }
        }

        // Update ingredients accordion if present
        if (product.ingredients && product.ingredients.length) {
            let ingredientsDetails = document.querySelector('details:has(summary:contains("Ingredients"))');
            if (!ingredientsDetails) {
                const allDetails = document.querySelectorAll('details');
                allDetails.forEach(d => {
                    const summary = d.querySelector('summary');
                    if (summary && summary.textContent.includes('Ingredients')) {
                        ingredientsDetails = d;
                    }
                });
            }
            if (ingredientsDetails) {
                const contentP = ingredientsDetails.querySelector('p');
                if (contentP) contentP.textContent = product.ingredients.join(', ');
            } else {
                const ingredientsEl = document.getElementById('product-ingredients');
                if (ingredientsEl) ingredientsEl.textContent = product.ingredients.join(', ');
            }
        }

        // Update flavor profile accordion if present
        if (product.flavorProfile && product.flavorProfile.length) {
            let flavorDetails = document.querySelector('details:has(summary:contains("Flavor Profile"))');
            if (!flavorDetails) {
                const allDetails = document.querySelectorAll('details');
                allDetails.forEach(d => {
                    const summary = d.querySelector('summary');
                    if (summary && summary.textContent.includes('Flavor Profile')) {
                        flavorDetails = d;
                    }
                });
            }
            if (flavorDetails) {
                const contentP = flavorDetails.querySelector('p');
                if (contentP) contentP.textContent = product.flavorProfile.join(', ');
            } else {
                const flavorEl = document.getElementById('product-flavor');
                if (flavorEl) flavorEl.textContent = product.flavorProfile.join(', ');
            }
        }

        // Update Pairs Well With section if present
        if (product.pairsWith && product.pairsWith.length) {
            let pairsSection = document.querySelector('section.mt-xl');
            let trayContainer = document.getElementById('pairs-well-with');
            if (!pairsSection && trayContainer) pairsSection = trayContainer.closest('section');
            if (pairsSection && (pairsSection.querySelector('h2')?.textContent.includes('Pairs Well With') || trayContainer)) {
                if (trayContainer) {
                    trayContainer.innerHTML = '';
                    const pairPromises = product.pairsWith.map(async pairId => {
                        try {
                            const pairProduct = await window.App.fetchAPI(`/api/products/${pairId}`);
                            if (!pairProduct) return;
                            const pairCard = document.createElement('div');
                            pairCard.className = 'flex-none w-[280px] group cursor-pointer';
                            pairCard.innerHTML = `
                                <div class="aspect-[4/5] rounded-xl overflow-hidden mb-sm butter-shadow">
                                    <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${pairProduct.image}" alt="${pairProduct.name}"/>
                                </div>
                                <h3 class="font-label-md text-label-md text-primary group-hover:text-secondary transition-colors">${pairProduct.name}</h3>
                                <p class="text-secondary font-label-sm text-label-sm">${window.App.formatPrice(pairProduct.price || 0)}</p>
                            `;
                            pairCard.addEventListener('click', () => {
                              window.navigateToProduct(pairId);
                            });
                            trayContainer.appendChild(pairCard);
                        } catch (_) {}
                    });
                    await Promise.all(pairPromises);
                }
            }
        }

        // Add availability/stock info if present
        if (product.availability || product.stock !== undefined) {
            let selectorsSection = document.querySelector('.bg-surface-container-lowest');
            if (!selectorsSection) {
                const addToCartBtn = document.getElementById('add-to-cart-btn');
                if (addToCartBtn) {
                    selectorsSection = addToCartBtn.closest('.bg-surface-container-lowest');
                }
            }
            if (selectorsSection) {
                // Remove existing stock info
                const existingStock = selectorsSection.querySelector('.stock-info');
                if (existingStock) existingStock.remove();
                
                const stockInfo = document.createElement('div');
                stockInfo.className = 'stock-info flex items-center justify-between mt-2 text-sm';
                const stockText = product.availability === 'In Stock' ? `In Stock (${product.stock || 0} available)` : product.availability === 'Out of Stock' ? 'Out of Stock' : `Pre-order (${product.stock || 0} available)`;
                const stockColor = product.availability === 'In Stock' ? 'text-green-700' : product.availability === 'Out of Stock' ? 'text-red-600' : 'text-amber-600';
                stockInfo.innerHTML = `<span class="font-label-md text-label-md ${stockColor}">${stockText}</span>`;
                if (product.sku) {
                    stockInfo.innerHTML += `<span class="font-label-sm text-label-sm text-on-surface-variant">SKU: ${product.sku}</span>`;
                }
                selectorsSection.appendChild(stockInfo);
            }
        }
      } catch (err) {
        console.error('Failed to load product data:', err.message);
        showProductNotFound();
      }
    }

    function showProductNotFound() {
      const productContent = document.getElementById('product-content');
      const notFoundEl = document.getElementById('product-not-found');
      if (productContent) productContent.classList.add('hidden');
      if (notFoundEl) notFoundEl.classList.remove('hidden');
      document.title = 'Product Not Found | cookieesandcakes';
    }
  }

  // --- 2. WISHLIST PAGE FLOW ---
  if (path.includes('wishlist.html')) {
    const listContainer = document.querySelector('div.grid.grid-cols-1.md\\:grid-cols-12');
    if (!listContainer) return;

    async function renderWishlistPage() {
      if (!listContainer) return;
      
      const wishlist = window.App.wishlist;
      const ids = Object.keys(wishlist);

      if (ids.length === 0) {
        listContainer.className = 'flex flex-col items-center justify-center py-xl text-center';
        listContainer.innerHTML = `
          <div class="max-w-md space-y-md">
            <span class="material-symbols-outlined text-6xl text-outline-variant">favorite_border</span>
            <h2 class="font-headline-md text-headline-md text-primary">Your Wishlist is Empty</h2>
            <p class="font-body-md text-body-md text-on-surface-variant">Tempting treats you save will appear here. Browse our menu to fill it with your favorites!</p>
            <a href="/treats.html" class="inline-block bg-secondary text-white font-label-md px-lg py-md rounded-xl hover:opacity-90 active:scale-95 transition-all">
              Go to Treats Gallery
            </a>
          </div>
        `;
        return;
      }

      listContainer.className = 'grid grid-cols-1 md:grid-cols-12 gap-gutter';
      listContainer.innerHTML = '';

      ids.forEach((id, index) => {
        const item = wishlist[id];
        
        let colSpan = 'md:col-span-4';
        if (index % 3 === 0) {
          colSpan = 'md:col-span-8';
        }

        const itemCard = document.createElement('div');
        itemCard.className = `${colSpan} group bg-surface-container-low rounded-xl overflow-hidden butter-shadow bakers-tray-item relative`;
        
        let cardHtml = '';
        if (colSpan === 'md:col-span-8') {
          cardHtml = `
            <div class="flex flex-col md:flex-row h-full">
              <div class="md:w-1/2 overflow-hidden h-64 md:h-full relative">
                <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src="${item.image}" alt="${item.name}"/>
              </div>
              <div class="md:w-1/2 p-lg flex flex-col justify-between">
                <div>
                  <h3 class="font-headline-md text-headline-md text-primary mb-xs">${item.name}</h3>
                  <p class="text-on-surface-variant font-body-md mb-md">${item.description}</p>
                </div>
                <div class="flex items-center justify-between">
                  <span class="font-headline-md text-primary">${window.App.formatPrice(item.price)}</span>
                  <div class="flex gap-sm">
                    <button class="p-3 rounded-full border border-outline hover:bg-surface-container-high transition-colors text-primary active-scale delete-btn">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                    <button class="flex items-center gap-2 bg-secondary text-on-secondary px-6 py-3 rounded-xl font-label-md text-label-md hover:bg-secondary/90 transition-all active-scale butter-shadow add-cart-btn">
                      <span class="material-symbols-outlined">shopping_cart</span>
                      Move to Cart
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `;
        } else {
          cardHtml = `
            <div class="h-48 overflow-hidden">
              <img class="w-full h-full object-cover" src="${item.image}" alt="${item.name}"/>
            </div>
            <div class="p-md">
              <h3 class="font-headline-md text-headline-md text-primary mb-xs">${item.name}</h3>
              <p class="text-on-surface-variant font-body-md mb-md">Signature Treat</p>
              <div class="flex items-center justify-between">
                <span class="font-headline-md text-primary">${window.App.formatPrice(item.price)}</span>
                <div class="flex gap-xs">
                  <button class="p-2 text-on-surface-variant hover:text-error transition-colors delete-btn">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                  <button class="bg-secondary text-on-secondary p-3 rounded-xl active-scale add-cart-btn">
                    <span class="material-symbols-outlined">add_shopping_cart</span>
                  </button>
                </div>
              </div>
            </div>
          `;
        }

        itemCard.innerHTML = cardHtml;

        itemCard.querySelector('.delete-btn').addEventListener('click', async () => {
          try {
            const allowed = await window.App.requireAuth({ returnUrl: window.location.pathname + window.location.search, message: 'Please log in to manage your wishlist.' });
            if (!allowed) return;
            
            const data = await window.App.fetchAPI('/api/wishlist/toggle', {
              method: 'POST',
              body: { productId: id }
            });
            await window.App.loadWishlist();
            if (data.status === 'removed') {
              window.App.toastSuccess('Removed from Wishlist 💔');
            }
          } catch (err) {
            window.App.toastError('Failed to update wishlist. Please try again.');
          }
        });

        itemCard.querySelector('.add-cart-btn').addEventListener('click', async () => {
          try {
            const allowed = await window.App.requireAuth({ returnUrl: window.location.pathname + window.location.search, message: 'Please log in to add items to your cart.' });
            if (!allowed) return;
            
            await window.App.fetchAPI('/api/cart', {
              method: 'POST',
              body: { productId: id, quantity: 1 }
            });
            await window.App.fetchAPI('/api/wishlist/toggle', {
              method: 'POST',
              body: { productId: id }
            });
            
            await window.App.updateCartBadge();
            await window.App.loadWishlist();
            window.App.toastSuccess(`${item.name} moved to cart!`);
          } catch (err) {
            window.App.toastError(err.message);
          }
        });

        listContainer.appendChild(itemCard);
      });
    }

    // Wait for the shared wishlist to load, then render
    await window.App.loadWishlist().catch(() => {});
    renderWishlistPage();

    // Re-render whenever the shared wishlist changes
    window.App.onWishlistChange(() => renderWishlistPage());
  }

  // --- 3. PERSONALIZATION CONFIRMATION FLOW ---
  if (path.includes('message-added.html')) {
    const params = new URLSearchParams(window.location.search);
    const prodId = params.get('productId');
    const msg = params.get('message');

    if (prodId && msg) {
      try {
        const product = await window.App.fetchAPI(`/api/products/${prodId}`);
        
        // Update product image and title on personalization success card
        const img = document.querySelector('main img');
        if (img) {
          img.src = product.image;
          img.alt = product.name;
        }

        const tag = document.querySelector('main .font-label-md.text-secondary');
        if (tag) {
          tag.textContent = product.name;
        }

        const msgBox = document.querySelector('main .italic.font-body-md');
        if (msgBox) {
          msgBox.textContent = `“${msg}”`;
        }
      } catch (err) {
        console.error('Failed to load personalized item details:', err.message);
      }
    }

    // Link Action Buttons
    const checkoutBtn = document.querySelector('main button.bg-secondary');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        window.location.href = '/cart.html';
      });
    }

    const shopBtn = document.querySelector('main button.border-primary');
    if (shopBtn) {
      shopBtn.addEventListener('click', () => {
        window.location.href = '/treats.html';
      });
    }
  }
});
