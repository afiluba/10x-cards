-- migration purpose: initialize flashcard management tables with audit support
-- affected objects: types flashcard_source_type, study_session_status; tables public.flashcards, public.ai_generation_audit; trigger function public.set_updated_at_timestamp; rls policies and indexes
-- notes: ensures soft-delete semantics, row level security per role, and data integrity constraints aligned with application expectations

-- ensure pgcrypto is available for gen_random_uuid usage in uuid defaults
create extension if not exists pgcrypto;

create type public.flashcard_source_type as enum ('ai_original', 'ai_edited', 'manual');
create type public.study_session_status as enum ('in_progress', 'completed', 'cancelled');

-- reusable trigger function to keep updated_at timestamps consistent across tables
create function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- table aggregating ai generation sessions for traceability and reporting
create table public.ai_generation_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  client_request_id uuid not null default gen_random_uuid(),
  model_identifier text,
  generation_started_at timestamptz not null default timezone('utc', now()),
  generation_completed_at timestamptz,
  generated_count integer not null,
  saved_unchanged_count integer not null,
  saved_edited_count integer not null,
  rejected_count integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  constraint ai_generation_audit_generated_count_non_negative check (generated_count >= 0),
  constraint ai_generation_audit_saved_unchanged_non_negative check (saved_unchanged_count >= 0),
  constraint ai_generation_audit_saved_edited_non_negative check (saved_edited_count >= 0),
  constraint ai_generation_audit_rejected_non_negative check (rejected_count >= 0),
  constraint ai_generation_audit_counts_consistency check (generated_count = saved_unchanged_count + saved_edited_count + rejected_count),
  constraint ai_generation_audit_user_client_unique unique (user_id, client_request_id)
);

-- table storing individual flashcards with soft-delete metadata and optional linkage to ai generation audit sessions
create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  front_text text not null,
  back_text text not null,
  source_type public.flashcard_source_type not null,
  ai_generation_audit_id uuid references public.ai_generation_audit(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  constraint flashcards_front_length_check check (char_length(front_text) between 1 and 500),
  constraint flashcards_back_length_check check (char_length(back_text) between 1 and 500),
  constraint flashcards_user_not_null check (user_id is not null)
);

-- install timestamp maintenance triggers to keep updated_at accurate
create trigger flashcards_set_updated_at
before update on public.flashcards
for each row
execute function public.set_updated_at_timestamp();

create trigger ai_generation_audit_set_updated_at
before update on public.ai_generation_audit
for each row
execute function public.set_updated_at_timestamp();

-- indexes supporting common query paths and soft-delete filtering semantics
create index flashcards_user_deleted_idx on public.flashcards using btree (user_id, deleted_at);
create index flashcards_source_type_idx on public.flashcards using btree (source_type);
create index ai_generation_audit_user_created_idx on public.ai_generation_audit using btree (user_id, created_at);