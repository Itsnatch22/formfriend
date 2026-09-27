insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'formfriend-documents',
    'formfriend-documents',
    false,
    20971520,
    array['application/pdf', 'image/png', 'image/jpeg']
)
on conflict (id) do update
set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can upload their own documents"
on storage.objects for insert
to authenticated
with check (
    bucket_id = 'formfriend-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can view their own documents"
on storage.objects for select
to authenticated
using (
    bucket_id = 'formfriend-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete their own documents"
on storage.objects for delete
to authenticated
using (
    bucket_id = 'formfriend-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
);
