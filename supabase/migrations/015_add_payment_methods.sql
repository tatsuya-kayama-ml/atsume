-- Add event_payment_methods table for multiple payment methods
-- 複数の支払い方法を登録できるようにする

-- Create the event_payment_methods table
CREATE TABLE IF NOT EXISTS event_payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('paypay', 'bank', 'other')),
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for event_id
CREATE INDEX IF NOT EXISTS idx_event_payment_methods_event_id ON event_payment_methods(event_id);

-- Add payment_method_id to event_participants to track which method was used
ALTER TABLE event_participants ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES event_payment_methods(id) ON DELETE SET NULL;

-- RLS policies
ALTER TABLE event_payment_methods ENABLE ROW LEVEL SECURITY;

-- Everyone can view payment methods for events they can see
CREATE POLICY "event_payment_methods_select_policy" ON event_payment_methods
  FOR SELECT USING (true);

-- Only organizers can insert/update/delete payment methods
CREATE POLICY "event_payment_methods_insert_policy" ON event_payment_methods
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM events WHERE events.id = event_id AND events.organizer_id = auth.uid()
    )
  );

CREATE POLICY "event_payment_methods_update_policy" ON event_payment_methods
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM events WHERE events.id = event_id AND events.organizer_id = auth.uid()
    )
  );

CREATE POLICY "event_payment_methods_delete_policy" ON event_payment_methods
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM events WHERE events.id = event_id AND events.organizer_id = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE event_payment_methods IS 'イベントの支払い方法（複数登録可能）';
COMMENT ON COLUMN event_payment_methods.type IS '支払い方法タイプ（paypay, bank, other）';
COMMENT ON COLUMN event_payment_methods.label IS '表示ラベル（例: PayPay、三井住友銀行）';
COMMENT ON COLUMN event_payment_methods.value IS '支払い情報（URL or 口座情報）';
COMMENT ON COLUMN event_payment_methods.order_index IS '表示順序';
COMMENT ON COLUMN event_participants.payment_method_id IS '参加者が使用した支払い方法のID';
