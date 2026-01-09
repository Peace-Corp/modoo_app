-- Update status column in cobuy_sessions table to support new progress states
-- This replaces the old status values (open, closed, cancelled, finalized) with new progress-based states

-- Step 1: Drop the existing check constraint on status column
ALTER TABLE cobuy_sessions DROP CONSTRAINT IF EXISTS cobuy_sessions_status_check;

-- Step 2: Migrate existing data to new status values
UPDATE cobuy_sessions SET status = 'gathering' WHERE status = 'open';
UPDATE cobuy_sessions SET status = 'delivery_complete' WHERE status IN ('closed', 'finalized');
-- 'cancelled' remains as 'cancelled'

-- Step 3: Add new check constraint with all valid status values
ALTER TABLE cobuy_sessions
ADD CONSTRAINT cobuy_sessions_status_check CHECK (status IN (
  'gathering',           -- 모집중
  'gather_complete',     -- 모집 완료
  'order_complete',      -- 주문 완료
  'manufacturing',       -- 제작중
  'manufacture_complete', -- 제작 완료
  'delivering',          -- 배송중
  'delivery_complete',   -- 배송 완료
  'cancelled'            -- 취소됨
));

-- Update comment for documentation
COMMENT ON COLUMN cobuy_sessions.status IS 'Current status of the CoBuy session: gathering (모집중), gather_complete (모집 완료), order_complete (주문 완료), manufacturing (제작중), manufacture_complete (제작 완료), delivering (배송중), delivery_complete (배송 완료), cancelled (취소됨)';
