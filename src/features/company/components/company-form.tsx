'use client';

import { useActionState } from 'react';
import { ImageUploadField } from '@/components/ui/image-upload-field';
import { MEDIA_BUCKETS } from '@/lib/storage/media';
import { saveCompanyAction } from '../actions/save-company';

type CompanyFormProps = {
  company: { name: string | null; iconPath: string | null; bannerPath: string | null };
};

export function CompanyForm({ company }: CompanyFormProps) {
  const [state, action, pending] = useActionState(saveCompanyAction, null);

  return (
    <form action={action} className="space-y-5">
      <label className="block text-sm font-medium">
        Nome da empresa
        <input
          name="name"
          maxLength={80}
          defaultValue={company.name ?? ''}
          placeholder="Ex.: Minha Empresa"
          className="border-border bg-background ring-primary mt-2 w-full rounded-xl border px-3 py-2.5 text-base outline-none focus:ring-2"
        />
      </label>
      <ImageUploadField
        name="iconPath"
        label="Ícone / avatar da empresa"
        bucket={MEDIA_BUCKETS.company}
        folder="company"
        initialPath={company.iconPath}
        shape="circle"
      />
      <ImageUploadField
        name="bannerPath"
        label="Banner (aparece no topo da home)"
        bucket={MEDIA_BUCKETS.company}
        folder="company"
        initialPath={company.bannerPath}
        shape="banner"
      />
      <p className="text-muted-foreground text-xs">
        JPG, PNG ou WebP até 5 MB. Banner ideal: 1500×500.
      </p>
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
        {pending ? 'Salvando…' : 'Salvar empresa'}
      </button>
    </form>
  );
}
