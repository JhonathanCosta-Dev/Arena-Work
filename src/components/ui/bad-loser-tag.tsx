import { Frown } from 'lucide-react';

/** "Mal perdedor" badge: given automatically when a player refuses a result; only admins remove it. */
export function BadLoserTag({ compact = false }: { compact?: boolean }) {
  return (
    <span
      title="Recusou um resultado. Só um administrador pode remover esta tag."
      className={`border-warning/40 bg-warning/10 text-warning inline-flex shrink-0 items-center gap-1 rounded-full border font-black whitespace-nowrap ${
        compact ? 'px-1.5 py-0 text-[9px]' : 'px-2 py-0.5 text-[11px]'
      }`}
    >
      <Frown className={compact ? 'size-3' : 'size-3.5'} aria-hidden="true" />
      {compact ? <span className="sr-only">Mal perdedor</span> : 'Mal perdedor'}
    </span>
  );
}
