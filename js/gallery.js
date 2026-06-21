// ============================================================
// cookieesandcakes — Gallery + Lightbox
// ============================================================

const GALLERY_ITEMS = [
  { src: 'assets/images/products/cookies.png',  label: 'Chocolate Chip Cookies'  },
  { src: 'assets/images/products/cake.png',     label: 'Triple Layer Rose Cake'   },
  { src: 'assets/images/products/brownies.png', label: 'Dark Fudge Brownies'      },
  { src: 'assets/images/products/giftbox.png',  label: 'Cookie Gift Box'          },
  { src: 'assets/images/hero/hero.png',         label: 'Fresh From the Oven'      },
  { src: 'assets/images/about/baker.png',       label: 'Made With Love'           },
  { src: 'assets/images/products/cookies.png',  label: 'Brown Butter Hazelnut'    },
  { src: 'assets/images/products/cake.png',     label: 'Custom Birthday Cake'     },
];

let currentIndex = 0;

export function initGallery(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = GALLERY_ITEMS.map((item, i) => `
    <div class="gallery-item reveal" data-index="${i}">
      <img src="${item.src}" alt="${item.label}" loading="lazy">
      <div class="gallery-item__overlay">
        <span class="gallery-item__label">${item.label}</span>
      </div>
    </div>
  `).join('');

  // Lightbox
  const lightbox  = document.getElementById('lightbox');
  const lbImg     = document.getElementById('lb-img');
  const lbClose   = document.getElementById('lb-close');
  const lbPrev    = document.getElementById('lb-prev');
  const lbNext    = document.getElementById('lb-next');
  const lbBackdrop = document.getElementById('lb-backdrop');

  function openLightbox(index) {
    currentIndex = index;
    lbImg.src = GALLERY_ITEMS[index].src;
    lbImg.alt = GALLERY_ITEMS[index].label;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  function navigate(dir) {
    currentIndex = (currentIndex + dir + GALLERY_ITEMS.length) % GALLERY_ITEMS.length;
    lbImg.style.opacity = '0';
    setTimeout(() => {
      lbImg.src = GALLERY_ITEMS[currentIndex].src;
      lbImg.alt = GALLERY_ITEMS[currentIndex].label;
      lbImg.style.opacity = '1';
    }, 150);
  }

  container.addEventListener('click', e => {
    const item = e.target.closest('.gallery-item');
    if (item) openLightbox(+item.dataset.index);
  });

  lbClose.addEventListener('click', closeLightbox);
  lbBackdrop.addEventListener('click', closeLightbox);
  lbPrev.addEventListener('click', () => navigate(-1));
  lbNext.addEventListener('click', () => navigate(1));

  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape')      closeLightbox();
    if (e.key === 'ArrowLeft')   navigate(-1);
    if (e.key === 'ArrowRight')  navigate(1);
  });

  // smooth opacity on img
  lbImg.style.transition = 'opacity 0.15s ease';
}
