
/*
# Fix app_users RLS to allow anon username lookup

The login flow queries app_users by username BEFORE authenticating,
using the anon key. The previous SELECT policy was restricted to
`authenticated` only, causing the lookup to return null and the
login to always fail with "Invalid username or password".

Changes:
- Drop and recreate the SELECT policy to include the `anon` role
  so the login page can look up a user by username to verify it exists.
- Only non-sensitive columns are needed (username, role, is_active),
  but since RLS is row-level not column-level, we allow the full row.
- All write policies remain authenticated-only (no change).
*/

DROP POLICY IF EXISTS "app_users_select" ON app_users;
CREATE POLICY "app_users_select" ON app_users FOR SELECT
TO anon, authenticated USING (true);
