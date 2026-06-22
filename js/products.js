// ============================================================
// cookieesandcakes — Products Renderer
// ============================================================
import { db } from './firebase-config.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const BADGE_MAP = {
  bestseller: { label: 'Bestseller', cls: 'badge--bestseller' },
  new:        { label: 'New',        cls: 'badge--new' },
  seasonal:   { label: 'Seasonal',   cls: 'badge--seasonal' },
};

// Cleans up URLs (e.g. extracts direct image from Google Images 'imgres' links)
const sanitizeImageUrl = (url) => {
  if (!url) return null;
  try {
    // Some browsers prefix missing protocols or we just parse it
    const parsed = url.startsWith('http') ? new URL(url) : new URL(url, window.location.origin);
    
    // If the user pasted a Google Images link, extract the actual image URL
    if (parsed.pathname.includes('imgres') && parsed.searchParams.has('imgurl')) {
      return parsed.searchParams.get('imgurl');
    }
    
    return url;
  } catch (e) {
    return url;
  }
};

// ── Data loading ──────────────────────────────────────────────
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

  return `
    <article class="product-card reveal" data-category="${product.category}">
      <div class="product-card__image-wrap">
        <img
          class="product-card__image"
          src="${imgSrc}"
          alt="${product.name}"
          loading="lazy"
          width="600" height="450"
          onerror="this.onerror=null;this.src='/assets/images/hero/hero.png'"
        >
        <div class="product-card__overlay"></div>
        ${badge ? `<div class="product-card__badge">
          <span class="badge ${badge.cls}">${badge.label}</span>
        </div>` : ''}
      </div>
      <div class="product-card__body">
        <p class="product-card__category">${product.category.replace('-', ' ')}</p>
        <h3 class="product-card__name">${product.name}</h3>
        <p class="product-card__description">${product.description}</p>
      </div>
      <div class="product-card__footer">
        <div class="product-card__price">
          $${product.price.toFixed(2)}
          <span>${product.unit}</span>
        </div>
        <a href="order.html?item=${encodeURIComponent(product.name)}" class="product-card__btn">
          Order &#8594;
        </a>
      </div>
    </article>
  `;
}

// ── Grid renderer ─────────────────────────────────────────────
export async function renderProductGrid(containerId, limit = null) {
  const container = document.getElementById(containerId);
  if (!container) return [];

  container.innerHTML = '<p style="text-align:center;color:var(--color-text-muted);padding:2rem;">Loading...</p>';

  try {
    const products = await loadProducts();
    let list = products;
    if (limit) {
      list = products.filter((p) => p.tags?.includes('bestseller'));
      // If we don't have enough bestsellers to fill the limit, just grab the first available products
      if (list.length < limit) {
        const needed = limit - list.length;
        const others = products.filter((p) => !p.tags?.includes('bestseller')).slice(0, needed);
        list = [...list, ...others];
      } else {
        list = list.slice(0, limit);
      }
    }

    if (list.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--color-text-muted);padding:2rem;">No products available.</p>';
    } else {
      container.innerHTML = list.map(renderProductCard).join('');
      console.log('Rendered product cards:', list.length);
    }

    document.querySelectorAll('.reveal:not(.visible)').forEach((el) => {
      if (window.revealObserver) window.revealObserver.observe(el);
    });

    return products;
  } catch (err) {
    container.innerHTML = '<p style="text-align:center;color:var(--color-error)">Could not load products. Please refresh.</p>';
    return [];
  }
}
