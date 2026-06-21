// ============================================================
// cookieesandcakes — Products Renderer
// ============================================================
import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const BADGE_MAP = {
  bestseller: { label: 'Bestseller', cls: 'badge--bestseller' },
  new:        { label: 'New',        cls: 'badge--new'        },
  seasonal:   { label: 'Seasonal',   cls: 'badge--seasonal'   },
};

export async function loadProducts() {
  try {
    const querySnapshot = await getDocs(collection(db, "products"));
    const products = [];
    querySnapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() });
    });
    
    if (products.length > 0) {
      return products;
    } else {
      throw new Error("No products in Firebase yet");
    }
  } catch (error) {
    console.warn("Falling back to local JSON:", error.message);
    const res = await fetch('/data/products.json');
    const { products } = await res.json();
    return products;
  }
}

export function renderProductCard(product) {
  const badge = product.tags[0] ? BADGE_MAP[product.tags[0]] : null;

  return `
    <article class="product-card reveal" data-category="${product.category}">
      <div class="product-card__image-wrap">
        <img
          class="product-card__image"
          src="${product.image}"
          alt="${product.name}"
          loading="lazy"
          width="600" height="450"
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

export async function renderProductGrid(containerId, limit = null) {
  const container = document.getElementById(containerId);
  if (!container) return [];

  container.innerHTML = '<p style="text-align:center;color:var(--color-text-muted);padding:2rem;">Loading...</p>';

  try {
    const products = await loadProducts();
    const list = limit ? products.filter(p => p.tags.includes('bestseller')).slice(0, limit) : products;
    container.innerHTML = list.map(renderProductCard).join('');

    // Trigger reveal observer on newly added elements
    document.querySelectorAll('.reveal:not(.visible)').forEach(el => {
      if (typeof revealObserver !== 'undefined') revealObserver.observe(el);
    });

    return products;
  } catch (err) {
    container.innerHTML = '<p style="text-align:center;color:var(--color-error)">Could not load products. Please refresh.</p>';
    return [];
  }
}
