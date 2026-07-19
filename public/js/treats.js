// treats.js - Handles catalog loading, sorting, search, category filter, cart adding, and wishlisting
document.addEventListener('DOMContentLoaded', () => {
  const productGrid = document.querySelector('main section.flex-grow div.grid');
  if (!productGrid) return; // Not on the Treats page

  let activeCategory = 'all';
  let searchQuery = '';
  let sortBy = 'Newest First';

  // Parse URL query parameter for category pre-selection
  const urlParams = new URLSearchParams(window.location.search);
  const catParam = urlParams.get('category');
  if (catParam) {
    activeCategory = catParam;
  }

  // 1. Setup Category Filter Sidebar Click Handlers
  const filterButtons = document.querySelectorAll('aside ul li button');
  filterButtons.forEach(btn => {
    const text = btn.textContent.trim().toLowerCase();
    let categoryKey = 'all';
    if (text.includes('cookies')) categoryKey = 'cookies';
    else if (text.includes('cakes')) categoryKey = 'cakes';
    else if (text.includes('pastries')) categoryKey = 'pastries';
    else if (text.includes('seasonal')) categoryKey = 'pastries'; // map seasonal as pastries or custom filter

    // Pre-activate filter button based on URL param
    if (catParam && text.includes(catParam.toLowerCase())) {
      setActiveButton(btn);
    } else if (!catParam && text.includes('all treats')) {
      setActiveButton(btn);
    }

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      setActiveButton(btn);
      activeCategory = categoryKey;
      loadProducts();
    });
  });

  function setActiveButton(activeBtn) {
    filterButtons.forEach(b => {
      b.className = "w-full text-left px-md py-sm rounded-xl font-label-md text-label-md text-on-surface-variant hover:bg-surface-container transition-all";
    });
    activeBtn.className = "w-full text-left px-md py-sm rounded-xl font-label-md text-label-md transition-all active-filter bg-primary-container text-white";
  }

  // 2. Setup Sort Event Handler
  const sortSelect = document.querySelector('select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      sortBy = e.target.value;
      loadProducts();
    });
  }

  // 3. Setup Search input (if present)
  // Let's check if there is an input we can use. If not, let's look for one in the footer or create one dynamically.
  // In treats.html, there is a Search input in the kitchen club. We can add a local search bar to the catalog header dynamically!
  const catalogHeader = document.querySelector('main section.flex-grow div.flex.justify-between.items-end');
  if (catalogHeader && !document.getElementById('catalog-search')) {
    const searchWrapper = document.createElement('div');
    searchWrapper.className = 'relative w-full md:w-64 mt-md md:mt-0';
    searchWrapper.innerHTML = `
      <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant">search</span>
      <input id="catalog-search" type="text" placeholder="Search treats..." class="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg font-body-md text-on-surface focus:ring-0 focus:border-primary transition-all placeholder:text-outline-variant"/>
    `;
    catalogHeader.appendChild(searchWrapper);
    
    document.getElementById('catalog-search').addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      loadProducts();
    });
  }

  // 4. Load Products from Backend API
  async function loadProducts() {
    if (!productGrid) return;
    
    Skeleton.show(productGrid, Array.from({length: 6}, () => Skeleton.productCard()));

    try {
      let url = `/api/products?category=${activeCategory}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      
      if (sortBy.includes('Low to High')) url += '&sort=low-high';
      else if (sortBy.includes('High to Low')) url += '&sort=high-low';

      const products = await window.App.fetchAPI(url);
      
      if (products.length === 0) {
        Skeleton.hide(productGrid, () => {
          const div = document.createElement('div');
          div.className = 'col-span-full py-xl text-center text-on-surface-variant font-body-lg';
          div.textContent = 'No treats found. Try another search or filter!';
          return div;
        });
        return;
      }

      Skeleton.hide(productGrid, () => {
        const frag = document.createDocumentFragment();
        products.forEach(product => {
          const isWishlisted = !!window.App.wishlist[product.id];
          const heartFill = isWishlisted ? 'fill-icon' : '';
          const heartFillSettings = isWishlisted ? "'FILL' 1" : "'FILL' 0";

          const card = document.createElement('div');
          card.className = 'group relative bg-surface-container-lowest rounded-xl butter-shadow overflow-hidden transition-all duration-300 hover:-translate-y-1';
          card.setAttribute('data-product-id', product.id);
          
          let productUrl = `/treat-${product.id}.html`;

          let buttonText = 'Add to Bag';
          let buttonIcon = 'shopping_bag';
          if (product.category === 'cakes' && product.price > 25) {
            buttonText = 'Pre-order';
            buttonIcon = 'calendar_today';
          }

          card.innerHTML = `
            <div class="aspect-square relative overflow-hidden cursor-pointer product-img-link">
              <img class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src="${product.image}" alt="${product.name}"/>
              <button class="absolute top-4 right-4 bg-white/80 backdrop-blur-sm p-2 rounded-full text-secondary wishlist-btn butter-shadow active:scale-95 transition-all">
                <span class="material-symbols-outlined ${heartFill}" style="font-variation-settings: ${heartFillSettings};">favorite</span>
              </button>
              ${product.tags && product.tags[0] ? `
                <div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <span class="bg-secondary text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">${product.tags[0]}</span>
                </div>
              ` : ''}
            </div>
            <div class="p-md">
              <div class="flex justify-between items-start mb-base cursor-pointer product-title-link">
                <h3 class="font-headline-md text-headline-md text-primary hover:text-secondary transition-colors">${product.name}</h3>
                <span class="font-label-md text-label-md text-secondary-container bg-primary-container px-2 py-0.5 rounded text-[12px]">${window.App.formatPrice(product.price)}</span>
              </div>
              <p class="font-body-md text-body-md text-on-surface-variant line-clamp-2 mb-md">${product.description}</p>
              <button class="w-full py-sm bg-secondary text-white rounded-lg font-label-md text-label-md flex items-center justify-center gap-xs hover:bg-on-secondary-container transition-colors active:scale-[0.98] add-to-cart-btn">
                <span class="material-symbols-outlined text-[20px]">${buttonIcon}</span>
                ${buttonText}
              </button>
            </div>
          `;

          card.querySelectorAll('.product-img-link, .product-title-link').forEach(elem => {
            elem.addEventListener('click', (e) => {
              if (e.target.closest('.wishlist-btn')) return;
              window.location.href = productUrl;
            });
          });

          card.querySelector('.wishlist-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
              const allowed = await window.App.requireAuth({ returnUrl: window.location.pathname + window.location.search, message: 'Please log in to manage your wishlist.' });
              if (!allowed) return;
              
              const data = await window.App.fetchAPI('/api/wishlist/toggle', {
                method: 'POST',
                body: { productId: product.id }
              });
              await window.App.loadWishlist();
              const span = card.querySelector('.wishlist-btn span');
              if (data.status === 'added') {
                span.classList.add('fill-icon');
                span.style.fontVariationSettings = "'FILL' 1";
                window.App.toastSuccess('Added to Wishlist ❤️');
              } else {
                span.classList.remove('fill-icon');
                span.style.fontVariationSettings = "'FILL' 0";
                window.App.toastSuccess('Removed from Wishlist 💔');
              }
            } catch (err) {
              window.App.toastError('Failed to update wishlist. Please try again.');
            }
          });

          card.querySelector('.add-to-cart-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            
            const allowed = await window.App.requireAuth({ returnUrl: window.location.pathname + window.location.search, message: 'Please log in to add items to your cart.' });
            if (!allowed) return;
            
            try {
              await window.App.fetchAPI('/api/cart', {
                method: 'POST',
                body: { productId: product.id, quantity: 1 }
              });
              await window.App.updateCartBadge();
              window.App.toastSuccess(`${product.name} added to cart!`);
            } catch (err) {
              window.App.toastError(err.message);
            }
          });

          frag.appendChild(card);
        });
        return frag;
      });
    } catch (err) {
      console.error('Failed to load catalog products:', err.message);
      Skeleton.hide(productGrid, () => {
        const div = document.createElement('div');
        div.className = 'col-span-full py-xl text-center text-on-surface-variant font-body-lg';
        div.textContent = 'Failed to load treats. Please try again later.';
        return div;
      });
    }
  }

  // Initial load
  // Wait for the shared wishlist to finish loading before rendering products
  (async () => {
    await window.App.loadWishlist().catch(() => {});
    loadProducts();
  })();
});
