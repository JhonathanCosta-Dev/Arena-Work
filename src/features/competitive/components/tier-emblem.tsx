import { tierColor, tierGroupIndex, type TierKey } from '../domain/tiers';

const sizes = { sm: 20, md: 32, lg: 72 } as const;

/**
 * Shield emblem in the tier color. Higher tiers get extra ornaments (wings from Diamante,
 * a crown from Divino); the division (1–3) is shown as chevrons.
 */
export function TierEmblem({
  tier,
  division,
  size = 'md',
  label,
}: {
  tier: TierKey;
  division: 1 | 2 | 3;
  size?: keyof typeof sizes;
  label?: string;
}) {
  const px = sizes[size];
  const color = tierColor(tier);
  const group = tierGroupIndex(tier);
  const id = `tier-${tier}-${division}-${size}`;

  return (
    <svg
      width={px}
      height={px}
      viewBox={group >= 8 ? '0 -12 64 76' : '0 0 64 64'}
      style={group >= 9 ? { filter: `drop-shadow(0 0 4px ${color})` } : undefined}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="shrink-0"
    >
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="1" />
          <stop offset="1" stopColor={color} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {group >= 6 ? (
        <g fill={color} opacity="0.7">
          <path d="M10 22 L2 18 L6 30 L12 32 Z" />
          <path d="M54 22 L62 18 L58 30 L52 32 Z" />
        </g>
      ) : null}
      <path
        d="M32 4 L54 12 V30 C54 44 44 54 32 60 C20 54 10 44 10 30 V12 Z"
        fill={`url(#${id}-g)`}
        stroke={color}
        strokeWidth="2"
      />
      <path
        d="M32 9 L49 15.5 V30 C49 41 41.5 49 32 54 C22.5 49 15 41 15 30 V15.5 Z"
        fill="#0b0b0b"
        opacity="0.55"
      />
      {group >= 8 ? (
        <path
          d="M19 -9 L25 -1 L32 -11 L39 -1 L45 -9 L43 6 H21 Z"
          fill={color}
          stroke="#0b0b0b"
          strokeWidth="1"
        />
      ) : null}
      {Array.from({ length: division }, (_, i) => (
        <path
          key={i}
          d={`M22 ${40 - i * 8} L32 ${34 - i * 8} L42 ${40 - i * 8}`}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

export function TierBadge({
  tier,
  division,
  label,
}: {
  tier: TierKey;
  division: 1 | 2 | 3;
  label: string;
}) {
  const color = tierColor(tier);
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full border py-0.5 pr-2 pl-1 text-[11px] font-black whitespace-nowrap"
      style={{ borderColor: `${color}66`, background: `${color}14`, color }}
    >
      <TierEmblem tier={tier} division={division} size="sm" />
      {label}
    </span>
  );
}
