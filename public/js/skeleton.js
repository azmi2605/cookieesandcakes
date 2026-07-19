// skeleton.js - Reusable skeleton loading utilities
window.Skeleton = {
  // Shimmer animation duration
  shimmerDuration: '1.5s',

  // Create a skeleton text line
  textLine(options = {}) {
    const {
      height = '14px',
      width = '90%',
      className = 'skeleton-text',
      style = ''
    } = options;
    const el = document.createElement('div');
    el.className = `skeleton ${className}`;
    el.style.width = width;
    el.style.height = height;
    if (style) el.style.cssText = style;
    return el;
  },

  // Create a skeleton image placeholder
  image(options = {}) {
    const {
      width = '100%',
      height = '200px',
      className = 'skeleton-image',
      style = ''
    } = options;
    const el = document.createElement('div');
    el.className = `skeleton ${className}`;
    el.style.width = width;
    el.style.height = height;
    if (style) el.style.cssText = style;
    return el;
  },

  // Create a skeleton button placeholder
  button(options = {}) {
    const {
      width = '100%',
      height = '44px',
      className = 'skeleton-button',
      style = ''
    } = options;
    const el = document.createElement('div');
    el.className = `skeleton ${className}`;
    el.style.width = width;
    el.style.height = height;
    if (style) el.style.cssText = style;
    return el;
  },

  // Create a skeleton badge/tag placeholder
  badge(options = {}) {
    const {
      width = '80px',
      height = '24px',
      className = 'skeleton-badge',
      style = ''
    } = options;
    const el = document.createElement('div');
    el.className = `skeleton ${className}`;
    el.style.width = width;
    el.style.height = height;
    if (style) el.style.cssText = style;
    return el;
  },

  // Create a skeleton card wrapper
  card(options = {}) {
    const {
      imageHeight = '200px',
      className = 'skeleton-card',
      style = ''
    } = options;
    const card = document.createElement('div');
    card.className = `skeleton ${className}`;
    if (style) card.style.cssText = style;

    const image = this.image({ height: imageHeight });
    const body = document.createElement('div');
    body.style.padding = '16px';
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.gap = '8px';

    body.appendChild(this.textLine({ width: '70%', height: '18px' }));
    body.appendChild(this.textLine({ width: '90%', height: '12px' }));
    body.appendChild(this.textLine({ width: '60%', height: '12px' }));
    body.appendChild(this.button({ height: '40px', marginTop: '8px' }));

    card.appendChild(image);
    card.appendChild(body);
    return card;
  },

  // Create a skeleton table row
  tableRow(options = {}) {
    const {
      columns = 4,
      className = 'skeleton-table-row',
      style = ''
    } = options;
    const row = document.createElement('div');
    row.className = `skeleton ${className}`;
    row.style.display = 'flex';
    row.style.gap = '16px';
    row.style.padding = '12px 16px';
    row.style.alignItems = 'center';

    for (let i = 0; i < columns; i++) {
      const cell = this.textLine({ 
        height: '14px', 
        width: `${100 / columns}%`,
        style: 'margin-bottom: 0;'
      });
      row.appendChild(cell);
    }
    if (style) row.style.cssText = style;
    return row;
  },

  // Create a skeleton input field
  input(options = {}) {
    const {
      width = '100%',
      height = '44px',
      className = 'skeleton-input',
      style = ''
    } = options;
    const el = document.createElement('div');
    el.className = `skeleton ${className}`;
    el.style.width = width;
    el.style.height = height;
    if (style) el.style.cssText = style;
    return el;
  },

  // Create a skeleton textarea
  textarea(options = {}) {
    const {
      width = '100%',
      height = '100px',
      className = 'skeleton-textarea',
      style = ''
    } = options;
    const el = document.createElement('div');
    el.className = `skeleton ${className}`;
    el.style.width = width;
    el.style.height = height;
    if (style) el.style.cssText = style;
    return el;
  },

  // Create a skeleton avatar
  avatar(options = {}) {
    const {
      size = '40px',
      className = 'skeleton-avatar',
      style = ''
    } = options;
    const el = document.createElement('div');
    el.className = `skeleton ${className}`;
    el.style.width = size;
    el.style.height = size;
    if (style) el.style.cssText = style;
    return el;
  },

  // Create a skeleton thumbnail
  thumbnail(options = {}) {
    const {
      width = '64px',
      height = '64px',
      className = 'skeleton-thumbnail',
      style = ''
    } = options;
    const el = document.createElement('div');
    el.className = `skeleton ${className}`;
    el.style.width = width;
    el.style.height = height;
    if (style) el.style.cssText = style;
    return el;
  },

  // Wrap content with skeleton loading state
  wrapper(container, contentFn, placeholderFn) {
    if (!container) return;
    
    const wrapper = document.createElement('div');
    wrapper.className = 'skeleton-wrapper';
    
    const placeholder = document.createElement('div');
    placeholder.className = 'skeleton-placeholder';
    if (placeholderFn) {
      const placeholderContent = placeholderFn();
      if (placeholderContent) {
        if (Array.isArray(placeholderContent)) {
          placeholderContent.forEach(child => placeholder.appendChild(child));
        } else {
          placeholder.appendChild(placeholderContent);
        }
      }
    }
    
    const content = document.createElement('div');
    content.className = 'skeleton-content';
    if (contentFn) {
      const contentData = contentFn();
      if (contentData) {
        if (Array.isArray(contentData)) {
          contentData.forEach(child => content.appendChild(child));
        } else {
          content.appendChild(contentData);
        }
      }
    }
    
    wrapper.appendChild(placeholder);
    wrapper.appendChild(content);
    container.appendChild(wrapper);
    
    return wrapper;
  },

  // Mark wrapper as loaded
  markLoaded(wrapper) {
    if (wrapper && wrapper.classList) {
      wrapper.classList.add('loaded');
    }
  },

  // Show skeleton in a container
  show(container, skeletonContent) {
    if (!container) return;
    container.innerHTML = '';
    if (Array.isArray(skeletonContent)) {
      skeletonContent.forEach(child => container.appendChild(child));
    } else if (skeletonContent) {
      container.appendChild(skeletonContent);
    }
  },

  // Hide skeleton and show content
  hide(container, contentFn) {
    if (!container) return;
    container.innerHTML = '';
    if (contentFn) {
      const content = contentFn();
      if (Array.isArray(content)) {
        content.forEach(child => container.appendChild(child));
      } else if (content) {
        container.appendChild(content);
      }
    }
  },

  // Create a product card skeleton
  productCard(options = {}) {
    const {
      imageHeight = '200px',
      showBadge = true,
      className = ''
    } = options;
    
    const card = document.createElement('div');
    card.className = `skeleton-card ${className}`;
    
    const imageContainer = document.createElement('div');
    imageContainer.style.position = 'relative';
    imageContainer.style.height = imageHeight;
    imageContainer.appendChild(this.image({ height: imageHeight, borderRadius: '0' }));
    
    if (showBadge) {
      const badge = this.badge();
      badge.style.position = 'absolute';
      badge.style.top = '12px';
      badge.style.right = '12px';
      imageContainer.appendChild(badge);
    }
    
    const body = document.createElement('div');
    body.style.padding = '16px';
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.gap = '10px';
    body.appendChild(this.textLine({ width: '65%', height: '18px' }));
    body.appendChild(this.textLine({ width: '90%', height: '12px' }));
    body.appendChild(this.textLine({ width: '75%', height: '12px' }));
    body.appendChild(this.button({ height: '40px', marginTop: '8px' }));
    
    card.appendChild(imageContainer);
    card.appendChild(body);
    return card;
  },

  // Create product details skeleton
  productDetails(options = {}) {
    const {
      showThumbnails = true,
      showPairs = true,
      showReviews = true
    } = options;

    const container = document.createElement('div');
    container.style.display = 'grid';
    container.style.gridTemplateColumns = '1fr';
    container.style.gap = '24px';

    if (window.innerWidth >= 768) {
      container.style.gridTemplateColumns = '1fr 1fr';
    }

    // Left column - image gallery
    const leftCol = document.createElement('div');
    leftCol.style.display = 'flex';
    leftCol.style.flexDirection = 'column';
    leftCol.style.gap = '16px';

    const heroImage = this.image({ height: '400px', borderRadius: '12px' });
    leftCol.appendChild(heroImage);

    if (showThumbnails) {
      const thumbRow = document.createElement('div');
      thumbRow.style.display = 'flex';
      thumbRow.style.gap = '12px';
      for (let i = 0; i < 4; i++) {
        thumbRow.appendChild(this.thumbnail({ width: '64px', height: '64px' }));
      }
      leftCol.appendChild(thumbRow);
    }

    // Right column - details
    const rightCol = document.createElement('div');
    rightCol.style.display = 'flex';
    rightCol.style.flexDirection = 'column';
    rightCol.style.gap = '16px';

    rightCol.appendChild(this.textLine({ width: '90%', height: '32px' })); // Title
    rightCol.appendChild(this.textLine({ width: '40%', height: '24px' })); // Price
    rightCol.appendChild(this.textLine({ width: '100%', height: '16px' })); // Description
    rightCol.appendChild(this.textLine({ width: '100%', height: '16px' })); // Description
    rightCol.appendChild(this.textLine({ width: '70%', height: '16px' })); // Description
    rightCol.appendChild(this.input({ height: '44px' })); // Quantity selector
    rightCol.appendChild(this.button({ height: '48px' })); // Add to cart button

    // Accordions
    for (let i = 0; i < 2; i++) {
      const accordion = document.createElement('div');
      accordion.style.height = '56px';
      accordion.style.borderRadius = '12px';
      accordion.className = 'skeleton';
      rightCol.appendChild(accordion);
    }

    container.appendChild(leftCol);
    container.appendChild(rightCol);

    // Pairs Well With section
    if (showPairs) {
      const pairsSection = document.createElement('div');
      pairsSection.style.marginTop = '48px';
      pairsSection.appendChild(this.textLine({ width: '30%', height: '28px', marginBottom: '16px' }));
      
      const pairsGrid = document.createElement('div');
      pairsGrid.style.display = 'flex';
      pairsGrid.style.gap = '16px';
      pairsGrid.style.overflowX = 'auto';
      
      for (let i = 0; i < 4; i++) {
        const pairCard = this.productCard({ imageHeight: '180px', showBadge: false });
        pairCard.style.minWidth = '200px';
        pairCard.style.maxWidth = '200px';
        pairsGrid.appendChild(pairCard);
      }
      pairsSection.appendChild(pairsGrid);
      container.appendChild(pairsSection);
    }

    // Reviews section
    if (showReviews) {
      const reviewsSection = document.createElement('div');
      reviewsSection.style.marginTop = '48px';
      reviewsSection.appendChild(this.textLine({ width: '25%', height: '28px', marginBottom: '16px' }));
      
      const reviewsGrid = document.createElement('div');
      reviewsGrid.style.display = 'grid';
      reviewsGrid.style.gridTemplateColumns = '1fr';
      reviewsGrid.style.gap = '16px';
      
      if (window.innerWidth >= 768) {
        reviewsGrid.style.gridTemplateColumns = '1fr 1fr';
      }
      
      for (let i = 0; i < 4; i++) {
        const reviewCard = document.createElement('div');
        reviewCard.style.padding = '20px';
        reviewCard.style.borderRadius = '12px';
        reviewCard.style.background = '#fff8f6';
        reviewCard.appendChild(this.avatar({ size: '32px' }));
        reviewCard.appendChild(this.textLine({ width: '40%', height: '14px', marginTop: '8px' }));
        reviewCard.appendChild(this.textLine({ width: '100%', height: '12px', marginTop: '8px' }));
        reviewCard.appendChild(this.textLine({ width: '90%', height: '12px' }));
        reviewsGrid.appendChild(reviewCard);
      }
      
      reviewsSection.appendChild(reviewsGrid);
      container.appendChild(reviewsSection);
    }

    return container;
  },

  // Create table skeleton
  table(options = {}) {
    const {
      rows = 5,
      columns = 4,
      showHeader = true,
      className = ''
    } = options;

    const container = document.createElement('div');
    container.className = `skeleton ${className}`;

    // Header
    if (showHeader) {
      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.gap = '16px';
      header.style.padding = '12px 16px';
      header.style.borderBottom = '1px solid #fbdcd1';
      
      for (let i = 0; i < columns; i++) {
        const headerCell = this.textLine({ 
          height: '14px', 
          width: `${100 / columns}%`,
          style: 'margin-bottom: 0; font-weight: 600;'
        });
        header.appendChild(headerCell);
      }
      container.appendChild(header);
    }

    // Rows
    for (let i = 0; i < rows; i++) {
      container.appendChild(this.tableRow({ columns }));
    }

    return container;
  },

  // Create form skeleton
  form(options = {}) {
    const {
      fields = 4,
      showTextarea = true,
      showButton = true,
      className = ''
    } = options;

    const container = document.createElement('div');
    container.className = `skeleton ${className}`;
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '20px';
    container.style.padding = '24px';

    for (let i = 0; i < fields; i++) {
      const fieldGroup = document.createElement('div');
      fieldGroup.style.display = 'flex';
      fieldGroup.style.flexDirection = 'column';
      fieldGroup.style.gap = '8px';
      fieldGroup.appendChild(this.textLine({ width: '30%', height: '14px' }));
      fieldGroup.appendChild(this.input({ height: '44px' }));
      container.appendChild(fieldGroup);
    }

    if (showTextarea) {
      const textareaGroup = document.createElement('div');
      textareaGroup.style.display = 'flex';
      textareaGroup.style.flexDirection = 'column';
      textareaGroup.style.gap = '8px';
      textareaGroup.appendChild(this.textLine({ width: '25%', height: '14px' }));
      textareaGroup.appendChild(this.textarea({ height: '120px' }));
      container.appendChild(textareaGroup);
    }

    if (showButton) {
      container.appendChild(this.button({ height: '48px', marginTop: '8px' }));
    }

    return container;
  },

  // Create cart item skeleton
  cartItem(options = {}) {
    const {
      showImage = true,
      className = ''
    } = options;

    const item = document.createElement('div');
    item.className = `skeleton ${className}`;
    item.style.display = 'flex';
    item.style.gap = '16px';
    item.style.padding = '16px';
    item.style.background = '#fff8f6';
    item.style.borderRadius = '12px';

    if (showImage) {
      const image = this.thumbnail({ width: '80px', height: '80px' });
      item.appendChild(image);
    }

    const details = document.createElement('div');
    details.style.flex = '1';
    details.style.display = 'flex';
    details.style.flexDirection = 'column';
    details.style.gap = '8px';
    details.appendChild(this.textLine({ width: '60%', height: '16px' }));
    details.appendChild(this.textLine({ width: '40%', height: '12px' }));
    details.appendChild(this.textLine({ width: '30%', height: '20px' }));

    item.appendChild(details);
    return item;
  },

  // Create order row skeleton
  orderRow(options = {}) {
    const {
      columns = 5,
      className = ''
    } = options;

    const row = document.createElement('div');
    row.className = `skeleton ${className}`;
    row.style.display = 'flex';
    row.style.gap = '16px';
    row.style.padding = '16px';
    row.style.alignItems = 'center';
    row.style.background = '#fff8f6';
    row.style.borderRadius = '12px';
    row.style.marginBottom = '12px';

    for (let i = 0; i < columns; i++) {
      const cell = this.textLine({ 
        height: '14px', 
        width: `${100 / columns}%`,
        style: 'margin-bottom: 0;'
      });
      row.appendChild(cell);
    }

    return row;
  },

  // Create stats card skeleton (for dashboard)
  statsCard(options = {}) {
    const {
      className = ''
    } = options;

    const card = document.createElement('div');
    card.className = `skeleton ${className}`;
    card.style.padding = '24px';
    card.style.borderRadius = '16px';
    card.style.background = '#fff8f6';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.gap = '12px';

    card.appendChild(this.textLine({ width: '50%', height: '14px' }));
    card.appendChild(this.textLine({ width: '70%', height: '28px' }));
    card.appendChild(this.textLine({ width: '40%', height: '12px' }));

    return card;
  },

  // Create chart placeholder skeleton
  chart(options = {}) {
    const {
      height = '300px',
      className = ''
    } = options;

    const chart = document.createElement('div');
    chart.className = `skeleton ${className}`;
    chart.style.height = height;
    chart.style.borderRadius = '12px';
    chart.style.background = 'linear-gradient(90deg, #fbdcd1 0%, #fff1ec 50%, #fbdcd1 100%)';
    chart.style.backgroundSize = '200% 100%';
    chart.style.animation = 'skeleton-shimmer 1.5s ease-in-out infinite';

    return chart;
  }
};

// Auto-inject skeleton CSS
(function injectSkeletonCSS() {
  if (document.querySelector('link[href*="skeleton.css"]')) return;
  
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/css/skeleton.css';
  document.head.appendChild(link);
})();
