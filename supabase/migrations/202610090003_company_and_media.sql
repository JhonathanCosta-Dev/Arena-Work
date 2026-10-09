-- Company branding (name, icon, banner) and profile images (avatar, banner) on Supabase Storage.
-- Images live in public buckets; the database stores bucket-relative object paths, never URLs.

alter table public.profiles rename column avatar_url to avatar_path;
alter table public.profiles add column banner_path text;

-- Singleton row: the app serves one company.
create table public.company_settings (
  id smallint primary key default 1 check (id = 1),
  name text check (name is null or char_length(trim(name)) between 1 and 80),
  icon_path text,
  banner_path text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index company_settings_updated_by_idx on public.company_settings (updated_by);

create trigger company_settings_set_updated_at before update on public.company_settings
for each row execute function public.set_updated_at();

insert into public.company_settings (id) values (1) on conflict (id) do nothing;

alter table public.company_settings enable row level security;
revoke all on table public.company_settings from anon, authenticated;
grant select on table public.company_settings to authenticated;

create policy company_settings_select_internal
on public.company_settings for select to authenticated
using (public.current_user_is_active());

-- Buckets: size and type are enforced by Storage itself, not only by the UI.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile-media', 'profile-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('company-media', 'company-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Each active member writes only inside its own folder: profile-media/<user id>/...
create policy profile_media_select_own
on storage.objects for select to authenticated
using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy profile_media_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.current_user_is_active()
);

create policy profile_media_delete_own
on storage.objects for delete to authenticated
using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Company images: admins only.
create policy company_media_select_admin
on storage.objects for select to authenticated
using (bucket_id = 'company-media' and public.current_user_is_admin());

create policy company_media_insert_admin
on storage.objects for insert to authenticated
with check (bucket_id = 'company-media' and public.current_user_is_admin());

create policy company_media_delete_admin
on storage.objects for delete to authenticated
using (bucket_id = 'company-media' and public.current_user_is_admin());

-- Profile editing. NULL path clears the image; paths must live in the caller's own folder.
create or replace function public.update_my_profile(
  p_name text,
  p_avatar_path text,
  p_banner_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_name text := nullif(trim(p_name), '');
  v_prefix text := (select auth.uid())::text || '/';
begin
  if v_user_id is null or not public.current_user_is_active() then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;
  if v_name is null or char_length(v_name) not between 2 and 120 then
    raise exception 'INVALID_PROFILE_NAME' using errcode = 'P0001';
  end if;
  if (p_avatar_path is not null and left(p_avatar_path, length(v_prefix)) <> v_prefix)
     or (p_banner_path is not null and left(p_banner_path, length(v_prefix)) <> v_prefix) then
    raise exception 'INVALID_IMAGE_PATH' using errcode = 'P0001';
  end if;

  update public.profiles
  set name = v_name, avatar_path = p_avatar_path, banner_path = p_banner_path
  where id = v_user_id;
end;
$$;

create or replace function public.admin_update_company(
  p_name text,
  p_icon_path text,
  p_banner_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := (select auth.uid());
  v_old public.company_settings%rowtype;
  v_name text := nullif(trim(p_name), '');
begin
  if not public.current_user_is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
  end if;
  if v_name is not null and char_length(v_name) > 80 then
    raise exception 'INVALID_COMPANY_NAME' using errcode = 'P0001';
  end if;
  if (p_icon_path is not null and left(p_icon_path, 8) <> 'company/')
     or (p_banner_path is not null and left(p_banner_path, 8) <> 'company/') then
    raise exception 'INVALID_IMAGE_PATH' using errcode = 'P0001';
  end if;

  select * into v_old from public.company_settings where id = 1 for update;

  update public.company_settings
  set name = v_name, icon_path = p_icon_path, banner_path = p_banner_path, updated_by = v_admin
  where id = 1;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, old_data, new_data)
  values (
    v_admin,
    'company.updated',
    'company',
    null,
    jsonb_build_object('name', v_old.name, 'icon_path', v_old.icon_path, 'banner_path', v_old.banner_path),
    jsonb_build_object('name', v_name, 'icon_path', p_icon_path, 'banner_path', p_banner_path)
  );
end;
$$;

revoke all on function public.update_my_profile(text, text, text) from public, anon;
revoke all on function public.admin_update_company(text, text, text) from public, anon;
grant execute on function public.update_my_profile(text, text, text) to authenticated;
grant execute on function public.admin_update_company(text, text, text) to authenticated;
