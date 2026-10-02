/*
# Add Doctor Specialty and Consultation Fee

1. Modified Tables
- `profiles`: Add `specialty` (text, nullable) — medical specialty for doctors (e.g., "General Practitioner", "Cardiologist").
- `profiles`: Add `consultation_fee` (integer, nullable) — consultation charge in TSh for telehealth calls.
- `profiles`: Add `is_online` (boolean, default false) — doctor availability status for telehealth directory.

2. Security
- No changes to existing RLS policies. Existing policies already cover the new columns since they apply to the full table.

3. Notes
- These columns are nullable so existing rows are unaffected.
- The frontend will read specialty/fee/online status to display the Doctor Directory and pricing.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialty text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS consultation_fee integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;
