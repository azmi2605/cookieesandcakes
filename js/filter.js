// ============================================================
// cookieesandcakes — Category Filter
// ============================================================

export function initFilter(products, gridId) {
  const grid    = document.getElementById(gridId);
  const buttons = document.querySelectorAll('.filter-btn');
  if (!grid || !buttons.length) return;

  let active = 'all';

  function render(category) {
    const targetCat = category.toLowerCase().replace(/s$/, ''); // e.g. "cakes" -> "cake"
    const filtered = category === 'all'
      ? products
      : products.filter(p => {
          const pCat = (p.category || '').toLowerCase();
          return pCat === category || pCat === targetCat || pCat + 's' === category;
        });

    // Fade out
    grid.style.opacity = '0';
    grid.style.transform = 'translateY(8px)';
    grid.style.transition = 'opacity 0.25s ease, transform 0.25s ease';

    setTimeout(() => {
      const { renderProductCard } = window.__cookieProducts;
      grid.innerHTML = filtered.length
        ? filtered.map(renderProductCard).join('')
        : `<p style="grid-column:1/-1;text-align:center;color:var(--color-text-muted);padding:3rem;">
             No items in this category yet. Check back soon! 🍪
           </p>`;

      // Fade in
      grid.style.opacity = '1';
      grid.style.transform = 'translateY(0)';
    }, 250);
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.filter;
      if (cat === active) return;
      active = cat;
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      render(cat);
    });
  });
}
