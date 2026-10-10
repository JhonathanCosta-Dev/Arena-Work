import Image from 'next/image';

const sizes = {
  sm: { box: 'size-8 text-xs', px: 32, ring: 'p-[2px]' },
  md: { box: 'size-10 text-sm', px: 40, ring: 'p-[2px]' },
  xl: { box: 'size-16 text-xl', px: 64, ring: 'p-[3px]' },
  lg: { box: 'size-24 text-3xl', px: 96, ring: 'p-1' },
} as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')
  ).toUpperCase();
}

type AvatarProps = {
  name: string;
  src: string | null;
  size?: keyof typeof sizes;
  className?: string;
  /** Border in the player's competitive tier color. */
  ringColor?: string | null | undefined;
  /** Monthly champion: animated glowing border (overrides the tier color). */
  champion?: boolean | undefined;
};

export function Avatar({
  name,
  src,
  size = 'md',
  className = '',
  ringColor,
  champion = false,
}: AvatarProps) {
  const { box, px, ring } = sizes[size];
  const framed = Boolean(ringColor) || champion;

  const face = (
    <span
      className={`bg-card-elevated relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-black ${box} ${framed ? '' : className}`}
    >
      {src ? (
        <Image src={src} alt="" fill sizes={`${px}px`} className="object-cover" />
      ) : (
        <span aria-hidden="true">{initials(name) || '?'}</span>
      )}
    </span>
  );

  if (!framed) return face;

  return (
    <span
      className={`inline-grid shrink-0 rounded-full ${ring} ${champion ? 'champion-ring' : ''} ${className}`}
      style={
        champion
          ? undefined
          : { background: ringColor ?? undefined, boxShadow: `0 0 10px ${ringColor}55` }
      }
    >
      <span className="bg-card inline-grid rounded-full p-[1px]">{face}</span>
    </span>
  );
}
