-- migration purpose: add comprehensive row level security (rls) policies for flashcards and ai_generation_audit tables
-- affected objects: tables public.flashcards, public.ai_generation_audit
-- notes: implements granular policies per crud operation (select, insert, update, delete) for both anon and authenticated roles.
--        authenticated users can only access their own data. anonymous users have no access.

-- enable row level security on flashcards table
-- this ensures that policies must explicitly grant access; default deny for all operations
alter table public.flashcards enable row level security;

-- enable row level security on ai_generation_audit table
-- this ensures that policies must explicitly grant access; default deny for all operations
alter table public.ai_generation_audit enable row level security;

-- ============================================================================
-- flashcards table policies
-- ============================================================================

-- policy: flashcards select for anonymous users
-- rationale: anonymous users should not have access to any flashcard data
-- behavior: denies all select operations for anon role
create policy "flashcards_select_anon"
on public.flashcards
for select
to anon
using (false);

-- policy: flashcards select for authenticated users
-- rationale: authenticated users should only see their own flashcards
-- behavior: allows select only where user_id matches the authenticated user's id
create policy "flashcards_select_authenticated"
on public.flashcards
for select
to authenticated
using (auth.uid() = user_id);

-- policy: flashcards insert for anonymous users
-- rationale: anonymous users should not be able to create flashcards
-- behavior: denies all insert operations for anon role
create policy "flashcards_insert_anon"
on public.flashcards
for insert
to anon
with check (false);

-- policy: flashcards insert for authenticated users
-- rationale: authenticated users should only be able to create flashcards for themselves
-- behavior: allows insert only when user_id matches the authenticated user's id
create policy "flashcards_insert_authenticated"
on public.flashcards
for insert
to authenticated
with check (auth.uid() = user_id);

-- policy: flashcards update for anonymous users
-- rationale: anonymous users should not be able to update flashcards
-- behavior: denies all update operations for anon role
create policy "flashcards_update_anon"
on public.flashcards
for update
to anon
using (false);

-- policy: flashcards update for authenticated users
-- rationale: authenticated users should only be able to update their own flashcards
-- behavior: allows update only where user_id matches the authenticated user's id
create policy "flashcards_update_authenticated"
on public.flashcards
for update
to authenticated
using (auth.uid() = user_id);

-- policy: flashcards delete for anonymous users
-- rationale: anonymous users should not be able to delete flashcards
-- behavior: denies all delete operations for anon role
-- note: this applies to hard deletes; soft deletes are handled via updates
create policy "flashcards_delete_anon"
on public.flashcards
for delete
to anon
using (false);

-- policy: flashcards delete for authenticated users
-- rationale: authenticated users should only be able to delete their own flashcards
-- behavior: allows delete only where user_id matches the authenticated user's id
-- note: this applies to hard deletes; soft deletes are handled via updates
create policy "flashcards_delete_authenticated"
on public.flashcards
for delete
to authenticated
using (auth.uid() = user_id);

-- ============================================================================
-- ai_generation_audit table policies
-- ============================================================================

-- policy: ai_generation_audit select for anonymous users
-- rationale: anonymous users should not have access to ai generation audit data
-- behavior: denies all select operations for anon role
create policy "ai_generation_audit_select_anon"
on public.ai_generation_audit
for select
to anon
using (false);

-- policy: ai_generation_audit select for authenticated users
-- rationale: authenticated users should only see their own ai generation audit records
-- behavior: allows select only where user_id matches the authenticated user's id
create policy "ai_generation_audit_select_authenticated"
on public.ai_generation_audit
for select
to authenticated
using (auth.uid() = user_id);

-- policy: ai_generation_audit insert for anonymous users
-- rationale: anonymous users should not be able to create ai generation audit records
-- behavior: denies all insert operations for anon role
create policy "ai_generation_audit_insert_anon"
on public.ai_generation_audit
for insert
to anon
with check (false);

-- policy: ai_generation_audit insert for authenticated users
-- rationale: authenticated users should only be able to create audit records for themselves
-- behavior: allows insert only when user_id matches the authenticated user's id
create policy "ai_generation_audit_insert_authenticated"
on public.ai_generation_audit
for insert
to authenticated
with check (auth.uid() = user_id);

-- policy: ai_generation_audit update for anonymous users
-- rationale: anonymous users should not be able to update ai generation audit records
-- behavior: denies all update operations for anon role
create policy "ai_generation_audit_update_anon"
on public.ai_generation_audit
for update
to anon
using (false);

-- policy: ai_generation_audit update for authenticated users
-- rationale: authenticated users should only be able to update their own audit records
-- behavior: allows update only where user_id matches the authenticated user's id
create policy "ai_generation_audit_update_authenticated"
on public.ai_generation_audit
for update
to authenticated
using (auth.uid() = user_id);

-- policy: ai_generation_audit delete for anonymous users
-- rationale: anonymous users should not be able to delete ai generation audit records
-- behavior: denies all delete operations for anon role
-- note: this applies to hard deletes; soft deletes are handled via updates
create policy "ai_generation_audit_delete_anon"
on public.ai_generation_audit
for delete
to anon
using (false);

-- policy: ai_generation_audit delete for authenticated users
-- rationale: authenticated users should only be able to delete their own audit records
-- behavior: allows delete only where user_id matches the authenticated user's id
-- note: this applies to hard deletes; soft deletes are handled via updates
create policy "ai_generation_audit_delete_authenticated"
on public.ai_generation_audit
for delete
to authenticated
using (auth.uid() = user_id);

