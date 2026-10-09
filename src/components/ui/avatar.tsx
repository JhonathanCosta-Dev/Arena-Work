import Image from 'next/image';

const sizes = {
  sm: { box: 'size-8 text-xs', px: 32 },
  md: { box: 'size-10 text-sm', px: 40 },
  xl: { box: 'size-16 text-xl', px: 64 },
  lg: { box: 'size-24 text-3xl', px: 96 },
} as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')
  ).toUpperCase();
}

export function Avatar({
  name,
  src,
  size = 'md',
  className = '',
}: {
  name: string;
  src: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const { box, px } = sizes[size];

  return (
    <span
      className={`bg-card-elevated relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-black ${box} ${className}`}
    >
      {src ? (
        <Image src={src} alt="" fill sizes={`${px}px`} className="object-cover" />
      ) : (
        <span aria-hidden="true">{initials(name) || '?'}</span>
      )}
    </span>
  );
}
