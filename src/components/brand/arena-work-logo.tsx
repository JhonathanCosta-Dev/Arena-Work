import Image from 'next/image';
import mark from '../../../public/brand/arena-work-mark.png';
import lockup from '../../../public/brand/arena-work-logo.png';

type ArenaWorkLogoProps = {
  className?: string;
  priority?: boolean;
};

/** Full stacked lockup (mark + "Arena Work"), for login/splash surfaces. */
export function ArenaWorkLogo({ className, priority = false }: ArenaWorkLogoProps) {
  return (
    <Image
      src={lockup}
      alt="Arena Work"
      priority={priority}
      sizes="(max-width: 640px) 60vw, 240px"
      className={className}
    />
  );
}

/** Compact horizontal version for the header: mark + live-text wordmark (crisp at any size). */
export function ArenaWorkWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <Image src={mark} alt="" priority sizes="48px" className="h-6 w-auto" />
      <span className="text-lg leading-none font-black tracking-tight">
        Arena<span className="text-primary">Work</span>
      </span>
    </span>
  );
}
