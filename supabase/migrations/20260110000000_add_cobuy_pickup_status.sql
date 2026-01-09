-- Add pickup_status column to cobuy_participants table for tracking distribution (배부 기능)
-- This allows session creators to track which pickup participants have received their items

ALTER TABLE cobuy_participants
ADD COLUMN IF NOT EXISTS pickup_status TEXT NOT NULL DEFAULT 'pending';

-- Add comment for documentation
COMMENT ON COLUMN cobuy_participants.pickup_status IS 'Pickup status for distribution tracking: pending (미수령) or picked_up (수령). Only applicable for participants with delivery_method = pickup.';
