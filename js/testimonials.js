// ============================================================
// cookieesandcakes — Testimonials Carousel
// ============================================================

const TESTIMONIALS = [
  {
    quote: "Ordered a custom birthday cake and it was absolutely breathtaking. The flavours matched perfectly and everyone at the party couldn't stop complimenting it!",
    name: "Sarah M.",
    handle: "Local customer",
    initials: "SM",
    stars: 5
  },
  {
    quote: "The chocolate chip cookies are honestly the best I've ever had. I ordered a gift box for my colleague and she was so moved. Will definitely be ordering again!",
    name: "Priya K.",
    handle: "Gift buyer",
    initials: "PK",
    stars: 5
  },
  {
    quote: "Incredibly fresh, so beautifully packaged. The dark fudge brownies are dangerously addictive. cookieesandcakes has ruined all other bakeries for me.",
    name: "James T.",
    handle: "Regular customer",
    initials: "JT",
    stars: 5
  },
  {
    quote: "I needed a custom cake for our office farewell and they delivered beyond expectations. Professional, responsive, and the cake was divine. Highly recommend!",
    name: "Amara L.",
    handle: "Corporate order",
    initials: "AL",
    stars: 5
  },
  {
    quote: "The strawberry dream cake was a revelation. Light, fresh, and not overly sweet. My whole family agreed — this is our new go-to bakery for every occasion.",
    name: "Tom & Nina R.",
    handle: "Family order",
    initials: "TN",
    stars: 5
  },
];

export function initTestimonials(containerId) {
  const track   = document.getElementById(containerId);
  const dotsWrap = document.getElementById('testimonials-dots');
  const prevBtn  = document.getElementById('testimonials-prev');
  const nextBtn  = document.getElementById('testimonials-next');

  if (!track) return;

  // Render cards
  track.innerHTML = TESTIMONIALS.map(t => `
    <div class="testimonial-card">
      <div class="testimonial-card__stars">
        ${'★'.repeat(t.stars)}
      </div>
      <p class="testimonial-card__quote">${t.quote}</p>
      <div class="testimonial-card__author">
        <div class="testimonial-card__avatar">${t.initials}</div>
        <div>
          <p class="testimonial-card__name">${t.name}</p>
          <p class="testimonial-card__handle">${t.handle}</p>
        </div>
      </div>
    </div>
  `).join('');

  // Render dots
  if (dotsWrap) {
    dotsWrap.innerHTML = TESTIMONIALS.map((_, i) =>
      `<button class="testimonials__dot ${i === 0 ? 'active' : ''}" aria-label="Testimonial ${i+1}" data-idx="${i}"></button>`
    ).join('');
  }

  let current = 0;
  const cards = track.querySelectorAll('.testimonial-card');
  const cardWidth = () => cards[0].offsetWidth + 24; // gap

  function goTo(index) {
    current = (index + TESTIMONIALS.length) % TESTIMONIALS.length;
    track.style.transition = 'transform 0.4s ease';
    track.style.transform = `translateX(-${current * cardWidth()}px)`;
    dotsWrap?.querySelectorAll('.testimonials__dot').forEach((d, i) => {
      d.classList.toggle('active', i === current);
    });
  }

  prevBtn?.addEventListener('click', () => goTo(current - 1));
  nextBtn?.addEventListener('click', () => goTo(current + 1));
  dotsWrap?.addEventListener('click', e => {
    const dot = e.target.closest('.testimonials__dot');
    if (dot) goTo(+dot.dataset.idx);
  });

  // Auto-advance
  let autoplay = setInterval(() => goTo(current + 1), 5000);
  track.addEventListener('mouseenter', () => clearInterval(autoplay));
  track.addEventListener('mouseleave', () => {
    autoplay = setInterval(() => goTo(current + 1), 5000);
  });

  // Touch swipe
  let startX = 0;
  track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) goTo(current + (diff > 0 ? 1 : -1));
  });
}
