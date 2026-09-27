create extension if not exists pgcrypto;
create extension if not exists vector with schema extensions;

set search_path = public, extensions;

create type document_status as enum ('uploaded', 'processing', 'ready', 'failed');
create type chat_message_role as enum ('user', 'assistant', 'system');

create or replace function update_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create table documents (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete set null,
    session_id uuid,
    title text not null check (char_length(btrim(title)) > 0),
    file_path text not null check (char_length(btrim(file_path)) > 0),
    file_type text not null check (file_type in ('application/pdf', 'image/png', 'image/jpeg')),
    file_size bigint not null check (file_size > 0),
    status document_status not null default 'uploaded',
    page_count integer check (page_count is null or page_count > 0),
    summary text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint documents_owner_check check (user_id is not null or session_id is not null)
);

create table document_chunks (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null references documents(id) on delete cascade,
    content text not null check (char_length(btrim(content)) > 0),
    page_number integer not null check (page_number > 0),
    chunk_index integer not null check (chunk_index >= 0),
    embedding vector(1536),
    metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint document_chunks_position_unique unique (document_id, chunk_index)
);

create table conversations (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null references documents(id) on delete cascade,
    user_id uuid references auth.users(id) on delete set null,
    session_id uuid,
    title text check (title is null or char_length(btrim(title)) > 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint conversations_owner_check check (user_id is not null or session_id is not null)
);

create table chat_messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references conversations(id) on delete cascade,
    role chat_message_role not null,
    content text not null check (char_length(btrim(content)) > 0),
    sources jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array'),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create trigger documents_updated_at
before update on documents
for each row execute function update_updated_at();

create trigger document_chunks_updated_at
before update on document_chunks
for each row execute function update_updated_at();

create trigger conversations_updated_at
before update on conversations
for each row execute function update_updated_at();

create trigger chat_messages_updated_at
before update on chat_messages
for each row execute function update_updated_at();

create index documents_user_id_idx on documents (user_id);
create index documents_session_id_idx on documents (session_id);
create index documents_status_idx on documents (status);
create index documents_created_at_idx on documents (created_at desc);

create index document_chunks_document_id_idx on document_chunks (document_id, page_number, chunk_index);
create index document_chunks_embedding_idx
    on document_chunks using hnsw (embedding vector_cosine_ops)
    where embedding is not null;

create index conversations_document_id_idx on conversations (document_id, created_at desc);
create index conversations_user_id_idx on conversations (user_id);
create index conversations_session_id_idx on conversations (session_id);
create index chat_messages_conversation_id_idx on chat_messages (conversation_id, created_at);

alter table documents enable row level security;
alter table document_chunks enable row level security;
alter table conversations enable row level security;
alter table chat_messages enable row level security;

create policy "Users can view their documents"
on documents for select
to authenticated
using (user_id = auth.uid());

create policy "Users can create their documents"
on documents for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update their documents"
on documents for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete their documents"
on documents for delete
to authenticated
using (user_id = auth.uid());

create policy "Users can view chunks from their documents"
on document_chunks for select
to authenticated
using (
    exists (
        select 1
        from documents
        where documents.id = document_chunks.document_id
          and documents.user_id = auth.uid()
    )
);

create policy "Users can create chunks for their documents"
on document_chunks for insert
to authenticated
with check (
    exists (
        select 1
        from documents
        where documents.id = document_chunks.document_id
          and documents.user_id = auth.uid()
    )
);

create policy "Users can update chunks from their documents"
on document_chunks for update
to authenticated
using (
    exists (
        select 1
        from documents
        where documents.id = document_chunks.document_id
          and documents.user_id = auth.uid()
    )
)
with check (
    exists (
        select 1
        from documents
        where documents.id = document_chunks.document_id
          and documents.user_id = auth.uid()
    )
);

create policy "Users can delete chunks from their documents"
on document_chunks for delete
to authenticated
using (
    exists (
        select 1
        from documents
        where documents.id = document_chunks.document_id
          and documents.user_id = auth.uid()
    )
);

create policy "Users can view their conversations"
on conversations for select
to authenticated
using (user_id = auth.uid());

create policy "Users can create their conversations"
on conversations for insert
to authenticated
with check (
    user_id = auth.uid()
    and exists (
        select 1
        from documents
        where documents.id = conversations.document_id
          and documents.user_id = auth.uid()
    )
);

create policy "Users can update their conversations"
on conversations for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete their conversations"
on conversations for delete
to authenticated
using (user_id = auth.uid());

create policy "Users can view messages from their conversations"
on chat_messages for select
to authenticated
using (
    exists (
        select 1
        from conversations
        where conversations.id = chat_messages.conversation_id
          and conversations.user_id = auth.uid()
    )
);

create policy "Users can create messages in their conversations"
on chat_messages for insert
to authenticated
with check (
    exists (
        select 1
        from conversations
        where conversations.id = chat_messages.conversation_id
          and conversations.user_id = auth.uid()
    )
);

create policy "Users can update messages in their conversations"
on chat_messages for update
to authenticated
using (
    exists (
        select 1
        from conversations
        where conversations.id = chat_messages.conversation_id
          and conversations.user_id = auth.uid()
    )
)
with check (
    exists (
        select 1
        from conversations
        where conversations.id = chat_messages.conversation_id
          and conversations.user_id = auth.uid()
    )
);

create policy "Users can delete messages from their conversations"
on chat_messages for delete
to authenticated
using (
    exists (
        select 1
        from conversations
        where conversations.id = chat_messages.conversation_id
          and conversations.user_id = auth.uid()
    )
);