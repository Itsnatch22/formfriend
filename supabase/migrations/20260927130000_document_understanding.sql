alter table public.documents
add column if not exists understanding jsonb
check (understanding is null or jsonb_typeof(understanding) = 'object');

alter table public.documents
add column if not exists embedding_provider text
check (embedding_provider is null or embedding_provider in ('gemini', 'openai'));

alter table public.documents
add column if not exists embedding_model text;

create or replace function public.match_document_chunks(
    query_embedding extensions.vector(1536),
    target_document_id uuid,
    requested_count integer default 6
)
returns table (
    chunk_index integer,
    page_number integer,
    content text,
    similarity real
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
    select
        chunks.chunk_index,
        chunks.page_number,
        chunks.content,
        (1 - (chunks.embedding <=> query_embedding))::real as similarity
    from public.document_chunks as chunks
    where chunks.document_id = target_document_id
      and chunks.embedding is not null
    order by chunks.embedding <=> query_embedding
    limit greatest(1, least(requested_count, 20));
$$;

grant execute on function public.match_document_chunks(extensions.vector, uuid, integer)
to service_role;
