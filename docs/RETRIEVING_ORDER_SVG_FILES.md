# Retrieving SVG Files from Order Items

## Overview

This guide explains how to access and download SVG files for text objects in order items. SVG files are stored in Supabase Storage and referenced in the `text_svg_exports` field of `order_items`.

## Data Structure

### Order Item Schema

```typescript
interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_title: string;
  canvas_state: Record<string, unknown>;
  text_svg_exports?: TextSvgExports;  // SVG URLs here
  image_urls?: Record<string, unknown>;
  // ... other fields
}
```

### Text SVG Exports Structure

```typescript
type TextSvgObjectExports = Record<string, Record<string, string>>;

interface TextSvgExports {
  __objects?: TextSvgObjectExports;
  [sideId: string]: string | TextSvgObjectExports | undefined;
}
```

**Example Data:**
```json
{
  "__objects": {
    "front": {
      "text-0": "https://xwuvbztgpwhbwohontuh.supabase.co/storage/v1/object/public/text-exports/svg/order-123-front-text-0.svg",
      "text-1": "https://xwuvbztgpwhbwohontuh.supabase.co/storage/v1/object/public/text-exports/svg/order-123-front-text-1.svg"
    },
    "back": {
      "text-0": "https://xwuvbztgpwhbwohontuh.supabase.co/storage/v1/object/public/text-exports/svg/order-123-back-text-0.svg"
    }
  }
}
```

## Retrieving SVG URLs

### Method 1: Get All SVGs for an Order Item

```typescript
function getAllSvgUrls(orderItem: OrderItem): string[] {
  const svgUrls: string[] = [];

  if (!orderItem.text_svg_exports) {
    return svgUrls;
  }

  const exports = orderItem.text_svg_exports;

  // Check for per-object SVG structure
  if (exports.__objects) {
    for (const sideId in exports.__objects) {
      const sideObjects = exports.__objects[sideId];
      for (const objectId in sideObjects) {
        svgUrls.push(sideObjects[objectId]);
      }
    }
  }

  // Check for direct side-level SVGs (fallback/legacy format)
  for (const key in exports) {
    if (key !== '__objects' && typeof exports[key] === 'string') {
      svgUrls.push(exports[key] as string);
    }
  }

  return svgUrls;
}

// Usage
const orderItem = await getOrderItem(orderId);
const allSvgs = getAllSvgUrls(orderItem);
console.log('All SVG URLs:', allSvgs);
```

### Method 2: Get SVGs Organized by Side

```typescript
interface SvgsBySide {
  [sideId: string]: {
    [objectId: string]: string;
  };
}

function getSvgsBySide(orderItem: OrderItem): SvgsBySide {
  const result: SvgsBySide = {};

  if (!orderItem.text_svg_exports?.__objects) {
    return result;
  }

  return orderItem.text_svg_exports.__objects;
}

// Usage
const orderItem = await getOrderItem(orderId);
const svgsBySide = getSvgsBySide(orderItem);

// Access specific side
const frontSvgs = svgsBySide['front'];
if (frontSvgs) {
  console.log('Front side SVGs:', frontSvgs);
  // { "text-0": "url1", "text-1": "url2" }
}
```

### Method 3: Get SVG for Specific Object

```typescript
function getSvgForObject(
  orderItem: OrderItem,
  sideId: string,
  objectId: string
): string | null {
  const exports = orderItem.text_svg_exports;

  if (!exports?.__objects?.[sideId]?.[objectId]) {
    return null;
  }

  return exports.__objects[sideId][objectId];
}

// Usage
const svgUrl = getSvgForObject(orderItem, 'front', 'text-0');
if (svgUrl) {
  console.log('SVG URL:', svgUrl);
}
```

## Downloading SVGs

### Browser Download

```typescript
async function downloadSvg(url: string, filename: string = 'design.svg') {
  try {
    const response = await fetch(url);
    const svgContent = await response.text();

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const downloadUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Failed to download SVG:', error);
  }
}

// Usage
const orderItem = await getOrderItem(orderId);
const svgUrl = getSvgForObject(orderItem, 'front', 'text-0');
if (svgUrl) {
  await downloadSvg(svgUrl, 'front-text-0.svg');
}
```

### Download All SVGs as ZIP

```typescript
import JSZip from 'jszip';

async function downloadAllSvgsAsZip(orderItem: OrderItem, zipFilename: string = 'svgs.zip') {
  const zip = new JSZip();

  if (!orderItem.text_svg_exports?.__objects) {
    console.warn('No SVG exports found');
    return;
  }

  const downloads: Promise<void>[] = [];

  for (const sideId in orderItem.text_svg_exports.__objects) {
    const sideObjects = orderItem.text_svg_exports.__objects[sideId];

    for (const objectId in sideObjects) {
      const url = sideObjects[objectId];
      const filename = `${sideId}-${objectId}.svg`;

      const promise = fetch(url)
        .then(response => response.text())
        .then(svgContent => {
          zip.file(filename, svgContent);
        });

      downloads.push(promise);
    }
  }

  await Promise.all(downloads);

  const blob = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = zipFilename;
  link.click();

  URL.revokeObjectURL(downloadUrl);
}

// Usage
await downloadAllSvgsAsZip(orderItem, `order-${orderItem.id}-svgs.zip`);
```

## Server-Side Access

### Next.js API Route Example

```typescript
// app/api/orders/[orderId]/download-svgs/route.ts
import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const supabase = await createClient();

  // Fetch order items
  const { data: orderItems, error } = await supabase
    .from('order_items')
    .select('id, text_svg_exports')
    .eq('order_id', params.orderId);

  if (error || !orderItems) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Collect all SVG URLs
  const allSvgUrls: Array<{
    itemId: string;
    sideId: string;
    objectId: string;
    url: string;
  }> = [];

  for (const item of orderItems) {
    if (item.text_svg_exports?.__objects) {
      for (const sideId in item.text_svg_exports.__objects) {
        const sideObjects = item.text_svg_exports.__objects[sideId];
        for (const objectId in sideObjects) {
          allSvgUrls.push({
            itemId: item.id,
            sideId,
            objectId,
            url: sideObjects[objectId],
          });
        }
      }
    }
  }

  return NextResponse.json({ svgs: allSvgUrls });
}
```

### Download Single SVG

```typescript
// app/api/orders/[orderId]/items/[itemId]/svg/[sideId]/[objectId]/route.ts
import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: {
    params: {
      orderId: string;
      itemId: string;
      sideId: string;
      objectId: string;
    }
  }
) {
  const supabase = await createClient();

  // Fetch order item
  const { data: orderItem, error } = await supabase
    .from('order_items')
    .select('text_svg_exports')
    .eq('id', params.itemId)
    .eq('order_id', params.orderId)
    .single();

  if (error || !orderItem) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  // Get SVG URL
  const svgUrl = orderItem.text_svg_exports?.__objects?.[params.sideId]?.[params.objectId];

  if (!svgUrl) {
    return NextResponse.json({ error: 'SVG not found' }, { status: 404 });
  }

  // Fetch SVG content
  const response = await fetch(svgUrl);
  const svgContent = await response.text();

  // Return SVG with proper headers
  return new NextResponse(svgContent, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Content-Disposition': `attachment; filename="${params.sideId}-${params.objectId}.svg"`,
    },
  });
}
```

## React Component Example

```typescript
'use client';

import { useState, useEffect } from 'react';

interface OrderItem {
  id: string;
  text_svg_exports?: {
    __objects?: Record<string, Record<string, string>>;
  };
}

export default function OrderSvgDownloader({ orderItem }: { orderItem: OrderItem }) {
  const [svgs, setSvgs] = useState<Array<{
    sideId: string;
    objectId: string;
    url: string;
  }>>([]);

  useEffect(() => {
    const svgList: typeof svgs = [];

    if (orderItem.text_svg_exports?.__objects) {
      for (const sideId in orderItem.text_svg_exports.__objects) {
        const sideObjects = orderItem.text_svg_exports.__objects[sideId];
        for (const objectId in sideObjects) {
          svgList.push({
            sideId,
            objectId,
            url: sideObjects[objectId],
          });
        }
      }
    }

    setSvgs(svgList);
  }, [orderItem]);

  const handleDownload = async (url: string, filename: string) => {
    const response = await fetch(url);
    const svgContent = await response.text();
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const downloadUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(downloadUrl);
  };

  if (svgs.length === 0) {
    return <p className="text-gray-500">No SVG files available</p>;
  }

  return (
    <div className="space-y-2">
      <h3 className="font-medium">SVG Files</h3>
      <div className="grid grid-cols-2 gap-2">
        {svgs.map((svg, index) => (
          <button
            key={index}
            onClick={() => handleDownload(svg.url, `${svg.sideId}-${svg.objectId}.svg`)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Download {svg.sideId} - {svg.objectId}
          </button>
        ))}
      </div>
    </div>
  );
}
```

## Checking if SVGs Exist

```typescript
function hasSvgExports(orderItem: OrderItem): boolean {
  return !!(
    orderItem.text_svg_exports &&
    (
      orderItem.text_svg_exports.__objects ||
      Object.keys(orderItem.text_svg_exports).some(key =>
        key !== '__objects' && typeof orderItem.text_svg_exports![key] === 'string'
      )
    )
  );
}

// Usage
if (hasSvgExports(orderItem)) {
  console.log('SVG exports available');
} else {
  console.log('No SVG exports found - might be an old order or no text objects');
}
```

## Storage URLs

SVG files are stored in Supabase Storage:

- **Bucket**: `text-exports`
- **Folder**: `svg/`
- **URL Pattern**: `https://{project-ref}.supabase.co/storage/v1/object/public/text-exports/svg/{filename}.svg`

### Filename Patterns

- **Design SVGs**: `design-{designId}-{sideId}-{objectId}.svg`
- **Order SVGs**: `order-{orderItemId}-{sideId}-{objectId}.svg`

## Common Use Cases

### 1. Admin Dashboard - View All Order SVGs

```typescript
async function getOrderSvgSummary(orderId: string) {
  const supabase = createClient();

  const { data: orderItems } = await supabase
    .from('order_items')
    .select('id, product_title, text_svg_exports')
    .eq('order_id', orderId);

  return orderItems?.map(item => ({
    itemId: item.id,
    productTitle: item.product_title,
    svgCount: Object.values(item.text_svg_exports?.__objects || {})
      .reduce((sum, side) => sum + Object.keys(side).length, 0),
  }));
}
```

### 2. Production Queue - List SVGs to Print

```typescript
async function getProductionSvgList(orderId: string) {
  const supabase = createClient();

  const { data: orderItems } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId);

  const productionList: Array<{
    orderItemId: string;
    productTitle: string;
    quantity: number;
    svgUrl: string;
    sideId: string;
    printMethod?: string;
  }> = [];

  for (const item of orderItems || []) {
    if (item.text_svg_exports?.__objects) {
      for (const sideId in item.text_svg_exports.__objects) {
        const sideObjects = item.text_svg_exports.__objects[sideId];
        for (const objectId in sideObjects) {
          // Extract print method from canvas state if available
          const canvasObjects = (item.canvas_state as any)?.[sideId]?.objects || [];
          const canvasObj = canvasObjects.find((o: any) =>
            o.data?.objectId === objectId || o.data?.id === objectId
          );

          productionList.push({
            orderItemId: item.id,
            productTitle: item.product_title,
            quantity: item.quantity,
            svgUrl: sideObjects[objectId],
            sideId,
            printMethod: canvasObj?.data?.printMethod,
          });
        }
      }
    }
  }

  return productionList;
}
```

### 3. Customer Preview - Display SVG Images

```typescript
export function SvgPreview({ url }: { url: string }) {
  return (
    <div className="border rounded-lg p-4">
      <img
        src={url}
        alt="SVG Preview"
        className="max-w-full h-auto"
      />
    </div>
  );
}
```

## Troubleshooting

### No SVG Exports Found

**Possible Reasons:**
1. Old order created before client-side SVG export was implemented
2. Design had no text objects
3. SVG export failed during design save

**Solution:**
```typescript
// Server-side fallback will generate SVGs on-demand during order creation
// Check server logs for:
// "Using pre-generated client-side SVG exports" (success)
// "No pre-generated SVGs found, generating server-side" (fallback)
```

### SVG URLs Return 404

**Possible Reasons:**
1. File was deleted from storage
2. Storage permissions changed
3. Incorrect bucket configuration

**Solution:**
Check Supabase Storage:
1. Go to Storage > text-exports > svg/
2. Verify files exist
3. Check bucket is public or has proper RLS policies

## Related Documentation

- [CLIENT_SIDE_SVG_EXPORT.md](./CLIENT_SIDE_SVG_EXPORT.md) - Implementation details
- [SVG_EXPORT_MIGRATION_SUMMARY.md](./SVG_EXPORT_MIGRATION_SUMMARY.md) - Migration guide
- [ORDER_FILE_DOWNLOADS.md](./ORDER_FILE_DOWNLOADS.md) - General file download implementation
