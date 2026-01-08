# Order-Based SVG Export Integration

## Overview

Text objects (i-text) are now automatically exported as SVG files **only when orders are created**, eliminating unnecessary file uploads during the design process.

## How It Works

### Previous Approach (Manual Export)
- User could manually export text to SVG anytime
- Required user action
- Could result in many unused SVG files

### New Approach (Order-Based Export)
- SVG export happens automatically during order creation
- Integrated into the checkout flow
- Only creates SVG files for actual purchases
- Stored with order data for production reference

## Implementation Flow

```
User adds items to cart
  ↓
Goes to checkout
  ↓
Completes payment (Toss)
  ↓
Order confirmation endpoint (/api/toss/confirm)
  ↓
Order and order items created
  ↓
For each order item with canvas state:
  - Extract text objects from canvas JSON
  - Convert to SVG format
  - Upload to Supabase Storage
  - Save SVG URLs to order_items.text_svg_exports
  ↓
Order complete with SVG references
```

## Database Schema

### New Column: `order_items.text_svg_exports`

```sql
-- JSONB column storing SVG URLs by side ID
{
  "front": "https://supabase.co/storage/v1/object/public/text-exports/svg/order-abc123-front.svg",
  "back": "https://supabase.co/storage/v1/object/public/text-exports/svg/order-abc123-back.svg",
  "sleeve_left": "https://supabase.co/storage/v1/object/public/text-exports/svg/order-abc123-sleeve_left.svg",
  "__objects": {
    "front": {
      "front-...objectId...": "https://supabase.co/storage/v1/object/public/text-exports/svg/order-abc123-front-front-...objectId....svg"
    }
  }
}
```

Notes:
- Side keys (`front`, `back`, ...) may store the **combined** SVG URL for that side (legacy-compatible).
- `__objects` (optional) stores **per-object** SVG URLs: `__objects[sideId][objectId] -> url`.

Current behavior:
- If per-object SVGs exist for a side, only per-object SVGs are uploaded for that side (to avoid duplicate uploads).
- If per-object SVGs cannot be produced, the exporter falls back to uploading a combined side SVG.

## File Structure

### New Files

1. **[lib/server-svg-export.ts](lib/server-svg-export.ts)**
   - Server-side SVG generation from canvas state JSON
   - No fabric.js dependency (parses JSON directly)
   - Exports: `exportAndUploadTextFromCanvasState()`

2. **Migration: `add_text_svg_exports_to_order_items`**
   - Adds `text_svg_exports` JSONB column to `order_items`

### Modified Files

1. **[app/api/toss/confirm/route.ts](app/api/toss/confirm/route.ts)**
   - Lines 3: Import server-side export utility
   - Lines 213-216: Modified to return inserted items
   - Lines 231-269: Added SVG export loop after order creation

## SVG Export Details

### What Gets Exported

- **Included**: All text objects (i-text, text, textbox)
- **Excluded**: Images, shapes, background elements
- **Preserved**: Font family, size, color, weight, style, position, rotation, scale
- **Metadata**: Print method (if specified), creation timestamp

### SVG File Naming

```
order-{order_item_id}-{side_id}.svg
```

Examples:
- `order-550e8400-e29b-41d4-a716-446655440000-front.svg`
- `order-550e8400-e29b-41d4-a716-446655440000-back.svg`

### Storage Location

- **Bucket**: `text-exports`
- **Folder**: `svg`
- **Full Path**: `text-exports/svg/order-{item_id}-{side}.svg`

## Accessing SVG Files

### From Order Items Query

```typescript
import { createClient } from '@/lib/supabase-client';

const supabase = createClient();

// Get order with SVG exports
const { data: order } = await supabase
  .from('orders')
  .select(`
    *,
    order_items (
      id,
      product_title,
      text_svg_exports,
      canvas_state
    )
  `)
  .eq('id', orderId)
  .single();

// Access SVG URLs
order?.order_items.forEach(item => {
  const svgUrls = item.text_svg_exports;

  if (svgUrls.front) {
    console.log('Front SVG:', svgUrls.front);
  }

  if (svgUrls.back) {
    console.log('Back SVG:', svgUrls.back);
  }
});
```

### Direct URL Access

SVG files are publicly accessible:

```
https://obxekwyolrmipwmffhwq.supabase.co/storage/v1/object/public/text-exports/svg/order-abc123-front.svg
```

## Error Handling

SVG export errors **do not fail the order**:

- If SVG export fails, order still completes successfully
- Errors are logged to console
- Failed exports have empty `text_svg_exports` object

```typescript
// In route.ts
try {
  const svgUrls = await exportAndUploadTextFromCanvasState(...);
  // Update order item
} catch (error) {
  // Log error but don't fail order
  console.error(`Error exporting SVG for item ${item.id}:`, error);
}
```

## Production Use Cases

### 1. Manufacturing Reference

Access SVG files for production:

```typescript
// Production system fetches order
const { data: orderItems } = await supabase
  .from('order_items')
  .select('text_svg_exports, canvas_state')
  .eq('order_id', orderId);

// Download SVG files for printing
for (const item of orderItems) {
  for (const [side, url] of Object.entries(item.text_svg_exports)) {
    const response = await fetch(url);
    const svgContent = await response.text();
    // Send to printing system
  }
}
```

### 2. Order Review Dashboard

```typescript
function OrderDetailsView({ orderId }) {
  const [order, setOrder] = useState(null);

  useEffect(() => {
    fetchOrderWithSVGs(orderId);
  }, [orderId]);

  return (
    <div>
      {order?.order_items.map(item => (
        <div key={item.id}>
          <h3>{item.product_title}</h3>

          {/* Display SVG previews */}
          {Object.entries(item.text_svg_exports).map(([side, url]) => (
            <div key={side}>
              <h4>{side}</h4>
              <img src={url} alt={`${side} design`} />
              <a href={url} download>Download SVG</a>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

### 3. Reorder Functionality

```typescript
// User wants to reorder - use existing SVG
const previousOrder = await getOrder(previousOrderId);
const svgUrls = previousOrder.order_items[0].text_svg_exports;

// SVG files persist in storage for reuse
console.log('Reusing SVG:', svgUrls.front);
```

## Benefits

### ✅ Efficiency
- Only creates SVG files for actual orders
- No wasted storage on abandoned designs
- Automatic - no user action required

### ✅ Production Ready
- SVG files available immediately after order
- Stored with order data for easy reference
- Includes all text styling and positioning

### ✅ Scalable
- Server-side generation (no browser limitations)
- Parallel processing for multiple order items
- Graceful error handling

### ✅ Reliable
- Order completion not dependent on SVG export
- Errors logged but don't block checkout
- SVG URLs stored in database for persistence

## Monitoring & Debugging

### Check SVG Export Success

```sql
-- Orders with SVG exports
SELECT
  o.id,
  o.customer_name,
  oi.product_title,
  oi.text_svg_exports
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE jsonb_typeof(oi.text_svg_exports) = 'object'
  AND oi.text_svg_exports != '{}'::jsonb;
```

### Check Failed Exports

```sql
-- Orders without SVG exports (empty object)
SELECT
  o.id,
  oi.product_title,
  oi.canvas_state
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE oi.text_svg_exports = '{}'::jsonb
  AND oi.canvas_state != '{}'::jsonb;
```

### Server Logs

Check logs in your deployment platform:

```bash
# Look for these log messages:
"Starting SVG export for order items..."
"SVG exports saved for item {id}: [...]"
"No text objects found for item {id}, skipping SVG export"
"Error exporting SVG for item {id}: ..."
```

## Manual Export (Still Available)

The manual export feature is still available for testing/preview:

```typescript
import { useCanvasStore } from '@/store/useCanvasStore';

// Manual export from canvas store
const { exportAndUploadTextToSVG } = useCanvasStore();
const result = await exportAndUploadTextToSVG();
```

**Use Case**: Preview or testing during design, before order creation.

## Future Enhancements

- [ ] Batch SVG generation for large orders
- [ ] SVG optimization/compression
- [ ] Alternative export formats (PDF, PNG)
- [ ] SVG versioning for design changes
- [ ] Automatic cleanup of old SVG files

---

## Summary

✨ **Text-to-SVG export is now fully integrated with the order flow**

- Automatic export during order creation
- Efficient (only for actual purchases)
- Production-ready SVG files
- Stored in `order_items.text_svg_exports`
- No impact on order completion if export fails
