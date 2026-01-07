-- Add PayPay payment link column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS paypay_link TEXT;

-- Add comment for documentation
COMMENT ON COLUMN events.paypay_link IS 'PayPay payment link for participants to pay the event fee';
