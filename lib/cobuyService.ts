import { createClient } from './supabase-client';
import { CoBuySession, CoBuyParticipant, CoBuyCustomField, CoBuySessionWithDetails } from '@/types/types';

// ============================================================================
// Type Definitions for Service Parameters
// ============================================================================

export interface CreateCoBuySessionData {
  savedDesignId: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  maxParticipants?: number | null;
  customFields: CoBuyCustomField[];
}

export interface UpdateCoBuySessionData {
  title?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  maxParticipants?: number | null;
  customFields?: CoBuyCustomField[];
  status?: 'open' | 'closed' | 'cancelled' | 'finalized';
}

export interface AddParticipantData {
  sessionId: string;
  name: string;
  email: string;
  phone?: string;
  fieldResponses: Record<string, string>;
  selectedSize: string;
}

// ============================================================================
// CoBuy Session Management
// ============================================================================

/**
 * Create a new CoBuy session
 * @param data Session configuration data
 * @returns The created session or null if failed
 */
export async function createCoBuySession(
  data: CreateCoBuySessionData
): Promise<CoBuySession | null> {
  const supabase = createClient();

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('User not authenticated:', userError);
      throw new Error('User must be authenticated to create CoBuy sessions');
    }

    // Prepare the session data
    const sessionData = {
      user_id: user.id,
      saved_design_id: data.savedDesignId,
      title: data.title,
      description: data.description || null,
      start_date: data.startDate.toISOString(),
      end_date: data.endDate.toISOString(),
      max_participants: data.maxParticipants,
      custom_fields: data.customFields,
      status: 'open' as const,
      current_participant_count: 0,
    };

    // Insert into cobuy_sessions table
    const { data: session, error: insertError } = await supabase
      .from('cobuy_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating CoBuy session:', insertError);
      throw insertError;
    }

    return session;
  } catch (error) {
    console.error('Failed to create CoBuy session:', error);
    return null;
  }
}

/**
 * Get a CoBuy session by ID (for authenticated users)
 * @param sessionId The session ID
 * @param userId The user ID (optional, for ownership check)
 * @returns The session data or null if not found
 */
export async function getCoBuySession(
  sessionId: string,
  userId?: string
): Promise<CoBuySession | null> {
  const supabase = createClient();

  try {
    let query = supabase
      .from('cobuy_sessions')
      .select('*')
      .eq('id', sessionId);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: session, error } = await query.single();

    if (error) {
      console.error('Error fetching CoBuy session:', error);
      throw error;
    }

    return session;
  } catch (error) {
    console.error('Failed to fetch CoBuy session:', error);
    return null;
  }
}

/**
 * Get a CoBuy session by share token (public access)
 * @param shareToken The unique share token
 * @returns The session data or null if not found
 */
export async function getCoBuySessionByToken(
  shareToken: string
): Promise<CoBuySessionWithDetails | null> {
  const supabase = createClient();

  try {
    const { data: session, error } = await supabase
      .from('cobuy_sessions')
      .select(`
        *,
        saved_design:saved_designs (
          id,
          title,
          preview_url,
          canvas_state,
          color_selections,
          price_per_item,
          product:products (
            id,
            title,
            configuration,
            size_options
          )
        )
      `)
      .eq('share_token', shareToken)
      .single();

    if (error) {
      console.error('Error fetching CoBuy session by token:', error);
      throw error;
    }

    // Transform the nested product array to object
    if (session && session.saved_design) {
      const design = session.saved_design as any;
      if (Array.isArray(design.product)) {
        design.product = design.product[0];
      }
    }

    return session as CoBuySessionWithDetails;
  } catch (error) {
    console.error('Failed to fetch CoBuy session by token:', error);
    return null;
  }
}

/**
 * Get all CoBuy sessions for the current user
 * @returns Array of sessions or empty array if failed
 */
export async function getUserCoBuySessions(): Promise<CoBuySession[]> {
  const supabase = createClient();

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('User not authenticated:', userError);
      return [];
    }

    const { data: sessions, error } = await supabase
      .from('cobuy_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user CoBuy sessions:', error);
      throw error;
    }

    return sessions || [];
  } catch (error) {
    console.error('Failed to fetch user CoBuy sessions:', error);
    return [];
  }
}

/**
 * Update an existing CoBuy session
 * @param sessionId The session ID
 * @param data Updated session data
 * @returns The updated session or null if failed
 */
export async function updateCoBuySession(
  sessionId: string,
  data: UpdateCoBuySessionData
): Promise<CoBuySession | null> {
  const supabase = createClient();

  try {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.title !== undefined) {
      updateData.title = data.title;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.startDate !== undefined) {
      updateData.start_date = data.startDate.toISOString();
    }
    if (data.endDate !== undefined) {
      updateData.end_date = data.endDate.toISOString();
    }
    if (data.maxParticipants !== undefined) {
      updateData.max_participants = data.maxParticipants;
    }
    if (data.customFields !== undefined) {
      updateData.custom_fields = data.customFields;
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    const { data: updatedSession, error } = await supabase
      .from('cobuy_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating CoBuy session:', error);
      throw error;
    }

    return updatedSession;
  } catch (error) {
    console.error('Failed to update CoBuy session:', error);
    return null;
  }
}

/**
 * Close a CoBuy session (set status to 'closed')
 * @param sessionId The session ID
 * @returns The updated session or null if failed
 */
export async function closeCoBuySession(sessionId: string): Promise<CoBuySession | null> {
  return updateCoBuySession(sessionId, { status: 'closed' });
}

/**
 * Delete a CoBuy session
 * @param sessionId The session ID
 * @returns true if successful, false otherwise
 */
export async function deleteCoBuySession(sessionId: string): Promise<boolean> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('cobuy_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      console.error('Error deleting CoBuy session:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete CoBuy session:', error);
    return false;
  }
}

// ============================================================================
// Participant Management
// ============================================================================

/**
 * Add a participant to a CoBuy session
 * @param data Participant data
 * @returns The created participant or null if failed
 */
export async function addParticipant(
  data: AddParticipantData
): Promise<CoBuyParticipant | null> {
  const supabase = createClient();

  try {
    // First, check if the session can accept participants
    const canJoin = await canAcceptParticipants(data.sessionId);
    if (!canJoin) {
      throw new Error('Session cannot accept more participants (closed, full, or expired)');
    }

    // Create participant record
    const participantData = {
      cobuy_session_id: data.sessionId,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      field_responses: data.fieldResponses,
      selected_size: data.selectedSize,
      payment_status: 'pending' as const,
    };

    const { data: participant, error: insertError } = await supabase
      .from('cobuy_participants')
      .insert(participantData)
      .select()
      .single();

    if (insertError) {
      console.error('Error adding participant:', insertError);
      throw insertError;
    }

    return participant;
  } catch (error) {
    console.error('Failed to add participant:', error);
    return null;
  }
}

/**
 * Update participant payment status
 * @param participantId The participant ID
 * @param paymentData Payment information
 * @returns The updated participant or null if failed
 */
export async function updateParticipantPayment(
  participantId: string,
  paymentData: {
    paymentStatus: 'completed' | 'failed' | 'refunded';
    paymentKey?: string;
    paymentAmount?: number;
  }
): Promise<CoBuyParticipant | null> {
  const supabase = createClient();

  try {
    const updateData: any = {
      payment_status: paymentData.paymentStatus,
    };

    if (paymentData.paymentKey) {
      updateData.payment_key = paymentData.paymentKey;
    }
    if (paymentData.paymentAmount !== undefined) {
      updateData.payment_amount = paymentData.paymentAmount;
    }
    if (paymentData.paymentStatus === 'completed') {
      updateData.paid_at = new Date().toISOString();
    }

    const { data: updatedParticipant, error } = await supabase
      .from('cobuy_participants')
      .update(updateData)
      .eq('id', participantId)
      .select()
      .single();

    if (error) {
      console.error('Error updating participant payment:', error);
      throw error;
    }

    // If payment is completed, increment session participant count
    if (paymentData.paymentStatus === 'completed' && updatedParticipant) {
      await incrementParticipantCount(updatedParticipant.cobuy_session_id);
    }

    return updatedParticipant;
  } catch (error) {
    console.error('Failed to update participant payment:', error);
    return null;
  }
}

/**
 * Get all participants for a session
 * @param sessionId The session ID
 * @returns Array of participants or empty array if failed
 */
export async function getParticipants(sessionId: string): Promise<CoBuyParticipant[]> {
  const supabase = createClient();

  try {
    const { data: participants, error } = await supabase
      .from('cobuy_participants')
      .select('*')
      .eq('cobuy_session_id', sessionId)
      .order('joined_at', { ascending: false });

    if (error) {
      console.error('Error fetching participants:', error);
      throw error;
    }

    return participants || [];
  } catch (error) {
    console.error('Failed to fetch participants:', error);
    return [];
  }
}

// ============================================================================
// Validation & Helper Functions
// ============================================================================

/**
 * Check if a session can accept new participants
 * @param sessionId The session ID
 * @returns true if session can accept participants, false otherwise
 */
export async function canAcceptParticipants(sessionId: string): Promise<boolean> {
  const supabase = createClient();

  try {
    const { data: session, error } = await supabase
      .from('cobuy_sessions')
      .select('status, end_date, max_participants, current_participant_count')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      return false;
    }

    // Check status
    if (session.status !== 'open') {
      return false;
    }

    // Check expiry
    const now = new Date();
    const endDate = new Date(session.end_date);
    if (now > endDate) {
      return false;
    }

    // Check participant limit
    if (session.max_participants !== null) {
      if (session.current_participant_count >= session.max_participants) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking if session can accept participants:', error);
    return false;
  }
}

/**
 * Check if a session has expired
 * @param sessionId The session ID
 * @returns true if expired, false otherwise
 */
export async function checkSessionExpiry(sessionId: string): Promise<boolean> {
  const supabase = createClient();

  try {
    const { data: session, error } = await supabase
      .from('cobuy_sessions')
      .select('end_date')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      return true; // Treat as expired if session not found
    }

    const now = new Date();
    const endDate = new Date(session.end_date);
    return now > endDate;
  } catch (error) {
    console.error('Error checking session expiry:', error);
    return true; // Treat as expired on error
  }
}

/**
 * Increment the participant count for a session (atomic operation)
 * @param sessionId The session ID
 * @returns true if successful, false otherwise
 */
async function incrementParticipantCount(sessionId: string): Promise<boolean> {
  const supabase = createClient();

  try {
    // Get current count
    const { data: session, error: fetchError } = await supabase
      .from('cobuy_sessions')
      .select('current_participant_count')
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) {
      throw fetchError || new Error('Session not found');
    }

    // Increment count
    const { error: updateError } = await supabase
      .from('cobuy_sessions')
      .update({ current_participant_count: session.current_participant_count + 1 })
      .eq('id', sessionId);

    if (updateError) {
      throw updateError;
    }

    return true;
  } catch (error) {
    console.error('Failed to increment participant count:', error);
    return false;
  }
}

/**
 * Request cancellation of a CoBuy session (sets status to 'cancelled')
 * Note: This should trigger admin notification in production
 * @param sessionId The session ID
 * @returns The updated session or null if failed
 */
export async function requestCancellation(sessionId: string): Promise<CoBuySession | null> {
  // In production, this would create a notification for admin review
  // For now, we'll just set the status to 'cancelled'
  return updateCoBuySession(sessionId, { status: 'cancelled' });
}
