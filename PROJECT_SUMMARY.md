# Project Summary

This document summarizes the purpose and behavior of the files in this repository based on the current codebase. It focuses on source and configuration files that define the application; build artifacts (`.next/`) and dependencies (`node_modules/`) are not described. Assets under `public/` and SQL migrations under `supabase/` are included.

## Root and config files

- `.env.local`: Local environment configuration with API keys and service credentials. Not used directly in code, but read by Next.js and Supabase clients for runtime configuration. Keep secrets out of source control.
- `.gitignore`: Git ignore rules for dependencies, build outputs, logs, and env files.
- `.mcp.json`: MCP server configuration for Supabase tooling, including project ref and access token. Used by MCP tooling, not runtime.
- `.claude/settings.local.json`: Local agent permissions and MCP toggles for dev tooling (Claude-specific).
- `README.md`: Default Next.js README with dev commands and basic usage.
- `CLAUDE.md`: Project overview, tech stack, architecture notes, and canvas system guidance for assistants.
- `next.config.ts`: Next.js configuration; allows remote images from Supabase storage and Unsplash.
- `tsconfig.json`: TypeScript compiler settings, strict mode, and path alias (`@/*`).
- `eslint.config.mjs`: ESLint configuration using Next.js presets and custom ignores.
- `postcss.config.mjs`: PostCSS configuration for Tailwind CSS.
- `next-env.d.ts`: Next.js type references; generated file.
- `package.json`: Project metadata, scripts, and dependencies (Next.js, React, Fabric.js, Supabase, Toss Payments, etc.).
- `package-lock.json`: NPM lockfile capturing exact dependency versions.

## Docs (`docs/`)

- `docs/AI_PSD_CONVERSION.md`: Explains client/server flow for converting AI/PSD to PNG via CloudConvert, Supabase storage handling, and error cases.
- `docs/IMPLEMENTATION_CHANGELOG.md`: Detailed changelog for image upload and SVG export features, with file references and flow description.
- `docs/IMPLEMENTATION_SUMMARY.md`: Summary of Supabase storage integration and SVG export utilities, including usage examples.
- `docs/ORDER_FILE_DOWNLOADS.md`: How order item files are tracked and downloaded; API examples and data shapes for `image_urls` and `text_svg_exports`.
- `docs/ORDER_SVG_EXPORT.md`: Describes order-time SVG export pipeline and schema changes.
- `docs/STORAGE_SETUP.md`: Supabase storage bucket setup and RLS policy guidance.
- `docs/SVG_EXPORT_FIX_SUMMARY.md`: Postmortem and fixes for SVG export/image URL extraction from stringified canvas state.

## Types (`types/`)

- `types/types.ts`: Shared type definitions for products, sides/layers, sizing, inquiries, print options, and canvas object metadata (including Supabase storage info).

## State stores (`store/`)

- `store/useAuthStore.ts`: Zustand store for authentication state, Supabase login/signup/OAuth, and persisted user profile.
- `store/useCartStore.ts`: Zustand store for local cart items, counts, and totals with persistence.
- `store/useCanvasStore.ts`: Central canvas state manager (active side, edit mode, colors, zoom, serialization), SVG export helpers, and canvas reset logic.

## Libraries (`lib/`)

- `lib/categories.ts`: Category constants and helper functions to map keys and icons.
- `lib/canvas-svg-export.ts`: Client-side SVG export for text objects from Fabric.js canvases; supports local download and Supabase upload.
- `lib/canvasExporter.ts`: Canvas export utilities for PNG/JPEG/SVG, print-ready exports, and production package creation.
- `lib/canvasUtils.ts`: Pixel-to-mm and mm-to-pixel conversions plus formatting helpers.
- `lib/cartService.ts`: Supabase-backed cart operations (create, update, remove, clear, fetch with designs).
- `lib/cloudconvert.ts`: Client helper to call `/api/convert-image` for AI/PSD conversion with user-friendly errors.
- `lib/colorExtractor.ts`: Extracts colors from canvas objects and images, with merging/sensitivity logic.
- `lib/designService.ts`: Save/load/update/delete designs in Supabase; extracts image URLs from canvas state for faster access.
- `lib/order-files.ts`: Utilities to collect, download, and count order item files (images and SVGs).
- `lib/server-svg-export.ts`: Server-side SVG generation from canvas JSON; uploads SVGs and extracts image URLs for order items.
- `lib/storage-config.ts`: Defines Supabase bucket/folder constants and setup notes.
- `lib/supabase.ts`: Server-side Supabase client using cookies (App Router SSR).
- `lib/supabase-client.ts`: Browser Supabase client using public URL and anon key.
- `lib/supabase-storage.ts`: Supabase Storage helper functions for file/data URL/SVG upload and deletion.
- `lib/thumbnailGenerator.ts`: Generates base64 thumbnails from Fabric.js canvases.

## App routes (`app/`)

### Global

- `app/layout.tsx`: Root layout with Geist fonts, global styles, `NavigationListener`, and site footer.
- `app/globals.css`: Tailwind import, CSS variables, body defaults, custom scrollbar hide, and slide-up animation.
- `app/loading.tsx`: Global loading spinner fallback.
- `app/page.tsx`: Landing page that redirects to `/home` after a short delay.
- `app/favicon.ico`: Favicon asset for the app.

### Home area

- `app/home/layout.tsx`: Layout wrapper for home routes with bottom navigation.
- `app/home/page.tsx`: Server component fetching active products and rendering hero, categories, product grid, production examples, and inquiry board.
- `app/home/loading.tsx`: Loading state for home pages.
- `app/home/search/page.tsx`: Client search/filter page for products with category filters and sticky search bar.
- `app/home/search/loading.tsx`: Loading state for search page.
- `app/home/designs/page.tsx`: Client page for user designs/favorites with edit modal, search, and add-to-cart flow.
- `app/home/designs/loading.tsx`: Loading state for designs page.
- `app/home/my-page/page.tsx`: Client account dashboard with profile summary, menu links, and logout.
- `app/home/my-page/loading.tsx`: Loading state for my-page.

### Auth

- `app/login/page.tsx`: Client login/signup toggle form using `useAuthStore` (email/password + Google OAuth).
- `app/login/loading.tsx`: Loading fallback for login page.
- `app/signup/page.tsx`: Client signup form using Supabase auth and optional Google OAuth.
- `app/signup/loading.tsx`: Loading fallback for signup page.
- `app/auth/callback/route.ts`: OAuth callback route to exchange code for a session and redirect to `/home`.

### Cart and checkout

- `app/cart/page.tsx`: Client cart page with grouped items, quantity change modal, and checkout CTA.
- `app/cart/loading.tsx`: Loading fallback for cart page.
- `app/checkout/page.tsx`: Client checkout flow (shipping method, address, payment method) and Toss widget integration.
- `app/checkout/success/page.tsx`: Client confirmation page for successful payment (order details fetch placeholder).
- `app/payment/complete/page.tsx`: Client confirmation page that expects an `orderId` in the URL.

### Product and editor

- `app/product/[product_id]/page.tsx`: Simple product detail placeholder showing the product ID.
- `app/product/[product_id]/loading.tsx`: Loading fallback for product detail.
- `app/editor/[productId]/page.tsx`: Server component that fetches product and routes to mobile or desktop editor based on user-agent.
- `app/editor/[productId]/ProductEditorClient.tsx`: Mobile editor page integrating canvas designer, color selection, pricing, add-to-cart, and reviews.
- `app/editor/[productId]/ProductEditorClientDesktop.tsx`: Desktop editor with two-column layout, pricing, and reviews.
- `app/editor/[productId]/loading.tsx`: Loading fallback for editor.
- `app/editor/[productId]/not-found.tsx`: 404 for missing product.

### Reviews

- `app/reviews/[productId]/page.tsx`: Client review list page with rating summary and distribution.
- `app/api/reviews/[productId]/route.ts`: API route to fetch reviews for a product with optional limit.

### Inquiries

- `app/inquiries/page.tsx`: Client inquiry list with status filters, search, and admin view hints.
- `app/inquiries/new/page.tsx`: Client inquiry creation with product selection modal.
- `app/inquiries/[id]/page.tsx`: Client inquiry detail with admin reply and status update tools.
- `app/components/InquiryBoardSection.tsx`: Server component showing latest inquiries on the home page.

### Payments (Toss)

- `app/toss/page.tsx`: Toss payments widget demo/test page.
- `app/toss/success/page.tsx`: Client handler to confirm payment and redirect to completion page.
- `app/toss/fail/page.tsx`: Client page showing failure info from query params.
- `app/api/toss/confirm/route.ts`: Server endpoint confirming payment with Toss, creating orders/items, exporting SVGs, and extracting image URLs.

### Orders

- `app/api/orders/[orderId]/files/route.ts`: Server endpoint returning order items and associated image/SVG files.

### Admin

- `app/admin/page.tsx`: Client admin shell with tabs (products, orders, users, settings) and auth/role checks.
- `app/components/admin/ProductsTab.tsx`: Admin product list with status toggles and edit/print-area modes.
- `app/components/admin/ProductEditor.tsx`: Admin form to create/edit products, sides, and size options, including storage upload.
- `app/components/admin/PrintAreaEditor.tsx`: Admin canvas for adjusting print area coordinates and real-world dimensions.

### Policies

- `app/policies/page.tsx`: Static terms and privacy policy content page.

## Components (`app/components/`)

- `app/components/AddToCartModal.tsx`: Modal for naming a design and confirming add-to-cart.
- `app/components/BottomNavBar.tsx`: Mobile bottom navigation with links and cart button.
- `app/components/CartButton.tsx`: Cart icon with badge; syncs with Supabase on auth changes.
- `app/components/CategoryButton.tsx`: Category chip button with icon and active state.
- `app/components/DesignEditModal.tsx`: Full-screen modal editor for existing cart or saved designs with save logic.
- `app/components/FavoritesList.tsx`: Displays user favorites; requires authentication.
- `app/components/Footer.tsx`: Site footer with contact and policy links.
- `app/components/Header.tsx`: Top navigation header with optional back button and desktop nav.
- `app/components/HeroBanner.tsx`: Home page Swiper hero carousel with slide data.
- `app/components/LoadingModal.tsx`: Generic overlay loading modal for async operations.
- `app/components/LoadingSpinner.tsx`: Full-screen spinner.
- `app/components/NavigationListener.tsx`: Clears canvas store when navigating away from editor routes.
- `app/components/OrderFilesDownload.tsx`: UI to list/download images and SVGs for an order item.
- `app/components/ProductCard.tsx`: Product grid card with favorites toggle and review summary.
- `app/components/ProductSelectionModal.tsx`: Modal to search/select products for inquiries.
- `app/components/ProductionExamples.tsx`: Auto-scrolling horizontal list of production examples with lazy pagination.
- `app/components/QuantityChangeModal.tsx`: Modal to adjust cart quantities across sizes.
- `app/components/QuantitySelectorModal.tsx`: Modal for selecting sizes/quantities and naming a design before adding to cart.
- `app/components/ReviewsSection.tsx`: Embedded review summary with link to full list.
- `app/components/SavedDesignsModal.tsx`: Modal to select a saved design for loading.
- `app/components/toss/TossPaymentWidget.tsx`: Wrapper component for Toss payment widgets and request handling.

### Canvas components (`app/components/canvas/`)

- `app/components/canvas/ColorInfo.tsx`: Extracts and displays dominant colors used across canvases.
- `app/components/canvas/EditButton.tsx`: Toggles edit mode (hidden when already editing).
- `app/components/canvas/ExportTextButton.tsx`: Demo UI for exporting/uploading text SVGs.
- `app/components/canvas/LayerColorSelector.tsx`: Color picker for multi-layer product mockups.
- `app/components/canvas/ObjectPreviewPanel.tsx`: Lists user objects across sides with previews and print method selection.
- `app/components/canvas/PricingInfo.tsx`: Calculates and displays price breakdown based on object coverage.
- `app/components/canvas/PrintOptionSelector.tsx`: Per-object print method selector (printing vs embroidery).
- `app/components/canvas/ProductDesigner.tsx`: Main canvas container with swipeable sides and toolbar.
- `app/components/canvas/ScaleBox.tsx`: Floating measurement tooltip over selected objects.
- `app/components/canvas/SingleSideCanvas.tsx`: Fabric.js canvas setup per side, with background/layer loading, clipping, snapping, and metadata.
- `app/components/canvas/TextStylePanel.tsx`: Bottom sheet for text styling controls.
- `app/components/canvas/Toolbar.tsx`: Editing toolbar for adding text/images, AI/PSD conversion, zoom, and deletion.

## Utilities (`app/utils/`)

- `app/utils/canvasPricing.ts`: Computes pricing based on bounding box size and real-world scaling.

## Database migrations (`supabase/migrations/`)

- `supabase/migrations/20260101000000_add_print_options_documentation.sql`: Adds column comments documenting print method metadata stored in `canvas_state` for designs and order items.

## Public assets (`public/`)

- `public/file.svg`: File icon used by default template assets.
- `public/globe.svg`: Globe icon asset.
- `public/next.svg`: Next.js logo asset.
- `public/vercel.svg`: Vercel triangle logo asset.
- `public/window.svg`: Window icon asset.
- `public/icons/hoodie.png`: Category icon for hoodies.
- `public/icons/jacket.png`: Category icon for jackets.
- `public/icons/sweater.png`: Category icon for sweaters.
- `public/icons/total.png`: Category icon for “all.”
- `public/icons/tshirt.png`: Category icon for t-shirts.
- `public/icons/zipup.png`: Category icon for zip-up hoodies.
- `public/pictures/female_model.png`: Hero banner image.
- `public/pictures/male_model.png`: Hero banner image.
- `public/pictures/varsity_model.png`: Hero banner image.

## Notes on generated/ignored content

- Build artifacts under `.next/` and dependencies under `node_modules/` exist locally but are generated; they are excluded from this summary.
- The repository includes additional local tooling metadata (git internals and cache files); these are operational and not part of the application logic.
