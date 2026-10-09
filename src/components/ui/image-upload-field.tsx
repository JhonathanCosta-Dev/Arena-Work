'use client';

import { useId, useRef, useState } from 'react';
import Image from 'next/image';
import { ImagePlus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { MEDIA_MAX_BYTES, MEDIA_MIME_TYPES, mediaUrl, type MediaBucket } from '@/lib/storage/media';

type ImageUploadFieldProps = {
  /** Name of the hidden input that carries the stored object path to the form action. */
  name: string;
  label: string;
  bucket: MediaBucket;
  /** First path segment; Storage policies only accept the user's own id (or "company" for admins). */
  folder: string;
  initialPath: string | null;
  shape: 'circle' | 'banner';
};

const extensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Uploads straight from the browser to Supabase Storage (RLS-checked), so large images never go
 * through the Server Action body limit. The form only submits the resulting object path.
 */
export function ImageUploadField({
  name,
  label,
  bucket,
  folder,
  initialPath,
  shape,
}: ImageUploadFieldProps) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState(initialPath);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = mediaUrl(bucket, path);

  async function handleFile(file: File) {
    setError(null);
    if (!(MEDIA_MIME_TYPES as readonly string[]).includes(file.type)) {
      setError('Use JPG, PNG ou WebP.');
      return;
    }
    if (file.size > MEDIA_MAX_BYTES) {
      setError('A imagem pode ter no máximo 5 MB.');
      return;
    }

    setUploading(true);
    const objectPath = `${folder}/${crypto.randomUUID()}.${extensions[file.type]}`;
    const { error: uploadError } = await createClient()
      .storage.from(bucket)
      .upload(objectPath, file, { contentType: file.type, cacheControl: '31536000' });
    setUploading(false);

    if (uploadError) {
      setError('Não foi possível enviar a imagem. Tente novamente.');
      return;
    }
    setPath(objectPath);
  }

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium">
        {label}
      </label>
      <input type="hidden" name={name} value={path ?? ''} />
      <div
        className={`mt-2 flex gap-3 ${shape === 'banner' ? 'flex-col items-start sm:flex-row sm:items-center' : 'items-center'}`}
      >
        <div
          className={`bg-background border-border relative shrink-0 overflow-hidden border ${
            shape === 'circle' ? 'size-20 rounded-full' : 'aspect-[3/1] w-full max-w-xs rounded-xl'
          }`}
        >
          {preview ? (
            <Image src={preview} alt="" fill sizes="320px" className="object-cover" />
          ) : (
            <span className="text-muted-foreground absolute inset-0 grid place-items-center text-xs">
              Sem imagem
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="border-border inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold hover:text-white disabled:opacity-50"
          >
            <ImagePlus className="size-4" aria-hidden="true" />
            {uploading ? 'Enviando…' : preview ? 'Trocar' : 'Enviar'}
          </button>
          {preview ? (
            <button
              type="button"
              disabled={uploading}
              onClick={() => setPath(null)}
              className="text-muted-foreground inline-flex items-center gap-2 rounded-lg px-3 py-1 text-xs font-bold hover:text-white"
            >
              <Trash2 className="size-4" aria-hidden="true" /> Remover
            </button>
          ) : null}
        </div>
      </div>
      <input
        ref={fileRef}
        id={inputId}
        type="file"
        accept={MEDIA_MIME_TYPES.join(',')}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void handleFile(file);
        }}
      />
      {error ? (
        <p role="alert" className="text-danger mt-2 text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}
