# CLAUDE.md — Shopify Theme Development Guide

## Project Overview

This is a Shopify Themes 2.0 project called "FIVE" — a minimal theme for small curated shops.

## Tech Stack

- **Liquid** — Shopify's templating language
- **Vanilla JavaScript (ES6+)** — No jQuery, no build step
- **CSS** — Custom properties, no preprocessor
- **JSON** — Templates and settings configuration

## Directory Structure

```
├── assets/          # CSS and JS files (served via CDN)
├── config/          # Theme settings (settings_schema.json, settings_data.json)
├── layout/          # Main layout wrapper (theme.liquid)
├── locales/         # Translation files (en.default.json)
├── sections/        # Modular, configurable sections with schemas
├── snippets/        # Reusable partials (no schema)
└── templates/       # JSON templates defining section order
```

## Key Commands

```bash
# Start local development server
shopify theme dev --store=your-store.myshopify.com

# Push theme to store
shopify theme push

# Pull latest from store
shopify theme pull

# Check theme for errors
shopify theme check

# Package theme as zip
shopify theme package
```

## Coding Conventions

### Liquid

- Use `{%- -%}` (with dashes) to strip whitespace
- Prefer `| t` filter for all user-facing strings
- Use `| escape` for user-generated content
- Always check `!= blank` before rendering optional content
- Use `{% render 'snippet' %}` not `{% include %}`

### Sections

- Every section needs a `{% schema %}` block
- Use descriptive setting IDs: `show_vendor`, `products_count`
- Include `"presets"` for sections that can be added anywhere
- Use `"templates"` array to restrict where section appears

### JavaScript

- No jQuery — use vanilla JS
- Namespace globals under `window.FiveTheme`
- Use `data-*` attributes for JS hooks, not classes
- Defer non-critical scripts
- Use fetch API for AJAX, not XMLHttpRequest

### CSS

- Use CSS custom properties for theming (`--color-accent`)
- Mobile-first responsive design
- Use `clamp()` for fluid typography
- Prefix theme-specific classes (e.g., `.five-header`)

## Shopify-Specific Patterns

### Cart AJAX

```javascript
// Add to cart
fetch("/cart/add.js", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ id: variantId, quantity: 1 }),
});

// Update cart
fetch("/cart/change.js", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ id: lineItemKey, quantity: newQty }),
});
```

### Section Rendering API

```javascript
// Fetch just one section's HTML
const response = await fetch(
  `${window.location.pathname}?section_id=cart-drawer`,
);
const html = await response.text();
```

### Responsive Images

```liquid
<img
  src="{{ image | image_url: width: 600 }}"
  srcset="
    {{ image | image_url: width: 300 }} 300w,
    {{ image | image_url: width: 600 }} 600w,
    {{ image | image_url: width: 900 }} 900w
  "
  sizes="(max-width: 600px) 100vw, 50vw"
  loading="lazy"
  alt="{{ image.alt | escape }}"
>
```

### Variant Selection

```liquid
{%- for option in product.options_with_values -%}
  <fieldset>
    <legend>{{ option.name }}</legend>
    {%- for value in option.values -%}
      <input type="radio" name="{{ option.name }}" value="{{ value }}"
        {% if option.selected_value == value %}checked{% endif %}>
      <label>{{ value }}</label>
    {%- endfor -%}
  </fieldset>
{%- endfor -%}
```

## Common Objects Reference

### Global Objects

- `shop` — Store info (name, currency, etc.)
- `cart` — Current cart (items, total_price, item_count)
- `customer` — Logged-in customer (or nil)
- `request` — Current request (path, host, locale)
- `routes` — URL helpers (cart_url, account_url, etc.)
- `settings` — Theme settings from settings_data.json

### Template Objects

- `product` — On product pages
- `collection` — On collection pages
- `article` — On blog article pages
- `page` — On CMS pages
- `search` — On search results page

## Important Filters

| Filter                       | Purpose                    |
| ---------------------------- | -------------------------- |
| `money`                      | Format price with currency |
| `money_without_currency`     | Price without symbol       |
| `image_url: width: N`        | Generate CDN image URL     |
| `asset_url`                  | URL to theme asset         |
| `t`                          | Translate string           |
| `escape`                     | HTML escape                |
| `handle`                     | URL-safe string            |
| `date: '%B %d, %Y'`          | Format date                |
| `json`                       | Output as JSON             |
| `pluralize: 'item', 'items'` | Pluralize word             |

## Testing Checklist

- [ ] Works on mobile (320px+)
- [ ] Cart drawer opens/closes properly
- [ ] Variant selection updates price and URL
- [ ] Images lazy load correctly
- [ ] No console errors
- [ ] `shopify theme check` passes
- [ ] Translations work (`{{ 'key' | t }}`)

## Common Pitfalls to Avoid

1. Don't use `{% include %}` — deprecated, use `{% render %}`
2. Don't forget `| escape` on user content
3. Don't hardcode currency symbols — use `| money`
4. Don't use inline styles for theming — use CSS custom properties
5. Don't forget `loading="lazy"` on below-fold images
6. Don't use `product.selected_variant` — use `product.selected_or_first_available_variant`

## Resources

- [Liquid Reference](https://shopify.dev/docs/api/liquid)
- [Theme Check](https://github.com/Shopify/theme-check)
- [Dawn Theme](https://github.com/Shopify/dawn) — Shopify's reference theme
