#!/bin/sh
set -eu
# Official postgres entrypoint runs this once on an empty volume.
# psql variable quoting prevents password text from becoming SQL.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
\getenv app_password PHEI_DB_PASSWORD
SELECT format('CREATE ROLE phei_app LOGIN PASSWORD %L', :'app_password') \gexec
CREATE SCHEMA phei AUTHORIZATION phei_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
ALTER ROLE phei_app SET search_path TO phei;
SQL
