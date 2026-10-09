'use client';

import { useActionState } from 'react';
import { ImageUploadField } from '@/components/ui/image-upload-field';
import { MEDIA_BUCKETS } from '@/lib/storage/media';
import { updateProfileAction } from '../actions/update-profile';

type ProfileEditFormProps = {
  userId: string;
  name: string;
  avatarPath: string | null;
  bannerPath: string | null;
};

export function ProfileEditForm({ userId, name, avatarPath, bannerPath }: ProfileEditFormProps) {
  const [state, action, pending] = useActionState(updateProfileAction, null);

  return (
    <form action={action} className="space-y-5">
      <label className="block text-sm font-medium">
        Nome
        <input
          name="name"
          required
          minLength={2}
          maxLength={120}
          defaultValue={name}
          className="border-border bg-background ring-primary mt-2 w-full rounded-xl border px-3 py-2.5 text-base outline-none focus:ring-2"
        />
      </label>
      <ImageUploadField
        name="avatarPath"
        label="Foto de perfil"
        bucket={MEDIA_BUCKETS.profile}
        folder={userId}
        initialPath={avatarPath}
        shape="circle"
      />
      <ImageUploadField
        name="bannerPath"
        label="Capa do perfil"
        bucket={MEDIA_BUCKETS.profile}
        folder={userId}
        initialPath={bannerPath}
        shape="banner"
      />
      <p className="text-muted-foreground text-xs">JPG, PNG ou WebP até 5 MB.</p>
      {state ? (
        <p
          role={state.ok ? 'status' : 'alert'}
          className={`text-sm ${state.ok ? 'text-success' : 'text-danger'}`}
        >
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="bg-primary w-full rounded-xl px-4 py-3 text-sm font-black text-white disabled:opacity-50 sm:w-auto"
      >
        {pending ? 'Salvando…' : 'Salvar perfil'}
      </button>
    </form>
  );
}
