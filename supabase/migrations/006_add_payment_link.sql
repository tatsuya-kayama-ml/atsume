-- Add payment link fields to events table
-- 支払いリンク（PayPay、銀行振込等）をイベントに追加

ALTER TABLE events ADD COLUMN IF NOT EXISTS payment_link TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS payment_link_label TEXT;

-- Comment
COMMENT ON COLUMN events.payment_link IS '支払いリンク（PayPay、銀行振込等のURL）';
COMMENT ON COLUMN events.payment_link_label IS '支払いリンクのラベル（例: "PayPay", "銀行振込"）';
