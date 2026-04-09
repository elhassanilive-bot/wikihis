-- Enable API access to shima schema (run in Supabase SQL Editor)
-- 1) Grants for API roles
grant usage on schema shima to anon, authenticated, service_role;
grant all on all tables in schema shima to service_role;
grant all on all sequences in schema shima to service_role;
grant all on all functions in schema shima to service_role;

grant select on all tables in schema shima to anon;
grant select, insert, update, delete on all tables in schema shima to authenticated;
grant usage, select on all sequences in schema shima to authenticated;
grant execute on all functions in schema shima to anon, authenticated;

alter default privileges in schema shima grant select on tables to anon;
alter default privileges in schema shima grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema shima grant usage, select on sequences to authenticated;
alter default privileges in schema shima grant execute on functions to anon, authenticated;

-- 2) Attempt to include shima in PostgREST exposed schemas
-- In some Supabase setups, this works immediately.
do $$
begin
  execute "alter role authenticator set pgrst.db_schemas = 'public,storage,graphql_public,shima'";
  perform pg_notify('pgrst', 'reload config');
exception
  when others then
    -- If this fails, add shima manually from Dashboard:
    -- Settings > API > Exposed schemas
    null;
end $$;

