# FIVE — Minimal Shopify Theme

A refined, editorial-style Shopify theme designed for small curated shops with 5-15 products. Built from scratch to demonstrate deep Shopify theme development expertise.

## ✨ Features

- **Themes 2.0 Architecture** — JSON templates, sections everywhere, Online Store 2.0 compatible
- **Section Rendering API** — Cart drawer updates without page reload
- **Clean Vanilla JavaScript** — No jQuery dependency, modern ES6+ patterns
- **Accessible** — Semantic HTML, ARIA labels, keyboard navigation
- **Performance Optimized** — Lazy loading, responsive images with srcset, deferred JS
- **SEO Ready** — JSON-LD structured data, Open Graph, Twitter Cards

## 📁 Theme Structure

```
shopify-theme/
├── assets/
│   ├── base.css           # Full CSS with custom properties, utilities, components
│   └── global.js          # CartDrawer, ProductForm, ProductGallery classes
├── config/
│   ├── settings_schema.json  # Theme settings definitions
│   └── settings_data.json    # Default values and presets
├── layout/
│   └── theme.liquid       # Main layout with header/footer groups
├── locales/
│   └── en.default.json    # Translation strings
├── sections/
│   ├── header.liquid      # Logo, navigation, mobile menu
│   ├── footer.liquid      # Newsletter, links, social, payments
│   ├── hero.liquid        # Full-width hero with CTA
│   ├── featured-products.liquid  # Product grid from collection
│   ├── main-product.liquid       # PDP with gallery, variants, ATC
│   ├── main-cart.liquid          # Full cart page
│   ├── cart-drawer.liquid        # Slide-in cart drawer
│   ├── collection-banner.liquid  # Collection header
│   ├── collection-products.liquid # Filterable product grid
│   ├── main-page.liquid          # Generic CMS page
│   ├── main-search.liquid        # Search results
│   └── main-list-collections.liquid # All collections grid
├── snippets/
│   ├── product-card.liquid   # Reusable product card
│   └── meta-tags.liquid      # SEO meta tags
└── templates/
    ├── index.json
    ├── product.json
    ├── collection.json
    ├── cart.json
    ├── page.json
    ├── search.json
    ├── list-collections.json
    └── 404.liquid
```

## 🎨 Design System

### Typography
- **Headings:** Playfair Display (serif)
- **Body:** DM Sans (sans-serif)
- **Scale:** Fluid typography using `clamp()`

### Colors
CSS custom properties with RGB channels for opacity compositing:
- `--color-base` — Background (#FAFAF9)
- `--color-contrast` — Text (#1A1A1A)
- `--color-accent` — Gold (#B8860B)

### Spacing
8px grid system with scale: `--space-xs` through `--space-3xl`

## 🔧 Key Technical Implementations

### 1. Section Rendering API
The cart drawer uses section rendering for seamless updates:

```javascript
async refresh() {
  const response = await fetch(`${window.location.pathname}?section_id=${this.sectionId}`);
  const html = await response.text();
  this.element.innerHTML = new DOMParser()
    .parseFromString(html, 'text/html')
    .querySelector('[data-cart-drawer]').innerHTML;
}
```

### 2. Variant Selection with URL State
Product forms update browser history for shareable variant URLs:

```javascript
updateVariant(selectedOptions) {
  const variant = this.variants.find(v => 
    v.options.every((opt, i) => opt === selectedOptions[i])
  );
  
  if (variant) {
    const url = new URL(window.location);
    url.searchParams.set('variant', variant.id);
    history.replaceState({}, '', url);
  }
}
```

### 3. Collection Filtering
Uses Shopify's native Storefront Filtering API:

```liquid
{%- for filter in collection.filters -%}
  {%- case filter.type -%}
    {%- when 'list' -%}
      {%- for value in filter.values -%}
        <input type="checkbox" name="{{ value.param_name }}" value="{{ value.value }}">
      {%- endfor -%}
    {%- when 'price_range' -%}
      <input type="number" name="{{ filter.min_value.param_name }}" min="0">
  {%- endcase -%}
{%- endfor -%}
```

### 4. Responsive Images
All images use srcset with proper width descriptors:

```liquid
<img
  src="{{ product.featured_image | image_url: width: 600 }}"
  srcset="
    {{ product.featured_image | image_url: width: 300 }} 300w,
    {{ product.featured_image | image_url: width: 600 }} 600w,
    {{ product.featured_image | image_url: width: 900 }} 900w
  "
  sizes="(max-width: 600px) 100vw, 33vw"
  loading="lazy"
>
```

### 5. JSON-LD Structured Data
Product pages include full schema markup:

```liquid
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "{{ product.title | escape }}",
  "offers": {
    "@type": "Offer",
    "price": "{{ product.price | money_without_currency }}",
    "availability": "{{ product.available | yepnope: 'InStock', 'OutOfStock' }}"
  }
}
</script>
```

## 📝 Interview Discussion Points

### Architecture Decisions
- **Why JSON templates?** Allows merchants to customize page layouts without code
- **Why vanilla JS?** Smaller bundle, no dependency management, modern browser support
- **Why CSS custom properties?** Runtime theming, reduced specificity wars, dark mode ready

### Performance Optimizations
- Images use native lazy loading (`loading="lazy"`)
- JS loaded with `defer` attribute
- Critical CSS inlined for header
- Fonts preconnected and display-swapped

### Accessibility
- Skip links for keyboard navigation
- Proper heading hierarchy
- ARIA labels on interactive elements
- Focus management in modals

### Scalability
- Section schema allows infinite customization
- Block-based footer for unlimited link columns
- Global settings for store-wide changes
- Translation-ready with locale files

## 🚀 Installation

1. Clone this repository
2. Install [Shopify CLI](https://shopify.dev/themes/tools/cli)
3. Run `shopify theme dev --store=your-store.myshopify.com`

## 📄 License

MIT License — Free for personal and commercial use.

---

Built as a portfolio piece demonstrating Shopify Themes 2.0 expertise.
