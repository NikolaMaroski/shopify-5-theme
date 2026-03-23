/**
 * FIVE Theme — Global JavaScript
 * ================================
 * Vanilla ES6+. No jQuery, no build step.
 * All DOM hooks use data-* attributes (never classes).
 */

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────

function debounce(fn, delay = 300) {
  let id;
  return function (...args) {
    clearTimeout(id);
    id = setTimeout(() => fn.apply(this, args), delay);
  };
}

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.description || `HTTP ${response.status}`);
  }

  return response.json();
}

function formatMoney(cents, format = '${{amount}}') {
  if (typeof cents === 'string') cents = cents.replace('.', '');
  const value = (cents / 100).toFixed(2);
  const [dollars] = value.split('.');
  return format
    .replace('{{amount}}', value)
    .replace('{{amount_no_decimals}}', dollars)
    .replace('{{amount_with_comma_separator}}', value.replace('.', ','));
}

// ─────────────────────────────────────────────
// CART DRAWER
// ─────────────────────────────────────────────

class CartDrawer {
  constructor() {
    this.drawer = document.querySelector('[data-cart-drawer]');
    this.overlay = document.querySelector('[data-cart-overlay]');
    this.countEl = document.querySelector('[data-cart-count]');
    this._bindEvents();
  }

  _bindEvents() {
    document.querySelectorAll('[data-cart-toggle]').forEach(btn => {
      btn.addEventListener('click', e => { e.preventDefault(); this.open(); });
    });

    this.overlay?.addEventListener('click', () => this.close());
    document.querySelector('[data-cart-close]')?.addEventListener('click', () => this.close());

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.isOpen()) this.close();
    });

    // Delegated quantity / remove handlers on the stable drawer parent
    this.drawer?.addEventListener('click', e => {
      const btn = e.target.closest('[data-quantity-minus], [data-quantity-plus], [data-remove-item]');
      if (!btn) return;

      const item = btn.closest('[data-cart-item]');
      if (!item) return;

      const key = item.dataset.key;
      const input = item.querySelector('.cart-item__quantity-input');

      if (btn.matches('[data-quantity-minus]')) {
        this.updateItem(key, Math.max(0, parseInt(input.value) - 1));
      } else if (btn.matches('[data-quantity-plus]')) {
        this.updateItem(key, parseInt(input.value) + 1);
      } else if (btn.matches('[data-remove-item]')) {
        this.updateItem(key, 0);
      }
    });
  }

  isOpen() { return this.drawer?.classList.contains('is-open'); }

  open() {
    this.drawer?.classList.add('is-open');
    this.overlay?.classList.add('is-visible');
    this.drawer?.removeAttribute('aria-hidden');
    document.body.style.overflow = 'hidden';
    this.refresh();
  }

  close() {
    this.drawer?.classList.remove('is-open');
    this.overlay?.classList.remove('is-visible');
    this.drawer?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  async refresh() {
    try {
      const cart = await fetchJSON(window.routes.cart_url + '.js');
      this._render(cart);
    } catch (err) {
      console.error('Cart refresh failed:', err);
    }
  }

  _render(cart) {
    const itemsEl   = document.querySelector('[data-cart-items]');
    const emptyEl   = document.querySelector('[data-cart-empty]');
    const footerEl  = document.querySelector('[data-cart-footer]');
    const subtotalEl = document.querySelector('[data-cart-subtotal]');

    if (!itemsEl || !emptyEl) return;

    const isEmpty = cart.item_count === 0;

    itemsEl.style.display  = isEmpty ? 'none' : '';
    emptyEl.style.display  = isEmpty ? '' : 'none';
    if (footerEl) footerEl.style.display = isEmpty ? 'none' : '';

    if (!isEmpty) {
      itemsEl.innerHTML = cart.items.map(item => `
        <div class="cart-item" data-cart-item data-key="${item.key}">
          <div class="cart-item__image">
            <img src="${item.image}" alt="${item.title}" width="80" height="80" loading="lazy">
          </div>
          <div class="cart-item__content">
            <p class="cart-item__title">${item.product_title}</p>
            ${item.variant_title && item.variant_title !== 'Default Title'
              ? `<p class="cart-item__variant">${item.variant_title}</p>`
              : ''}
            <p class="cart-item__price">${formatMoney(item.final_line_price)}</p>
            <div class="cart-item__quantity">
              <button class="cart-item__quantity-btn" data-quantity-minus aria-label="Decrease quantity">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
              <input type="number" value="${item.quantity}" min="0" class="cart-item__quantity-input" readonly>
              <button class="cart-item__quantity-btn" data-quantity-plus aria-label="Increase quantity">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            </div>
          </div>
          <button class="cart-item__remove" data-remove-item aria-label="Remove ${item.title}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      `).join('');
    }

    if (subtotalEl) subtotalEl.textContent = formatMoney(cart.total_price);
    this._updateCount(cart.item_count);
  }

  _updateCount(count) {
    if (!this.countEl) return;
    this.countEl.textContent = count;
    this.countEl.style.display = count > 0 ? 'flex' : 'none';
  }

  async updateItem(key, quantity) {
    try {
      const cart = await fetchJSON(window.routes.cart_change_url + '.js', {
        method: 'POST',
        body: JSON.stringify({ id: key, quantity }),
      });
      this._render(cart);
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: cart }));
    } catch (err) {
      console.error('Cart update failed:', err);
    }
  }

  async addItem(variantId, quantity = 1, properties = {}) {
    await fetchJSON(window.routes.cart_add_url + '.js', {
      method: 'POST',
      body: JSON.stringify({ id: variantId, quantity, properties }),
    });
    // Refresh full cart state (add.js returns a line item, not the full cart)
    const cart = await fetchJSON(window.routes.cart_url + '.js');
    this._render(cart);
    this.open();
    document.dispatchEvent(new CustomEvent('cart:added', { detail: { variantId, quantity } }));
  }
}

// ─────────────────────────────────────────────
// PRODUCT FORM  (on the product detail page)
// ─────────────────────────────────────────────

class ProductForm {
  constructor(form) {
    this.form = form;

    // Read variant JSON from the adjacent <script> tag (keyed by section id)
    const jsonScript = document.querySelector('[id^="product-json-"]');
    this.productData = jsonScript ? JSON.parse(jsonScript.textContent) : {};
    this.variants    = this.productData.variants || [];

    this.variantIdInput = form.querySelector('[data-variant-id]');
    this.submitBtn      = form.querySelector('[data-add-to-cart]');
    this.submitText     = form.querySelector('[data-add-to-cart-text]');
    this.priceEl        = document.querySelector('[data-price]');
    this.stickyPriceEl  = document.querySelector('[data-sticky-price]');
    this.stickyBtn      = document.querySelector('[data-sticky-atc-btn]');

    this._bindEvents();
  }

  _bindEvents() {
    this.form.addEventListener('submit', async e => {
      e.preventDefault();
      const variantId = this.variantIdInput?.value;
      if (!variantId) {
        alert(window.variantStrings?.unavailable || 'Please select all options');
        return;
      }
      this._setLoading(true);
      try {
        await window.cartDrawer.addItem(parseInt(variantId, 10));
      } catch (err) {
        console.error('Add to cart failed:', err);
      } finally {
        this._setLoading(false);
      }
    });

    // Sticky ATC button submits the same form
    this.stickyBtn?.addEventListener('click', () => {
      this.form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    // Variant option button clicks — data-option-btn on each button
    this.form.querySelectorAll('[data-option-btn]').forEach(btn => {
      btn.addEventListener('click', () => this._onOptionClick(btn));
    });

    // Quantity stepper — data-quantity-decrease / data-quantity-increase
    const qtyInput = this.form.querySelector('[data-quantity-input]');

    this.form.querySelector('[data-quantity-decrease]')?.addEventListener('click', () => {
      if (qtyInput) qtyInput.value = Math.max(1, parseInt(qtyInput.value) - 1);
    });

    this.form.querySelector('[data-quantity-increase]')?.addEventListener('click', () => {
      if (qtyInput) qtyInput.value = parseInt(qtyInput.value) + 1;
    });
  }

  _onOptionClick(btn) {
    // Update aria-pressed + is-selected on sibling buttons in the same group
    const group = btn.closest('[data-option-position]');
    group?.querySelectorAll('[data-option-btn]').forEach(sib => {
      sib.classList.remove('is-selected');
      sib.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('is-selected');
    btn.setAttribute('aria-pressed', 'true');

    this._updateVariant();
  }

  _updateVariant() {
    // Build array of selected values indexed by option position (1-based)
    const selected = {};
    this.form.querySelectorAll('[data-option-position]').forEach(group => {
      const pos = parseInt(group.dataset.optionPosition, 10);
      const active = group.querySelector('.is-selected');
      if (active) selected[pos] = active.dataset.optionValue;
    });

    const variant = this.variants.find(v =>
      (!selected[1] || v.option1 === selected[1]) &&
      (!selected[2] || v.option2 === selected[2]) &&
      (!selected[3] || v.option3 === selected[3])
    );

    if (!variant) return;

    // Update hidden input
    if (this.variantIdInput) this.variantIdInput.value = variant.id;

    // Update price
    const priceHtml = formatMoney(variant.price);
    if (this.priceEl) this.priceEl.textContent = priceHtml;
    if (this.stickyPriceEl) this.stickyPriceEl.textContent = priceHtml;

    // Compare-at price
    const compareEl = document.querySelector('[data-product-price] .product__price-compare');
    if (compareEl) {
      if (variant.compare_at_price > variant.price) {
        compareEl.textContent = formatMoney(variant.compare_at_price);
        compareEl.style.display = '';
      } else {
        compareEl.style.display = 'none';
      }
    }

    // Button state
    this._updateButtonAvailability(variant);

    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.set('variant', variant.id);
    window.history.replaceState({}, '', url);

    // Update gallery to variant's featured image
    if (variant.featured_image) {
      window.productGallery?.showImage(variant.featured_image.src);
    }
  }

  _updateButtonAvailability(variant) {
    const available = variant.available;
    const label = available
      ? window.variantStrings.addToCart
      : window.variantStrings.soldOut;

    [this.submitBtn, this.stickyBtn].forEach(btn => {
      if (!btn) return;
      btn.disabled = !available;
    });

    if (this.submitText) this.submitText.textContent = label;
    if (this.stickyBtn) this.stickyBtn.textContent = label;
  }

  _setLoading(on) {
    this.submitBtn?.classList.toggle('is-loading', on);
    if (this.submitBtn) this.submitBtn.disabled = on;
    if (this.stickyBtn) this.stickyBtn.disabled = on;
  }
}

// ─────────────────────────────────────────────
// PRODUCT GALLERY
// ─────────────────────────────────────────────

class ProductGallery {
  constructor(container) {
    this.container   = container;
    this.mainImg     = container.querySelector('[data-main-image]');
    this.thumbnails  = container.querySelectorAll('[data-thumbnail]');
    this._bindEvents();
  }

  _bindEvents() {
    this.thumbnails.forEach(thumb => {
      thumb.addEventListener('click', () => {
        const url     = thumb.dataset.imageUrl;
        const srcset  = thumb.dataset.imageSrcset;
        const alt     = thumb.dataset.imageAlt;
        this._swap(url, srcset, alt);

        this.thumbnails.forEach(t => t.classList.remove('is-active'));
        thumb.classList.add('is-active');
      });
    });
  }

  _swap(url, srcset, alt) {
    if (!this.mainImg) return;
    this.mainImg.style.opacity = '0';
    // Preload before swapping to avoid flash
    const tmp = new Image();
    tmp.onload = () => {
      this.mainImg.src    = url;
      if (srcset) this.mainImg.srcset = srcset;
      if (alt)    this.mainImg.alt    = alt;
      this.mainImg.style.opacity = '1';
    };
    tmp.src = url;
  }

  // Called by ProductForm when variant image changes
  showImage(src) {
    const match = [...this.thumbnails].find(t => t.dataset.imageUrl?.includes(src.split('?')[0].split('/').pop().split('_')[0]));
    if (match) match.click();
    else this._swap(src, '', '');
  }
}

// ─────────────────────────────────────────────
// QUICK ADD  (product cards)
// ─────────────────────────────────────────────

class QuickAdd {
  constructor() {
    // Delegate from document — cards may be re-rendered (e.g. recently viewed)
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-quick-add]');
      if (!btn) return;
      e.preventDefault();
      this._handle(btn);
    });
  }

  async _handle(btn) {
    const variantId = parseInt(btn.dataset.variantId, 10);
    if (!variantId) return;

    const textEl    = btn.querySelector('[data-quick-add-text]');
    const spinnerEl = btn.querySelector('.product-card__quick-add-spinner');

    btn.disabled = true;
    if (textEl)    textEl.hidden    = true;
    if (spinnerEl) spinnerEl.hidden = false;

    try {
      await window.cartDrawer.addItem(variantId);
    } catch (err) {
      console.error('Quick add failed:', err);
    } finally {
      btn.disabled = false;
      if (textEl)    textEl.hidden    = false;
      if (spinnerEl) spinnerEl.hidden = true;
    }
  }
}

// ─────────────────────────────────────────────
// STICKY ADD TO CART
// ─────────────────────────────────────────────

class StickyAddToCart {
  constructor() {
    this.bar      = document.querySelector('[data-sticky-atc]');
    this.mainBtn  = document.querySelector('[data-add-to-cart]');
    if (!this.bar || !this.mainBtn) return;

    this._observer = new IntersectionObserver(
      ([entry]) => {
        const show = !entry.isIntersecting;
        this.bar.classList.toggle('is-visible', show);
        this.bar.setAttribute('aria-hidden', String(!show));
      },
      { threshold: 0.1 }
    );
    this._observer.observe(this.mainBtn);
  }
}

// ─────────────────────────────────────────────
// MOBILE MENU
// ─────────────────────────────────────────────

class MobileMenu {
  constructor() {
    this.menu    = document.querySelector('.mobile-menu');
    this.overlay = document.querySelector('.mobile-menu__overlay');
    this._bindEvents();
  }

  _bindEvents() {
    document.querySelectorAll('[data-mobile-menu-toggle]').forEach(btn => {
      btn.addEventListener('click', () => this._toggle());
    });
    this.overlay?.addEventListener('click', () => this._close());
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this._isOpen()) this._close();
    });
  }

  _isOpen() { return this.menu?.classList.contains('is-open'); }

  _toggle() { this._isOpen() ? this._close() : this._open(); }

  _open() {
    this.menu?.classList.add('is-open');
    this.overlay?.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
  }

  _close() {
    this.menu?.classList.remove('is-open');
    this.overlay?.classList.remove('is-visible');
    document.body.style.overflow = '';
  }
}

// ─────────────────────────────────────────────
// ANNOUNCEMENT BAR (rotating messages)
// ─────────────────────────────────────────────

class AnnouncementBar {
  constructor() {
    this.bar = document.querySelector('[data-announcement-bar]');
    if (!this.bar) return;

    this.items    = this.bar.querySelectorAll('[data-announcement-item]');
    this.closeBtn = this.bar.querySelector('[data-announcement-close]');
    this.current  = 0;
    this.interval = null;

    if (sessionStorage.getItem('announcement-dismissed') === '1') {
      this.bar.style.display = 'none';
      return;
    }

    this.closeBtn?.addEventListener('click', () => {
      sessionStorage.setItem('announcement-dismissed', '1');
      this.bar.style.display = 'none';
      clearInterval(this.interval);
    });

    if (this.items.length > 1) {
      const speed = parseInt(this.bar.dataset.rotateSpeed, 10) || 4000;
      this.interval = setInterval(() => this._next(), speed);
    }
  }

  _next() {
    this.items[this.current]?.classList.remove('is-active');
    this.current = (this.current + 1) % this.items.length;
    this.items[this.current]?.classList.add('is-active');
  }
}

// ─────────────────────────────────────────────
// RECENTLY VIEWED (localStorage, no server)
// ─────────────────────────────────────────────

const RecentlyViewed = {
  STORAGE_KEY: 'five_recently_viewed',
  MAX: 8,

  track(productId, handle) {
    if (!productId) return;
    let list = this._get();
    list = list.filter(p => p.id !== productId);
    list.unshift({ id: productId, handle });
    list = list.slice(0, this.MAX);
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    } catch (_) {}
  },

  _get() {
    try { return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || []; } catch (_) { return []; }
  },

  getHandles(excludeId) {
    return this._get()
      .filter(p => p.id !== excludeId)
      .map(p => p.handle);
  },
};

// ─────────────────────────────────────────────
// SECTION RENDERING API
// ─────────────────────────────────────────────

async function renderSection(sectionId, url = window.location.href) {
  const response = await fetch(`${url}?section_id=${sectionId}`);
  const html     = await response.text();
  const doc      = new DOMParser().parseFromString(html, 'text/html');
  const next     = doc.querySelector(`#shopify-section-${sectionId}`);
  const current  = document.querySelector(`#shopify-section-${sectionId}`);
  if (next && current) current.replaceWith(next);
  return next;
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Cart (always present)
  window.cartDrawer = new CartDrawer();

  // Product page components
  const productForm = document.querySelector('[data-product-form]');
  if (productForm) {
    new ProductForm(productForm);
    new StickyAddToCart();
  }

  const gallery = document.querySelector('[data-product-gallery]');
  if (gallery) {
    window.productGallery = new ProductGallery(gallery);
  }

  // Quick add on cards
  new QuickAdd();

  // Mobile menu
  new MobileMenu();

  // Announcement bar
  new AnnouncementBar();

  // Track currently-viewed product
  const productSection = document.querySelector('[data-product-section]');
  if (productSection && window.productData) {
    RecentlyViewed.track(window.productData.id, window.productData.handle);
  }

  // Smooth scroll for hash links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    });
  });
});

// Public API
window.FiveTheme = {
  debounce,
  fetchJSON,
  formatMoney,
  renderSection,
  RecentlyViewed,
};
