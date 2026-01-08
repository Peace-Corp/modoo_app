import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/orders/[orderId]/files
 *
 * Get all files (images and SVGs) for all items in an order
 * Returns organized file information for easy download
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;

    const supabase = await createClient();

    // Fetch order with all item files
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id,
        customer_name,
        order_status,
        created_at,
        order_items (
          id,
          product_title,
          quantity,
          text_svg_exports,
          image_urls,
          thumbnail_url
        )
      `)
      .eq('id', orderId)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Organize files by order item
    const itemsWithFiles = order.order_items.map((item: {
      id: string;
      product_title: string;
      quantity: number;
      text_svg_exports?: Record<string, unknown>;
      image_urls?: Record<string, Array<{ url: string; path?: string; uploadedAt?: string }>>;
      thumbnail_url?: string;
    }) => {
      const images: Array<{ type: 'image'; side: string; url: string; path?: string }> = [];
      const svgs: Array<{ type: 'svg'; side: string; url: string; kind?: 'combined' | 'object'; objectId?: string }> = [];

      // Extract images
      if (item.image_urls) {
        Object.entries(item.image_urls).forEach(([side, sideImages]) => {
          if (Array.isArray(sideImages)) {
            sideImages.forEach(img => {
              images.push({
                type: 'image',
                side,
                url: img.url,
                path: img.path,
              });
            });
          }
        });
      }

      // Extract SVGs
      if (item.text_svg_exports) {
        // Combined side SVGs: { [sideId]: "https://..." }
        Object.entries(item.text_svg_exports).forEach(([key, value]) => {
          if (key === '__objects') return;
          if (typeof value !== 'string') return;
          svgs.push({ type: 'svg', side: key, url: value, kind: 'combined' });
        });

        // Per-object SVGs: { __objects: { [sideId]: { [objectId]: "https://..." } } }
        const perObject = item.text_svg_exports.__objects;
        if (isRecord(perObject)) {
          Object.entries(perObject).forEach(([sideId, sideMap]) => {
            if (!isRecord(sideMap)) return;
            Object.entries(sideMap).forEach(([objectId, url]) => {
              if (typeof url !== 'string') return;
              svgs.push({ type: 'svg', side: sideId, url, kind: 'object', objectId });
            });
          });
        }
      }

      return {
        itemId: item.id,
        productTitle: item.product_title,
        quantity: item.quantity,
        thumbnailUrl: item.thumbnail_url,
        files: {
          images,
          svgs,
          allFiles: [...images, ...svgs],
          count: {
            images: images.length,
            svgs: svgs.length,
            total: images.length + svgs.length,
          },
        },
      };
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        customerName: order.customer_name,
        orderStatus: order.order_status,
        createdAt: order.created_at,
      },
      items: itemsWithFiles,
      totalFiles: itemsWithFiles.reduce((sum, item) => sum + item.files.count.total, 0),
    });
  } catch (error) {
    console.error('Error fetching order files:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch order files'
      },
      { status: 500 }
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
