# SVG Export Quick Reference

Quick reference guide for working with SVG exports in the modoo_app.

## Data Structure

```typescript
// Order Item
interface OrderItem {
  text_svg_exports?: {
    __objects?: {
      [sideId: string]: {
        [objectId: string]: string; // SVG URL
      };
    };
  };
}
```

## Common Operations

### Get All SVG URLs

```typescript
function getAllSvgUrls(orderItem: OrderItem): string[] {
  const urls: string[] = [];
  if (orderItem.text_svg_exports?.__objects) {
    for (const side in orderItem.text_svg_exports.__objects) {
      for (const obj in orderItem.text_svg_exports.__objects[side]) {
        urls.push(orderItem.text_svg_exports.__objects[side][obj]);
      }
    }
  }
  return urls;
}
```

### Get SVG by Side and Object

```typescript
function getSvg(item: OrderItem, sideId: string, objectId: string): string | null {
  return item.text_svg_exports?.__objects?.[sideId]?.[objectId] || null;
}
```

### Download SVG

```typescript
async function downloadSvg(url: string, filename: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
```

## Storage Location

- **Bucket**: `text-exports`
- **Path**: `svg/{filename}.svg`
- **URL**: `https://{project}.supabase.co/storage/v1/object/public/text-exports/svg/{filename}.svg`

## File Naming

- **Designs**: `design-{tempId}-{sideId}-{objectId}.svg`
- **Orders**: `order-{itemId}-{sideId}-{objectId}.svg`

## Console Messages

**Design Save (client):**
```
Exporting text objects to SVG using Fabric.js toSVG()...
```

**Order Creation (server):**
```
✅ Using pre-generated client-side SVG exports for item {id}
⚠️  No pre-generated SVGs found for item {id}, generating server-side
```

## API Examples

### Fetch Order SVGs

```typescript
// GET /api/orders/[orderId]/items/[itemId]/svgs
const response = await fetch(`/api/orders/${orderId}/items/${itemId}/svgs`);
const { svgs } = await response.json();
// svgs: Array<{ sideId, objectId, url }>
```

### React Component

```tsx
function SvgList({ orderItem }: { orderItem: OrderItem }) {
  const svgs = orderItem.text_svg_exports?.__objects || {};

  return (
    <div>
      {Object.entries(svgs).map(([sideId, objects]) =>
        Object.entries(objects).map(([objectId, url]) => (
          <div key={`${sideId}-${objectId}`}>
            <img src={url} alt={`${sideId} ${objectId}`} />
            <a href={url} download>Download</a>
          </div>
        ))
      )}
    </div>
  );
}
```

## Checking for SVGs

```typescript
function hasSvgs(item: OrderItem): boolean {
  return !!(item.text_svg_exports?.__objects);
}

function getSvgCount(item: OrderItem): number {
  if (!item.text_svg_exports?.__objects) return 0;
  return Object.values(item.text_svg_exports.__objects)
    .reduce((sum, side) => sum + Object.keys(side).length, 0);
}
```

## Related Docs

- [RETRIEVING_ORDER_SVG_FILES.md](./RETRIEVING_ORDER_SVG_FILES.md) - Full guide
- [CLIENT_SIDE_SVG_EXPORT.md](./CLIENT_SIDE_SVG_EXPORT.md) - Implementation
- [SVG_EXPORT_MIGRATION_SUMMARY.md](./SVG_EXPORT_MIGRATION_SUMMARY.md) - Migration
