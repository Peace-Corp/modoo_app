-- Add progress_state column to cobuy_sessions table
-- This tracks the overall progress of a CoBuy session through various stages

-- Add the progress_state column with a CHECK constraint for valid values
ALTER TABLE cobuy_sessions
ADD COLUMN progress_state TEXT NOT NULL DEFAULT 'gathering'
CHECK (progress_state IN (
  'gathering',           -- 모집중
  'gather_complete',     -- 모집 완료
  'order_complete',      -- 주문 완료
  'manufacturing',       -- 제작중
  'manufacture_complete', -- 제작 완료
  'delivering',          -- 배송중
  'delivery_complete'    -- 배송 완료
));

-- Add an index for querying by progress_state
CREATE INDEX idx_cobuy_sessions_progress_state ON cobuy_sessions(progress_state);

-- Add comment for documentation
COMMENT ON COLUMN cobuy_sessions.progress_state IS 'Current progress state of the CoBuy session: gathering, gather_complete, order_complete, manufacturing, manufacture_complete, delivering, delivery_complete';
