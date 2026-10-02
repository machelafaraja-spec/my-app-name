/*
# Production WebRTC Call Rooms + Push Notification Tokens

1. Changes
- Create `call_rooms` table: tracks active WebRTC call sessions with room IDs, token info, and participant state.
- Create `push_tokens` table: stores FCM device tokens for push notification delivery.
- Add `webrtc_provider` and `webrtc_token` columns to `consultations` table for production call integration.

2. New Tables
- `call_rooms`: WebRTC room state — room_id, consultation_id, provider (agora/twilio), status, participant tokens, started_at, ended_at.
- `push_tokens`: FCM registration tokens — profile_id, token, platform, is_active.

3. Security
- RLS enabled on both new tables with `TO anon, authenticated` full CRUD (no-auth demo app).
*/

-- Step 1: call_rooms table
CREATE TABLE IF NOT EXISTS call_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid REFERENCES consultations(id) ON DELETE CASCADE,
  room_id text NOT NULL,
  provider text NOT NULL DEFAULT 'agora' CHECK (provider IN ('agora', 'twilio', 'local')),
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'active', 'ended')),
  caller_token text,
  callee_token text,
  caller_joined boolean DEFAULT false,
  callee_joined boolean DEFAULT false,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE call_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_call_rooms" ON call_rooms;
CREATE POLICY "anon_select_call_rooms" ON call_rooms FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_call_rooms" ON call_rooms;
CREATE POLICY "anon_insert_call_rooms" ON call_rooms FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_call_rooms" ON call_rooms;
CREATE POLICY "anon_update_call_rooms" ON call_rooms FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_call_rooms" ON call_rooms;
CREATE POLICY "anon_delete_call_rooms" ON call_rooms FOR DELETE
  TO anon, authenticated USING (true);

-- Step 2: push_tokens table
CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text DEFAULT 'web' CHECK (platform IN ('web', 'android', 'ios')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_push_tokens" ON push_tokens;
CREATE POLICY "anon_select_push_tokens" ON push_tokens FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_push_tokens" ON push_tokens;
CREATE POLICY "anon_insert_push_tokens" ON push_tokens FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_push_tokens" ON push_tokens;
CREATE POLICY "anon_update_push_tokens" ON push_tokens FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_push_tokens" ON push_tokens;
CREATE POLICY "anon_delete_push_tokens" ON push_tokens FOR DELETE
  TO anon, authenticated USING (true);

-- Step 3: Add WebRTC columns to consultations
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS webrtc_provider text DEFAULT 'local';
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS webrtc_room_id text;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS webrtc_token text;

-- Step 4: Indexes
CREATE INDEX IF NOT EXISTS idx_call_rooms_consultation ON call_rooms(consultation_id);
CREATE INDEX IF NOT EXISTS idx_call_rooms_status ON call_rooms(status);
CREATE INDEX IF NOT EXISTS idx_push_tokens_profile ON push_tokens(profile_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active);

-- Step 5: Enable realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE call_rooms;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE push_tokens;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
