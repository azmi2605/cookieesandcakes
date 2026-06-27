# AGENTS.md

## Purpose
This file helps AI coding agents understand the `cookieesandcake` repository quickly and make productive, low-risk changes.

## Repository summary
- Static bakery website built with vanilla HTML, CSS, and JavaScript.
- Uses Vite for local development and multi-page build output.
- Includes Firebase Realtime Database / Authentication support for admin product/order workflows.
- No frontend framework or test suite is present.
- The term "Stitch" appears in comments/design token metadata only; it is not a runtime dependency.

## Key files and entry points
- `README.md` — project overview and local/dev instructions.
- `package.json` — development commands: `npm run dev`, `npm run build`, `npm run preview`.
- `vite.config.js` — multi-page Vite configuration.
- `vercel.json` — deployment settings for static hosting.
- `data/products.json` — local menu data fallback and easiest source-of-truth for product updates.
- `js/firebase-config.js` — Firebase initialization, uses `import.meta.env` values.
- `js/products.js` — product loading, Realtime DB fallback logic, wishlist localStorage, and HTML card rendering.
- `js/filter.js` — client-side category filtering using the rendered product grid.
- `js/form.js` — form validation and order submission logic.
- `js/admin.js` — admin dashboard, Firebase auth gating, product CRUD, and order watch logic.
- `js/login.js` — authentication forms (sign in, sign up, password reset).
- `styles/tokens.css` — design tokens and color system.
- `styles/global.css` — site-wide base styles.

## Development guidance
- Preserve the vanilla DOM-first architecture: existing code uses native ES modules, class toggles, and DOM event listeners.
- Keep styling in CSS, not via external UI frameworks; the codebase intentionally avoids Bootstrap/Tailwind.
- Do not assume a backend API exists beyond Firebase Realtime Database and the static files.
- Use `data/products.json` for local editing and fallback when Firebase is unavailable.
- `js/products.js` will attempt Realtime DB first, then fetch the local JSON file.
- `js/filter.js` depends on `window.__cookieProducts.renderProductCard` for rerendering after filter changes.

## Firebase and deployment notes
- Firebase config is loaded from Vite environment variables.
- Relevant Realtime Database paths:
  - `products` for menu data
  - `orders` for submitted orders
- Deployment is static; Vercel is the intended host.
- Local preview works with either Vite or a simple static server such as `python -m http.server 5500`.

## What agents should avoid
- Do not add a new framework or migrate to a complex build system unless the user explicitly asks.
- Do not assume tests or lint scripts are available.
- Avoid committing Firebase secrets in source files.
- Avoid changing `product` data shape without updating both card rendering and admin/product forms.

## Quick start for edits
1. Inspect `README.md`, `vite.config.js`, and `package.json` first.
2. For product/menu changes, edit `data/products.json` and verify `js/products.js`/`js/filter.js` behavior.
3. For page flow changes, update HTML files and maintain the existing CSS class names used by JS.
4. For admin or auth changes, review `js/firebase-config.js`, `js/admin.js`, and `js/login.js` together.

## Suggestions for future customizations
- Add a project-specific Copilot skill for `data/products.json` menu updates.
- Add instructions for handling Firebase environment variables and Vercel setup.
- Add a check for `window.__cookieProducts` render dependency when modifying filter logic.
