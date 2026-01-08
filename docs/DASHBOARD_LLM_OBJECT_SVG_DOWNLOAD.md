# Dashboard Domain LLM Guide: Identify Each Canvas Object + Per-Object SVG Download URLs

This project generates **per-object SVG files** for text objects during order creation and stores the public URLs in `order_items.text_svg_exports`.

Use this guide to:
- Identify the correct Fabric object (`objectId`)
- Read the correct per-object SVG URL (`downloadUrl`)

---

## 1) Canonical object identifier (`objectId`)

**Source of truth**: `obj.data.objectId`

- File: `app/components/canvas/SingleSideCanvas.tsx`
- Hook: `canvas.on('object:added', ...)`
- Behavior: assigns `obj.data.objectId = "${side.id}-${Date.now()}-${random}"`

This `objectId` is the stable identifier used to map exports back to the original object.

Fallbacks:
- Some objects may only have `obj.data.id` (system/legacy usage).
- If neither exists, server export generates a deterministic fallback.

---

## 2) Where per-object SVG URLs are stored (orders)

Per-object exports are generated server-side during checkout:

- File: `lib/server-svg-export.ts`
- Called by: `app/api/toss/confirm/route.ts` (also used in other order creation flows)
- Function: `exportAndUploadTextFromCanvasState()`

### `order_items.text_svg_exports` JSON shape

This JSONB field contains:

1) **Combined (per-side) SVG URL** (legacy-compatible)
2) **Per-object SVG URLs** (new) under `__objects`

Example:

```json
{
  "front": "https://.../text-exports/svg/order-<itemId>-front.svg",
  "back": "https://.../text-exports/svg/order-<itemId>-back.svg",
  "__objects": {
    "front": {
      "front-173...-abc123": "https://.../text-exports/svg/order-<itemId>-front-front-173...-abc123.svg",
      "front-173...-def456": "https://.../text-exports/svg/order-<itemId>-front-front-173...-def456.svg"
    },
    "back": {
      "back-173...-zzz999": "https://.../text-exports/svg/order-<itemId>-back-back-173...-zzz999.svg"
    }
  }
}
```

Meaning:
- `text_svg_exports[sideId]` is the **combined** SVG for the side.
- `text_svg_exports.__objects[sideId][objectId]` is the **per-object** SVG (cropped to that object).

---

## 3) How to build a per-object download list (dashboard)

Input: a single `order_item` row including `text_svg_exports`.

Algorithm:
1) Read `text_svg_exports.__objects` if present.
2) For each `sideId` and `objectId`, use the stored URL as the download URL.

Pseudo-code:

```ts
const exports = orderItem.text_svg_exports;
const perObject = exports?.__objects ?? {};

const items = [];
for (const [sideId, sideMap] of Object.entries(perObject)) {
  for (const [objectId, url] of Object.entries(sideMap)) {
    items.push({ sideId, objectId, downloadUrl: url });
  }
}
```

Back-compat:
- If `__objects` is missing, only side-level combined SVG URLs exist.

---

## 4) How to map a download entry back to a Fabric object (design-side)

Given `{ objectId }`, find the Fabric object on a canvas:

```ts
const obj = canvas.getObjects().find(o => o.data?.objectId === objectId);
```

---

## 5) Important scope note

Current server export only generates per-object SVGs for **text objects** (`IText`/`Text`/`Textbox`).
If you need per-object exports for images/logos/shapes, extend `lib/server-svg-export.ts` filtering and SVG generation.

