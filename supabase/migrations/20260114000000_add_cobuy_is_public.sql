-- Add is_public column to cobuy_sessions table
-- When true, the session will be visible on public discovery pages
-- Defaults to false for backward compatibility

ALTER TABLE cobuy_sessions
ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false;

-- Add comment
COMMENT ON COLUMN cobuy_sessions.is_public IS 'Whether the session is publicly discoverable (true) or private/invite-only (false)';