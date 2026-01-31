-- Migration: Add selected_size_code column to cobuy_participants
-- This stores the internal size code alongside the display label

ALTER TABLE cobuy_participants
ADD COLUMN selected_size_code TEXT;

-- Add comment for documentation
COMMENT ON COLUMN cobuy_participants.selected_size_code IS 'Internal size code for factory/admin tracking (e.g., 001, 002)';
