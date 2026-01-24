import { createClient } from '@/lib/supabase-client';
import { ProductPreview } from './types';
import { CATEGORY_MAPPING } from './intents';

export interface ProductSearchOptions {
  maxPrice?: number;
  category?: string;
  limit?: number;
}

export async function fetchProductsForRecommendation(
  options?: ProductSearchOptions
): Promise<ProductPreview[]> {
  const supabase = createClient();

  let query = supabase
    .from('products')
    .select('id, title, base_price, thumbnail_image_link, category')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (options?.maxPrice) {
    query = query.lte('base_price', options.maxPrice);
  }

  if (options?.category) {
    // Map Korean category name to database key
    const categoryKey = CATEGORY_MAPPING[options.category] || options.category;
    query = query.eq('category', categoryKey);
  }

  const limit = options?.limit || 6;
  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching products for chatbot:', error);
    return [];
  }

  return (data || []) as ProductPreview[];
}

export async function fetchPopularProducts(limit: number = 6): Promise<ProductPreview[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('products')
    .select('id, title, base_price, thumbnail_image_link, category')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching popular products:', error);
    return [];
  }

  return (data || []) as ProductPreview[];
}
