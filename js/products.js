// ============================================================
// cookieesandcakes — Products Renderer (Tailwind / Stitch UI)
// ============================================================
import { db } from './firebase-config.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const BADGE_MAP = {
  bestseller: { label: 'Bestseller', cls: 'bg-secondary text-white' },
  new:        { label: 'New',        cls: 'bg-primary text-white' },
  seasonal:   { label: 'Seasonal',   cls: 'bg-surface-container-highest text-primary' },
};

// Cleans up URLs (e.g. extracts direct image from Google Images 'imgres' links)
const sanitizeImageUrl = (url) => {
  if (!url) return null;
  try {
    const parsed = url.startsWith('http') ? new URL(url) : new URL(url, window.location.origin);
    if (parsed.pathname.includes('imgres') && parsed.searchParams.has('imgurl')) {
      return parsed.searchParams.get('imgurl');
    }
    return url;
  } catch (e) {
    return url;
  }
};

// ── Data loading ──────────────────────────────────────────────
// Check wishlist storage helpers
export function getWishlist() {
  return JSON.parse(localStorage.getItem('wishlist') || '[]');
}

export function toggleWishlist(id) {
  let wishlist = getWishlist();
  if (wishlist.includes(id)) {
    wishlist = wishlist.filter(item => item !== id);
  } else {
    wishlist.push(id);
  }
  localStorage.setItem('wishlist', JSON.stringify(wishlist));
  updateWishlistBadge();
}

export function updateWishlistBadge() {
  const wishlist = getWishlist();
  const count = wishlist.length;
  document.querySelectorAll('#wishlist-badge').forEach(badge => {
    badge.textContent = count;
    if (count > 0) {
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  });
}

export async function loadProducts() {
  const timeout = (ms) =>
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Realtime DB timeout')), ms)
    );

  try {
    const snapshot = await Promise.race([
      get(ref(db, 'products')),
      timeout(5000),
    ]);
    console.log('Snapshot fetched, children count:', snapshot.exists() ? snapshot.size : 0);
    const products = [];
    snapshot.forEach((childSnap) => {
      products.push({ id: childSnap.key, ...childSnap.val() });
    });
    console.log('Loaded products count:', products.length);
    if (products.length > 0) return products;
    console.warn('Realtime DB returned empty set — trying local fallback.');
  } catch (err) {
    console.warn('Realtime DB failed or timed out:', err);
  }

  try {
    const res = await fetch('/data/products.json');
    const { products: localProducts } = await res.json();
    console.log('Loaded fallback local products count:', localProducts.length);
    return localProducts;
  } catch (e) {
    console.error('Failed to load fallback products JSON:', e);
    return [];
  }
}

// ── Card renderer ─────────────────────────────────────────────
export function renderProductCard(product) {
  const badge = product.tags?.[0] ? BADGE_MAP[product.tags[0]] : null;
  const imgSrc = sanitizeImageUrl(product.image) || '/assets/images/hero/hero.png';
  const wishlist = getWishlist();
  const isWishlisted = wishlist.includes(product.id);

  return `
    <div class="group relative bg-surface-container-lowest rounded-xl butter-shadow overflow-hidden transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between" data-category="${product.category}">
      <div class="aspect-square relative overflow-hidden flex-shrink-0">
        <img class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src="${imgSrc}" alt="${product.name}" loading="lazy" onerror="this.onerror=null;this.src='/assets/images/hero/hero.png'">
        <button class="absolute top-4 right-4 bg-white/80 backdrop-blur-sm p-2 rounded-full text-secondary butter-shadow active:scale-95 transition-all wishlist-btn" data-id="${product.id}">
          <span class="material-symbols-outlined ${isWishlisted ? 'fill-icon' : ''}">favorite</span>
        </button>
        ${badge ? `
        <div class="absolute bottom-4 left-4">
          <span class="bg-secondary text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">${badge.label}</span>
        </div>` : ''}
      </div>
      <div class="p-md flex flex-col justify-between flex-grow">
        <div class="mb-md">
          <div class="flex justify-between items-start mb-base gap-2">
            <h3 class="font-headline-md text-headline-md text-primary line-clamp-1">${product.name}</h3>
            <span class="font-label-md text-label-md text-secondary-container bg-primary-container px-2 py-0.5 rounded text-[12px] whitespace-nowrap">$${product.price.toFixed(2)}</span>
          </div>
          <p class="font-body-md text-body-md text-on-surface-variant line-clamp-2">${product.description}</p>
        </div>
        <a href="order.html?item=${encodeURIComponent(product.name)}" class="w-full py-sm bg-secondary text-white rounded-lg font-label-md text-label-md flex items-center justify-center gap-xs hover:bg-on-secondary-container transition-colors active:scale-[0.98] text-center">
          <span class="material-symbols-outlined text-[20px]">add_shopping_cart</span>
          Order Now
        </a>
      </div>
    </div>
  `;
}

// ── Grid renderer ─────────────────────────────────────────────
export async function renderProductGrid(containerId, limit = null, categoryFilter = 'all') {
  const container = document.getElementById(containerId);
  if (!container) return [];

  container.innerHTML = '<p class="text-center text-on-surface-variant py-8">Loading our treats...</p>';

  try {
    const products = await loadProducts();
    let list = products;

    // Apply category filter if specified
    if (categoryFilter && categoryFilter !== 'all') {
      list = list.filter(p => p.category === categoryFilter);
    }

    if (limit) {
      let featured = products.filter((p) => p.tags?.includes('bestseller'));
      if (featured.length < limit) {
        const needed = limit - featured.length;
        const others = products.filter((p) => !p.tags?.includes('bestseller')).slice(0, needed);
        featured = [...featured, ...others];
      }
      list = featured.slice(0, limit);
    }

    if (list.length === 0) {
      container.innerHTML = '<p class="text-center text-on-surface-variant py-8">No bakes available in this collection.</p>';
    } else {
      container.innerHTML = list.map(renderProductCard).join('');
      console.log('Rendered product cards:', list.length);
    }

    // Bind wishlist click listeners dynamically
    container.querySelectorAll('.wishlist-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        toggleWishlist(id);
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) {
          icon.classList.toggle('fill-icon');
        }
      });
    });

    return products;
  } catch (err) {
    container.innerHTML = '<p class="text-center text-error py-8">Could not load products. Please refresh.</p>';
    return [];
  }
}
