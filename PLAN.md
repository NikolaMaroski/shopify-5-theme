# FIVE Theme — Senior-Level Upgrade Plan

## Audit Findings

### Critical Bugs
1. **JS/Liquid data-attribute mismatch** — `global.js` `ProductForm` listens for `[data-variant-option]` clicks but `main-product.liquid` renders buttons with `data-option-value` + `data-option-position`. Variant selection is completely broken.
2. **`ProductGallery` mismatch** — JS reads `thumb.dataset.fullSize` but Liquid outputs `data-image-url`. Main image never swaps.
3. **Quantity buttons mismatch** — JS binds `[data-quantity-minus]` / `[data-quantity-plus]` but Liquid uses `data-quantity-decrease` / `data-quantity-increase`.
4. **Loading state leaks** — `setLoading()` swaps the button's `textContent` but the template uses a separate `<span data-loading hidden>` spinner. Both run simultaneously — broken visual.
5. **`--duration-fast` not defined** — used in product + collection CSS but only `--duration-short`, `--duration-default`, `--duration-long` are declared. Falls back to `0s` (no transition).

### UI/Alignment Issues
1. **`.collection-layout` always renders 2 columns** even when filtering is disabled — grid shows 250 px sidebar gap over a 1-column layout.
2. **`.product-card__title a::after` full-cover link** uses `position: absolute; inset: 0` but `.product-card` has no `position: relative` — click target bleeds outside card.
3. **Product thumbnails overflow on mobile** — container has no wrapping, just `overflow-x: auto` with no minimum sizes enforced.
4. **Cart item `remove` button** has no minimum tap target (`line-height: 0` + icon only with `padding: --space-xs` = ~20px, below 44px WCAG guideline).
5. **`product__price-current--sale` hardcodes `#dc2626`** — violates the CSS custom-property theming contract of the theme.

### Product Card / Images
- The card renders a secondary hover image for all products — user wants **only the primary image** on cards; full image gallery lives on the detail page only.
- No Quick Add to Cart on cards — standard on all top-selling themes (Prestige, Impulse, Craft).
- Quick Add shows a full loading spinner blocking the page — should be an inline card-level state.

### Missing Selling / Conversion Sections
None of these exist in the theme. All are standard in Prestige / Broadcast / Impulse:
- Announcement bar (rotating promotional messages)
- Trust / USP bar (icons + text — free shipping, returns, secure checkout)
- Selling tips / value-proposition section (merchant-editable icon + title + text blocks)
- Recently Viewed products (JS-driven, no server round-trip needed)
- Inline stock urgency indicator

---

## 5 Differentiators vs Best-Selling Themes

| # | Feature | Why it's different |
|---|---|---|
| 1 | **Rotating Announcement Bar** | Dawn has static single line. Ours supports multiple messages with configurable rotation speed and a close button with session-storage persistence. |
| 2 | **Contextual Trust Bar** | Most themes hard-code trust icons. Ours is a fully schema-driven section: each block has its own icon (SVG name picker), headline, and sub-text — fully editable per page. |
| 3 | **Selling Tips Section** | A "Why buy from us" section with up to 6 merchant-created blocks, each with icon, title, description, and optional link. Editable entirely in the theme editor. |
| 4 | **Sticky Add to Cart bar** | A floating bottom bar that appears only when the main ATC button scrolls off-screen. Includes variant name + price. Invisible until needed — no layout shift. |
| 5 | **Inline Low-Stock Badge** | A snippet that reads `product.inventory_quantity` against a configurable threshold. Shows "Only X left" in accent colour on both cards and the detail page — drives urgency without 3rd-party apps. |

---

## Implementation Plan

### Phase 1 — Bug Fixes (blocking correctness)
- [ ] Fix data-attribute mismatches in `global.js` (`ProductForm`, `ProductGallery`, quantity buttons)
- [ ] Fix `setLoading()` to use the `[data-loading]` span pattern from the template
- [ ] Define `--duration-fast` in `:root` (= 150ms, alias for `--duration-short`)
- [ ] Fix sale price to use CSS custom property instead of hardcoded hex

### Phase 2 — UI Alignment Fixes
- [ ] `.collection-layout`: conditionally apply 2-column grid only when sidebar exists
- [ ] `.product-card`: add `position: relative`
- [ ] Cart remove button: minimum 44×44 tap target
- [ ] Product thumbnails: add `flex-wrap: wrap` fallback on small screens

### Phase 3 — Product Card Overhaul
- [ ] Remove secondary hover image from `product-card.liquid`
- [ ] Add Quick Add overlay button (shows on hover / long-press mobile)
- [ ] Add inline stock badge via `stock-indicator` snippet
- [ ] Quick Add drives `CartDrawer.addItem()` with card-level loading state

### Phase 4 — Product Page
- [ ] Remove inline `<span data-loading hidden>` spinner from ATC button (clean up)
- [ ] Implement Sticky Add to Cart bar (appears on scroll)
- [ ] Show stock indicator under price

### Phase 5 — New Sections
- [ ] `sections/announcement-bar.liquid` — rotating messages, closeable, session-persistent
- [ ] `sections/trust-bar.liquid` — schema-driven icon + text blocks
- [ ] `sections/selling-tips.liquid` — value proposition blocks (up to 6)
- [ ] `sections/recently-viewed.liquid` — client-side, localStorage, no Liquid loop needed
- [ ] `snippets/stock-indicator.liquid` — reusable low-stock badge

### Phase 6 — Translations & Polish
- [ ] Add all new `t` keys to `locales/en.default.json`
- [ ] Ensure all new sections have `presets` for "Add section" discoverability
- [ ] Final pass: `shopify theme check` compliance (no deprecated tags, no missing schema fields)

---

## File Change Summary

| File | Action | Reason |
|---|---|---|
| `assets/global.js` | Edit | Fix all data-attr bugs, add `StickyAddToCart`, `QuickAdd` classes |
| `assets/base.css` | Edit | Alignment fixes, quick-add styles, new section styles, missing CSS vars |
| `snippets/product-card.liquid` | Edit | Single image, quick-add button, stock badge |
| `sections/main-product.liquid` | Edit | Fix ATC button, add sticky bar markup + schema settings |
| `sections/announcement-bar.liquid` | Create | Rotating announcement bar |
| `sections/trust-bar.liquid` | Create | Trust / USP bar |
| `sections/selling-tips.liquid` | Create | Value proposition blocks |
| `sections/recently-viewed.liquid` | Create | Client-side recently viewed |
| `snippets/stock-indicator.liquid` | Create | Reusable low-stock badge |
| `locales/en.default.json` | Edit | New translation keys |
