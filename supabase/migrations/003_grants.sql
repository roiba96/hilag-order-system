-- 003: table and function privileges for logged-in users. Kept
-- here for the record. Fixes "permission denied" (42501) when loading the menu.
-- RLS policies (schema.sql) decide which rows; these grants decide which tables at all.
-- Only the authenticated role gets access. Nothing is granted to anon.

grant usage on schema public to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- Objects created later by the same role get the same privileges.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;
alter default privileges in schema public
  grant execute on functions to authenticated;
