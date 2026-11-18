#!/usr/bin/env bash
# Runs the database security tests against a LOCAL throwaway Postgres (never your real Supabase).
# Usage (from repo root):  bash supabase/tests/run.sh      needs: psql + a local postgres server
set -e
DB=hh_test
psql -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
for f in supabase/tests/00_supabase_stubs.sql supabase/schema.sql supabase/002_security_hardening.sql supabase/003_phase2_listings_and_storage.sql supabase/004_seed_categories.sql supabase/005_application_table_grants.sql; do
  psql -q -v ON_ERROR_STOP=1 -d $DB -f "$f"
done
echo "--- Phase 1 security ---";  psql -q -d $DB -f supabase/tests/10_phase1_security.sql 2>&1 | grep -E "^T[0-9]"
echo "--- Phase 2 listings ---";  psql -q -d $DB -f supabase/tests/20_phase2_listings.sql 2>&1 | grep -E "^(S|H|R|V|D|L)[0-9]"
echo "Read each line: the text in parentheses says what the correct result is."
