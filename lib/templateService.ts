import { createClient } from './supabase-client';
import { DesignTemplate, TemplatePickerItem } from '@/types/types';

/**
 * Get all active templates for a product (lightweight version for picker)
 * @param productId The product ID to fetch templates for
 * @returns Array of template picker items
 */
export async function getProductTemplates(
  productId: string
): Promise<TemplatePickerItem[]> {
  const supabase = createClient();

  try {
    const { data: templates, error } = await supabase
      .from('design_templates')
      .select('id, title, description, preview_url')
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }

    return templates || [];
  } catch (error) {
    console.error('Failed to fetch product templates:', error);
    return [];
  }
}

/**
 * Get a single template by ID (full data for applying)
 * @param templateId The template ID to fetch
 * @returns The full template data or null if not found
 */
export async function getTemplate(
  templateId: string
): Promise<DesignTemplate | null> {
  const supabase = createClient();

  try {
    const { data: template, error } = await supabase
      .from('design_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) {
      console.error('Error fetching template:', error);
      throw error;
    }

    return template;
  } catch (error) {
    console.error('Failed to fetch template:', error);
    return null;
  }
}

// ============================================================================
// Admin Functions (for template management)
// ============================================================================

/**
 * Create a new template (admin only)
 */
export async function createTemplate(
  data: Omit<DesignTemplate, 'id' | 'created_at' | 'updated_at'>
): Promise<DesignTemplate | null> {
  const supabase = createClient();

  try {
    const { data: template, error } = await supabase
      .from('design_templates')
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      throw error;
    }

    return template;
  } catch (error) {
    console.error('Failed to create template:', error);
    return null;
  }
}

/**
 * Update an existing template (admin only)
 */
export async function updateTemplate(
  templateId: string,
  data: Partial<Omit<DesignTemplate, 'id' | 'created_at' | 'updated_at'>>
): Promise<DesignTemplate | null> {
  const supabase = createClient();

  try {
    const { data: template, error } = await supabase
      .from('design_templates')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      throw error;
    }

    return template;
  } catch (error) {
    console.error('Failed to update template:', error);
    return null;
  }
}

/**
 * Delete a template (admin only)
 */
export async function deleteTemplate(templateId: string): Promise<boolean> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('design_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      console.error('Error deleting template:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete template:', error);
    return false;
  }
}

/**
 * Get all templates for a product (including inactive) - for admin management
 */
export async function getAllProductTemplates(
  productId: string
): Promise<DesignTemplate[]> {
  const supabase = createClient();

  try {
    const { data: templates, error } = await supabase
      .from('design_templates')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching all templates:', error);
      throw error;
    }

    return templates || [];
  } catch (error) {
    console.error('Failed to fetch all product templates:', error);
    return [];
  }
}
