-- CoBuy (공동구매) Feature Tables
-- This migration creates the database schema for group purchase functionality

-- ============================================================================
-- 1. COBUY_SESSIONS TABLE
-- ============================================================================
-- Stores group purchase sessions created by users
CREATE TABLE cobuy_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  saved_design_id UUID NOT NULL REFERENCES saved_designs(id) ON DELETE CASCADE,

  -- Session configuration
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled', 'finalized')),
  share_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),

  -- Time configuration
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,

  -- Participant limits
  max_participants INTEGER, -- NULL = infinite
  current_participant_count INTEGER DEFAULT 0,

  -- Custom form fields (JSONB array)
  -- Format: [{ id: string, type: 'text'|'email'|'phone'|'dropdown', label: string, required: boolean, fixed?: boolean, options?: string[] }]
  custom_fields JSONB NOT NULL DEFAULT '[]',

  -- Bulk order reference (created after finalization by admin)
  bulk_order_id TEXT REFERENCES orders(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for cobuy_sessions
CREATE INDEX idx_cobuy_sessions_user_id ON cobuy_sessions(user_id);
CREATE INDEX idx_cobuy_sessions_saved_design_id ON cobuy_sessions(saved_design_id);
CREATE INDEX idx_cobuy_sessions_share_token ON cobuy_sessions(share_token);
CREATE INDEX idx_cobuy_sessions_status ON cobuy_sessions(status);
CREATE INDEX idx_cobuy_sessions_end_date ON cobuy_sessions(end_date);

-- ============================================================================
-- 2. COBUY_PARTICIPANTS TABLE
-- ============================================================================
-- Stores individual participants who join a CoBuy session
CREATE TABLE cobuy_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cobuy_session_id UUID NOT NULL REFERENCES cobuy_sessions(id) ON DELETE CASCADE,

  -- Participant info
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,

  -- Form responses (JSONB)
  -- Format: { field_id: value }
  field_responses JSONB NOT NULL,

  -- Selected size (from product options)
  selected_size TEXT NOT NULL,

  -- Payment info
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_key TEXT,
  payment_amount NUMERIC(10, 2),
  paid_at TIMESTAMPTZ,

  -- Metadata
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one participant per email per session
  UNIQUE(cobuy_session_id, email)
);

-- Indexes for cobuy_participants
CREATE INDEX idx_cobuy_participants_session_id ON cobuy_participants(cobuy_session_id);
CREATE INDEX idx_cobuy_participants_payment_status ON cobuy_participants(payment_status);
CREATE INDEX idx_cobuy_participants_email ON cobuy_participants(email);

-- ============================================================================
-- 3. COBUY_NOTIFICATIONS TABLE
-- ============================================================================
-- Stores email notification log for CoBuy events
CREATE TABLE cobuy_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cobuy_session_id UUID NOT NULL REFERENCES cobuy_sessions(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES cobuy_participants(id) ON DELETE SET NULL,

  notification_type TEXT NOT NULL CHECK (notification_type IN ('participant_joined', 'session_closing', 'session_closed', 'payment_confirmed')),
  recipient_email TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),

  metadata JSONB
);

-- Indexes for cobuy_notifications
CREATE INDEX idx_cobuy_notifications_session_id ON cobuy_notifications(cobuy_session_id);
CREATE INDEX idx_cobuy_notifications_participant_id ON cobuy_notifications(participant_id);
CREATE INDEX idx_cobuy_notifications_type ON cobuy_notifications(notification_type);

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE cobuy_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobuy_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobuy_notifications ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- COBUY_SESSIONS RLS Policies
-- ----------------------------------------------------------------------------

-- Allow users to view their own sessions
CREATE POLICY "Users can view their own cobuy sessions"
  ON cobuy_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to create sessions
CREATE POLICY "Users can create cobuy sessions"
  ON cobuy_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own sessions
CREATE POLICY "Users can update their own cobuy sessions"
  ON cobuy_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own sessions
CREATE POLICY "Users can delete their own cobuy sessions"
  ON cobuy_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Allow admins to view all sessions
CREATE POLICY "Admins can view all cobuy sessions"
  ON cobuy_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to update all sessions (for finalization)
CREATE POLICY "Admins can update all cobuy sessions"
  ON cobuy_sessions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Public read access for sessions via share token (used by public cobuy pages)
-- This allows unauthenticated users to view session details if they have the share token
CREATE POLICY "Public can view sessions by share token"
  ON cobuy_sessions
  FOR SELECT
  USING (true); -- Token validation happens in application layer

-- ----------------------------------------------------------------------------
-- COBUY_PARTICIPANTS RLS Policies
-- ----------------------------------------------------------------------------

-- Session creators can view all participants in their sessions
CREATE POLICY "Session creators can view participants"
  ON cobuy_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cobuy_sessions
      WHERE cobuy_sessions.id = cobuy_participants.cobuy_session_id
        AND cobuy_sessions.user_id = auth.uid()
    )
  );

-- Allow public insert for participants (guest participation)
CREATE POLICY "Public can join cobuy sessions"
  ON cobuy_participants
  FOR INSERT
  WITH CHECK (true); -- Validation happens in application layer

-- Participants can update their own payment status (via API)
CREATE POLICY "Payment API can update participant status"
  ON cobuy_participants
  FOR UPDATE
  USING (true) -- Payment confirmation API has service role access
  WITH CHECK (true);

-- Admins can view all participants
CREATE POLICY "Admins can view all participants"
  ON cobuy_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- COBUY_NOTIFICATIONS RLS Policies
-- ----------------------------------------------------------------------------

-- Session creators can view notifications for their sessions
CREATE POLICY "Session creators can view notifications"
  ON cobuy_notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cobuy_sessions
      WHERE cobuy_sessions.id = cobuy_notifications.cobuy_session_id
        AND cobuy_sessions.user_id = auth.uid()
    )
  );

-- Allow system to insert notifications (service role)
CREATE POLICY "System can insert notifications"
  ON cobuy_notifications
  FOR INSERT
  WITH CHECK (true); -- Service role access

-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications"
  ON cobuy_notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- Update updated_at timestamp on cobuy_sessions
CREATE OR REPLACE FUNCTION update_cobuy_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cobuy_sessions_updated_at
  BEFORE UPDATE ON cobuy_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_cobuy_session_updated_at();

-- ============================================================================
-- 6. COMMENTS
-- ============================================================================

COMMENT ON TABLE cobuy_sessions IS 'Group purchase sessions created by users to share designs and collect orders';
COMMENT ON TABLE cobuy_participants IS 'Individual participants who join a CoBuy session and make payments';
COMMENT ON TABLE cobuy_notifications IS 'Email notification log for CoBuy events';

COMMENT ON COLUMN cobuy_sessions.share_token IS 'Unique token for public access to the session';
COMMENT ON COLUMN cobuy_sessions.custom_fields IS 'Array of custom form fields defined by session creator';
COMMENT ON COLUMN cobuy_sessions.max_participants IS 'Maximum number of participants allowed (NULL = unlimited)';
COMMENT ON COLUMN cobuy_participants.field_responses IS 'User responses to custom form fields';
COMMENT ON COLUMN cobuy_participants.selected_size IS 'Product size selected by participant';
