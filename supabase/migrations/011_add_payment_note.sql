-- Add payment_note column to event_participants table
-- This allows participants to add a note when reporting payment (e.g., PayPay username, transaction details)

ALTER TABLE event_participants
ADD COLUMN IF NOT EXISTS payment_note TEXT;

COMMENT ON COLUMN event_participants.payment_note IS '支払い報告時のメモ（例: PayPayで送りました。ユーザー名XXです。）';
