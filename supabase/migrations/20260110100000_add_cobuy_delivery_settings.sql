-- Add delivery_settings column to cobuy_sessions table
-- This column stores delivery configuration as JSONB with the following structure:
--
-- {
--   "enabled": boolean,           -- Whether individual delivery option is available for participants
--   "deliveryFee": number,        -- Extra fee for delivery (0 if free), e.g., 4000
--   "pickupLocation": string,     -- Legacy field for backward compatibility (full address string)
--   "deliveryAddress": {          -- 배송받을 장소 (where organizer receives bulk products)
--     "roadAddress": string,      -- 도로명 주소, e.g., "서울특별시 강남구 테헤란로 123"
--     "jibunAddress": string,     -- 지번 주소 (optional)
--     "postalCode": string,       -- 우편번호, e.g., "06234"
--     "addressDetail": string     -- 상세주소 (optional), e.g., "101동 202호"
--   },
--   "pickupAddress": {            -- 배부 장소 (where participants pick up their orders)
--     "roadAddress": string,      -- 도로명 주소
--     "jibunAddress": string,     -- 지번 주소 (optional)
--     "postalCode": string,       -- 우편번호
--     "addressDetail": string     -- 상세주소 (optional)
--   }
-- }

-- Add delivery_settings column if not exists
ALTER TABLE cobuy_sessions
ADD COLUMN IF NOT EXISTS delivery_settings JSONB DEFAULT NULL;

-- Add comment for documentation with JSON schema example
COMMENT ON COLUMN cobuy_sessions.delivery_settings IS 'Delivery configuration as JSONB: { enabled: boolean, deliveryFee: number, pickupLocation?: string (legacy), deliveryAddress?: { roadAddress, jibunAddress?, postalCode, addressDetail? }, pickupAddress?: { roadAddress, jibunAddress?, postalCode, addressDetail? } }';

-- Also ensure other related columns exist (these may have been added via dashboard)
ALTER TABLE cobuy_sessions
ADD COLUMN IF NOT EXISTS receive_by_date TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE cobuy_sessions
ADD COLUMN IF NOT EXISTS min_quantity INTEGER DEFAULT NULL;

ALTER TABLE cobuy_sessions
ADD COLUMN IF NOT EXISTS max_quantity INTEGER DEFAULT NULL;

ALTER TABLE cobuy_sessions
ADD COLUMN IF NOT EXISTS current_total_quantity INTEGER DEFAULT 0;

ALTER TABLE cobuy_sessions
ADD COLUMN IF NOT EXISTS pricing_tiers JSONB DEFAULT '[]';

-- Add saved_design_screenshot_id column if not exists (for design snapshot)
ALTER TABLE cobuy_sessions
ADD COLUMN IF NOT EXISTS saved_design_screenshot_id UUID REFERENCES saved_design_screenshots(id) ON DELETE CASCADE;

-- Add comments for documentation
COMMENT ON COLUMN cobuy_sessions.receive_by_date IS 'Expected date when participants will receive their items (수령 예정일)';
COMMENT ON COLUMN cobuy_sessions.min_quantity IS 'Minimum total quantity required to proceed with the co-buy';
COMMENT ON COLUMN cobuy_sessions.max_quantity IS 'Maximum total quantity allowed (NULL = unlimited)';
COMMENT ON COLUMN cobuy_sessions.current_total_quantity IS 'Current total quantity of items ordered';
COMMENT ON COLUMN cobuy_sessions.pricing_tiers IS 'Array of pricing tiers based on quantity: [{minQuantity: number, pricePerItem: number}]';
COMMENT ON COLUMN cobuy_sessions.saved_design_screenshot_id IS 'Reference to immutable design snapshot for this co-buy session';
