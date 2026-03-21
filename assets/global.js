/**
 * FIVE Theme - Global JavaScript
 * ================================
 * Core utilities and functionality for the Shopify theme
 * 
 * INTERVIEW POINT: This demonstrates vanilla JS patterns without frameworks.
 * Shopify themes should minimize dependencies for performance.
 */

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Debounce function to limit rate of function calls
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(fn, delay = 300) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Fetch wrapper with error handling
 * INTERVIEW POINT: Always handle errors gracefully in Shopify themes
 */
async function fetchJSON(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

/**
 * Format money according to Shopify's money format
 * INTERVIEW POINT: Shopify stores prices in cents
 */
function formatMoney(cents, format = '${{amount}}') {
  if (typeof cents === 'string') {
    cents = cents.replace('.', '');
  }
  
  const value = (cents / 100).toFixed(2);
  const [dollars, pennies] = value.split('.');
  
  return format
    .replace('{{amount}}', value)
    .replace('{{amount_no_decimals}}', dollars)
    .replace('{{amount_with_comma_separator}}', value.replace('.', ','));
}

// ============================================
// CART FUNCTIONALITY
// ============================================

class CartDrawer {
  constructor() {
    // Use data attributes — these elements are always in the DOM regardless of cart state
    this.drawer = document.querySelector('[data-cart-drawer]');
    this.overlay = document.querySelector('[data-cart-overlay]');
    this.countEl = document.querySelector('[data-cart-count]');

    this.bindEvents();
  }

  bindEvents() {
    // Open cart drawer from any [data-cart-toggle] element (header cart icon, etc.)
    document.querySelectorAll('[data-cart-toggle]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.open();
      });
    });

    // Close via overlay click or close button
    this.overlay?.addEventListener('click', () => this.close());
    document.querySelector('[data-cart-close]')?.addEventListener('click', () => this.close());

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) this.close();
    });

    // Delegate quantity/remove events from the stable drawer parent.
    // This works for both the initial Liquid-rendered HTML and JS-re-rendered HTML.
    this.drawer?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-quantity-minus], [data-quantity-plus], [data-remove-item]');
      if (!btn) return;

      const item = btn.closest('[data-cart-item]');
      if (!item) return;

      const key = item.dataset.key;

      if (btn.matches('[data-quantity-minus]')) {
        const input = item.querySelector('.cart-item__quantity-input');
        const newQty = Math.max(0, parseInt(input.value) - 1);
        this.updateItem(key, newQty);
      } else if (btn.matches('[data-quantity-plus]')) {
        const input = item.querySelector('.cart-item__quantity-input');
        const newQty = parseInt(input.value) + 1;
        this.updateItem(key, newQty);
      } else if (btn.matches('[data-remove-item]')) {
        this.updateItem(key, 0);
      }
    });
  }

  isOpen() {
    return this.drawer?.classList.contains('is-open');
  }

  open() {
    this.drawer?.classList.add('is-open');
    this.overlay?.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
    this.refresh();
  }

  close() {
    this.drawer?.classList.remove('is-open');
    this.overlay?.classList.remove('is-visible');
    document.body.style.overflow = '';
  }

  async refresh() {
    try {
      const cart = await fetchJSON(window.routes.cart_url + '.js');
      this.render(cart);
    } catch (error) {
      console.error('Failed to refresh cart:', error);
    }
  }

  render(cart) {
    // Re-query every time — these are always in DOM thanks to the Liquid restructure
    const itemsEl = document.querySelector('[data-cart-items]');
    const emptyEl = document.querySelector('[data-cart-empty]');
    const footerEl = document.querySelector('[data-cart-footer]');
    const subtotalEl = document.querySelector('[data-cart-subtotal]');

    if (!itemsEl || !emptyEl) return;

    if (cart.item_count === 0) {
      itemsEl.style.display = 'none';
      emptyEl.style.display = '';
      if (footerEl) footerEl.style.display = 'none';
    } else {
      emptyEl.style.display = 'none';
      itemsEl.style.display = '';
      if (footerEl) footerEl.style.display = '';

      itemsEl.innerHTML = cart.items.map(item => `
        <div class="cart-item" data-cart-item data-key="${item.key}">
          <div class="cart-item__image">
            <img src="${item.image}" alt="${item.title}" width="80" height="80" loading="lazy">
          </div>
          <div class="cart-item__content">
            <p class="cart-item__title">${item.product_title}</p>
            ${item.variant_title && item.variant_title !== 'Default Title' ? `<p class="cart-item__variant">${item.variant_title}</p>` : ''}
            <p class="cart-item__price">${formatMoney(item.final_line_price)}</p>
            <div class="cart-item__quantity">
              <button class="cart-item__quantity-btn" data-quantity-minus aria-label="Decrease quantity">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
              <input type="number" value="${item.quantity}" min="0" class="cart-item__quantity-input" readonly>
              <button class="cart-item__quantity-btn" data-quantity-plus aria-label="Increase quantity">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
            </div>
          </div>
          <button class="cart-item__remove" data-remove-item aria-label="Remove ${item.title}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      `).join('');
    }

    if (subtotalEl) subtotalEl.textContent = formatMoney(cart.total_price);
    this.updateCount(cart.item_count);
  }

  updateCount(count) {
    if (this.countEl) {
      this.countEl.textContent = count;
      this.countEl.style.display = count > 0 ? 'flex' : 'none';
    }
  }

  /**
   * Update cart item quantity
   * INTERVIEW POINT: Using Shopify's Cart API
   * The 'change' endpoint is preferred for single item updates
   */
  async updateItem(key, quantity) {
    try {
      const cart = await fetchJSON(window.routes.cart_change_url + '.js', {
        method: 'POST',
        body: JSON.stringify({ id: key, quantity }),
      });
      
      this.render(cart);
      
      // Dispatch event for other components
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: cart }));
    } catch (error) {
      console.error('Failed to update cart:', error);
      // Show user-friendly error
      alert(window.cartStrings.error);
    }
  }

  /**
   * Add item to cart
   * INTERVIEW POINT: This can be called from product forms
   */
  async addItem(variantId, quantity = 1, properties = {}) {
    try {
      const cart = await fetchJSON(window.routes.cart_add_url + '.js', {
        method: 'POST',
        body: JSON.stringify({
          id: variantId,
          quantity,
          properties,
        }),
      });

      await this.refresh();
      this.open();
      
      document.dispatchEvent(new CustomEvent('cart:added', { detail: cart }));
      
      return cart;
    } catch (error) {
      console.error('Failed to add to cart:', error);
      throw error;
    }
  }
}

// ============================================
// PRODUCT FORM
// ============================================

class ProductForm {
  constructor(form) {
    this.form = form;
    this.variantSelect = form.querySelector('[name="id"]');
    this.submitButton = form.querySelector('[type="submit"]');
    this.quantityInput = form.querySelector('[name="quantity"]');
    this.priceEl = document.querySelector('.product__price-current');
    this.comparePriceEl = document.querySelector('.product__price-compare');
    
    // Parse variant data from JSON
    const variantData = form.querySelector('[data-variant-json]');
    this.variants = variantData ? JSON.parse(variantData.textContent) : [];
    
    this.bindEvents();
  }

  bindEvents() {
    // Form submission
    this.form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const variantId = this.variantSelect?.value;
      const quantity = parseInt(this.quantityInput?.value || 1);
      
      if (!variantId) {
        alert('Please select all options');
        return;
      }

      this.setLoading(true);
      
      try {
        await window.cartDrawer.addItem(variantId, quantity);
      } catch (error) {
        alert(window.cartStrings.error);
      } finally {
        this.setLoading(false);
      }
    });

    // Variant option changes
    this.form.querySelectorAll('[data-variant-option]').forEach(option => {
      option.addEventListener('click', () => {
        // Update selected state
        const siblings = option.parentElement.querySelectorAll('[data-variant-option]');
        siblings.forEach(sib => sib.classList.remove('is-selected'));
        option.classList.add('is-selected');
        
        // Find matching variant
        this.updateVariant();
      });
    });

    // Quantity buttons
    this.form.querySelector('[data-quantity-minus]')?.addEventListener('click', () => {
      if (this.quantityInput) {
        this.quantityInput.value = Math.max(1, parseInt(this.quantityInput.value) - 1);
      }
    });

    this.form.querySelector('[data-quantity-plus]')?.addEventListener('click', () => {
      if (this.quantityInput) {
        this.quantityInput.value = parseInt(this.quantityInput.value) + 1;
      }
    });
  }

  /**
   * Find variant based on selected options
   * INTERVIEW POINT: Shopify variants have option1, option2, option3 properties
   */
  updateVariant() {
    const selectedOptions = [];
    
    this.form.querySelectorAll('.product__variant-options').forEach((group, index) => {
      const selected = group.querySelector('.is-selected');
      if (selected) {
        selectedOptions[index] = selected.textContent.trim();
      }
    });

    // Find matching variant
    const variant = this.variants.find(v => {
      return (
        (!selectedOptions[0] || v.option1 === selectedOptions[0]) &&
        (!selectedOptions[1] || v.option2 === selectedOptions[1]) &&
        (!selectedOptions[2] || v.option3 === selectedOptions[2])
      );
    });

    if (variant) {
      this.variantSelect.value = variant.id;
      this.updatePrice(variant);
      this.updateButton(variant);
      
      // Update URL without page reload
      const url = new URL(window.location.href);
      url.searchParams.set('variant', variant.id);
      window.history.replaceState({}, '', url);
    }
  }

  updatePrice(variant) {
    if (this.priceEl) {
      this.priceEl.textContent = formatMoney(variant.price);
    }
    
    if (this.comparePriceEl) {
      if (variant.compare_at_price > variant.price) {
        this.comparePriceEl.textContent = formatMoney(variant.compare_at_price);
        this.comparePriceEl.style.display = '';
      } else {
        this.comparePriceEl.style.display = 'none';
      }
    }
  }

  updateButton(variant) {
    if (!this.submitButton) return;

    if (!variant.available) {
      this.submitButton.disabled = true;
      this.submitButton.textContent = window.variantStrings.soldOut;
    } else {
      this.submitButton.disabled = false;
      this.submitButton.textContent = window.variantStrings.addToCart;
    }
  }

  setLoading(loading) {
    this.submitButton.disabled = loading;
    this.submitButton.classList.toggle('is-loading', loading);
    
    if (loading) {
      this.submitButton.dataset.originalText = this.submitButton.textContent;
      this.submitButton.textContent = 'Adding...';
    } else {
      this.submitButton.textContent = this.submitButton.dataset.originalText || window.variantStrings.addToCart;
    }
  }
}

// ============================================
// PRODUCT GALLERY
// ============================================

class ProductGallery {
  constructor(container) {
    this.container = container;
    this.mainImage = container.querySelector('.product__main-image img');
    this.thumbnails = container.querySelectorAll('.product__thumbnail');
    
    this.bindEvents();
  }

  bindEvents() {
    this.thumbnails.forEach(thumb => {
      thumb.addEventListener('click', () => {
        const newSrc = thumb.dataset.fullSize || thumb.querySelector('img').src;
        this.setMainImage(newSrc);
        
        // Update active state
        this.thumbnails.forEach(t => t.classList.remove('is-active'));
        thumb.classList.add('is-active');
      });
    });
  }

  setMainImage(src) {
    if (this.mainImage) {
      this.mainImage.style.opacity = '0';
      
      const newImage = new Image();
      newImage.onload = () => {
        this.mainImage.src = src;
        this.mainImage.style.opacity = '1';
      };
      newImage.src = src;
    }
  }
}

// ============================================
// MOBILE MENU
// ============================================

class MobileMenu {
  constructor() {
    // Renamed to toggleBtn to avoid collision with the toggle() method below
    this.menu = document.querySelector('.mobile-menu');
    this.overlay = document.querySelector('.mobile-menu__overlay');

    this.bindEvents();
  }

  bindEvents() {
    // Both the hamburger button and the in-menu close button share [data-mobile-menu-toggle]
    document.querySelectorAll('[data-mobile-menu-toggle]').forEach(btn => {
      btn.addEventListener('click', () => this.toggle());
    });
    this.overlay?.addEventListener('click', () => this.close());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) this.close();
    });
  }

  isOpen() {
    return this.menu?.classList.contains('is-open');
  }

  toggle() {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.menu?.classList.add('is-open');
    this.overlay?.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.menu?.classList.remove('is-open');
    this.overlay?.classList.remove('is-visible');
    document.body.style.overflow = '';
  }
}

// ============================================
// SECTION RENDERING API
// ============================================

/**
 * Fetch and replace section content without page reload
 * INTERVIEW POINT: This is how AJAX cart updates work in modern themes
 */
async function renderSection(sectionId, url = window.location.href) {
  try {
    const response = await fetch(`${url}?section_id=${sectionId}`);
    const html = await response.text();
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const newSection = doc.querySelector(`#shopify-section-${sectionId}`);
    
    if (newSection) {
      const currentSection = document.querySelector(`#shopify-section-${sectionId}`);
      currentSection?.replaceWith(newSection);
    }
    
    return newSection;
  } catch (error) {
    console.error('Failed to render section:', error);
    throw error;
  }
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize cart drawer
  window.cartDrawer = new CartDrawer();
  
  // Initialize product forms
  document.querySelectorAll('[data-product-form]').forEach(form => {
    new ProductForm(form);
  });
  
  // Initialize product galleries
  document.querySelectorAll('.product__gallery').forEach(gallery => {
    new ProductGallery(gallery);
  });
  
  // Initialize mobile menu
  new MobileMenu();
  
  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});

// Expose utilities globally
window.FiveTheme = {
  debounce,
  fetchJSON,
  formatMoney,
  renderSection,
};
