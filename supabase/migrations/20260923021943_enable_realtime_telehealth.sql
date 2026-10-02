/*
# Enable Realtime for Telehealth Tables

1. Changes
- Add `consultations` table to the `supabase_realtime` publication so INSERT/UPDATE events trigger real-time notifications.
- Add `consultation_messages` table to the `supabase_realtime` publication so new chat messages appear instantly on both doctor and patient screens.

2. Security
- No RLS changes. Existing policies already allow anon + authenticated access.
- Realtime publication only controls which table changes are broadcast; RLS still filters which rows each client can see.

3. Notes
- Without this, the doctor's incoming-call alert and the in-call live chat would not fire in real-time.
*/

ALTER PUBLICATION supabase_realtime ADD TABLE consultations;
ALTER PUBLICATION supabase_realtime ADD TABLE consultation_messages;
