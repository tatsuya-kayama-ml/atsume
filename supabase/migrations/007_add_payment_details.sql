-- Add payment_details column for storing bank account info, etc.
-- This is used when payment method is not PayPay (which uses payment_link as URL)

ALTER TABLE events ADD COLUMN IF NOT EXISTS payment_details TEXT;

-- Comment
COMMENT ON COLUMN events.payment_details IS '支払い詳細情報（銀行口座情報など）。PayPay以外の支払い方法で使用';
