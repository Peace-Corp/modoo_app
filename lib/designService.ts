import { createClient } from './supabase-client';
import { extractImageUrlsFromCanvasState, type TextSvgExports } from './server-svg-export';
import * as fabric from 'fabric';
import { extractTextObjectsToSVG } from './canvas-svg-export';
import { uploadSVGToStorage } from './supabase-storage';
import { STORAGE_BUCKETS, STORAGE_FOLDERS } from './storage-config';

export interface SaveDesignData {
  productId: string;
  title?: string;
  productColor: string;
  canvasState: Record<string, string>;
  userId?: string;
  previewImage?: string; // Base64 data URL for preview image
  pricePerItem: number;
  canvasMap?: Record<string, fabric.Canvas>; // Optional canvas instances for SVG export
}

export interface SavedDesign {
  id: string;
  user_id: string;
  product_id: string;
  title: string | null;
  color_selections: {
    productColor: string;
  };
  canvas_state: Record<string, string>;
  preview_url: string | null;
  image_urls?: Record<string, Array<{ url: string; path?: string; uploadedAt?: string }>>;
  text_svg_exports?: TextSvgExports; // SVG URLs per side
  created_at: string;
  updated_at: string;
}

/**
 * Save a design to Supabase
 * @param data The design data to save
 * @returns The saved design record or null if failed
 */
export async function saveDesign(data: SaveDesignData): Promise<SavedDesign | null> {
  const supabase = createClient();

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('User not authenticated:', userError);
      throw new Error('User must be authenticated to save designs');
    }

    // Extract image URLs from canvas state for easier access
    const imageUrls = extractImageUrlsFromCanvasState(data.canvasState);

    // Export text objects to SVG using Fabric's toSVG() if canvas instances are provided
    const textSvgExports: TextSvgExports = {};
    if (data.canvasMap) {
      console.log('Exporting text objects to SVG using Fabric.js toSVG()...');

      for (const [sideId, canvas] of Object.entries(data.canvasMap)) {
        try {
          const { objectSvgs } = extractTextObjectsToSVG(canvas);

          if (objectSvgs.length > 0) {
            const sideObjectUrls: Record<string, string> = {};

            // Generate a unique design ID for filenames (will use actual ID after insert)
            const tempDesignId = `temp-${Date.now()}`;

            for (const objectSvg of objectSvgs) {
              const fileName = `design-${tempDesignId}-${sideId}-${objectSvg.objectId}.svg`;

              const uploadResult = await uploadSVGToStorage(
                supabase,
                objectSvg.svg,
                STORAGE_BUCKETS.TEXT_EXPORTS,
                STORAGE_FOLDERS.SVG,
                fileName
              );

              if (uploadResult.success && uploadResult.url) {
                sideObjectUrls[objectSvg.objectId] = uploadResult.url;
              } else {
                console.error(`Failed to upload SVG for ${sideId}/${objectSvg.objectId}:`, uploadResult.error);
              }
            }

            if (Object.keys(sideObjectUrls).length > 0) {
              if (!textSvgExports.__objects) {
                textSvgExports.__objects = {};
              }
              // Type assertion needed due to index signature in TextSvgExports
              const objectsMap = textSvgExports.__objects as Record<string, Record<string, string>>;
              objectsMap[sideId] = sideObjectUrls;
            }
          }
        } catch (error) {
          console.error(`Error exporting SVG for side ${sideId}:`, error);
        }
      }
    }

    // Prepare the data for insertion
    const designData: any = {
      user_id: user.id,
      product_id: data.productId,
      title: data.title || `Design ${new Date().toLocaleString('ko-KR')}`,
      color_selections: {
        productColor: data.productColor,
      },
      canvas_state: data.canvasState,
      preview_url: data.previewImage || null, // Save preview image as base64 data URL
      image_urls: imageUrls, // Save extracted image URLs for easy access
      price_per_item: data.pricePerItem
    };

    // Add text SVG exports if available
    if (Object.keys(textSvgExports).length > 0) {
      designData.text_svg_exports = textSvgExports;
    }

    // Insert into saved_designs table
    const { data: savedDesign, error: insertError } = await supabase
      .from('saved_designs')
      .insert(designData)
      .select()
      .single();

    if (insertError) {
      console.error('Error saving design:', insertError);
      throw insertError;
    }

    return savedDesign;
  } catch (error) {
    console.error('Failed to save design:', error);
    return null;
  }
}

/**
 * Load a design from Supabase by ID
 * @param designId The ID of the design to load
 * @returns The design data or null if not found
 */
export async function loadDesign(designId: string): Promise<SavedDesign | null> {
  const supabase = createClient();

  try {
    const { data: design, error } = await supabase
      .from('saved_designs')
      .select('*')
      .eq('id', designId)
      .single();

    if (error) {
      console.error('Error loading design:', error);
      throw error;
    }

    return design;
  } catch (error) {
    console.error('Failed to load design:', error);
    return null;
  }
}

/**
 * Get all saved designs for the current user
 * @returns Array of saved designs or empty array if failed
 */
export async function getUserDesigns(): Promise<SavedDesign[]> {
  const supabase = createClient();

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('User not authenticated:', userError);
      return [];
    }

    const { data: designs, error } = await supabase
      .from('saved_designs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching designs:', error);
      throw error;
    }

    return designs || [];
  } catch (error) {
    console.error('Failed to fetch user designs:', error);
    return [];
  }
}

/**
 * Update an existing design
 * @param designId The ID of the design to update
 * @param data The updated design data
 * @returns The updated design or null if failed
 */
export async function updateDesign(
  designId: string,
  data: Partial<SaveDesignData>
): Promise<SavedDesign | null> {
  const supabase = createClient();

  try {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.title !== undefined) {
      updateData.title = data.title;
    }
    if (data.productColor !== undefined) {
      updateData.color_selections = { productColor: data.productColor };
    }
    if (data.canvasState !== undefined) {
      updateData.canvas_state = data.canvasState;
      // Extract and update image URLs when canvas state changes
      updateData.image_urls = extractImageUrlsFromCanvasState(data.canvasState);
    }
    if (data.previewImage !== undefined) {
      updateData.preview_url = data.previewImage;
    }

    const { data: updatedDesign, error } = await supabase
      .from('saved_designs')
      .update(updateData)
      .eq('id', designId)
      .select()
      .single();

    if (error) {
      console.error('Error updating design:', error);
      throw error;
    }

    return updatedDesign;
  } catch (error) {
    console.error('Failed to update design:', error);
    return null;
  }
}

/**
 * Delete a design
 * @param designId The ID of the design to delete
 * @returns true if successful, false otherwise
 */
export async function deleteDesign(designId: string): Promise<boolean> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('saved_designs')
      .delete()
      .eq('id', designId);

    if (error) {
      console.error('Error deleting design:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete design:', error);
    return false;
  }
}
